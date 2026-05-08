import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // =====================================================
  // 🎨 PROFESSIONAL BI DASHBOARD — REGIONAL POLITICAL SHIFT
  // =====================================================

  addMdToPage(`
#  Regionala politiska skiften (2018–2022)

<div style="
background: linear-gradient(135deg,#1e3c72 0%, #2a5298 100%);
padding: 30px;
border-radius: 16px;
color: white;
margin-bottom: 30px;
box-shadow: 0 6px 20px rgba(0,0,0,0.25);
">

## Hur förändrades Sveriges län politiskt?

Denna analys visar hur Sveriges län förändrades mellan riksdagsvalen
2018 och 2022 genom att analysera utvecklingen för:

-  Högerblocket
-  Vänsterblocket
-  Regionala vinnare
-  Regionala förlorare

Analysen bygger på samtliga kommuner i Sverige och visualiserar
hur den politiska balansen förändrades geografiskt.

</div>
  `);

  // =====================================================
  // 🧹 DATA CLEANING
  // =====================================================

  function normalizeKommun(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace("strängns", "strängnäs");
  }

  // =====================================================
  // 🗺️ JOIN KOMMUN → LÄN
  // =====================================================

  const kommunToLan = new Map(
    lanKommun.map(r => [
      normalizeKommun(r.kommun),
      r.lan
    ])
  );

  // =====================================================
  // 🎨 COLORS
  // =====================================================

  const colors = {
    hoger: "#1D4ED8",
    vanster: "#DC2626",
    positive: "#16A34A",
    negative: "#DC2626",
    neutral: "#6B7280"
  };

  // =====================================================
  // 🧠 BLOCK DEFINITIONS
  // =====================================================

  const hogerBlock = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna"
  ];

  const vansterBlock = [
    "Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet",
    "Centerpartiet",
    "Arbetarepartiet-Socialdemokraterna"
  ];

  // =====================================================
  // 📊 AGGREGATE PER LÄN
  // =====================================================

  const lanStats = new Map();

  electionResults.forEach(row => {

    const kommun = normalizeKommun(row.kommun);
    const lan = kommunToLan.get(kommun);

    if (!lan) return;

    if (!lanStats.has(lan)) {
      lanStats.set(lan, {
        hoger2018: 0,
        hoger2022: 0,
        vanster2018: 0,
        vanster2022: 0
      });
    }

    const stats = lanStats.get(lan);

    const v2018 = Number(row.roster2018 || 0);
    const v2022 = Number(row.roster2022 || 0);

    if (hogerBlock.includes(row.parti)) {
      stats.hoger2018 += v2018;
      stats.hoger2022 += v2022;
    }

    if (vansterBlock.includes(row.parti)) {
      stats.vanster2018 += v2018;
      stats.vanster2022 += v2022;
    }
  });

  // =====================================================
  // 📈 CALCULATE POLITICAL SHIFT
  // =====================================================

  const regionalShift = [];

  lanStats.forEach((stats, lan) => {

    const hogerDiff =
      stats.hoger2022 - stats.hoger2018;

    const vansterDiff =
      stats.vanster2022 - stats.vanster2018;

    const netShift = hogerDiff - vansterDiff;

    regionalShift.push({
      lan,
      hogerDiff,
      vansterDiff,
      netShift
    });
  });

  regionalShift.sort((a, b) =>
    Math.abs(b.netShift) - Math.abs(a.netShift)
  );

  // =====================================================
  // 🏆 INSIGHT CARDS
  // =====================================================

  const strongestRight =
    regionalShift.reduce((a, b) =>
      a.netShift > b.netShift ? a : b
    );

  const strongestLeft =
    regionalShift.reduce((a, b) =>
      a.netShift < b.netShift ? a : b
    );

  addMdToPage(`
<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
gap:20px;
margin:30px 0;
">

<div style="
background:linear-gradient(135deg,#2563EB,#1E40AF);
padding:25px;
border-radius:16px;
color:white;
box-shadow:0 4px 15px rgba(0,0,0,0.15);
">
<h3> Starkast högerskifte</h3>
<p style="font-size:26px;font-weight:bold;">
${strongestRight.lan}
</p>
<p>
+${strongestRight.netShift.toLocaleString("sv-SE")} röster
</p>
</div>

<div style="
background:linear-gradient(135deg,#DC2626,#991B1B);
padding:25px;
border-radius:16px;
color:white;
box-shadow:0 4px 15px rgba(0,0,0,0.15);
">
<h3> Starkast vänsterskifte</h3>
<p style="font-size:26px;font-weight:bold;">
${strongestLeft.lan}
</p>
<p>
${strongestLeft.netShift.toLocaleString("sv-SE")} röster
</p>
</div>

</div>
  `);

  // =====================================================
  // 📊 MAIN CHART
  // =====================================================

  addMdToPage(`
##  Regionala politiska skiften per län
  `);

  const chartData = [
    ["Län", "Nettoförändring", { role: "style" }]
  ];

  regionalShift.forEach(r => {

    chartData.push([
      r.lan,
      r.netShift,
      `color: ${
        r.netShift >= 0
          ? colors.hoger
          : colors.vanster
      }`
    ]);
  });

  drawGoogleChart({
    type: "ColumnChart",
    data: chartData,
    options: {
      title:
        "Politiskt skifte per län (höger ↔ vänster)",
      height: 650,
      width: 1200,
      legend: "none",
      backgroundColor: "#ffffff",
      animation: {
        startup: true,
        duration: 1200,
        easing: "out"
      },
      chartArea: {
        left: 80,
        right: 30,
        top: 80,
        bottom: 120
      },
      hAxis: {
        title: "Län",
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: {
        title: "Nettoförändring i röster"
      }
    }
  });

  // =====================================================
  // 📋 TABLE
  // =====================================================

addMdToPage(`
## Regional statistik
`);

const tableData = regionalShift.map(r => ({
  "Län": r.lan,
  "Högerförändring": r.hogerDiff,
  "Vänsterförändring": r.vansterDiff,
  "Netto": r.netShift,
  "Trend": r.netShift > 0 ? "Höger" : r.netShift < 0 ? "Vänster" : "Neutral"
}));

tableFromData({
  data: tableData,
  columnNames: [
    "Län",
    "Högerförändring",
    "Vänsterförändring",
    "Netto",
    "Trend"
  ],
  fixedHeader: true
});

  
  // =====================================================
  // 🧠 ANALYSIS
  // =====================================================

addMdToPage(`
<div style="
background:#F8FAFC;
padding:30px;
border-radius:16px;
margin-top:40px;
border-left:8px solid #2563EB;
">

## Statistisk tolkning

Analysen visar tydliga geografiska skillnader i hur väljare förändrade
sina politiska preferenser mellan 2018 och 2022.

</div>
`);

addMdToPage(`
<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #0EA5E9;
">

## Viktiga observationer

- Län med positiva värden har rört sig mot högerblocket  
- Län med negativa värden har rört sig mot vänsterblocket  
- Förändringarna varierar kraftigt mellan olika delar av Sverige  
- Regionala socioekonomiska faktorer kan förklara delar av utvecklingen

</div>
`);

addMdToPage(`
<div style="
background:#FFF7ED;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #16b1f9;
">

## Möjliga förklaringar

<table style="width:100%; border-collapse:collapse; margin-top:10px;">
  <thead>
    <tr style="background:#f3f4f6; text-align:left;">
      <th style="padding:10px; border-bottom:2px solid #e5e7eb;">Faktor</th>
      <th style="padding:10px; border-bottom:2px solid #e5e7eb;">Möjlig påverkan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Urbanisering</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Städer röstar annorlunda än landsbygd</td>
    </tr>
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Inkomst</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Ekonomiska skillnader påverkar partival</td>
    </tr>
    <tr>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Migration</td>
      <td style="padding:10px; border-bottom:1px solid #e5e7eb;">Demografiska förändringar påverkar opinion</td>
    </tr>
    <tr>
      <td style="padding:10px;">Arbetsmarknad</td>
      <td style="padding:10px;">Lokala jobbfrågor kan förändra väljarmönster</td>
    </tr>
  </tbody>
</table>

</div>
`);


}