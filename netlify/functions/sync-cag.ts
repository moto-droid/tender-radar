import type { Config } from "@netlify/functions";
import { fetchCag } from "./_shared/cag.ts";

export default async () => {
  try {
    const items = await fetchCag();
    return Response.json({ ok: true, source: "cag", count: items.length, items }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Sync failed" }, { status: 502 });
  }
};
export const config: Config = { path: "/api/sync/cag" };

