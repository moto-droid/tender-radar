import * as cheerio from "cheerio";

export const CAG_URL = "https://sesami.online/cag/businessOpportunities.jsp";

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return "";
  const months: Record<string, string> = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
  return `${match[3]}-${months[match[2]] || "01"}-${match[1]}`;
}

export async function fetchCag() {
  const response = await fetch(CAG_URL, { headers: { "user-agent": "TenderRadar/1.0" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`CAG returned ${response.status}`);
  const $ = cheerio.load(await response.text());
  const items: any[] = [];
  $("tr").each((_, row) => {
    const cells = $(row).find("td").map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
    if (cells.length < 7 || !/^\d{4}\/\d+$/.test(cells[1] || "")) return;
    items.push({
      id: `CAG-${cells[1].split("/").pop()}`, source: "cag", currency: "SGD", region: "Singapore",
      agency: "Changi Airport Group", code: cells[1], docType: cells[2], category: cells[3], title: cells[4],
      date: parseDate(cells[5]), deadline: parseDate(cells[6]), budget: null, match: 75, status: "open", sourceUrl: CAG_URL
    });
  });
  return items;
}

