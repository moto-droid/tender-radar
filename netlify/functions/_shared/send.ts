import nodemailer from "nodemailer";
import type { Subscription } from "./store.ts";

export async function dispatch(config: Subscription, message: string) {
  const sent: string[] = [];
  if (config.emailEnabled && config.email && Netlify.env.get("SMTP_HOST")) {
    const transporter = nodemailer.createTransport({
      host: Netlify.env.get("SMTP_HOST"), port: Number(Netlify.env.get("SMTP_PORT") || 587),
      secure: Netlify.env.get("SMTP_SECURE") === "1",
      auth: Netlify.env.get("SMTP_USER") ? { user: Netlify.env.get("SMTP_USER"), pass: Netlify.env.get("SMTP_PASSWORD") } : undefined
    });
    await transporter.sendMail({ from: Netlify.env.get("SMTP_FROM") || Netlify.env.get("SMTP_USER"), to: config.email, subject: "標案雷達｜每日建議標案", text: message });
    sent.push("電子信箱");
  }
  const lineToken = Netlify.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (config.lineEnabled && config.lineUserId && lineToken) {
    const response = await fetch("https://api.line.me/v2/bot/message/push", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${lineToken}` }, body: JSON.stringify({ to: config.lineUserId, messages: [{ type: "text", text: message.slice(0, 5000) }] }) });
    if (!response.ok) throw new Error(`LINE push failed: ${response.status}`);
    sent.push("LINE");
  }
  return sent;
}

