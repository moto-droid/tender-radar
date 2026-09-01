import type { Config } from "@netlify/functions";
import { readSubscription, writeSubscription } from "./_shared/store.ts";

export default async (request: Request) => {
  if (request.method === "GET") {
    const current = await readSubscription();
    const id = String(current.lineUserId || "");
    return Response.json({ ok: true, lineLinked: Boolean(id), maskedLineUserId: id.length > 10 ? `${id.slice(0,4)}…${id.slice(-4)}` : "", enabled: Boolean(current.enabled) });
  }
  if (request.method === "POST") return Response.json({ ok: true, saved: true, subscription: await writeSubscription(await request.json()) });
  return new Response("Method not allowed", { status: 405 });
};
export const config: Config = { path: ["/api/subscriptions", "/api/subscriptions/status"] };

