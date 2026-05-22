import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ─── INTRO ───────────────────────────────────────────────────────────────

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

> **Viktigt:** Blockindelningen är **år-specifik** — Centerpartiet
> räknas till vänsterblocket 2018 (stödde Löfven-regeringen) men till
> högerblocket 2022 (ingick i Tidöavtalet). Se metodnotering längst ner.

</div>
  `);

  // ─── HELPER FUNCTIONS ────────────────────────────────────────────────────

  function normalizeKommun(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace("strängns", "strängnäs");
  }

  function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  function standardDeviation(arr) {
    if (arr.length < 2) return 0;
    const m        = mean(arr);
    const variance = mean(arr.map(v => (v - m) ** 2));
    return Math.sqrt(variance);
  }

  // ─── KOMMUN → LÄN ────────────────────────────────────────────────────────

  const kommunToLan = new Map(
    lanKommun.map(r => [normalizeKommun(r.kommun), r.lan])
  );

  // ─── YEAR-SPECIFIC BLOCK DEFINITIONS ─────────────────────────────────────
  // This is the key methodological fix:
  // Centerpartiet supported the left government (Löfven) in 2018
  // but joined the right Tidö agreement in 2022.
  // Using fixed blocks would give misleading shift calculations.

  const hogerBlock2018 = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna"
    // Centerpartiet NOT included in 2018 höger
  ];

  const vansterBlock2018 = [
    "Socialdemokraterna",
    "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet",
    "Centerpartiet"  // supported Löfven government 2018
  ];

  const hogerBlock2022 = [
    "Moderaterna",
    "Kristdemokraterna",
    "Liberalerna",
    "Sverigedemokraterna",
    "Centerpartiet"  // joined Tidö agreement 2022
  ];

  const vansterBlock2022 = [
    "Socialdemokraterna",
    "Arbetarepartiet-Socialdemokraterna",
    "Vänsterpartiet",
    "Miljöpartiet"
    // Centerpartiet NOT included in 2022 vänster
  ];

  // ─── AGGREGATE VOTES PER LÄN ─────────────────────────────────────────────

  const lanStats = new Map();

  electionResults.forEach(row => {
    const kommun = normalizeKommun(row.kommun);
    const lan    = kommunToLan.get(kommun);
    if (!lan) return;

    if (!lanStats.has(lan)) {
      lanStats.set(lan, {
        total2018:   0, total2022:   0,
        hoger2018:   0, hoger2022:   0,
        vanster2018: 0, vanster2022: 0
      });
    }

    const stats     = lanStats.get(lan);
    const votes2018 = Number(row.roster2018 || 0);
    const votes2022 = Number(row.roster2022 || 0);

    stats.total2018 += votes2018;
    stats.total2022 += votes2022;

    // Use year-specific blocks for each year
    if (hogerBlock2018.includes(row.parti))   stats.hoger2018   += votes2018;
    if (vansterBlock2018.includes(row.parti)) stats.vanster2018 += votes2018;
    if (hogerBlock2022.includes(row.parti))   stats.hoger2022   += votes2022;
    if (vansterBlock2022.includes(row.parti)) stats.vanster2022 += votes2022;
  });

  // ─── CALCULATE SHIFTS ────────────────────────────────────────────────────

  const regionalShift = [];

  lanStats.forEach((stats, lan) => {
    if (stats.total2018 === 0 || stats.total2022 === 0) return;

    const hogerShare2018   = (stats.hoger2018   / stats.total2018) * 100;
    const hogerShare2022   = (stats.hoger2022   / stats.total2022) * 100;
    const vansterShare2018 = (stats.vanster2018 / stats.total2018) * 100;
    const vansterShare2022 = (stats.vanster2022 / stats.total2022) * 100;
    const hogerDiff        = hogerShare2022  - hogerShare2018;
    const vansterDiff      = vansterShare2022 - vansterShare2018;
    const netShift         = hogerDiff - vansterDiff;

    regionalShift.push({
      lan,
      hogerShare2018, hogerShare2022,
      vansterShare2018, vansterShare2022,
      hogerDiff, vansterDiff, netShift
    });
  });

  regionalShift.sort((a, b) => b.netShift - a.netShift);

  // ─── STATISTICS ───────────────────────────────────────────────────────────

  const allShifts  = regionalShift.map(r => r.netShift);
  const meanShift  = mean(allShifts);
  const stdShift   = standardDeviation(allShifts);
  const maxShift   = Math.max(...allShifts);
  const minShift   = Math.min(...allShifts);

  const strongestRight = regionalShift[0];
  const strongestLeft  = [...regionalShift].sort((a, b) => a.netShift - b.netShift)[0];

  // ─── KPI CARDS ───────────────────────────────────────────────────────────

  addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#2563EB;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">STARKAST HÖGERSKIFTE</div>
  <div style="font-size:24px;font-weight:bold;">${strongestRight.lan}</div>
  <div style="font-size:18px;margin-top:4px;">+${strongestRight.netShift.toFixed(2)} p.e.</div>
</div>

<div style="background:#DC2626;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">STARKAST VÄNSTERSKIFTE</div>
  <div style="font-size:24px;font-weight:bold;">${strongestLeft.lan}</div>
  <div style="font-size:18px;margin-top:4px;">${strongestLeft.netShift.toFixed(2)} p.e.</div>
</div>

<div style="background:#1e3a5f;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">GENOMSNITTLIGT SKIFTE</div>
  <div style="font-size:28px;font-weight:bold;">${meanShift >= 0 ? "+" : ""}${meanShift.toFixed(2)} p.e.</div>
  <div style="font-size:13px;opacity:0.85;">${meanShift >= 0 ? "Övergripande rörelse mot höger" : "Övergripande rörelse mot vänster"}</div>
</div>

<div style="background:#7C3AED;padding:24px;border-radius:16px;color:white;">
  <div style="font-size:13px;opacity:0.8;">STANDARDAVVIKELSE</div>
  <div style="font-size:28px;font-weight:bold;">${stdShift.toFixed(2)}</div>
  <div style="font-size:13px;opacity:0.85;">Spridning mellan länens skiften</div>
</div>

</div>
  `);

  // ─── CHART: NET SHIFT PER LÄN ────────────────────────────────────────────

  addMdToPage(`## Nettoförändring per län (högerblock minus vänsterblock)`);

  const chartData = [["Län", "Nettoförändring", { role: "style" }, { role: "annotation" }]];
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
      title: "Nettoförändring mellan höger- och vänsterblock per län (2018 → 2022)",
      height: 550,
      legend: "none",
      chartArea: { left: 70, right: 30, top: 70, bottom: 120 },
      hAxis: { title: "Län", slantedText: true, slantedTextAngle: 45 },
      vAxis: { title: "Förändring i procentenheter" },
      annotations: { alwaysOutside: true }
    }
  });

  // ─── CHART: HÖGER SHARE 2018 VS 2022 ─────────────────────────────────────

  addMdToPage(`## Högerblockets röstandel per län – 2018 vs 2022`);

  const hogerChartData = [["Län", "Höger 2018 (%)", "Höger 2022 (%)"]];
  [...regionalShift]
    .sort((a, b) => b.hogerShare2022 - a.hogerShare2022)
    .forEach(r => {
      hogerChartData.push([r.lan, r.hogerShare2018, r.hogerShare2022]);
    });

  drawGoogleChart({
    type: "BarChart",
    data: hogerChartData,
    options: {
      title: "Högerblockets röstandel per län – 2018 och 2022",
      height: 550,
      colors: ["#93C5FD", "#2563EB"],
      chartArea: { left: 180, right: 60, top: 60, bottom: 40 },
      legend: { position: "top" },
      hAxis: { title: "Röstandel (%)" },
      vAxis: { title: "Län" }
    }
  });

  // ─── CHART: VÄNSTER SHARE 2018 VS 2022 ───────────────────────────────────

  addMdToPage(`## Vänsterblockets röstandel per län – 2018 vs 2022`);

  const vansterChartData = [["Län", "Vänster 2018 (%)", "Vänster 2022 (%)"]];
  [...regionalShift]
    .sort((a, b) => b.vansterShare2022 - a.vansterShare2022)
    .forEach(r => {
      vansterChartData.push([r.lan, r.vansterShare2018, r.vansterShare2022]);
    });

  drawGoogleChart({
    type: "BarChart",
    data: vansterChartData,
    options: {
      title: "Vänsterblockets röstandel per län – 2018 och 2022",
      height: 550,
      colors: ["#FCA5A5", "#DC2626"],
      chartArea: { left: 180, right: 60, top: 60, bottom: 40 },
      legend: { position: "top" },
      hAxis: { title: "Röstandel (%)" },
      vAxis: { title: "Län" }
    }
  });

  // ─── DETAILED TABLE ───────────────────────────────────────────────────────

  addMdToPage(`## Regional statistik – fullständig tabell`);

  tableFromData({
    data: regionalShift.map(r => ({
      "Län":               r.lan,
      "Höger 2018 (%)":    r.hogerShare2018.toFixed(2),
      "Höger 2022 (%)":    r.hogerShare2022.toFixed(2),
      "Höger Δ (p.e.)":    (r.hogerDiff >= 0 ? "+" : "") + r.hogerDiff.toFixed(2),
      "Vänster 2018 (%)":  r.vansterShare2018.toFixed(2),
      "Vänster 2022 (%)":  r.vansterShare2022.toFixed(2),
      "Vänster Δ (p.e.)":  (r.vansterDiff >= 0 ? "+" : "") + r.vansterDiff.toFixed(2),
      "Nettoskifte (p.e.)": (r.netShift >= 0 ? "+" : "") + r.netShift.toFixed(2),
      "Trend":             r.netShift > 0 ? "Höger" : r.netShift < 0 ? "Vänster" : "Neutral"
    })),
    columnNames: [
      "Län",
      "Höger 2018 (%)", "Höger 2022 (%)", "Höger Δ (p.e.)",
      "Vänster 2018 (%)", "Vänster 2022 (%)", "Vänster Δ (p.e.)",
      "Nettoskifte (p.e.)", "Trend"
    ],
    fixedHeader: true
  });

  // ─── STATISTICAL SUMMARY ─────────────────────────────────────────────────

  addMdToPage(`
## Statistisk sammanfattning

| Mått | Värde | Tolkning |
|---|---|---|
| Genomsnittligt nettoskifte | ${meanShift >= 0 ? "+" : ""}${meanShift.toFixed(2)} p.e. | ${meanShift >= 0 ? "Övergripande rörelse mot höger" : "Övergripande rörelse mot vänster"} |
| Standardavvikelse | ${stdShift.toFixed(2)} | Spridning mellan länens skiften |
| Största högerskifte | +${maxShift.toFixed(2)} p.e. | ${strongestRight.lan} |
| Största vänsterskifte | ${minShift.toFixed(2)} p.e. | ${strongestLeft.lan} |
| Spann (max − min) | ${(maxShift - minShift).toFixed(2)} p.e. | Total politisk variation mellan länen |

**Tolkning av standardavvikelsen (${stdShift.toFixed(2)}):**
En hög standardavvikelse innebär att länen förändrades på väldigt olika sätt —
vissa tydligt mot höger, andra mot vänster. Det finns alltså ingen enhetlig
nationell trend utan tydliga regionala skillnader.
  `);

  // ─── SLUTSATS ─────────────────────────────────────────────────────────────

  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Slutsats

Analysen visar att Sveriges politiska utveckling mellan riksdagsvalen
2018 och 2022 inte var geografiskt jämnt fördelad.

- Det genomsnittliga nettoskiftet var **${meanShift >= 0 ? "+" : ""}${meanShift.toFixed(2)} procentenheter** —
  en ${meanShift >= 0 ? "rörelse mot höger" : "rörelse mot vänster"} på nationell nivå
- Standardavvikelsen på **${stdShift.toFixed(2)}** visar att länen förändrades mycket olika
- **${strongestRight.lan}** hade det starkaste högerskiftet (+${strongestRight.netShift.toFixed(2)} p.e.)
- **${strongestLeft.lan}** hade det starkaste vänsterskiftet (${strongestLeft.netShift.toFixed(2)} p.e.)
- Spannet mellan extremerna var **${(maxShift - minShift).toFixed(2)} procentenheter** —
  vilket visar på betydande regional variation

Genom att använda röstandelar istället för absoluta röster blir
jämförelserna statistiskt rättvisa mellan stora och små län.

</div>
  `);

  // ─── METHODOLOGY NOTE ────────────────────────────────────────────────────
  // This is the key section — explains the year-specific block decision

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

### Centerpartiet – det avgörande skiftet

| Valår | Centerpartiets position | Blocktillhörighet i denna analys |
|---|---|---|
| **2018** | Stödde Stefan Löfvens S-MP-regering via Januariavtalet | Vänsterblocket |
| **2022** | Ingick i Tidöavtalet med M, KD, L och SD | Högerblocket |

### Varför spelar detta roll?

Om vi hade använt **samma fasta block för båda åren** skulle vi jämföra
**politiskt olikartade storlekar**:

- Höger 2018 (utan C) vs Höger 2022 (med C) — inte en rättvis jämförelse
- Skiftet skulle delvis spegla Centerpartiets byte av sida, inte väljarnas röstbeteende

Med **år-specifika block** mäter vi istället den faktiska förändringen i
väljarstöd för de politiska konstellationer som faktiskt styrde eller
utgjorde opposition under respektive mandatperiod.

### Konsekvens för resultaten

Att använda korrekta block ger **mer tillförlitliga skiftmätningar** —
nettoförändringen återspeglar genuina väljarförändringar snarare än
metodologiska artefakter orsakade av partiernas egna politiska ompositioneringar.

</div>


  `);

}