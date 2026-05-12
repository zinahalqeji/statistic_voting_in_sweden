import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

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
rättvisa jämförelser mellan län med olika befolkningsstorlek.

</div>
  `);

  // Fixa kommun name issue in lanKommun data

  function normalizeKommun(name) {

    return (name || "")
      .trim()
      .toLowerCase()
      .replace("strängns", "strängnäs");

  }

  // KOMMUN → LÄN

  const kommunToLan = new Map(
    lanKommun.map(r => [
      normalizeKommun(r.kommun),
      r.lan
    ])
  );

  // Färger för blocken

  const colors = {
    hoger: "#2563EB",
    vanster: "#DC2626",
    neutral: "#6B7280"
  };

  // Politiska block

  const hogerBlock = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna",
    "Centerpartiet"
  ];

  const vansterBlock = [
    "Socialdemokraterna",
    "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet"
  ];

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

    // Totala röster

    stats.total2018 += votes2018;
    stats.total2022 += votes2022;

    // Högerblock

    if (hogerBlock.includes(row.parti)) {

      stats.hoger2018 += votes2018;
      stats.hoger2022 += votes2022;

    }

    // Vänsterblock

    if (vansterBlock.includes(row.parti)) {

      stats.vanster2018 += votes2018;
      stats.vanster2022 += votes2022;

    }

  });

  // Beräkna förändringar och nettoförändring per län

  const regionalShift = [];

  lanStats.forEach((stats, lan) => {

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

  // Statistiska funktioner

  function mean(arr) {

    return arr.reduce((a, b) => a + b, 0) / arr.length;

  }

  function standardDeviation(arr) {

    const m = mean(arr);

    const variance =
      mean(arr.map(v => (v - m) ** 2));

    return Math.sqrt(variance);

  }

  // Sortera län efter nettoförändring

  regionalShift.sort((a, b) =>
    b.netShift - a.netShift
  );

  // Statistisk sammanfattning av nettoförändringar
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

  // Visa län med starkast skifte mot höger respektive vänster

  const strongestRight =
    regionalShift[0];

  const strongestLeft =
    [...regionalShift]
      .sort((a, b) => a.netShift - b.netShift)[0];

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

<h3>Starkast högerskifte</h3>

<p style="font-size:26px;font-weight:bold;">
${strongestRight.lan}
</p>

<p>
+${strongestRight.netShift.toFixed(2)} procentenheter
</p>

</div>

<div style="
background:linear-gradient(135deg,#DC2626,#991B1B);
padding:25px;
border-radius:16px;
color:white;
box-shadow:0 4px 15px rgba(0,0,0,0.15);
">

<h3>Starkast vänsterskifte</h3>

<p style="font-size:26px;font-weight:bold;">
${strongestLeft.lan}
</p>

<p>
${strongestLeft.netShift.toFixed(2)} procentenheter
</p>

</div>

</div>
  `);

  // Chart över nettoförändring per län

  addMdToPage(`
## Regionala politiska skiften per län
  `);

  const chartData = [
    ["Län", "Nettoförändring", { role: "style" }]
  ];

  regionalShift.forEach(r => {

    chartData.push([

      r.lan,

      r.netShift,

      `color:${
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
        "Nettoförändring mellan höger- och vänsterblock per län",

      height: 650,
      width: 1200,

      legend: "none",

      backgroundColor: "#ffffff",

      chartArea: {
        left: 90,
        right: 30,
        top: 80,
        bottom: 120
      },

      animation: {
        startup: true,
        duration: 1200,
        easing: "out"
      },

      hAxis: {
        title: "Län",
        slantedText: true,
        slantedTextAngle: 45
      },

      vAxis: {
        title: "Förändring i procentenheter"
      }

    }

  });

  // Tabell med detaljerad regional statistik

  addMdToPage(`
## Regional statistik
`);

  const tableData =
    regionalShift.map(r => ({

      "Län":
        r.lan,

      "Höger 2018 (%)":
        r.hogerShare2018.toFixed(2),

      "Höger 2022 (%)":
        r.hogerShare2022.toFixed(2),

      "Vänster 2018 (%)":
        r.vansterShare2018.toFixed(2),

      "Vänster 2022 (%)":
        r.vansterShare2022.toFixed(2),

      "Nettoförändring":
        r.netShift.toFixed(2),

      "Trend":
        r.netShift > 0
          ? "Höger"
          : r.netShift < 0
            ? "Vänster"
            : "Neutral"

    }));

  tableFromData({

    data: tableData,

    columnNames: [

      "Län",
      "Höger 2018 (%)",
      "Höger 2022 (%)",
      "Vänster 2018 (%)",
      "Vänster 2022 (%)",
      "Nettoförändring",
      "Trend"

    ],

    fixedHeader: true

  });

  // Statistisk sammanfattning av nettoförändringar

  addMdToPage(`

## Statistisk sammanfattning

- **Genomsnittlig nettoförändring mellan län:** ${meanShift.toFixed(2)} procentenheter
- **Standardavvikelse:** ${stdShift.toFixed(2)}
- **Största högerskifte:** ${maxShift.toFixed(2)} procentenheter
- **Största vänsterskifte:** ${minShift.toFixed(2)} procentenheter

## Statistisk analys och tolkning

Analysen visar tydliga regionala skillnader i hur väljarnas politiska preferenser förändrades mellan riksdagsvalen 2018 och 2022.

Genomsnittsvärdet beskriver den övergripande politiska förändringen mellan Sveriges län, medan standardavvikelsen visar hur mycket förändringarna varierade geografiskt. Ett högre värde indikerar större regionala skillnader i den politiska utvecklingen mellan länen.

Resultaten visar att vissa län uppvisade tydliga förskjutningar mot högerblocket, medan andra län utvecklades i riktning mot vänsterblocket. Skillnaderna mellan max- och minvärden illustrerar de mest extrema politiska förändringarna i landet och visar att utvecklingen inte varit jämnt fördelad geografiskt.

`);

  // Viktiga observationer

  addMdToPage(`

## Viktiga observationer

- Positiva värden innebär ett starkare stöd för högerblocket.
- Negativa värden innebär ett starkare stöd för vänsterblocket.
- Förändringarna varierade tydligt mellan Sveriges län.
- Resultaten tyder på regionala skillnader i väljarnas politiska beteende.
- Skillnaderna kan delvis påverkas av socioekonomiska faktorer,
  urbanisering och lokala arbetsmarknadsförhållanden.

`);

  // Slutsats

  addMdToPage(`
<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Slutsats

Analysen visar att Sveriges politiska utveckling mellan riksdagsvalen
2018 och 2022 inte var geografiskt jämnt fördelad.

Flera län uppvisade tydliga rörelser mot högerblocket medan andra län
visade ökningar för vänsterblocket. Resultaten visar därmed att det
finns betydande regional variation i väljarnas politiska förändringar.

Genom att analysera röstandelar istället för absoluta röster blir
jämförelserna statistiskt mer rättvisa mellan stora och små län.

Den statistiska spridningen mellan länen visar dessutom att vissa delar
av landet förändrades betydligt mer än andra, vilket tyder på att lokala
och regionala faktorer kan ha haft stor påverkan på valresultaten.

Eftersom analysen bygger på hela populationen av registrerade röster
beskriver resultaten faktiska förändringar i valutfallet och inte
statistiska uppskattningar från ett stickprov.
</div>

`);

}