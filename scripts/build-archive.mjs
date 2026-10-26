import fs from "node:fs";
import path from "node:path";

const sourceRoot = "/Users/chriscody/Documents/c2Pix/Invoices/THE BAYTOWN SUN";
const outputRoot = "/Users/chriscody/Documents/Codex/2026-10-26/i/work/c2pix-baytown-sun-archive/dist";
const assetRoot = path.join(outputRoot, "assets");
const years = ["2024", "2025", "2026"];
const imagePattern = /\.(png|jpe?g)$/i;
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthAliases = [
  ["January", "JAN"], ["February", "FEB"], ["March", "MAR"], ["April", "APR"],
  ["May", "MAY"], ["June", "JUN"], ["July", "JUL"], ["August", "AUG"],
  ["September", "SEP"], ["October", "OCT"], ["November", "NOV"], ["December", "DEC"]
];

function walk(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(full) : imagePattern.test(entry.name) ? [full] : [];
  });
}

function cleanName(value) {
  return value.replace(/\.[^.]+$/, "").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function monthFrom(value) {
  const upper = value.toUpperCase();
  const patterns = [
    ["January", /\bJAN(?:UARY)?\b/], ["February", /\bFEB(?:RUARY)?\b/],
    ["March", /\bMAR(?:CH)?\b/], ["April", /\bAPR(?:IL)?\b/],
    ["May", /\bMAY\b/], ["June", /\bJUN(?:E)?\b/], ["July", /\bJUL(?:Y)?\b/],
    ["August", /\bAUG(?:UST)?\b/], ["September", /\bSEP(?:T(?:EMBER)?)?\b/],
    ["October", /\bOCT(?:OBER)?\b/], ["November", /\bNOV(?:EMBER)?\b/],
    ["December", /\bDEC(?:EMBER)?\b/]
  ];
  for (const [month, pattern] of patterns) if (pattern.test(upper)) return month;
  return null;
}

function monthFromFolder(relative) {
  for (const part of relative.split(path.sep).reverse()) {
    const found = monthFrom(part);
    if (found) return found;
  }
  return null;
}

function monthNumber(month) { return months.indexOf(month) + 1; }

function printDate(month, day, year) {
  return day ? `${month} ${day}, ${year}` : `${month} ${year}`;
}

function placementFor(name) {
  const upper = name.toUpperCase();
  if (/SCREENSHOT|ONLINE/.test(upper)) return "Online coverage";
  if (/FRONT/.test(upper)) return "Front Page";
  const page = upper.match(/PAGE\s*(\d+[A-Z]?)/);
  if (page) return `Page ${page[1]}`;
  if (/SPORT/.test(upper)) return "Sports";
  if (/CHAMBERS/.test(upper)) return "Chambers County Weekly";
  if (/DAILY NEWS/.test(upper)) return "Daily News";
  return "Print feature";
}

function infoFor(file) {
  const relative = path.relative(sourceRoot, file);
  const [year] = relative.split(path.sep);
  const base = path.basename(file);
  const stem = cleanName(base);
  const folderMonth = monthFromFolder(path.dirname(relative));
  const namedMonth = monthFrom(stem);
  const month = namedMonth || folderMonth || "Unfiled";
  const numericMonth = monthNumber(month);
  let day = null;
  const nameDay = stem.match(/(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*(\d{1,2})/i);
  const compactDay = stem.match(/^(\d{1,2})\s*[- ]\s*(\d{1,2})\b/);
  if (nameDay) day = Number(nameDay[1]);
  else if (compactDay && Number(compactDay[1]) === numericMonth) day = Number(compactDay[2]);
  const placement = placementFor(stem);
  const type = placement === "Online coverage" ? "online" : "print";
  const relativeSlug = relative.replace(/[\\/]/g, "--").replace(/[^a-zA-Z0-9._-]/g, "-");
  const asset = path.posix.join("assets", year, relativeSlug);
  const feature = placement === "Front Page";
  const isSummerCollection = year === "2024" && relative.includes("JUNE 2024") && !namedMonth && /SCREENSHOT/i.test(base);
  return {
    id: `${year}-${relativeSlug}`,
    year,
    month: isSummerCollection ? "June–August" : month,
    monthOrder: isSummerCollection ? 6 : (numericMonth || 99),
    date: isSummerCollection ? "Summer 2024" : printDate(month, day, year),
    placement,
    type,
    featured: feature,
    file: asset,
    filename: base,
    title: feature ? "Front Page" : placement
  };
}

fs.rmSync(assetRoot, { recursive: true, force: true });
fs.mkdirSync(assetRoot, { recursive: true });
const records = years.flatMap(year => walk(path.join(sourceRoot, year)).map(file => ({ file, record: infoFor(file) })));
for (const { file, record } of records) {
  const target = path.join(outputRoot, record.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
}
const data = records.map(({ record }) => record).sort((a, b) => Number(b.year) - Number(a.year) || b.monthOrder - a.monthOrder || a.filename.localeCompare(b.filename));
fs.writeFileSync(path.join(outputRoot, "records.json"), JSON.stringify(data, null, 2));
console.log(`Built ${data.length} archive records across ${new Set(data.map(record => record.year)).size} years.`);
