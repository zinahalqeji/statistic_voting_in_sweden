import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {
 const pctText = (value) =>
  `${(value * 100).toFixed(2).replace(".", ",")}%`;

const signedPctText = (value) =>
  `${value >= 0 ? "+" : ""}${(value * 100)
    .toFixed(2)
    .replace(".", ",")}%`;

const pctCell = (value) => ({
  v: value,
  f: `${(value * 100).toFixed(2).replace(".", ",")}%`
});

  const getNumber = (row, keys) => {
    for (const key of keys) {
      const value = Number(row[key]);
      if (
        !Number.isNaN(value) &&
        row[key] !== undefined &&
        row[key] !== null &&
        row[key] !== ""
      ) {
        return value;
      }
    }
    return 0;
  };

  const buildTicks = (minValue, maxValue, step) => {
    const ticks = [];
    const start = Math.floor(minValue / step) * step;
    const end = Math.ceil(maxValue / step) * step;

    for (let t = start; t <= end + 0.0000001; t += step) {
      ticks.push(Number(t.toFixed(4)));
    }

    return ticks;
  };

  const getMaxAbsValue = (data) => {
    let max = 0;
    for (const row of data.slice(1)) {
      for (let i = 1; i < row.length; i++) {
        const cell = row[i];
        const value =
          cell && typeof cell === "object" && "v" in cell
            ? Number(cell.v) || 0
            : Number(cell) || 0;
        max = Math.max(max, Math.abs(value));
      }
    }
    return max;
  };

  // INTRO

  addMdToPage(`
# Totala röster per kommun (2018–2022)

<div style="
  background:#F1F5F9;
  padding:30px;
  border-radius:16px;
  margin-top:20px;
  border-left:8px solid #192c4e;
">

## Översikt

Denna sida analyserar kommunernas andel av alla röster i riksdagsvalen 2018 och 2022.
Alla diagram visas i procent (%), och förändringen visas som vanlig procentuell förändring.

</div>
  `);

  // DATA AGGREGATION

  const kommunMap = new Map();

  electionResults.forEach((row) => {
    const kommun = row.kommun;

    if (!kommunMap.has(kommun)) {
      kommunMap.set(kommun, { votes2018: 0, votes2022: 0 });
    }

    const k = kommunMap.get(kommun);
    k.votes2018 += getNumber(row, ["roster2018"]);
    k.votes2022 += getNumber(row, ["roster2022"]);
  });

  const kommunDataRaw = Array.from(kommunMap.entries()).map(([kommun, v]) => ({
    kommun,
    votes2018: v.votes2018,
    votes2022: v.votes2022
  }));

  const totalVotes2018 = kommunDataRaw.reduce((s, k) => s + k.votes2018, 0);
  const totalVotes2022 = kommunDataRaw.reduce((s, k) => s + k.votes2022, 0);

  const kommunData = kommunDataRaw.map((k) => ({
    kommun: k.kommun,
    votes2018: k.votes2018,
    votes2022: k.votes2022,
    share2018: totalVotes2018 > 0 ? k.votes2018 / totalVotes2018 : 0,
    share2022: totalVotes2022 > 0 ? k.votes2022 / totalVotes2022 : 0
  }));


   kommunData.forEach((k) => {
  k.changePct = k.share2018 > 0 ? (k.share2022 - k.share2018) / k.share2022 : 0; 
  k.changeShare = k.share2022 - k.share2018; 
});
  

  // KPI CALCULATIONS

  const biggestGrowth = [...kommunData].sort((a, b) => b.changePct - a.changePct)[0];
  const biggestDecline = [...kommunData].sort((a, b) => a.changePct - b.changePct)[0];
  const biggest2022 = [...kommunData].sort((a, b) => b.share2022 - a.share2022)[0];

  // KPI CARDS

  addMdToPage(`
<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:20px;
margin:30px 0;
">

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST ÖKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestGrowth.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${signedPctText(biggestGrowth.changePct)}</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST MINSKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestDecline.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${signedPctText(biggestDecline.changePct)}</div>
</div>

</div>
  `);

  // CHART 1 — TOP 20 COMMUNES BY SHARE

  addMdToPage(`## Top 20 kommuner – störst röstandel 2022`);

  const top20 = [...kommunData]
    .sort((a, b) => b.share2022 - a.share2022)
    .slice(0, 20);

  const top20ChartData = [["Kommun", "2018", "2022"]];
  top20.forEach((k) => {
    top20ChartData.push([
      k.kommun,
      pctCell(k.share2018),
      pctCell(k.share2022)
    ]);
  });

  drawGoogleChart({
    type: "ColumnChart",
    data: top20ChartData,
    options: {
      title: "Top 20 kommuner efter röstandel av alla röster (2022)",
      height: 500,
      chartArea: { left: 80, right: 40, top: 60, bottom: 120 },
      colors: ["#93C5FD", "#1e3a5f"],
      hAxis: {
        title: "Kommun",
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        title: "Röstandel (%)",
        format: "0.0%",
        viewWindow: { min: 0, max: Math.max(0.10, getMaxAbsValue(top20ChartData)) },
        ticks: buildTicks(0, Math.max(0.10, getMaxAbsValue(top20ChartData)), 0.005)
      },
      legend: { position: "top" }
    }
  });

  // CHART 2 — TOP 15 GROWTH (relative change)

  addMdToPage(`## Top 15 kommuner – störst ökning i röstandel (2018 → 2022)`);

  const top15growth = [...kommunData]
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 15);

  const growthChartData = [["Kommun", "Förändring", { role: "style" }]];
  top15growth.forEach((k) => {
    growthChartData.push([
      k.kommun,
      pctCell(k.changePct),
      "#059669"
    ]);
  });

  const growthMax = getMaxAbsValue(growthChartData);

  drawGoogleChart({
    type: "BarChart",
    data: growthChartData,
    options: {
      title: "Kommuner med störst ökning i röstandel",
      height: 500,
      chartArea: { left: 140, right: 60, top: 60, bottom: 60 },
      hAxis: {
        title: "Förändring (%)",
        format: "0.0%",
        viewWindow: { min: 0, max: Math.max(0.10, growthMax) },
        ticks: buildTicks(0, Math.max(0.10, growthMax), 0.01)
      },
      vAxis: { title: "Kommun" },
      legend: { position: "none" }
    }
  });

  // CHART 3 — TOP 15 DECLINE (relative change)

  addMdToPage(`## Top 15 kommuner – störst minskning i röstandel (2018 → 2022)`);

  const top15decline = [...kommunData]
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 15);

  const declineChartData = [["Kommun", "Förändring", { role: "style" }]];
  top15decline.forEach((k) => {
    declineChartData.push([
      k.kommun,
      pctCell(k.changePct),
      "#DC2626"
    ]);
  });

  const declineMax = getMaxAbsValue(declineChartData);

  drawGoogleChart({
    type: "BarChart",
    data: declineChartData,
    options: {
      title: "Kommuner med störst minskning i röstandel",
      height: 500,
      chartArea: { left: 140, right: 60, top: 60, bottom: 60 },
      hAxis: {
        title: "Förändring (%)",
        format: "0.0%",
        viewWindow: { min: -0.15, max: 0 },
        ticks: buildTicks(-0.15, 0, 0.01)
      },
      vAxis: { title: "Kommun" },
      legend: { position: "none" }
    }
  });

  // FULL TABLE

   addMdToPage(`## Alla kommuner – fullständig tabell`);

  const sortedByDiff = [...kommunData].sort((a, b) => b.changePct - a.changePct);

  tableFromData({
    data: sortedByDiff.map((k) => ({
      Kommun: k.kommun,
      "Röstandel 2018": pctText(k.share2018),
      "Röstandel 2022": pctText(k.share2022),
      "Förändring": signedPctText(k.changePct)
    })),
    columnNames: ["Kommun", "Röstandel 2018", "Röstandel 2022", "Förändring"],
    fixedHeader: true
  });

  // INTERPRETATION

  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Tolkning

Analysen visar tydliga geografiska skillnader i kommunernas röstandelar.
Storstadskommuner dominerar eftersom de står för en stor del av alla röster.

- kommuner med befolkningstillväxt uppvisar ofta ökade röstandelar
- kommuner med befolkningsminskning tenderar att tappa röstandelar
- flera landsbygdskommuner i norra Sverige visar tydliga nedgångar

</div>
  `);
}