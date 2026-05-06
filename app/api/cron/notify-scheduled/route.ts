import { NextRequest, NextResponse } from "next/server";
import { getUsersWithDueScheduledPosts } from "../../../lib/deviceTokens";
import admin from "firebase-admin";

function getFirebaseApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// POST /api/cron/notify-scheduled
// Called by Vercel Cron at 10:00 UTC daily.
// Finds all users with pending scheduled posts due today and sends push notifications.
export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getUsersWithDueScheduledPosts();

    if (!users.length) {
      return NextResponse.json({ sent: 0, message: "No due scheduled posts" });
    }

    const app = getFirebaseApp();
    const messaging = app.messaging();

    let sent = 0;
    let failed = 0;

    for (const { tokens, postCount } of users) {
      if (!tokens.length) continue;

      const title = "Your post is ready to publish";
      const body = postCount === 1
        ? "You have 1 scheduled post ready. Tap to review and publish."
        : `You have ${postCount} scheduled posts ready. Tap to review and publish.`;

      // Send to each token (handles multiple devices per user)
      for (const token of tokens) {
        try {
          await messaging.send({
            token,
            notification: { title, body },
            data: { type: "scheduled_posts", count: String(postCount) },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: postCount,
                },
              },
            },
            android: {
              notification: {
                sound: "default",
                channelId: "scheduled_posts",
              },
            },
          });
          sent++;
        } catch (err: any) {
          // Token may be stale — log but continue
          console.error("FCM send failed for token:", err?.message);
          failed++;
        }
      }
    }

    console.log(`Cron notify-scheduled: sent=${sent} failed=${failed} users=${users.length}`);
    return NextResponse.json({ sent, failed, users: users.length });
  } catch (error: any) {
    console.error("Cron notify-scheduled error:", error);
    return NextResponse.json({ error: error?.message || "Cron job failed" }, { status: 500 });
  }
}
