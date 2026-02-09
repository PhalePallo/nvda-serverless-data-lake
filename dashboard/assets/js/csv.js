/**
 * Robust CSV loader + parser:
 * - handles quoted values with commas
 * - trims headers
 * - returns array of objects keyed by header
 */

export async function loadCSV(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load CSV: ${url} (${res.status})`);
  const text = await res.text();
  return parseCSV(text);
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => normalizeKey(h));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }

  return rows;
}

// Split a CSV line respecting quotes
function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' ) {
      // Handle escaped quotes ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);

  return out.map(v => v.trim());
}

export function normalizeKey(s) {
  return String(s)
    .trim()
    .replace(/^"|"$/g, "")   // remove wrapping quotes
    .replace(/\s+/g, "_")    // spaces -> underscores
    .toLowerCase();          // normalize case
}

export function toNumber(v) {
  const n = Number(String(v).replace(/"/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function safeMean(nums) {
  const valid = nums.filter(n => Number.isFinite(n));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function safeStdDev(nums) {
  const valid = nums.filter(n => Number.isFinite(n));
  if (valid.length < 2) return null;
  const mean = safeMean(valid);
  const variance = valid.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (valid.length - 1);
  return Math.sqrt(variance);
}

export function formatNumber(n, { decimals = 2 } = {}) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
