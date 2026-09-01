import type { Config } from "@netlify/functions";
import { buildDigest } from "./_shared/digest.ts";
import { dispatch } from "./_shared/send.ts";

export default async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const body = await request.json();
    const config = body.subscription || {};
    const message = String(body.message || await buildDigest(Number(config.limit) || 5));
    const channels = await dispatch(config, message);
    return Response.json({ ok: true, sent: channels.length > 0, channels, previewOnly: channels.length === 0 });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Send failed" }, { status: 500 });
  }
};
export const config: Config = { path: "/api/subscriptions/test" };

