import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
import { normalizeKommun } from "../helper/formatting.js";
import { mean, standardDeviation } from "../helper/statistics.js";
import { hogerBlock2018, hogerBlock2022, vansterBlock2018, vansterBlock2022 } from "../helper/blocks.js";

if (!dbInfoOk) {

  displayDbNotOkText();

} else {

  // Intro

  addMdToPage(`
# Regionala politiska skiften (2018–2022)

<div style="
  background:#F1F5F9;
  padding:30px;
  border-radius:16px;
  margin-top:20px;
  border-left:8px solid #192c4e;
">

## Hur förändrades Sveriges län politiskt?

Denna analys visar hur Sveriges län förändrades mellan riksdagsvalen
2018 och 2022 genom att analysera utvecklingen för:

- Högerblocket
- Vänsterblocket
- Regionala vinnare
- Regionala förlorare

Analysen bygger på samtliga kommuner i Sverige och använder
röstandelar (%) istället för absoluta röster för att möjliggöra
jämförbara analyser mellan län med olika befolkningsstorlek.

> **Viktigt:** Blockindelningen är år-specifik —
> Centerpartiet räknas till vänsterblocket 2018
> men till högerblocket 2022.

</div>
  `);

  // Kommun → län mapping

  const kommunToLan = new Map(
    lanKommun.map(row => [
      normalizeKommun(row.kommun),
      row.lan
    ])
  );

  // Aggregera röster per län och block

  const lanStats = new Map();

  electionResults.forEach(row => {

    const kommun =
      normalizeKommun(row.kommun);

    const lan =
      kommunToLan.get(kommun);

    if (!lan) return;

    if (!lanStats.has(lan)) {

      lanStats.set(lan, {

        total2018: 0,
        total2022: 0,

        hoger2018: 0,
        hoger2022: 0,

        vanster2018: 0,
        vanster2022: 0

      });

    }

    const stats =
      lanStats.get(lan);

    const votes2018 =
      Number(row.roster2018 || 0);

    const votes2022 =
      Number(row.roster2022 || 0);

    stats.total2018 += votes2018;
    stats.total2022 += votes2022;

    if (hogerBlock2018.includes(row.parti)) {
      stats.hoger2018 += votes2018;
    }

    if (vansterBlock2018.includes(row.parti)) {
      stats.vanster2018 += votes2018;
    }

    if (hogerBlock2022.includes(row.parti)) {
      stats.hoger2022 += votes2022;
    }

    if (vansterBlock2022.includes(row.parti)) {
      stats.vanster2022 += votes2022;
    }

  });

  // Beräkna regionala skiften

  const regionalShift = [];

  lanStats.forEach((stats, lan) => {

    if (
      stats.total2018 === 0 ||
      stats.total2022 === 0
    ) return;

    const hogerShare2018 =
      (stats.hoger2018 / stats.total2018) * 100;

    const hogerShare2022 =
      (stats.hoger2022 / stats.total2022) * 100;

    const vansterShare2018 =
      (stats.vanster2018 / stats.total2018) * 100;

    const vansterShare2022 =
      (stats.vanster2022 / stats.total2022) * 100;

    const hogerDiff =
      hogerShare2022 - hogerShare2018;

    const vansterDiff =
      vansterShare2022 - vansterShare2018;

    const netShift =
      hogerDiff - vansterDiff;

    regionalShift.push({

      lan,

      hogerShare2018,
      hogerShare2022,

      vansterShare2018,
      vansterShare2022,

      hogerDiff,
      vansterDiff,

      netShift

    });

  });

  regionalShift.sort(
    (a, b) => b.netShift - a.netShift
  );

  // Statistiska mått

  const allShifts =
    regionalShift.map(r => r.netShift);

  const meanShift =
    mean(allShifts);

  const stdShift =
    standardDeviation(allShifts);

  const maxShift =
    Math.max(...allShifts);

  const minShift =
    Math.min(...allShifts);

  const strongestRight =
    regionalShift[0];

  const strongestLeft =
    [...regionalShift]
      .sort((a, b) => a.netShift - b.netShift)[0];

  // KPI-kort

  addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="
  background:#2563EB;
  padding:24px;
  border-radius:16px;
  color:white;
">
  <div style="font-size:13px;opacity:0.8;">
    STARKAST HÖGERSKIFTE
  </div>

  <div style="font-size:24px;font-weight:bold;">
    ${strongestRight.lan}
  </div>

  <div style="font-size:18px;margin-top:4px;">
    +${strongestRight.netShift.toFixed(2)} p.e.
  </div>
</div>

<div style="
  background:#DC2626;
  padding:24px;
  border-radius:16px;
  color:white;
">
  <div style="font-size:13px;opacity:0.8;">
    STARKAST VÄNSTERSKIFTE
  </div>

  <div style="font-size:24px;font-weight:bold;">
    ${strongestLeft.lan}
  </div>

  <div style="font-size:18px;margin-top:4px;">
    ${strongestLeft.netShift.toFixed(2)} p.e.
  </div>
</div>

<div style="
  background:#1e3a5f;
  padding:24px;
  border-radius:16px;
  color:white;
">
  <div style="font-size:13px;opacity:0.8;">
    GENOMSNITTLIGT SKIFTE
  </div>

  <div style="font-size:28px;font-weight:bold;">
    ${meanShift >= 0 ? "+" : ""}
    ${meanShift.toFixed(2)} p.e.
  </div>

  <div style="font-size:13px;opacity:0.85;">
    ${
      meanShift >= 0
        ? "Genomsnittlig rörelse mot höger"
        : "Genomsnittlig rörelse mot vänster"
    }
  </div>
</div>

<div style="
  background:#7C3AED;
  padding:24px;
  border-radius:16px;
  color:white;
">
  <div style="font-size:13px;opacity:0.8;">
    STANDARDAVVIKELSE
  </div>

  <div style="font-size:28px;font-weight:bold;">
    ${stdShift.toFixed(2)}
  </div>

  <div style="font-size:13px;opacity:0.85;">
    Regional spridning mellan län
  </div>
</div>

</div>
  `);

  // Diagram: nettoförändring

  addMdToPage(`
## Nettoförändring per län
`);

  const chartData = [
    [
      "Län",
      "Nettoförändring",
      { role: "style" },
      { role: "annotation" }
    ]
  ];

  regionalShift.forEach(r => {

    chartData.push([
      r.lan,
      r.netShift,
      `color:${r.netShift >= 0 ? "#2563EB" : "#DC2626"}`,
      r.netShift.toFixed(2)
    ]);

  });

  drawGoogleChart({

    type: "ColumnChart",

    data: chartData,

    options: {

      title:
        "Nettoförändring mellan blocken per län",

      height: 550,

      legend: "none",

      chartArea: {
        left: 70,
        right: 30,
        top: 70,
        bottom: 120
      },

      hAxis: {
        title: "Län",
        slantedText: true,
        slantedTextAngle: 45
      },

      vAxis: {
        title: "Förändring i procentenheter"
      },

      annotations: {
        alwaysOutside: true
      }

    }

  });

  // Högerblock

  addMdToPage(`
## Högerblockets röstandel per län
`);

  const hogerChartData = [
    ["Län", "2018", "2022"]
  ];

  [...regionalShift]
    .sort((a, b) =>
      b.hogerShare2022 - a.hogerShare2022
    )
    .forEach(r => {

      hogerChartData.push([
        r.lan,
        r.hogerShare2018,
        r.hogerShare2022
      ]);

    });

  drawGoogleChart({

    type: "BarChart",

    data: hogerChartData,

    options: {

      title:
        "Högerblockets röstandel per län (2018–2022)",

      height: 550,

      colors: [
        "#93C5FD",
        "#2563EB"
      ],

      chartArea: {
        left: 180,
        right: 60,
        top: 60,
        bottom: 40
      },

      legend: {
        position: "top"
      },

      hAxis: {
        title: "Röstandel (%)"
      },

      vAxis: {
        title: "Län"
      }

    }

  });

  // Vänsterblock

  addMdToPage(`
## Vänsterblockets röstandel per län
`);

  const vansterChartData = [
    ["Län", "2018", "2022"]
  ];

  [...regionalShift]
    .sort((a, b) =>
      b.vansterShare2022 - a.vansterShare2022
    )
    .forEach(r => {

      vansterChartData.push([
        r.lan,
        r.vansterShare2018,
        r.vansterShare2022
      ]);

    });

  drawGoogleChart({

    type: "BarChart",

    data: vansterChartData,

    options: {

      title:
        "Vänsterblockets röstandel per län (2018–2022)",

      height: 550,

      colors: [
        "#FCA5A5",
        "#DC2626"
      ],

      chartArea: {
        left: 180,
        right: 60,
        top: 60,
        bottom: 40
      },

      legend: {
        position: "top"
      },

      hAxis: {
        title: "Röstandel (%)"
      },

      vAxis: {
        title: "Län"
      }

    }

  });

  // Tabell

  addMdToPage(`
## Regional statistik
`);

  tableFromData({

    data: regionalShift.map(r => ({

      "Län":
        r.lan,

      "Höger 2018 (%)":
        r.hogerShare2018.toFixed(2),

      "Höger 2022 (%)":
        r.hogerShare2022.toFixed(2),

      "Höger Δ":
        (r.hogerDiff >= 0 ? "+" : "") +
        r.hogerDiff.toFixed(2),

      "Vänster 2018 (%)":
        r.vansterShare2018.toFixed(2),

      "Vänster 2022 (%)":
        r.vansterShare2022.toFixed(2),

      "Vänster Δ":
        (r.vansterDiff >= 0 ? "+" : "") +
        r.vansterDiff.toFixed(2),

      "Nettoskifte":
        (r.netShift >= 0 ? "+" : "") +
        r.netShift.toFixed(2),

      "Trend":
        r.netShift > 0
          ? "Höger"
          : r.netShift < 0
            ? "Vänster"
            : "Neutral"

    })),

    columnNames: [
      "Län",
      "Höger 2018 (%)",
      "Höger 2022 (%)",
      "Höger Δ",
      "Vänster 2018 (%)",
      "Vänster 2022 (%)",
      "Vänster Δ",
      "Nettoskifte",
      "Trend"
    ],

    fixedHeader: true

  });

  // Statistisk sammanfattning

  addMdToPage(`
## Statistisk sammanfattning

- Genomsnittligt nettoskifte:
  ${meanShift >= 0 ? "+" : ""}${meanShift.toFixed(2)} procentenheter

- Standardavvikelse:
  ${stdShift.toFixed(2)}

- Största högerskifte:
  +${maxShift.toFixed(2)} procentenheter

- Största vänsterskifte:
  ${minShift.toFixed(2)} procentenheter

- Spann:
  ${(maxShift - minShift).toFixed(2)} procentenheter

### Tolkning

Standardavvikelsen visar hur mycket länens
politiska skiften varierade kring det
genomsnittliga nettoskiftet.

Ett högre värde innebär större regionala
skillnader mellan länen, medan ett lägre
värde tyder på mer likartade politiska
förändringar mellan valen.
`);

  // Slutsats

  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Slutsats

Analysen visar att Sveriges politiska
utveckling mellan riksdagsvalen 2018 och
2022 varierade mellan olika delar av landet.

Det genomsnittliga nettoskiftet var
**${meanShift >= 0 ? "+" : ""}${meanShift.toFixed(2)} procentenheter**,
vilket indikerar en genomsnittlig regional
${meanShift >= 0 ? "rörelse mot höger" : "rörelse mot vänster"}.

Standardavvikelsen på
**${stdShift.toFixed(2)}**
visar samtidigt att utvecklingen skilde sig
mellan länen och att förändringarna inte var
geografiskt jämnt fördelade.

Det största högerskiftet observerades i
**${strongestRight.lan}**
(+${strongestRight.netShift.toFixed(2)} p.e.),
medan det största vänsterskiftet observerades i
**${strongestLeft.lan}**
(${strongestLeft.netShift.toFixed(2)} p.e.).

Resultaten visar därmed tydliga regionala
variationer i väljarnas politiska utveckling
mellan valen.

</div>
  `);

  // Metodnotering

  addMdToPage(`
<div style="
  background:#FEF9C3;
  padding:30px;
  border-radius:16px;
  margin-top:30px;
  border-left:8px solid #CA8A04;
">

## Metodnotering

Analysen använder år-specifika block eftersom
de politiska samarbetena förändrades mellan
2018 och 2022.

Centerpartiet stödde exempelvis den
socialdemokratiska regeringen efter valet
2018 men ingick senare i Tidösamarbetet 2022.

Genom att använda år-specifika block mäter
analysen förändringar i faktiska politiska
konstellationer istället för att skapa
metodologiskt missvisande jämförelser mellan
olika valår.

</div>
  `);

}