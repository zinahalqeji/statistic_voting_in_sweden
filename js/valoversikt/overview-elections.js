import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // Into

  addMdToPage(`
# Nationella valresultat (2018 och 2022)

<div style="
  background:#F1F5F9;
  padding:30px;
  border-radius:16px;
  margin-top:20px;
  border-left:8px solid #192c4e;
">

## Översikt av Sveriges riksdagsval

Denna sida presenterar en nationell översikt av riksdagsvalen 2018 och 2022.
Fokus ligger på hur det totala väljarstödet fördelades mellan partierna på nationell nivå.

Analysen visar:

- partiernas röstandelar (%) för båda valen
- jämförelse av röstandelar mellan valåren
- blockens storlek i procent
- övergripande förändringar i det politiska landskapet

> **Metodnotering:** Blockindelningen är **år-specifik** — Centerpartiet
> räknas till vänsterblocket 2018 (Januariavtalet) men till högerblocket 2022 (Tidöavtalet).
> Se metodnotering längst ner.

</div>
  `);

  // Aggregate votes per party and calculate percentages and changes

  const partyMap = new Map();

  electionResults.forEach(row => {
    const parti = row.parti;
    if (!partyMap.has(parti)) partyMap.set(parti, { votes2018: 0, votes2022: 0 });
    const stats = partyMap.get(parti);
    stats.votes2018 += Number(row.roster2018 || 0);
    stats.votes2022 += Number(row.roster2022 || 0);
  });

  const total2018 = Array.from(partyMap.values()).reduce((sum, p) => sum + p.votes2018, 0);
  const total2022 = Array.from(partyMap.values()).reduce((sum, p) => sum + p.votes2022, 0);
  const totalDiff = total2022 - total2018;

  const results = Array.from(partyMap.entries()).map(([parti, stats]) => ({
    parti,
    votes2018:   stats.votes2018,
    votes2022:   stats.votes2022,
    percent2018: (stats.votes2018 / total2018) * 100,
    percent2022: (stats.votes2022 / total2022) * 100,
    change:      ((stats.votes2022 / total2022) - (stats.votes2018 / total2018)) * 100
  })).sort((a, b) => b.percent2022 - a.percent2022);

  // Year-specific block definitions based on political alliances in each election

  const hogerBlock2018 = [
    "Moderaterna", "Kristdemokraterna", "Liberalerna", "Sverigedemokraterna"
  ];
  const vansterBlock2018 = [
    "Socialdemokraterna", "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet", "Miljöpartiet", "Centerpartiet"
  ];
  const hogerBlock2022 = [
    "Moderaterna", "Kristdemokraterna", "Liberalerna",
    "Sverigedemokraterna", "Centerpartiet"
  ];
  const vansterBlock2022 = [
    "Socialdemokraterna", "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet", "Miljöpartiet"
  ];

  let hoger2018 = 0, hoger2022 = 0, vanster2018 = 0, vanster2022 = 0;

  results.forEach(row => {
    if (hogerBlock2018.includes(row.parti))   hoger2018   += row.percent2018;
    if (vansterBlock2018.includes(row.parti)) vanster2018 += row.percent2018;
    if (hogerBlock2022.includes(row.parti))   hoger2022   += row.percent2022;
    if (vansterBlock2022.includes(row.parti)) vanster2022 += row.percent2022;
  });

  // Find biggest winner and loser
  const biggestWinner = [...results].sort((a, b) => b.change - a.change)[0];
  const biggestLoser  = [...results].sort((a, b) => a.change - b.change)[0];

  // KPI cards for block percentages and biggest changes

  addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">HÖGERBLOCKET 2018</div>
  <div style="font-size:28px;font-weight:bold;">${hoger2018.toFixed(1)}%</div>
  <div style="font-size:13px;opacity:0.85;">Utan Centerpartiet</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">HÖGERBLOCKET 2022</div>
  <div style="font-size:28px;font-weight:bold;">${hoger2022.toFixed(1)}%</div>
  <div style="font-size:13px;opacity:0.85;">Med Centerpartiet (Tidöavtalet)</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">VÄNSTERBLOCKET 2018</div>
  <div style="font-size:28px;font-weight:bold;">${vanster2018.toFixed(1)}%</div>
  <div style="font-size:13px;opacity:0.85;">Med Centerpartiet (Januariavtalet)</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">VÄNSTERBLOCKET 2022</div>
  <div style="font-size:28px;font-weight:bold;">${vanster2022.toFixed(1)}%</div>
  <div style="font-size:13px;opacity:0.85;">Utan Centerpartiet</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST ÖKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestWinner.parti}</div>
  <div style="font-size:16px;">+${biggestWinner.change.toFixed(2)}%</div>
</div>

<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">STÖRST MINSKNING</div>
  <div style="font-size:22px;font-weight:bold;">${biggestLoser.parti}</div>
  <div style="font-size:16px;">${biggestLoser.change.toFixed(2)}%</div>
</div>

</div>
  `);

  // Charts for party percentages and changes

  addMdToPage(`## Nationella röstandelar per parti (%) – 2018 och 2022`);

  const chartData = [["Parti", "2018 (%)", "2022 (%)"]];
  results.forEach(row => {
    chartData.push([row.parti, row.percent2018, row.percent2022]);
  });

  drawGoogleChart({
    type: "ColumnChart",
    data: chartData,
    options: {
      title: "Nationella röstandelar per parti (2018 och 2022)",
      height: 500,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 70, right: 40, top: 60, bottom: 120 },
      hAxis: { title: "Parti", slantedText: true, slantedTextAngle: 30 },
      vAxis: { title: "Röstandel (%)" },
      legend: { position: "top" }
    }
  });

  // Change chart with annotations for biggest winner and loser

  addMdToPage(`## Förändring i röstandel per parti (procentenheter)`);

  const changeChartData = [["Parti", "Förändring (p.e.)", { role: "style" }, { role: "annotation" }]];
  [...results].sort((a, b) => b.change - a.change).forEach(row => {
    changeChartData.push([
      row.parti,
      row.change,
      row.change >= 0 ? "color:#059669" : "color:#DC2626",
      (row.change >= 0 ? "+" : "") + row.change.toFixed(2) + "%"
    ]);
  });

  drawGoogleChart({
    type: "BarChart",
    data: changeChartData,
    options: {
      title: "Förändring i röstandel per parti (2018 → 2022)",
      height: 420,
      chartArea: { left: 240, right: 80, top: 50, bottom: 40 },
      legend: { position: "none" },
      hAxis: { title: "Förändring (procentenheter)" },
      vAxis: { title: "Parti" },
      annotations: { alwaysOutside: true }
    }
  });

  // Chart for block percentages

  addMdToPage(`## Blocknivå – höger och vänster (%) – 2018 och 2022`);

  drawGoogleChart({
    type: "BarChart",
    data: [
      ["Block", "2018 (%)", "2022 (%)"],
      ["Vänsterblocket", vanster2018, vanster2022],
      ["Högerblocket",   hoger2018,   hoger2022]
    ],
    options: {
      title: "Blockstöd i procent – 2018 och 2022 (år-specifika block)",
      height: 300,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 160, right: 80, top: 50, bottom: 40 },
      hAxis: { title: "Röstandel (%)" },
      vAxis: { title: "Block" },
      legend: { position: "top" }
    }
  });

  // Summary table for party results

  addMdToPage(`## Nationell sammanfattning per parti`);

  tableFromData({
    data: results.map(r => ({
      "Parti":            r.parti,
      "2018 (%)":         r.percent2018.toFixed(2),
      "2022 (%)":         r.percent2022.toFixed(2),
      "Förändring (p.e.)": (r.change >= 0 ? "+" : "") + r.change.toFixed(2)
    })),
    columnNames: ["Parti", "2018 (%)", "2022 (%)", "Förändring (p.e.)"],
    fixedHeader: true
  });

  // Interpretation and methodological note

  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Statistisk tolkning

Den nationella analysen visar hur väljarnas stöd fördelades mellan Sveriges
riksdagspartier under valen 2018 och 2022.

- **${biggestWinner.parti}** hade den största ökningen med **+${biggestWinner.change.toFixed(2)}** procentenheter
- **${biggestLoser.parti}** hade den största minskningen med **${biggestLoser.change.toFixed(2)}** procentenheter
- Högerblocket gick från **${hoger2018.toFixed(1)}%** (2018) till **${hoger2022.toFixed(1)}%** (2022)
- Vänsterblocket gick från **${vanster2018.toFixed(1)}%** (2018) till **${vanster2022.toFixed(1)}%** (2022)

Denna sida fungerar som en övergripande introduktion till projektets
fortsatta analyser av regionala skillnader, socioekonomiska faktorer
och politiska förändringar.

</div>
  `);

  // Methodological note on year-specific blocks

  addMdToPage(`
<div style="
  background:#FEF9C3;
  padding:30px;
  border-radius:16px;
  margin-top:30px;
  border-left:8px solid #CA8A04;
">

## Metodnotering – Varför används år-specifika block?

I denna analys används **olika blockindelningar för 2018 och 2022**,
eftersom den svenska partikonstellationen förändrades betydligt mellan valen.

| Valår | Centerpartiets position | Blocktillhörighet |
|---|---|---|
| **2018** | Stödde Löfvens S-MP-regering via Januariavtalet | Vänsterblocket |
| **2022** | Ingick i Tidöavtalet med M, KD, L och SD | Högerblocket |

Om samma fasta block hade använts för båda åren skulle blockjämförelsen
delvis spegla Centerpartiets byte av sida snarare än genuina väljarförändringar.

</div>

  `);

}