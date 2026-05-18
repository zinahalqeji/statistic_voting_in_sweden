import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

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

Denna sida analyserar det totala antalet avlagda röster per kommun i riksdagsvalen 2018 och 2022.
Genom att summera alla partiröster per kommun kan vi identifiera:

- kommuner med högst valdeltagande i absoluta tal  
- kommuner där antalet röster ökat mest  
- kommuner där antalet röster minskat mest  
- övergripande nationella förändringar mellan valåren  

Syftet är att ge en tydlig och jämförbar bild av hur väljardeltagandet utvecklats geografiskt.

</div>
  `);

  // DATA AGGREGATION

  const kommunMap = new Map();

  electionResults.forEach(row => {
    const kommun = row.kommun;
    if (!kommunMap.has(kommun)) {
      kommunMap.set(kommun, { votes2018: 0, votes2022: 0 });
    }
    const k = kommunMap.get(kommun);
    k.votes2018 += Number(row.roster2018 || 0);
    k.votes2022 += Number(row.roster2022 || 0);
  });

  const kommunData = Array.from(kommunMap.entries()).map(([kommun, v]) => ({
    kommun,
    votes2018: v.votes2018,
    votes2022: v.votes2022,
    diff: v.votes2022 - v.votes2018,
    diffPct: v.votes2018 > 0
      ? (((v.votes2022 - v.votes2018) / v.votes2018) * 100):0
  }));

  // KPI CALCULATIONS

  const totalVotes2018 = kommunData.reduce((s, k) => s + k.votes2018, 0);
  const totalVotes2022 = kommunData.reduce((s, k) => s + k.votes2022, 0);
  const totalDiff = totalVotes2022 - totalVotes2018;

  const biggestGrowth = [...kommunData].sort((a, b) => b.diff - a.diff)[0];
  const biggestDecline = [...kommunData].sort((a, b) => a.diff - b.diff)[0];
  const mostVotes2022 = [...kommunData].sort((a, b) => b.votes2022 - a.votes2022)[0];

  // KPI CARDS

  addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">TOTALA RÖSTER 2018</div>
  <div style="font-size:28px;font-weight:bold;">${totalVotes2018.toLocaleString("sv-SE")}</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">TOTALA RÖSTER 2022</div>
  <div style="font-size:28px;font-weight:bold;">${totalVotes2022.toLocaleString("sv-SE")}</div>
</div>

<div style="background:${totalDiff >= 0 ? '#F1F5F9' : '#DC2626'};color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">FÖRÄNDRING I RÖSTER</div>
  <div style="font-size:28px;font-weight:bold;">${totalDiff >= 0 ? '+' : ''}${totalDiff.toLocaleString("sv-SE")}</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST KOMMUN 2022</div>
  <div style="font-size:22px;font-weight:bold;">${mostVotes2022.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${mostVotes2022.votes2022.toLocaleString("sv-SE")} röster</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST ÖKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestGrowth.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">+${biggestGrowth.diff.toLocaleString("sv-SE")} röster</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST MINSKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestDecline.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${biggestDecline.diff.toLocaleString("sv-SE")} röster</div>
</div>

</div>
  `);

  // CHART 1 — TOP 20 COMMUNES BY TOTAL VOTES

  addMdToPage(`## Top 20 kommuner – flest röster 2022`);

  const top20 = [...kommunData]
    .sort((a, b) => b.votes2022 - a.votes2022)
    .slice(0, 20);

  const top20ChartData = [["Kommun", "2018", "2022"]];
  top20.forEach(k => top20ChartData.push([k.kommun, k.votes2018, k.votes2022]));

  drawGoogleChart({
    type: "ColumnChart",
    data: top20ChartData,
    options: {
      title: "Top 20 kommuner efter totalt antal röster (2022)",
      height: 500,
      chartArea: { left: 80, right: 40, top: 60, bottom: 120 },
      colors: ["#93C5FD", "#1e3a5f"],
      hAxis: {
        title: "Kommun",
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        title: "Antal röster",
        format: "#,###"
      },
      legend: { position: "top" }
    }
  });

  // CHART 2 — TOP 15 GROWTH

  addMdToPage(`## Top 15 kommuner – störst ökning i röster (2018 → 2022)`);

  const top15growth = [...kommunData]
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 15);

  const growthChartData = [["Kommun", "Förändring", { role: "style" }]];
  top15growth.forEach(k => growthChartData.push([
    k.kommun,
    k.diff,
    k.diff >= 0 ? "#059669" : "#DC2626"
  ]));

  drawGoogleChart({
    type: "BarChart",
    data: growthChartData,
    options: {
      title: "Kommuner med störst ökning i antal röster",
      height: 500,
      chartArea: { left: 140, right: 60, top: 60, bottom: 60 },
      hAxis: {
        title: "Förändring i antal röster",
        format: "#,###"
      },
      vAxis: { title: "Kommun" },
      legend: { position: "none" }
    }
  });

  // CHART 3 — TOP 15 DECLINE

  addMdToPage(`## Top 15 kommuner – störst minskning i röster (2018 → 2022)`);

  const top15decline = [...kommunData]
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 15);

  const declineChartData = [["Kommun", "Förändring", { role: "style" }]];
  top15decline.forEach(k => declineChartData.push([
    k.kommun,
    k.diff,
    "#DC2626"
  ]));

  drawGoogleChart({
    type: "BarChart",
    data: declineChartData,
    options: {
      title: "Kommuner med störst minskning i antal röster",
      height: 500,
      chartArea: { left: 140, right: 60, top: 60, bottom: 60 },
      hAxis: {
        title: "Förändring i antal röster",
        format: "#,###"
      },
      vAxis: { title: "Kommun" },
      legend: { position: "none" }
    }
  });

  // FULL TABLE

  addMdToPage(`## Alla kommuner – fullständig tabell`);

  const sortedByDiff = [...kommunData].sort((a, b) => b.diff - a.diff);

tableFromData({
  data: sortedByDiff.map(k => ({
    "Kommun": k.kommun,
    "Röster 2018": k.votes2018.toLocaleString("sv-SE"),
    "Röster 2022": k.votes2022.toLocaleString("sv-SE"),
    "Förändring": (k.diff >= 0 ? "+" : "-") + Math.abs(k.diff),
    "Förändring (%)": (k.diffPct >= 0 ? "+" : "-") + Math.abs(k.diffPct).toFixed(1) + "%"
  })),
  columnNames: ["Kommun", "Röster 2018", "Röster 2022", "Förändring", "Förändring (%)"],
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

Analysen visar tydliga geografiska skillnader i antalet avlagda röster.
Storstadskommuner dominerar i absoluta tal, vilket främst speglar befolkningsstorlek.
Mer analytiskt intressant är förändringen mellan valåren:

- kommuner med befolkningstillväxt uppvisar ökade rösttal  
- kommuner med befolkningsminskning tenderar att tappa röster  
- flera landsbygdskommuner i norra Sverige visar tydliga nedgångar  

Dessa mönster kopplar direkt till projektets övriga analyser av demografi,
urbanitet och socioekonomiska faktorer.

</div>
  `);

}
