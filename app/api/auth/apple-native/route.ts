import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Exchange a native Apple Sign In identity token for a Clerk sign-in ticket.
// Called by the Capacitor iOS app after the native Apple Sign In sheet completes.
export async function POST(req: Request) {
  let identityToken: string;
  let email: string | undefined;
  let givenName: string | undefined;
  let familyName: string | undefined;
  let user: string | undefined;

  try {
    const body = await req.json();
    identityToken = body.identityToken;
    email = body.email || undefined;
    givenName = body.givenName || undefined;
    familyName = body.familyName || undefined;
    user = body.user || undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!identityToken) {
    return NextResponse.json({ error: "Missing identity token" }, { status: 400 });
  }

  // Decode the Apple JWT payload (base64url) to extract the Apple user sub.
  // Note: for production, verify the signature against Apple's public keys at
  // https://appleid.apple.com/auth/keys to prevent token spoofing.
  let appleUserId: string;
  let appleEmail: string | undefined;
  try {
    const payloadB64 = identityToken.split(".")[1];
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(json);
    appleUserId = payload.sub;
    appleEmail = payload.email || email;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Apple identity token" },
      { status: 400 }
    );
  }

  if (!appleUserId) {
    return NextResponse.json(
      { error: "Apple identity token missing sub claim" },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();
    let clerkUserId: string;

    // 1. Check for an existing user linked by Apple sub (externalId)
    const byExternalId = await client.users.getUserList({
      externalId: [appleUserId],
    });

    if (byExternalId.totalCount > 0) {
      clerkUserId = byExternalId.data[0].id;
    } else if (appleEmail) {
      // 2. Check for an existing user by email (may have registered via web OAuth)
      const byEmail = await client.users.getUserList({
        emailAddress: [appleEmail],
      });

      if (byEmail.totalCount > 0) {
        clerkUserId = byEmail.data[0].id;
        // Link this user's Apple sub so future lookups use externalId
        await client.users.updateUser(clerkUserId, {
          externalId: appleUserId,
        });
      } else {
        // 3. Create a new Clerk user
        const newUser = await client.users.createUser({
          externalId: appleUserId,
          emailAddress: [appleEmail],
          firstName: givenName,
          lastName: familyName,
          skipPasswordChecks: true,
        });
        clerkUserId = newUser.id;
      }
    } else {
      // 4. No email available — create a minimal user
      const newUser = await client.users.createUser({
        externalId: appleUserId,
        firstName: givenName,
        lastName: familyName,
        skipPasswordChecks: true,
      });
      clerkUserId = newUser.id;
    }

    // Issue a short-lived sign-in ticket the client can exchange for a session
    const signInToken = await client.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 300,
    });

    return NextResponse.json({ ticket: signInToken.token });
  } catch (err: any) {
    const detail = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Authentication failed";
    console.error("Apple native auth error:", JSON.stringify(err?.errors || err));
    return NextResponse.json(
      { error: detail },
      { status: 500 }
    );
  }
}
