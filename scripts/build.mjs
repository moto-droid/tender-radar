import { cp, mkdir, rm } from "node:fs/promises";

const files = [
  "index.html", "styles.css", "enhancements.css", "apple-theme.css",
  "intelligence.css", "subscription.css", "app.js", "enhancements.js",
  "intelligence.js", "subscription.js"
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of files) await cp(file, `dist/${file}`);

