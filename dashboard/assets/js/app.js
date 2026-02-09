import { loadCSV, toNumber, safeMean, safeStdDev, formatNumber } from "./csv.js";
import { lineChart, barChart, histogramChart, buildHistogram } from "./charts.js";

const paths = {
  monthly: "./data/monthly_summary.csv",
  movingAvg: "./data/moving_avg.csv",
  returns: "./data/daily_returns.csv",
};

let chartAvgCloseYear, chartVolumeYear, chartCloseSma, chartReturnsHist;

const $ = (id) => document.getElementById(id);
const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

function sortByYearAsc(rows) {
  return [...rows].sort((a, b) => (toNumber(a.year) ?? 0) - (toNumber(b.year) ?? 0));
}

function sortByDateAsc(rows, key) {
  return [...rows].sort((a, b) => new Date(a[key]) - new Date(b[key]));
}

function takeLast(rows, n) {
  if (n === "all") return rows;
  const k = Number(n);
  if (!Number.isFinite(k) || k <= 0) return rows;
  return rows.slice(Math.max(0, rows.length - k));
}

// Find a usable column key from candidates
function pickKey(row, candidates) {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const c of candidates) {
    if (keys.includes(c)) return c;
  }
  return null;
}

async function init() {
  const [monthlyRowsRaw, movingRowsRaw, returnRowsRaw] = await Promise.all([
    loadCSV(paths.monthly),
    loadCSV(paths.movingAvg),
    loadCSV(paths.returns),
  ]);

  // Detect column names safely
  const m0 = monthlyRowsRaw[0];
  const mv0 = movingRowsRaw[0];
  const r0 = returnRowsRaw[0];

  const monthlyYearKey = pickKey(m0, ["year"]);
  const monthlyAvgCloseKey = pickKey(m0, ["avg_close", "average_close", "avgclose"]);
  const monthlyVolumeKey = pickKey(m0, ["total_volume", "volume_total", "sum_volume"]);

  const movingDateKey = pickKey(mv0, ["trade_date", "date"]);
  const movingCloseKey = pickKey(mv0, ["close"]);
  const movingSmaKey = pickKey(mv0, ["sma_30", "sma30", "moving_average_30", "ma_30"]);

  const returnsDateKey = pickKey(r0, ["trade_date", "date"]);
  const returnsValueKey = pickKey(r0, ["daily_return", "returns", "return", "daily_returns"]);

  if (!monthlyYearKey || !monthlyAvgCloseKey || !monthlyVolumeKey) {
    throw new Error("monthly_summary.csv headers not detected. Expected year, avg_close, total_volume (or similar).");
  }
  if (!movingDateKey || !movingCloseKey || !movingSmaKey) {
    throw new Error("moving_avg.csv headers not detected. Expected trade_date, close, sma_30 (or similar).");
  }
  if (!returnsDateKey || !returnsValueKey) {
    throw new Error("daily_returns.csv headers not detected. Expected trade_date + daily_return (or similar).");
  }

  // ---- Monthly charts
  const monthlyRows = sortByYearAsc(monthlyRowsRaw);

  const years = monthlyRows.map(r => String(r[monthlyYearKey]));
  const avgClose = monthlyRows.map(r => toNumber(r[monthlyAvgCloseKey]) ?? 0);
  const totalVolume = monthlyRows.map(r => toNumber(r[monthlyVolumeKey]) ?? 0);

  chartAvgCloseYear?.destroy();
  chartAvgCloseYear = lineChart(
    $("chartAvgCloseYear"),
    years,
    [{ label: "Avg Close", data: avgClose, tension: 0.2 }],
    "Average Close by Year"
  );

  chartVolumeYear?.destroy();
  chartVolumeYear = barChart(
    $("chartVolumeYear"),
    years,
    [{ label: "Total Volume", data: totalVolume }],
    "Total Volume by Year"
  );

  // ---- Close vs SMA chart
  const movingRowsSorted = sortByDateAsc(movingRowsRaw, movingDateKey);

  const rangeSelect = $("rangeSelect");
  const renderCloseSma = (range) => {
    const subset = takeLast(movingRowsSorted, range);
    const labels = subset.map(r => r[movingDateKey]);
    const close = subset.map(r => toNumber(r[movingCloseKey]) ?? 0);
    const sma30 = subset.map(r => toNumber(r[movingSmaKey]) ?? null);

    chartCloseSma?.destroy();
    chartCloseSma = lineChart(
      $("chartCloseSma"),
      labels,
      [
        { label: "Close", data: close, tension: 0.15, pointRadius: 0 },
        { label: "SMA 30", data: sma30, tension: 0.15, pointRadius: 0 },
      ],
      "Close vs 30-Day Moving Average"
    );
  };

  renderCloseSma(rangeSelect?.value ?? "180");
  rangeSelect?.addEventListener("change", (e) => renderCloseSma(e.target.value));

  // ---- Returns histogram
  const returnRowsSorted = sortByDateAsc(returnRowsRaw, returnsDateKey);
  const dailyReturns = returnRowsSorted
    .map(r => toNumber(r[returnsValueKey]))
    .filter(v => Number.isFinite(v));

  const { labels: histLabels, counts } = buildHistogram(dailyReturns, 24);

  chartReturnsHist?.destroy();
  chartReturnsHist = histogramChart(
    $("chartReturnsHist"),
    histLabels,
    counts,
    "Distribution of Daily Returns"
  );

  // ---- Stats panel
  // Use known Athena results you already validated:
  // curated_rows = 6790, rows_2025 = 250
  // But also compute "Latest Date" and returns stats from CSVs.
  setText("statCuratedRows", (6790).toLocaleString());
  setText("statRows2025", (250).toLocaleString());

  const latestDate = movingRowsSorted.length ? movingRowsSorted[movingRowsSorted.length - 1][movingDateKey] : "—";
  setText("statLatestDate", latestDate);

  const avgReturn = safeMean(dailyReturns);
  const vol = safeStdDev(dailyReturns);

  setText("statAvgReturn", avgReturn === null ? "—" : `${formatNumber(avgReturn * 100, { decimals: 3 })}%`);
  setText("statVolatility", vol === null ? "—" : `${formatNumber(vol * 100, { decimals: 3 })}%`);
}

init().catch((err) => {
  console.error(err);
  alert(
    "Dashboard failed to load data.\n\n" +
    "Fix checklist:\n" +
    "1) Ensure CSV files exist in dashboard/data/\n" +
    "2) Ensure you're running via a local server or GitHub Pages (not file://)\n" +
    "3) Open DevTools Console to see the exact error\n\n" +
    "Error: " + err.message
  );
});
