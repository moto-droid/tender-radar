import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readSubscription, writeSubscription } from "./_shared/store.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Netlify.env.get("LINE_CHANNEL_SECRET") || "";
  if (!secret) return Response.json({ ok: false, error: "LINE_CHANNEL_SECRET is not configured" }, { status: 503 });
  const raw = await request.text(), received = request.headers.get("x-line-signature") || "";
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const valid = received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return Response.json({ ok: false, error: "Invalid LINE signature" }, { status: 401 });
  const body = JSON.parse(raw), current = await readSubscription();
  let linked = 0;
  for (const event of body.events || []) {
    const userId = event?.source?.userId;
    if (userId && ["follow", "message", "postback"].includes(event.type)) {
      await writeSubscription({ ...current, lineUserId: userId, lineEnabled: true, lineLinked: true }); linked++;
    }
  }
  return Response.json({ ok: true, linked });
};
export const config: Config = { path: "/api/line/webhook" };

