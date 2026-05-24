import { electionResults, income, ages, geoData } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
import { normalizeKommun, safeNumber } from "../helper/formatting.js";
import { mean, correlation } from "../helper/statistics.js";
import { hogerBlock2018, hogerBlock2022 } from "../helper/blocks.js";

if (!dbInfoOk) {

  displayDbNotOkText();

} else {

  // Intro

  addMdToPage(`
# Regionala drivkrafter (kommunnivå, 2018–2022)

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
(i procentenheter) mellan de två valen.

> **Metodnotering:** År-specifika block används — Centerpartiet räknas till
> vänsterblocket 2018 men till högerblocket 2022.
> Se metodnotering längst ner på sidan.

</div>

> **Statistisk notering:** Korrelationskoefficienten (r) mäter styrkan på det linjära sambandet
> mellan två variabler. r = 1 är perfekt positivt samband, r = -1 är perfekt negativt samband,
> r = 0 betyder inget samband. r² visar hur stor andel av variationen som förklaras.
  `);

  // Helper functions

  function korrelationBeskrivning(r) {

    const abs = Math.abs(r);

    if (abs >= 0.5) return "starkt";
    if (abs >= 0.3) return "måttligt";
    if (abs >= 0.1) return "svagt";

    return "nästan inget";

  }

  function riktning(r) {

    return r > 0
      ? "mot höger"
      : "mot vänster";

  }

  // Political shift calculation per kommun

  const kommunStats = new Map();

  electionResults.forEach(row => {

    const kommunKey =
      normalizeKommun(row.kommun);

    if (!kommunKey) return;

    if (!kommunStats.has(kommunKey)) {

      kommunStats.set(kommunKey, {
        kommun: row.kommun,

        total2018: 0,
        total2022: 0,

        hoger2018: 0,
        hoger2022: 0
      });

    }

    const stats =
      kommunStats.get(kommunKey);

    const v2018 =
      safeNumber(row.roster2018);

    const v2022 =
      safeNumber(row.roster2022);

    stats.total2018 += v2018;
    stats.total2022 += v2022;

    // Year-specific blocks

    if (hogerBlock2018.includes(row.parti)) {

      stats.hoger2018 += v2018;

    }

    if (hogerBlock2022.includes(row.parti)) {

      stats.hoger2022 += v2022;

    }

  });

  const kommunShift = [];

  kommunStats.forEach(stats => {

    if (
      stats.total2018 === 0 ||
      stats.total2022 === 0
    ) return;

    const hogerShare2018 =
      (stats.hoger2018 / stats.total2018) * 100;

    const hogerShare2022 =
      (stats.hoger2022 / stats.total2022) * 100;

    const netShift =
      hogerShare2022 - hogerShare2018;

    kommunShift.push({
      kommun: stats.kommun,

      kommunKey:
        normalizeKommun(stats.kommun),

      shift: netShift,

      hoger2018: hogerShare2018,
      hoger2022: hogerShare2022
    });

  });

  // Aggregate socioeconomic data

  function aggregateIncome(data) {

    const map = new Map();

    data.forEach(row => {

      if (
        (row.kon || "").toLowerCase() !== "totalt"
      ) return;

      const key =
        normalizeKommun(row.kommun);

      const value =
        safeNumber(row.medelInkomst2022);

      if (!map.has(key)) {

        map.set(key, []);

      }

      map.get(key).push(value);

    });

    const result = {};

    map.forEach((values, key) => {

      result[key] = mean(values);

    });

    return result;

  }

  function aggregateAge(data) {

    const map = new Map();

    data.forEach(row => {

      if (
        (row.kon || "").toLowerCase() !== "totalt"
      ) return;

      const key =
        normalizeKommun(row.kommun);

      const value =
        safeNumber(row.medelalderAr2022);

      if (!map.has(key)) {

        map.set(key, []);

      }

      map.get(key).push(value);

    });

    const result = {};

    map.forEach((values, key) => {

      result[key] = mean(values);

    });

    return result;

  }

  const incomeAgg =
    aggregateIncome(income);

  const ageAgg =
    aggregateAge(ages);

  // Urbanization data

  const urbanAgg = {};

  geoData.forEach(row => {

    const key =
      normalizeKommun(row.municipality);

    if (!key) return;

    if (!urbanAgg[key]) {

      urbanAgg[key] = 0;

    }

    urbanAgg[key] += 1;

  });

  // Combine all data

  const analysis =
    kommunShift
      .map(r => {

        const key = r.kommunKey;

        return {
          kommun: r.kommun,

          shift: r.shift,

          hoger2018: r.hoger2018,
          hoger2022: r.hoger2022,

          income:
            incomeAgg[key] || 0,

          age:
            ageAgg[key] || 0,

          urban:
            urbanAgg[key] || 0
        };

      })
      .filter(r =>
        r.income > 0 &&
        r.age > 0
      );

  // Correlation calculations

  const shifts =
    analysis.map(r => r.shift);

  const rIncome =
    correlation(
      analysis.map(r => r.income),
      shifts
    );

  const rAge =
    correlation(
      analysis.map(r => r.age),
      shifts
    );

  const rUrban =
    correlation(
      analysis.map(r => r.urban),
      shifts
    );

  const rSqIncome =
    (rIncome ** 2 * 100).toFixed(1);

  const rSqAge =
    (rAge ** 2 * 100).toFixed(1);

  const rSqUrban =
    (rUrban ** 2 * 100).toFixed(1);

  // KPI cards

  addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#2563EB;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">INKOMST ↔ POLITISKT SKIFTE</div>
  <div style="font-size:32px;font-weight:bold;margin:8px 0;">
    r = ${rIncome.toFixed(3)}
  </div>
  <div style="font-size:14px;opacity:0.85;">
    r² = ${rSqIncome}% — ${korrelationBeskrivning(rIncome)} samband
  </div>
  <div style="font-size:13px;margin-top:8px;">
    Kommuner med högre inkomst tenderar att röra sig ${riktning(rIncome)}
  </div>
</div>

<div style="background:#7C3AED;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">MEDELÅLDER ↔ POLITISKT SKIFTE</div>
  <div style="font-size:32px;font-weight:bold;margin:8px 0;">
    r = ${rAge.toFixed(3)}
  </div>
  <div style="font-size:14px;opacity:0.85;">
    r² = ${rSqAge}% — ${korrelationBeskrivning(rAge)} samband
  </div>
  <div style="font-size:13px;margin-top:8px;">
    Kommuner med högre medelålder tenderar att röra sig ${riktning(rAge)}
  </div>
</div>

<div style="background:#059669;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">URBANITET ↔ POLITISKT SKIFTE</div>
  <div style="font-size:32px;font-weight:bold;margin:8px 0;">
    r = ${rUrban.toFixed(3)}
  </div>
  <div style="font-size:14px;opacity:0.85;">
    r² = ${rSqUrban}% — ${korrelationBeskrivning(rUrban)} samband
  </div>
  <div style="font-size:13px;margin-top:8px;">
    Kommuner med fler tätorter tenderar att röra sig ${riktning(rUrban)}
  </div>
</div>

</div>
  `);

  // Scatter charts

  addMdToPage(`
## Socioekonomisk profil – tre samband med politiskt skifte
`);

  function drawScatter(
    title,
    xField,
    xLabel,
    color
  ) {

    const data = [[
      xLabel,
      "Politiskt skifte (p.e.)",
      { role: "tooltip" }
    ]];

    analysis.forEach(row => {

      data.push([
        row[xField],
        row.shift,

        `Kommun: ${row.kommun}
${xLabel}: ${row[xField]}
Skifte: ${row.shift.toFixed(2)} p.e.`
      ]);

    });

    drawGoogleChart({

      type: "ScatterChart",

      data,

      options: {

        title,

        height: 380,

        pointSize: 5,

        colors: [color],

        legend: "none",

        chartArea: {
          left: 70,
          right: 20,
          top: 50,
          bottom: 60
        },

        hAxis: {
          title: xLabel
        },

        vAxis: {
          title:
            "Politiskt skifte (p.e.)"
        },

        trendlines: {
          0: {
            type: "linear",
            color: "#111827",
            lineWidth: 2,
            opacity: 0.4
          }
        }

      }

    });

  }

  drawScatter(
    `Inkomst ↔ Politiskt skifte (r = ${rIncome.toFixed(3)}, r² = ${rSqIncome}%)`,
    "income",
    "Medelinkomst 2022 (tkr)",
    "#2563EB"
  );

  drawScatter(
    `Medelålder ↔ Politiskt skifte (r = ${rAge.toFixed(3)}, r² = ${rSqAge}%)`,
    "age",
    "Medelålder 2022 (år)",
    "#7C3AED"
  );

  drawScatter(
    `Urbanitet ↔ Politiskt skifte (r = ${rUrban.toFixed(3)}, r² = ${rSqUrban}%)`,
    "urban",
    "Antal tätorter",
    "#059669"
  );

  // Top kommuner

  addMdToPage(`
## Kommuner med störst politiskt skifte
`);

  const sortedByShift =
    [...analysis]
      .sort((a, b) => b.shift - a.shift);

  const topRight =
    sortedByShift.slice(0, 10);

  const topLeft =
    sortedByShift
      .slice(-10)
      .reverse();

  addMdToPage(`
### Störst rörelse mot höger (Top 10)
`);

  tableFromData({

    data: topRight.map(r => ({

      "Kommun":
        r.kommun,

      "Höger 2018 (%)":
        r.hoger2018.toFixed(1),

      "Höger 2022 (%)":
        r.hoger2022.toFixed(1),

      "Skifte mot höger (p.e.)":
        "+" + r.shift.toFixed(2),

      "Medelinkomst 2022 (tkr)":
        Math.round(r.income),

      "Medelålder 2022 (år)":
        r.age.toFixed(1),

      "Antal tätorter":
        r.urban

    })),

    columnNames: [
      "Kommun",
      "Höger 2018 (%)",
      "Höger 2022 (%)",
      "Skifte mot höger (p.e.)",
      "Medelinkomst 2022 (tkr)",
      "Medelålder 2022 (år)",
      "Antal tätorter"
    ],

    fixedHeader: true

  });

  addMdToPage(`
### Störst rörelse mot vänster (Top 10)
`);

  tableFromData({

    data: topLeft.map(r => ({

      "Kommun":
        r.kommun,

      "Höger 2018 (%)":
        r.hoger2018.toFixed(1),

      "Höger 2022 (%)":
        r.hoger2022.toFixed(1),

      "Skifte mot vänster (p.e.)":
        r.shift.toFixed(2),

      "Medelinkomst 2022 (tkr)":
        Math.round(r.income),

      "Medelålder 2022 (år)":
        r.age.toFixed(1),

      "Antal tätorter":
        r.urban

    })),

    columnNames: [
      "Kommun",
      "Höger 2018 (%)",
      "Höger 2022 (%)",
      "Skifte mot vänster (p.e.)",
      "Medelinkomst 2022 (tkr)",
      "Medelålder 2022 (år)",
      "Antal tätorter"
    ],

    fixedHeader: true

  });

  // Statistical interpretation

  addMdToPage(`
## Statistisk tolkning

| Faktor | r | r² | Samband | Riktning |
|---|---|---|---|---|
| Medelinkomst | ${rIncome.toFixed(3)} | ${rSqIncome}% | ${korrelationBeskrivning(rIncome)} | ${riktning(rIncome)} |
| Medelålder | ${rAge.toFixed(3)} | ${rSqAge}% | ${korrelationBeskrivning(rAge)} | ${riktning(rAge)} |
| Urbanitet | ${rUrban.toFixed(3)} | ${rSqUrban}% | ${korrelationBeskrivning(rUrban)} | ${riktning(rUrban)} |

**r** = korrelationskoefficient (styrkan på sambandet)

**r²** = förklaringsgrad (hur stor andel av variationen i politiskt skifte som förklaras av faktorn)

Korrelationerna beskriver statistiska samband på kommunnivå — inte direkta orsaker.
  `);

  // Conclusion

  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Slutsats

Analysen av ${analysis.length} kommuner visar att socioekonomiska faktorer har
**${korrelationBeskrivning(rIncome)}** samband med politiska skiften mellan 2018 och 2022.

- **Medelinkomst** (r = ${rIncome.toFixed(3)}, r² = ${rSqIncome}%):
  ${korrelationBeskrivning(rIncome)} samband

- **Medelålder** (r = ${rAge.toFixed(3)}, r² = ${rSqAge}%):
  ${korrelationBeskrivning(rAge)} samband

- **Urbanitet** (r = ${rUrban.toFixed(3)}, r² = ${rSqUrban}%):
  ${korrelationBeskrivning(rUrban)} samband

Korrelationerna visar statistiska samband men innebär inte att faktorerna
orsakar väljarnas politiska förändringar.

</div>
  `);

  // Methodological note

  addMdToPage(`
<div style="
  background:#FEF9C3;
  padding:30px;
  border-radius:16px;
  margin-top:30px;
  border-left:8px solid #CA8A04;
">

## Metodnotering – Varför används år-specifika block?

I denna analys används olika blockindelningar för 2018 och 2022
eftersom partikonstellationerna förändrades mellan valen.

### Centerpartiet – det avgörande skiftet

| Valår | Position | Block i analysen |
|---|---|---|
| 2018 | Stödde Löfven-regeringen | Vänsterblocket |
| 2022 | Ingick i Tidöavtalet | Högerblocket |

Om samma fasta block hade använts för båda åren
skulle en del av förändringen spegla Centerpartiets
blockbyte istället för väljarnas faktiska rörelser.

</div>
  `);

}