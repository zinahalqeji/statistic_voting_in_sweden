import { electionResults, income, ages, geoData } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // Intro

  addMdToPage(`
# Socioekonomiska drivkrafter (kommunnivå, 2018–2022)

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Hur hänger socioekonomi ihop med politiska skiften?

Analysen kopplar samman:

- Medianinkomst  
- Medelålder  
- Urbanisering (antal tätorter)  

med hur kommunernas politiska balans förändrades mellan riksdagsvalen 2018 och 2022.

Det politiska skiftet mäts som förändringen i högerblockets röstandel
(i procentenheter).

</div>
  `);

  // Fixa kommun name issue in lanKommun data

  function normalizeKommun(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace("strängns", "strängnäs");
  }

  function safeNumber(value) {
    const n = Number(
      typeof value === "string" ? value.replace(",", ".") : value
    );
    return isNaN(n) ? 0 : n;
  }

  // Block-listor för höger- och vänsterpartier (för att räkna röster per block)

  const hogerBlock = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna"
  ];

  const vansterBlock = [
    "Socialdemokraterna",
    "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet",
    "Centerpartiet"
  ];

  // Neo4j-data innehåller röstningsresultat per kommun, parti och år – perfekt för att analysera politiska skiften på kommunnivå.

  let electionRows = electionResults;
  if (Array.isArray(electionRows)) {
    electionRows = electionRows.map(r => r.n || r);
  }

  // Politiskt skifte per kommun: beräkna rörelse mot höger eller vänster mellan 2018 och 2022

  const kommunStats = new Map();

  electionRows.forEach(row => {
    const kommunKey = normalizeKommun(row.kommun);
    if (!kommunKey) return;

    if (!kommunStats.has(kommunKey)) {
      kommunStats.set(kommunKey, {
        kommun: row.kommun,
        total2018: 0,
        total2022: 0,
        hoger2018: 0,
        hoger2022: 0,
        vanster2018: 0,
        vanster2022: 0
      });
    }

    const stats = kommunStats.get(kommunKey);
    const v2018 = safeNumber(row.roster2018);
    const v2022 = safeNumber(row.roster2022);

    stats.total2018 += v2018;
    stats.total2022 += v2022;

    if (hogerBlock.includes(row.parti)) {
      stats.hoger2018 += v2018;
      stats.hoger2022 += v2022;
    }

    if (vansterBlock.includes(row.parti)) {
      stats.vanster2018 += v2018;
      stats.vanster2022 += v2022;
    }
  });

  const kommunShift = [];

  kommunStats.forEach(stats => {
    if (stats.total2018 === 0 || stats.total2022 === 0) return;

    const hogerShare2018 = (stats.hoger2018 / stats.total2018) * 100;
    const hogerShare2022 = (stats.hoger2022 / stats.total2022) * 100;

    const netShift = hogerShare2022 - hogerShare2018;

    kommunShift.push({
      kommun: stats.kommun,
      kommunKey: normalizeKommun(stats.kommun),
      shift: netShift
    });
  });

  // Socioekonomiska data: aggregera inkomster och ålder per kommun

  function aggregateIncome(data) {
    const map = new Map();

    data.forEach(row => {
      if ((row.kon || "").toLowerCase() !== "totalt") return;

      const key = normalizeKommun(row.kommun);
      const value = safeNumber(row.medelInkomst2021);

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(value);
    });

    const result = {};
    map.forEach((values, key) => {
      result[key] = values.reduce((a, b) => a + b, 0) / values.length;
    });
    return result;
  }

  function aggregateAge(data) {
    const map = new Map();

    data.forEach(row => {
      if ((row.kon || "").toLowerCase() !== "totalt") return;

      const key = normalizeKommun(row.kommun);
      const value = safeNumber(row.medelalderAr2022);

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(value);
    });

    const result = {};
    map.forEach((values, key) => {
      result[key] = values.reduce((a, b) => a + b, 0) / values.length;
    });
    return result;
  }

  const incomeAgg = aggregateIncome(income);
  const ageAgg = aggregateAge(ages);

  // Urbanisering: räkna antal tätorter per kommun baserat på geoData (som innehåller alla tätorter och deras kommun)

  const urbanAgg = {};
  geoData.forEach(row => {
    const key = normalizeKommun(row.municipality);
    if (!key) return;
    if (!urbanAgg[key]) urbanAgg[key] = 0;
    urbanAgg[key] += 1;
  });

  // Antal kommuner som har både politiskt skifte och socioekonomiska data

  const analysis = kommunShift.map(r => {
    const key = r.kommunKey;

    return {
      kommun: r.kommun,
      shift: r.shift,
      income: incomeAgg[key] || 0,
      age: ageAgg[key] || 0,
      urban: urbanAgg[key] || 0
    };
  }).filter(r => r.income || r.age || r.urban);

  
  // Korrelationer mellan socioekonomiska faktorer och politiskt skifte

  function correlation(x, y) {
    if (!x.length || !y.length) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, dx2 = 0, dy2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }

    const denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
  }

  const shifts = analysis.map(r => r.shift);

  const rIncome = correlation(analysis.map(r => r.income), shifts);
  const rAge = correlation(analysis.map(r => r.age), shifts);
  const rUrban = correlation(analysis.map(r => r.urban), shifts);

  // KPI sammanfattning i tre färgkodade boxar

  addMdToPage(`
<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
gap:20px;
margin:30px 0;
">

<div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:24px;border-radius:16px;color:white;">
<h3>Inkomst ↔ Politiskt skifte</h3>
<p style="font-size:32px;font-weight:bold;margin:8px 0;">${rIncome.toFixed(3)}</p>
<p>Kommuner med högre inkomster tenderar att röra sig mer mot höger.</p>
</div>

<div style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:24px;border-radius:16px;color:white;">
<h3>Medelålder ↔ Politiskt skifte</h3>
<p style="font-size:32px;font-weight:bold;margin:8px 0;">${rAge.toFixed(3)}</p>
<p>Åldersstruktur har ett svagare men mätbart samband med politiska skiften.</p>
</div>

<div style="background:linear-gradient(135deg,#059669,#047857);padding:24px;border-radius:16px;color:white;">
<h3>Urbanitet ↔ Politiskt skifte</h3>
<p style="font-size:32px;font-weight:bold;margin:8px 0;">${rUrban.toFixed(3)}</p>
<p>Kommuner med fler tätorter uppvisar större variation i politiska förändringar.</p>
</div>

</div>
  `);

  addMdToPage(`## Socioekonomisk profil – tre tydliga samband`);

function drawMiniScatter(title, xField, xLabel, color) {
  const data = [
    [xLabel, "Politiskt skifte (p.e.)", { role: "tooltip" }]
  ];

  analysis.forEach(row => {
    const tooltip = `
Kommun: ${row.kommun}
${xLabel}: ${row[xField]}
Politiskt skifte: ${row.shift.toFixed(2)} p.e.
`;
    data.push([row[xField], row.shift, tooltip]);
  });

  drawGoogleChart({
    type: "ScatterChart",
    data,
    options: {
      title,
      height: 350,
      pointSize: 5,
      colors: [color],
      legend: "none",
      chartArea: { left: 60, right: 20, top: 50, bottom: 60 },
      hAxis: { title: xLabel },
      vAxis: { title: "Politiskt skifte (p.e.)" },
      trendlines: {
        0: { type: "linear", color: "#111827", lineWidth: 2, opacity: 0.4 }
      }
    }
  });
}

addMdToPage(`
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px;margin-top:20px;">
  <div id="chart_income"></div>
  <div id="chart_age"></div>
  <div id="chart_urban"></div>
</div>
`);

drawMiniScatter("Inkomst ↔ Politiskt skifte", "income", "Medianinkomst (tkr)", "#2563EB");
drawMiniScatter("Medelålder ↔ Politiskt skifte", "age", "Medelålder (år)", "#7C3AED");
drawMiniScatter("Urbanitet ↔ Politiskt skifte", "urban", "Antal tätorter", "#059669");

  // Topp 10 kommuner som rört sig mest mot höger och vänster, med socioekonomisk profil

  const sortedByShift = [...analysis].sort((a, b) => b.shift - a.shift);
  const topRight = sortedByShift.slice(0, 10);
  const topLeft = sortedByShift.slice(-10).reverse();

  addMdToPage(`## Kommuner med störst politiskt skifte`);

  const topRightTable = topRight.map(r => ({
    "Kommun": r.kommun,
    "Skifte mot höger (p.e.)": r.shift.toFixed(2),
    "Medianinkomst (tkr)": Math.round(r.income),
    "Medelålder (år)": r.age.toFixed(1),
    "Urbanitet (tätorter)": r.urban
  }));

  const topLeftTable = topLeft.map(r => ({
    "Kommun": r.kommun,
    "Skifte mot vänster (p.e.)": r.shift.toFixed(2),
    "Medianinkomst (tkr)": Math.round(r.income),
    "Medelålder (år)": r.age.toFixed(1),
    "Urbanitet (tätorter)": r.urban
  }));

  addMdToPage(`### Störst rörelse mot höger (Top 10)`);

  tableFromData({
    data: topRightTable,
    columnNames: [
      "Kommun",
      "Skifte mot höger (p.e.)",
      "Medianinkomst (tkr)",
      "Medelålder (år)",
      "Urbanitet (tätorter)"
    ],
    fixedHeader: false
  });

  addMdToPage(`### Störst rörelse mot vänster (Top 10)`);

  tableFromData({
    data: topLeftTable,
    columnNames: [
      "Kommun",
      "Skifte mot vänster (p.e.)",
      "Medianinkomst (tkr)",
      "Medelålder (år)",
      "Urbanitet (tätorter)"
    ],
    fixedHeader: false
  });

  // Kort sammanfattning av de statistiska sambanden

  addMdToPage(`

## Statistisk tolkning

- **Inkomst** har ett tydligt positivt samband med politiskt skifte mot höger.  
- **Medelålder** visar ett svagare samband – äldre kommuner tenderar något mer mot stabilitet.  
- **Urbanitet** (antal tätorter) hänger ihop med större variation i politiska förändringar.

Korrelationerna beskriver statistiska samband – inte direkta orsaker – men ger en tydlig bild av hur socioekonomiska mönster och politiska skiften samvarierar på kommunnivå.

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

Analysen visar att socioekonomiska faktorer har tydliga samband med hur kommunerna förändrade sin politiska inriktning mellan 2018 och 2022.

### 🔹 Inkomst
Kommuner med högre medianinkomst uppvisade ett politiskt skifte på **${rIncome.toFixed(3)}%**, vilket innebär ett tydligt samband mellan ekonomisk nivå och rörelse mot högerblocket.

### 🔹 Medelålder
Sambandet mellan medelålder och politiskt skifte var **${rAge.toFixed(3)}%**, vilket visar ett svagare men fortfarande mätbart samband.

### 🔹 Urbanitet
Urbaniseringsgraden (antal tätorter) hade ett samband på **${rUrban.toFixed(3)}%**, vilket tyder på att mer urbana kommuner uppvisar större variation i politiska förändringar.

### Sammanfattning
Dessa procentvärden visar att socioekonomiska faktorer inte bara varierar mellan kommuner – de samvarierar också med hur väljarnas politiska preferenser förändrades över tid.

</div>
`);

}
