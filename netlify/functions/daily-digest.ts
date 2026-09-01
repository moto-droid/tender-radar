import type { Config } from "@netlify/functions";
import { buildDigest } from "./_shared/digest.ts";
import { dispatch } from "./_shared/send.ts";
import { readSubscription, writeSubscription } from "./_shared/store.ts";

export default async () => {
  const config = await readSubscription();
  if (!config.enabled) return;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone || "Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date());
  const part = (type: string) => parts.find(x => x.type === type)?.value || "";
  const today = `${part("year")}-${part("month")}-${part("day")}`, now = `${part("hour")}:${part("minute")}`;
  if (now !== config.time || config.lastSentDate === today) return;
  const channels = await dispatch(config, await buildDigest(config.limit || 5));
  if (channels.length) await writeSubscription({ ...config, lastSentDate: today });
};
export const config: Config = { schedule: "*/15 * * * *" };
