import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  let appleUserId: string;
  let appleEmail: string | undefined;
  try {
    const payloadB64 = identityToken.split(".")[1];
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    const payload = JSON.parse(json);
    appleUserId = payload.sub;
    appleEmail = payload.email || email;
    console.log("Apple sub:", appleUserId, "email:", appleEmail);
  } catch {
    return NextResponse.json({ error: "Failed to parse Apple identity token" }, { status: 400 });
  }

  if (!appleUserId) {
    return NextResponse.json({ error: "Apple identity token missing sub claim" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    let clerkUserId: string | undefined;

    // 1. Look up by externalId (Apple sub)
    try {
      const byExternalId = await client.users.getUserList({ externalId: [appleUserId] });
      console.log("By externalId:", byExternalId.totalCount);
      if (byExternalId.totalCount > 0) clerkUserId = byExternalId.data[0].id;
    } catch (e: any) {
      console.error("getUserList externalId failed:", e?.message);
    }

    // 2. Look up by email
    if (!clerkUserId && appleEmail) {
      try {
        const byEmail = await client.users.getUserList({ emailAddress: [appleEmail] });
        console.log("By email:", byEmail.totalCount);
        if (byEmail.totalCount > 0) {
          clerkUserId = byEmail.data[0].id;
          await client.users.updateUser(clerkUserId, { externalId: appleUserId });
        }
      } catch (e: any) {
        console.error("getUserList email failed:", e?.message);
      }
    }

    // 3. Create new user
    if (!clerkUserId) {
      if (!appleEmail) {
        return NextResponse.json(
          { error: "Apple did not return your email address. Please sign in with email/password instead, or go to iPhone Settings → Apple ID → Password & Security → Apps Using Apple ID, remove this app, then try again." },
          { status: 400 }
        );
      }
      try {
        const newUser = await client.users.createUser({
          externalId: appleUserId,
          emailAddress: [appleEmail],
          firstName: givenName,
          lastName: familyName,
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
        });
        console.log("Created user:", newUser.id);
        clerkUserId = newUser.id;
      } catch (e: any) {
        console.error("createUser failed:", JSON.stringify(e?.errors || e?.message));
        throw e;
      }
    }

    // 4. Create sign-in token
    try {
      const signInToken = await client.signInTokens.createSignInToken({
        userId: clerkUserId,
        expiresInSeconds: 300,
      });
      console.log("Sign-in token created");
      return NextResponse.json({ ticket: signInToken.token });
    } catch (e: any) {
      console.error("createSignInToken failed:", JSON.stringify(e?.errors || e?.message));
      throw e;
    }
  } catch (err: any) {
    const detail = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Authentication failed";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
