function baseOptions({ title } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { boxWidth: 12 } },
      title: title ? { display: true, text: title } : { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0 }
      },
      y: {
        grid: { color: "rgba(2,6,23,0.08)" },
        ticks: { callback: (v) => v }
      },
    },
  };
}

export function lineChart(ctx, labels, datasets, title) {
  return new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: baseOptions({ title }),
  });
}

export function barChart(ctx, labels, datasets, title) {
  return new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: baseOptions({ title }),
  });
}

export function histogramChart(ctx, binsLabels, counts, title) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: binsLabels,
      datasets: [{ label: "Count", data: counts }],
    },
    options: baseOptions({ title }),
  });
}

export function buildHistogram(values, binCount = 30) {
  const valid = values.filter(v => Number.isFinite(v));
  if (valid.length === 0) return { labels: [], counts: [] };

  const min = Math.min(...valid);
  const max = Math.max(...valid);

  const span = max - min || 1e-9;
  const binSize = span / binCount;

  const counts = new Array(binCount).fill(0);

  for (const v of valid) {
    let idx = Math.floor((v - min) / binSize);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx]++;
  }

  const labels = [];
  for (let i = 0; i < binCount; i++) {
    const a = min + i * binSize;
    const b = a + binSize;
    labels.push(`${(a * 100).toFixed(1)}%–${(b * 100).toFixed(1)}%`);
  }

  return { labels, counts };
}
