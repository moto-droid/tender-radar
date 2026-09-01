import { getStore } from "@netlify/blobs";

export type Subscription = {
  enabled?: boolean;
  emailEnabled?: boolean;
  lineEnabled?: boolean;
  email?: string;
  lineUserId?: string;
  lineLinked?: boolean;
  time?: string;
  timezone?: string;
  limit?: number;
  includePrep?: boolean;
  includeOutline?: boolean;
  includeDeadlines?: boolean;
  onlyHighMatch?: boolean;
  lastSentDate?: string;
};

const store = () => getStore({ name: "tender-radar", consistency: "strong" });

export async function readSubscription(): Promise<Subscription> {
  return (await store().get("subscription", { type: "json" }) as Subscription | null) ?? {};
}

export async function writeSubscription(input: Subscription): Promise<Subscription> {
  const current = await readSubscription();
  const clean: Subscription = {
    enabled: Boolean(input.enabled),
    emailEnabled: Boolean(input.emailEnabled),
    lineEnabled: Boolean(input.lineEnabled),
    email: String(input.email ?? "").slice(0, 320),
    lineUserId: String(input.lineUserId || current.lineUserId || "").slice(0, 128),
    lineLinked: Boolean(input.lineLinked || current.lineUserId),
    time: /^\d{2}:\d{2}$/.test(String(input.time)) ? String(input.time) : "08:30",
    timezone: ["Asia/Taipei", "Asia/Singapore"].includes(String(input.timezone)) ? String(input.timezone) : "Asia/Taipei",
    limit: Math.max(1, Math.min(10, Number(input.limit) || 5)),
    includePrep: input.includePrep !== false,
    includeOutline: input.includeOutline !== false,
    includeDeadlines: input.includeDeadlines !== false,
    onlyHighMatch: Boolean(input.onlyHighMatch),
    lastSentDate: String(input.lastSentDate || current.lastSentDate || "")
  };
  await store().setJSON("subscription", clean);
  return clean;
}

