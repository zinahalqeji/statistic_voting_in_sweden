import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
 
if (!dbInfoOk) {
 
  displayDbNotOkText();
 
} else {
 
  // Intro
 
  addMdToPage(`
# Nationella valresultat (2018 vs 2022)
 
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
 
- partiernas totala röstandelar  
- jämförelse mellan valåren  
- blockens storlek  
- total röstmängd  
- övergripande förändringar i det politiska landskapet  
 
Syftet är att skapa en statistisk grund för projektets fortsatta analyser.
 
</div>
  `);
 
  // Aggregate votes per party
 
  const partyMap = new Map();
 
  electionResults.forEach(row => {
 
    const parti = row.parti;
 
    if (!partyMap.has(parti)) {
 
      partyMap.set(parti, {
        votes2018: 0,
        votes2022: 0
      });
 
    }
 
    const stats = partyMap.get(parti);
 
    stats.votes2018 += Number(row.roster2018 || 0);
    stats.votes2022 += Number(row.roster2022 || 0);
 
  });
 
  // Total röster per valår
 
  const total2018 =
    Array.from(partyMap.values())
      .reduce((sum, p) => sum + p.votes2018, 0);
 
  const total2022 =
    Array.from(partyMap.values())
      .reduce((sum, p) => sum + p.votes2022, 0);
 
 
  // Build results array with percentages
 
  const results =
    Array.from(partyMap.entries())
      .map(([parti, stats]) => {
 
        const percent2018 =
          (stats.votes2018 / total2018) * 100;
 
        const percent2022 =
          (stats.votes2022 / total2022) * 100;
 
        return {
          parti,
          votes2018: stats.votes2018,
          votes2022: stats.votes2022,
          percent2018,
          percent2022
        };
 
      });
 
  // KPIs
 
  addMdToPage(`
<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
gap:20px;
margin:30px 0;
">
 
<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
<h3>Totala röster 2018</h3>
<p style="font-size:30px;font-weight:bold;">
${total2018.toLocaleString("sv-SE")}
</p>
</div>
 
<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
<h3>Totala röster 2022</h3>
<p style="font-size:30px;font-weight:bold;">
${total2022.toLocaleString("sv-SE")}
</p>
</div>
 
<div style="background:#F1F5F9;color:black;padding:24px;border-radius:16px;">
<h3>Förändring i antal röster</h3>
<p style="font-size:30px;font-weight:bold;">
${(total2022 - total2018).toLocaleString("sv-SE")}
</p>
</div>
 
</div>
  `);
 
  // Chart: national percentages
 
  addMdToPage(`## Nationella röstandelar per parti`);
 
  const chartData = [
    ["Parti", "2018", "2022"]
  ];
 
  results.forEach(row => {
 
    chartData.push([
      row.parti,
      row.percent2018,
      row.percent2022
    ]);
 
  });
 
  drawGoogleChart({
 
    type: "ColumnChart",
 
    data: chartData,
 
    options: {
 
      title:
        "Nationella röstandelar per parti (2018 vs 2022)",
 
      height: 550,
      width: 1200,
 
      chartArea: {
        left: 80,
        right: 40,
        top: 70,
        bottom: 100
      },
 
      hAxis: {
        title: "Parti"
      },
 
      vAxis: {
        title: "Röstandel (%)"
      },
 
      legend: {
        position: "top"
      }
 
    }
 
  });
 
  // Blocknivå
 
  const rightBlock = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna",
    "Centerpartiet"
  ];
 
  const leftBlock = [
    "Socialdemokraterna",
    "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet"
  ];
 
  let right2018 = 0;
  let right2022 = 0;
 
  let left2018 = 0;
  let left2022 = 0;
 
  results.forEach(row => {
 
    if (rightBlock.includes(row.parti)) {
      right2018 += row.percent2018;
      right2022 += row.percent2022;
    }
 
    if (leftBlock.includes(row.parti)) {
      left2018 += row.percent2018;
      left2022 += row.percent2022;
    }
 
  });
 
  // Block chart
 
  addMdToPage(`## Blocknivå – vänster och höger`);
 
  drawGoogleChart({
 
    type: "BarChart",
 
    data: [
      ["Block", "2018", "2022"],
      ["Vänsterblocket", left2018, left2022],
      ["Högerblocket", right2018, right2022]
    ],
 
    options: {
 
      height: 350,
 
      colors: ["#DC2626", "#2563EB"],
 
      hAxis: {
        title: "Röstandel (%)"
      },
 
      legend: {
        position: "top"
      }
 
    }
 
  });
 
  // Summary table
 
  addMdToPage(`## Nationell sammanfattning`);
 
  tableFromData({
 
    data: results.map(r => ({
      "Parti": r.parti,
      "2018 (%)": r.percent2018.toFixed(2),
      "2022 (%)": r.percent2022.toFixed(2),
      "2018 röster": r.votes2018.toLocaleString("sv-SE"),
      "2022 röster": r.votes2022.toLocaleString("sv-SE")
    })),
 
    columnNames: [
      "Parti",
      "2018 (%)",
      "2022 (%)",
      "2018 röster",
      "2022 röster"
    ],
 
    fixedHeader: true
 
  });
 
  // Interpretation
 
  addMdToPage(`
<div style="
background:#F8FAFC;
padding:30px;
border-radius:18px;
margin-top:35px;
border-left:8px solid #192c4e;
">
 
## Statistisk tolkning
 
Den nationella analysen visar hur väljarnas stöd fördelades mellan Sveriges riksdagspartier under valen 2018 och 2022.
 
Resultaten visar att vissa partier stärkte sina nationella röstandelar medan andra tappade stöd. Blockanalysen visar hur balansen mellan vänster- och högerblocket förändrades mellan valåren.
 
Denna sida fungerar som en övergripande introduktion till projektets senare analyser av regionala skillnader, socioekonomiska faktorer och politiska förändringar.
 
</div>
  `);
 
}
