import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // INTRO

  addMdToPage(`
# Ålder vs Röstning (2018 och 2022)

<div style="
  background:#F1F5F9;
  padding:30px;
  border-radius:16px;
  margin-top:20px;
  border-left:8px solid #192c4e;
">

## Forskningsfråga: Finns det ett geografiskt samband mellan en kommuns åldersstruktur och dess röstningsmönster?

Denna sida undersöker om kommuner med hög medelålder röstar annorlunda än kommuner med låg medelålder
— och om detta geografiska mönster förändrades mellan 2018 och 2022.

Analysen visar:

- Om kommuner med hög medelålder tenderar att ha högre stöd för höger- eller vänsterblocket
- Om detta geografiska samband stärktes eller försvagades mellan 2018 och 2022
- Vilket parti som är starkast kopplat till kommuners åldersstruktur

</div>

> **Metodnotering:** Denna analys bygger på aggregerad kommundata — medelåldern bland *invånare*
> kombineras med *totala röster* per parti per kommun.
> Vi kan därför uttala oss om **kommuners geografiska mönster**, inte om hur enskilda
> åldersgrupper röstar individuellt. Detta är en viktig distinktion i all aggregerad statistik.
  `);

  // DROPDOWN — only län

  const unikaLan = [...new Set(lanKommun.map(lk => lk.lan))].sort();
  let valtLan    = addDropdown("Välj län:", ["Alla län", ...unikaLan]);

  // HELPER FUNCTIONS 

  function hamtaLanForKommun(kommunNamn) {
    const match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

  function hamtaMedelalderForKommun(kommunNamn, ar) {
    let rader = ages.filter(a =>
      a.kommun === kommunNamn &&
      (a.kon === "totalt" || a.kon === "Totalt")
    );
    if (!rader.length) rader = ages.filter(a => a.kommun === kommunNamn);
    if (!rader.length) return null;

    const aldrar = rader.map(r =>
      ar === "2018"
        ? Number(r.medelalderAr2018) || 0
        : Number(r.medelalderAr2022) || 0
    ).filter(v => v > 0);

    if (!aldrar.length) return null;
    return aldrar.reduce((a, b) => a + b, 0) / aldrar.length;
  }

  function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  function sampleCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) return 0;
    const n     = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
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

  function korrelationBeskrivning(r) {
    const abs = Math.abs(r);
    if (abs >= 0.5) return "starkt";
    if (abs >= 0.3) return "måttligt";
    if (abs >= 0.1) return "svagt";
    return "nästan inget";
  }

  // BLOCK DEFINITIONS

  const hogerPartier   = ["Moderaterna", "Kristdemokraterna", "Liberalerna", "Sverigedemokraterna", "Centerpartiet"];
  const vansterPartier = ["Socialdemokraterna", "Arbetarepartiet-Socialdemokraterna", "Miljöpartiet", "Vänsterpartiet"];

  // FILTER DATA 

  const filtreradVal = valtLan !== "Alla län"
    ? electionResults.filter(v => hamtaLanForKommun(v.kommun) === valtLan)
    : electionResults;

  // BUILD DATA FOR BOTH YEARS

  function byggKommunData(ar) {
    const unikaKommuner = [...new Set(filtreradVal.map(v => v.kommun))];
    const data = [];

    unikaKommuner.forEach(kommun => {
      const medelAlder = hamtaMedelalderForKommun(kommun, ar);
      if (!medelAlder) return;

      const kommunVal   = filtreradVal.filter(v => v.kommun === kommun);
      const totalRoster = kommunVal.reduce((sum, v) =>
        sum + Number(ar === "2018" ? v.roster2018 : v.roster2022), 0
      );
      if (totalRoster === 0) return;

      const partiData = {};
      kommunVal.forEach(v => {
        const roster = Number(ar === "2018" ? v.roster2018 : v.roster2022);
        partiData[v.parti] = (roster / totalRoster) * 100;
      });

      const hogerBlock   = hogerPartier.reduce((sum, p) => sum + Number(partiData[p] || 0), 0);
      const vansterBlock = vansterPartier.reduce((sum, p) => sum + Number(partiData[p] || 0), 0);

      data.push({
        kommun,
        medelAlder,
        lan: hamtaLanForKommun(kommun),
        hogerBlock,
        vansterBlock,
        totalRoster,
        ...partiData
      });
    });

    return data;
  }

  const data2018 = byggKommunData("2018");
  const data2022 = byggKommunData("2022");

  if (!data2018.length || !data2022.length) {
    addMdToPage(`> Ingen data hittades för valt län.`);
  } else {

    // CORRELATION CALCULATIONS

    const r_hoger_2018   = sampleCorrelation(data2018.map(d => d.medelAlder), data2018.map(d => d.hogerBlock));
    const r_hoger_2022   = sampleCorrelation(data2022.map(d => d.medelAlder), data2022.map(d => d.hogerBlock));
    const r_vanster_2018 = sampleCorrelation(data2018.map(d => d.medelAlder), data2018.map(d => d.vansterBlock));
    const r_vanster_2022 = sampleCorrelation(data2022.map(d => d.medelAlder), data2022.map(d => d.vansterBlock));

    const hogerStarkare   = Math.abs(r_hoger_2022) > Math.abs(r_hoger_2018);
    const vansterStarkare = Math.abs(r_vanster_2022) > Math.abs(r_vanster_2018);

    // Median split using 2022 as reference
    const aldarArr2022    = data2022.map(d => d.medelAlder);
    const sorted2022      = [...aldarArr2022].sort((a, b) => a - b);
    const mid             = Math.floor(sorted2022.length / 2);
    const medianAlder2022 = sorted2022.length % 2 === 0
      ? (sorted2022[mid - 1] + sorted2022[mid]) / 2
      : sorted2022[mid];

    function grupperaData(data) {
      const lagAlder  = data.filter(d => d.medelAlder < medianAlder2022);
      const hogAlder  = data.filter(d => d.medelAlder >= medianAlder2022);
      return {
        avgHogerLag:    mean(lagAlder.map(d => d.hogerBlock)),
        avgVansterLag:  mean(lagAlder.map(d => d.vansterBlock)),
        avgHogerHog:    mean(hogAlder.map(d => d.hogerBlock)),
        avgVansterHog:  mean(hogAlder.map(d => d.vansterBlock)),
        lagCount: lagAlder.length,
        hogCount: hogAlder.length
      };
    }

    const grupp2018 = grupperaData(data2018);
    const grupp2022 = grupperaData(data2022);

    // KPI CARDS 

    addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#1e3a5f;color:white;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">KOMMUNER ANALYSERADE</div>
  <div style="font-size:28px;font-weight:bold;">${data2022.length}</div>
</div>

<div style="background:#2563EB;color:white;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">SAMBAND ÅLDERSSTRUKTUR → HÖGER</div>
  <div style="font-size:20px;font-weight:bold;">2018: r = ${r_hoger_2018.toFixed(3)}</div>
  <div style="font-size:20px;font-weight:bold;">2022: r = ${r_hoger_2022.toFixed(3)}</div>
  <div style="font-size:13px;opacity:0.85;">Sambandet ${hogerStarkare ? "stärktes" : "försvagades"}</div>
</div>

<div style="background:#DC2626;color:white;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">SAMBAND ÅLDERSSTRUKTUR → VÄNSTER</div>
  <div style="font-size:20px;font-weight:bold;">2018: r = ${r_vanster_2018.toFixed(3)}</div>
  <div style="font-size:20px;font-weight:bold;">2022: r = ${r_vanster_2022.toFixed(3)}</div>
  <div style="font-size:13px;opacity:0.85;">Sambandet ${vansterStarkare ? "stärktes" : "försvagades"}</div>
</div>

<div style="background:#059669;color:white;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">MEDIANGRÄNS (MEDELÅLDER)</div>
  <div style="font-size:28px;font-weight:bold;">${medianAlder2022.toFixed(1)} år</div>
  <div style="font-size:13px;opacity:0.85;">
    Låg medelålder: ${grupp2022.lagCount} kommuner |
    Hög medelålder: ${grupp2022.hogCount} kommuner
  </div>
</div>

</div>
    `);

    // DIAGRAM 1: HIGH VS LOW AGE BLOCK COMPARISON

    addMdToPage(`## Kommuner med hög vs låg medelålder – blockröstning 2018 och 2022

Kommunerna delas vid mediangränsen **${medianAlder2022.toFixed(1)} år** i medelålder.
Varje grupp visas för båda valen så att förändringen syns direkt.
    `);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Grupp", "Högerblock 2018", "Högerblock 2022", "Vänsterblock 2018", "Vänsterblock 2022"],
        [
          `Låg medelålder\n(under ${medianAlder2022.toFixed(1)} år)`,
          grupp2018.avgHogerLag, grupp2022.avgHogerLag,
          grupp2018.avgVansterLag, grupp2022.avgVansterLag
        ],
        [
          `Hög medelålder\n(${medianAlder2022.toFixed(1)} år och över)`,
          grupp2018.avgHogerHog, grupp2022.avgHogerHog,
          grupp2018.avgVansterHog, grupp2022.avgVansterHog
        ]
      ],
      options: {
        title: "Genomsnittligt blockstöd – kommuner med hög vs låg medelålder (2018 och 2022)",
        height: 450,
        colors: ["#93C5FD", "#2563EB", "#FCA5A5", "#DC2626"],
        chartArea: { left: 70, right: 20, top: 60, bottom: 80 },
        legend: { position: "top" },
        hAxis: { title: "Kommungrupp (medelålder)" },
        vAxis: { title: "Röstandel (%)", minValue: 0, maxValue: 100 }
      }
    });

    const hogerSkift2018 = grupp2018.avgHogerHog - grupp2018.avgHogerLag;
    const hogerSkift2022 = grupp2022.avgHogerHog - grupp2022.avgHogerLag;

    addMdToPage(`
**Analys:**
- I **2018**: kommuner med hög medelålder hade **${hogerSkift2018 > 0 ? hogerSkift2018.toFixed(1) + "% högre" : Math.abs(hogerSkift2018).toFixed(1) + "% lägre"}** stöd för högerblocket än kommuner med låg medelålder
- I **2022**: samma skillnad var **${hogerSkift2022 > 0 ? hogerSkift2022.toFixed(1) + "%" : Math.abs(hogerSkift2022).toFixed(1) + "%"}**
- Det geografiska sambandet mellan åldersstruktur och högerröstning är **${korrelationBeskrivning(r_hoger_2022)}** (r: ${r_hoger_2018.toFixed(3)} → ${r_hoger_2022.toFixed(3)})
- Sambandet **${hogerStarkare ? "stärktes" : "försvagades"}** mellan valen — åldersstrukturen blev en **${hogerStarkare ? "starkare" : "svagare"}** geografisk prediktor för högerröstning
    `);

    // DIAGRAM 2: CORRELATION PER PARTI BOTH YEARS

    addMdToPage(`## Geografiskt samband per parti – 2018 vs 2022

Diagrammet visar korrelationskoefficienten (r) mellan kommuners medelålder och stödet för varje parti.
- **Positivt r** → partiet är geografiskt starkare i kommuner med hög medelålder
- **Negativt r** → partiet är geografiskt starkare i kommuner med låg medelålder
    `);

    const allaParter = [...new Set(electionResults.map(v => v.parti))].sort();

    const korrelationsPerParti = allaParter.map(parti => {
      const r2018 = sampleCorrelation(
        data2018.map(d => d.medelAlder),
        data2018.map(d => Number(d[parti] || 0))
      );
      const r2022 = sampleCorrelation(
        data2022.map(d => d.medelAlder),
        data2022.map(d => Number(d[parti] || 0))
      );
      return {
        parti,
        r2018: isNaN(r2018) ? 0 : r2018,
        r2022: isNaN(r2022) ? 0 : r2022
      };
    }).sort((a, b) => b.r2022 - a.r2022);

    const korrelationsChartData = [["Parti", "Samband 2018", "Samband 2022"]];
    korrelationsPerParti.forEach(d => {
      korrelationsChartData.push([d.parti, d.r2018, d.r2022]);
    });

    drawGoogleChart({
      type: "BarChart",
      data: korrelationsChartData,
      options: {
        title: "Geografiskt samband: Kommuners medelålder vs Partistöd – 2018 och 2022",
        height: 450,
        colors: ["#93C5FD", "#1e3a5f"],
        chartArea: { left: 240, right: 80, top: 60, bottom: 40 },
        legend: { position: "top" },
        hAxis: {
          title: "Korrelationskoefficient (r)",
          viewWindow: { min: -1, max: 1 },
          gridlines: { count: 5 }
        },
        vAxis: { title: "Parti" }
      }
    });

    const starkastPositiv = korrelationsPerParti[0];
    const starkastNegativ = korrelationsPerParti[korrelationsPerParti.length - 1];
    const stortSkift      = korrelationsPerParti.reduce((prev, curr) =>
      Math.abs(curr.r2022 - curr.r2018) > Math.abs(prev.r2022 - prev.r2018) ? curr : prev
    );

    addMdToPage(`
**Analys:**
- **${starkastPositiv.parti}** är geografiskt starkast i kommuner med hög medelålder (r = ${starkastPositiv.r2022.toFixed(3)} i 2022)
- **${starkastNegativ.parti}** är geografiskt starkast i kommuner med låg medelålder (r = ${starkastNegativ.r2022.toFixed(3)} i 2022)
- **${stortSkift.parti}** visade störst förändring i geografiskt samband mellan valen (${stortSkift.r2018.toFixed(3)} → ${stortSkift.r2022.toFixed(3)})
    `);

    //DIAGRAM 3: TOP 10 HIGH VS LOW AGE KOMMUNER

    addMdToPage(`## De 10 kommunerna med högst vs lägst medelålder – blockjämförelse 2018 och 2022`);

    const top10hog  = [...data2022].sort((a, b) => b.medelAlder - a.medelAlder).slice(0, 10);
    const top10lag  = [...data2022].sort((a, b) => a.medelAlder - b.medelAlder).slice(0, 10);

    function matchData2018(kommunNamn) {
      return data2018.find(d => d.kommun === kommunNamn);
    }

    const hogChartData = [["Kommun", "Höger 2018", "Höger 2022", "Vänster 2018", "Vänster 2022"]];
    top10hog.forEach(d => {
      const d18 = matchData2018(d.kommun);
      if (!d18) return;
      hogChartData.push([
        `${d.kommun} (${d.medelAlder.toFixed(1)} år)`,
        d18.hogerBlock, d.hogerBlock,
        d18.vansterBlock, d.vansterBlock
      ]);
    });

    drawGoogleChart({
      type: "BarChart",
      data: hogChartData,
      options: {
        title: "De 10 kommunerna med högst medelålder – blockröstning 2018 vs 2022",
        height: 420,
        colors: ["#FCA5A5", "#DC2626", "#93C5FD", "#2563EB"],
        chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
        hAxis: { title: "Röstandel (%)" },
        vAxis: { title: "Kommun (medelålder)" },
        legend: { position: "top" }
      }
    });

    const lagChartData = [["Kommun", "Höger 2018", "Höger 2022", "Vänster 2018", "Vänster 2022"]];
    top10lag.forEach(d => {
      const d18 = matchData2018(d.kommun);
      if (!d18) return;
      lagChartData.push([
        `${d.kommun} (${d.medelAlder.toFixed(1)} år)`,
        d18.hogerBlock, d.hogerBlock,
        d18.vansterBlock, d.vansterBlock
      ]);
    });

    drawGoogleChart({
      type: "BarChart",
      data: lagChartData,
      options: {
        title: "De 10 kommunerna med lägst medelålder – blockröstning 2018 vs 2022",
        height: 420,
        colors: ["#FCA5A5", "#DC2626", "#93C5FD", "#2563EB"],
        chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
        hAxis: { title: "Röstandel (%)" },
        vAxis: { title: "Kommun (medelålder)" },
        legend: { position: "top" }
      }
    });

    // FULL TABLE 

    addMdToPage(`## Alla kommuner – åldersstruktur och blockröstning (2018 och 2022)`);

    const tabellData = data2022.map(d => {
      const d18 = matchData2018(d.kommun) || {};
      return {
        "Kommun": d.kommun,
        "Län": d.lan,
        "Medelålder": d.medelAlder.toFixed(1),
        "Höger 2018 (%)": (d18.hogerBlock || 0).toFixed(1),
        "Höger 2022 (%)": d.hogerBlock.toFixed(1),
        "Vänster 2018 (%)": (d18.vansterBlock || 0).toFixed(1),
        "Vänster 2022 (%)": d.vansterBlock.toFixed(1),
        "S (%)": (d["Socialdemokraterna"] || d["Arbetarepartiet-Socialdemokraterna"] || 0).toFixed(1),
        "M (%)": (d["Moderaterna"] || 0).toFixed(1),
        "SD (%)": (d["Sverigedemokraterna"] || 0).toFixed(1)
      };
    }).sort((a, b) => parseFloat(b["Medelålder"]) - parseFloat(a["Medelålder"]));

    tableFromData({
      data: tabellData,
      columnNames: [
        "Kommun", "Län", "Medelålder",
        "Höger 2018 (%)", "Höger 2022 (%)",
        "Vänster 2018 (%)", "Vänster 2022 (%)",
        "S (%)", "M (%)", "SD (%)"
      ],
      fixedHeader: true
    });

    // KAUSALITETSDISKUSSION

    addMdToPage(`
## Varför ser vi dessa geografiska mönster?

Sambandet mellan kommuners åldersstruktur och röstningsmönster kan förklaras av flera faktorer:

| Förklaring | Beskrivning |
|---|---|
| **Geografisk selektion** | Yngre personer tenderar att flytta till städer, äldre bor kvar på landsbygden — detta skapar geografiska mönster oberoende av individuell ålder |
| **Kommunal sammansättning** | Kommuner med hög medelålder har fler pensionärer som en grupp prioriterar annan politik |
| **Urbaniseringseffekt** | Städer med låg medelålder har också högre utbildningsnivå och inkomst — ålder är samkorrelerat med andra faktorer |
| **Historiska mönster** | Vissa regioner har traditionellt starka partibindningar som sammanfaller med åldersstrukturen |

Observera att dessa är **geografiska mönster på kommunnivå** — de säger inte nödvändigtvis något om hur enskilda individer i olika åldrar röstar.
    `);

    // SLUTSATS

    addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">

## Slutsats – Förändrades det geografiska sambandet mellan 2018 och 2022?

Analysen visar ett **${korrelationBeskrivning(r_hoger_2022)}** geografiskt samband mellan kommuners medelålder och högerblockets röstandel.

- Samband åldersstruktur → högerblocket: **r = ${r_hoger_2018.toFixed(3)} (2018)** → **r = ${r_hoger_2022.toFixed(3)} (2022)**
- Det geografiska sambandet **${hogerStarkare ? "stärktes" : "försvagades"}** mellan valen
- Kommuner med hög medelålder tenderar geografiskt att ha **${hogerSkift2022 > 0 ? "högre" : "lägre"}** stöd för högerblocket
- **${starkastPositiv.parti}** är geografiskt starkast kopplat till hög medelålder
- **${starkastNegativ.parti}** är geografiskt starkast kopplat till låg medelålder

**Viktig begränsning:** Dessa resultat gäller geografiska mönster på kommunnivå.
För att veta hur enskilda åldersgrupper röstar krävs individuell väljardata, exempelvis exitpolls.

</div>

    `);

  }

}