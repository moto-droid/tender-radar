import { fetchCag } from "./cag.ts";

function prep(item: any) {
  const text = `${item.title} ${item.category} ${item.agency}`.toLowerCase();
  const work = ["確認投標資格、採購方式與應備證明", "下載完整標書並建立疑義與送件時程"];
  if (/airport|airfield|terminal|changi/.test(text)) work.push("確認機場通行證、保安規範、禁區作業與保險要求");
  if (/cleaning|housekeeping|waste|清潔/.test(text)) work.push("盤點清潔頻率、人力班表、機具耗材及廢棄物處理");
  if (/system|cloud|software|系統/.test(text)) work.push("準備技術架構、資安、SLA、導入與維運計畫");
  return work.slice(0, 3);
}

export async function buildDigest(limit = 5) {
  const items = (await fetchCag()).slice(0, Math.max(1, Math.min(limit, 10)));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const lines = [`標案雷達每日精選｜${date}`, ""];
  for (const [index, item] of items.entries()) lines.push(`${index + 1}. ${item.title}`, `${item.agency}｜截止 ${item.deadline}`, `建議準備：${prep(item).join("；")}`, "");
  lines.push("辨識結果僅供快速閱讀，投標內容請以原始招標文件為準。");
  return lines.join("\n");
}

