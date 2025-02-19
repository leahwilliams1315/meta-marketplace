import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";
import slugify from "slugify";

export async function POST(req: Request) {
  console.log("Received webhook request");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env"
    );
  }

  // Get the headers asynchronously
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log("Missing svix headers");
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  let evt: WebhookEvent;

  try {
    const rawBody = await req.text();

    if (!rawBody) {
      console.log("Empty request body");
      return new Response("Empty request body", { status: 400 });
    }

    // Create a new Webhook instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    // Verify the webhook and get the event data
    evt = wh.verify(rawBody, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;

    // Get the ID and event type from the verified event
    const { id } = evt.data as { id: string };
    const eventType = evt.type;

    console.log(`Processing ${eventType} event for user ${id}`);

    // Handle the webhook
    if (eventType === "user.created") {
      const base = "user";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const generatedSlug = slugify(base, { lower: true }) + "-" + randomSuffix;

      await prisma.user.create({
        data: {
          id,
          slug: generatedSlug,
        },
      });
      console.log(`Created user ${id} with slug ${generatedSlug}`);
    }

    if (eventType === "user.deleted") {
      await prisma.user.delete({
        where: { id },
      });
      console.log(`Deleted user ${id}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (err) {
    // Safe error logging that won't cause console.error to throw
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.log("Webhook error:", errorMessage);

    return new Response(`Webhook error: ${errorMessage}`, { status: 500 });
  }
}
