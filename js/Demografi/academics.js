import { educationInfo, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ─── INTRO ───

  addMdToPage(`
# 🎓 Utbildning & Röstning

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Hur påverkar utbildningsnivå röstningsmönster?

Denna sida undersöker sambandet mellan utbildningsnivå och politiska preferenser i Sveriges kommuner.
Vi analyserar:

- Hur utbildningsnivån är fördelad i Sverige
- Om kommuner med hög andel högskoleutbildade röstar annorlunda
- Vilka partier som är starkare i välutbildade vs lägre utbildade kommuner
- Statistiska samband och hypotesprövning

**Hypotes:** *Kommuner med hög andel högskoleutbildade röstar i högre utsträckning på partier i vänsterblocket.*

</div>
`);

  // ─── DROPDOWNS ───

  let valtAr = addDropdown("Välj valår:", ["2018", "2022"]);
  let valtKon = addDropdown("Filtrera efter kön:", ["Alla", "Män", "Kvinnor"]);

  // ─── HJÄLPFUNKTIONER ───

  function hamtaLanForKommun(kommunNamn) {
    let match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

  // Rensa och normalisera valdata från Neo4j
  function rensaValdata(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(item => {
        let node = item.n || item;
        let props = node.properties || node;
        return {
          kommun: props.kommun,
          parti: props.parti,
          roster2018: Number(props.roster2018) || 0,
          roster2022: Number(props.roster2022) || 0
        };
      });
    }
    if (raw.records) {
      return raw.records.map(r => {
        let props = r._fields[0].properties;
        return {
          kommun: props.kommun,
          parti: props.parti,
          roster2018: Number(props.roster2018) || 0,
          roster2022: Number(props.roster2022) || 0
        };
      });
    }
    return [];
  }

  // Statistiska hjälpfunktioner
  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function median(arr) {
    if (!arr.length) return 0;
    let sorted = [...arr].sort((a, b) => a - b);
    let mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function standardDeviation(arr) {
    if (arr.length < 2) return 0;
    let m = mean(arr);
    let variance = mean(arr.map(v => (v - m) ** 2));
    return Math.sqrt(variance);
  }

  function sampleCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) return 0;
    let n = x.length;
    let meanX = mean(x);
    let meanY = mean(y);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      let dx = x[i] - meanX;
      let dy = y[i] - meanY;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    let denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
  }

  // Enkelt t-test (Welch)
  function ttest2(arr1, arr2) {
    if (arr1.length < 2 || arr2.length < 2) return null;
    let m1 = mean(arr1);
    let m2 = mean(arr2);
    let s1 = standardDeviation(arr1);
    let s2 = standardDeviation(arr2);
    let n1 = arr1.length;
    let n2 = arr2.length;
    let se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
    if (se === 0) return null;
    let t = (m1 - m2) / se;
    let absT = Math.abs(t);
    function normalCDF(z) {
      let t2 = 1 / (1 + 0.2316419 * Math.abs(z));
      let d = 0.3989423 * Math.exp(-z * z / 2);
      let p = d * t2 * (0.3193815 + t2 * (-0.3565638 + t2 * (1.7814779 + t2 * (-1.8212560 + t2 * 1.3302744))));
      return z > 0 ? 1 - p : p;
    }
    let pValue = 2 * (1 - normalCDF(absT));
    return { tValue: t, pValue };
  }

  // ─── SEKTION 1: UTBILDNINGSNIVÅER NATIONELLT ───

  addMdToPage(`## 📊 Utbildningsnivåer i Sverige – nationell översikt`);

  // Definierade nivåer att aggregera
  let utbildningsNivaer = [
    "förgymnasial utbildning kortare än 9 år",
    "förgymnasial utbildning, 9 (10) år",
    "gymnasial utbildning, högst 2 år",
    "gymnasial utbildning, 3 år",
    "eftergymnasial utbildning, mindre än 3 år",
    "eftergymnasial utbildning, 3 år eller mer",
    "forskarutbildning"
  ];

  // Korta etiketter för diagrammen
  let nivaEtiketter = {
    "förgymnasial utbildning kortare än 9 år": "Förgymnasial <9 år",
    "förgymnasial utbildning, 9 (10) år": "Förgymnasial 9 år",
    "gymnasial utbildning, högst 2 år": "Gymnasial ≤2 år",
    "gymnasial utbildning, 3 år": "Gymnasial 3 år",
    "eftergymnasial utbildning, mindre än 3 år": "Eftergymn. <3 år",
    "eftergymnasial utbildning, 3 år eller mer": "Eftergymn. 3+ år",
    "forskarutbildning": "Forskarutbildning"
  };

  // Filtrera på kön
  let filtreradUtb = educationInfo.filter(e => {
    if (valtKon === "Alla") return true;
    let konKey = valtKon === "Män" ? "män" : "kvinnor";
    return e.gender === konKey;
  });

  // Aggregera nationellt per utbildningsnivå
  let nationellUtbMap = new Map();
  filtreradUtb.forEach(e => {
    if (!utbildningsNivaer.includes(e.educationalLevel)) return;
    let niva = e.educationalLevel;
    if (!nationellUtbMap.has(niva)) nationellUtbMap.set(niva, { antal2018: 0, antal2022: 0 });
    let d = nationellUtbMap.get(niva);
    d.antal2018 += Number(e["2018"]) || 0;
    d.antal2022 += Number(e["2022"]) || 0;
  });

  if (!nationellUtbMap.size) {
    addMdToPage(`> ⚠️ Ingen utbildningsdata hittades för valt kön.`);
  } else {

    let nationellChartData = [["Utbildningsnivå", "2018", "2022"]];
    utbildningsNivaer.forEach(niva => {
      let d = nationellUtbMap.get(niva);
      if (d) {
        nationellChartData.push([nivaEtiketter[niva] || niva, d.antal2018, d.antal2022]);
      }
    });

    drawGoogleChart({
      type: "BarChart",
      data: nationellChartData,
      options: {
        title: `Antal personer per utbildningsnivå – nationellt (${valtKon})`,
        height: 500,
        chartArea: { left: 200, right: 60, top: 60, bottom: 50 },
        colors: ["#93C5FD", "#1e3a5f"],
        hAxis: { title: "Antal personer", format: "#,###" },
        vAxis: { title: "Utbildningsnivå" },
        legend: { position: "top" }
      }
    });

    addMdToPage(`
**Analys:** Fördelningen visar hur stora befolkningsgrupper finns på respektive utbildningsnivå.
Gymnasial utbildning är den vanligaste nivån. Noteringen "3 år eller mer" för eftergymnasial
utbildning inkluderar högskoleutbildade – en grupp som ofta studeras i politisk analys.
`);

    // ─── SEKTION 2: HÖGSKOLEUTBILDNING PER KOMMUN ───

    addMdToPage(`## 🗺️ Högskoleutbildning per kommun`);

    // Högskoleutbildade = "eftergymnasial utbildning, 3 år eller mer" + forskarutbildning
    let hogskolaPartier = [
      "eftergymnasial utbildning, 3 år eller mer",
      "forskarutbildning"
    ];

    // Aggregera högskoleutbildade per kommun
    let kommunUtbMap = new Map();
    filtreradUtb.forEach(e => {
      // educationInfo använder "municipality" som kolumnnamn
      let kommunNamn = e.municipality;
      if (!kommunNamn) return;
      let niva = e.educationalLevel;
      let arNyckel = valtAr === "2018" ? "2018" : "2022";
      let antal = Number(e[arNyckel]) || 0;

      if (!kommunUtbMap.has(kommunNamn)) {
        kommunUtbMap.set(kommunNamn, { hogskola: 0, totalt: 0 });
      }
      let d = kommunUtbMap.get(kommunNamn);

      // Räkna alla utbildningsnivåer som totalt
      if (utbildningsNivaer.includes(niva) || niva === "uppgift om utbildningsnivå saknas") {
        d.totalt += antal;
      }
      // Räkna högskoleutbildade separat
      if (hogskolaPartier.includes(niva)) {
        d.hogskola += antal;
      }
    });

    // Beräkna andel högskoleutbildade per kommun
    let kommunHogskola = Array.from(kommunUtbMap.entries())
      .map(([kommun, d]) => ({
        kommun,
        andelHogskola: d.totalt > 0 ? (d.hogskola / d.totalt) * 100 : 0,
        lan: hamtaLanForKommun(kommun)
      }))
      .filter(d => d.andelHogskola > 0);

    if (!kommunHogskola.length) {
      addMdToPage(`> ⚠️ Kunde inte beräkna högskoleandelar per kommun.`);
    } else {

      // Top/botten 15 kommuner per högskoleutbildning
      let sortadeHogskola = [...kommunHogskola].sort((a, b) => b.andelHogskola - a.andelHogskola);
      let top15Hogskola = sortadeHogskola.slice(0, 15);
      let botten15Hogskola = sortadeHogskola.slice(-15).reverse();

      addMdToPage(`### De 15 kommunerna med högst andel högskoleutbildade (${valtAr}, ${valtKon})`);

      let chartTop15 = [["Kommun", "Andel högskoleutbildade (%)", { role: "style" }]];
      top15Hogskola.forEach(d => {
        chartTop15.push([d.kommun, d.andelHogskola, "color:#7C3AED"]);
      });

      drawGoogleChart({
        type: "BarChart",
        data: chartTop15,
        options: {
          title: `Top 15 kommuner – andel högskoleutbildade ${valtAr}`,
          height: 500,
          chartArea: { left: 160, right: 80, top: 50, bottom: 40 },
          legend: { position: "none" },
          hAxis: { title: "Andel (%)" },
          vAxis: { title: "Kommun" }
        }
      });

      addMdToPage(`### De 15 kommunerna med lägst andel högskoleutbildade (${valtAr}, ${valtKon})`);

      let chartBotten15 = [["Kommun", "Andel högskoleutbildade (%)", { role: "style" }]];
      botten15Hogskola.forEach(d => {
        chartBotten15.push([d.kommun, d.andelHogskola, "color:#DC2626"]);
      });

      drawGoogleChart({
        type: "BarChart",
        data: chartBotten15,
        options: {
          title: `Botten 15 kommuner – andel högskoleutbildade ${valtAr}`,
          height: 500,
          chartArea: { left: 160, right: 80, top: 50, bottom: 40 },
          legend: { position: "none" },
          hAxis: { title: "Andel (%)" },
          vAxis: { title: "Kommun" }
        }
      });

      // ─── SEKTION 3: UTBILDNING VS RÖSTNING ───

      addMdToPage(`## 🗳️ Utbildning vs Röstning – Korrelationsanalys`);

      // Bygg valdata
      let rensadeVal = rensaValdata(electionResults);
      let unikaKommuner = [...new Set(rensadeVal.map(v => v.kommun))];

      let korrelationsData = [];

      unikaKommuner.forEach(kommun => {
        // Normalisera kommunnamnet – electionResults och educationInfo kan ha
        // lite olika stavning, försök matcha case-insensitive
        let utbMatch = kommunHogskola.find(d =>
          d.kommun.toLowerCase() === kommun.toLowerCase()
        );
        if (!utbMatch) return;

        let kommunVal = rensadeVal.filter(v => v.kommun === kommun);
        let totalRoster = kommunVal.reduce((sum, v) =>
          sum + (valtAr === "2018" ? v.roster2018 : v.roster2022), 0
        );
        if (totalRoster === 0) return;

        let partiData = {};
        kommunVal.forEach(v => {
          let roster = valtAr === "2018" ? v.roster2018 : v.roster2022;
          partiData[v.parti] = (roster / totalRoster) * 100;
        });

        korrelationsData.push({
          kommun,
          andelHogskola: utbMatch.andelHogskola,
          lan: hamtaLanForKommun(kommun),
          ...partiData
        });
      });

      if (!korrelationsData.length) {
        addMdToPage(`> ⚠️ Inga matchande kommuner mellan utbildningsdata och valdata.`);
      } else {

        // Korrelation per parti
        let allaParter = [...new Set(rensadeVal.map(v => v.parti))].sort();

        let korrelationsPerParti = allaParter.map(parti => {
          let hogskolaArr = korrelationsData.map(d => d.andelHogskola);
          let rosterArr = korrelationsData.map(d => d[parti] || 0);
          let korrel = sampleCorrelation(hogskolaArr, rosterArr);
          return { parti, korrelation: isNaN(korrel) ? 0 : korrel };
        });

        drawGoogleChart({
          type: "BarChart",
          data: makeChartFriendly(korrelationsPerParti, "Parti", "Korrelation med högskoleutbildning"),
          options: {
            height: 450,
            chartArea: { left: 240, right: 60, top: 40, bottom: 60 },
            colors: ["#059669"],
            legend: { position: "none" },
            hAxis: { title: "Korrelationskoefficient (r)", viewWindow: { min: -1, max: 1 } },
            vAxis: { title: "Parti" },
            title: `Korrelation: Andel högskoleutbildade vs Partistöd – ${valtAr}`,
            titleTextStyle: { fontSize: 16, bold: true }
          }
        });

        addMdToPage(`
**Analys:** Partier med positiv korrelation är starkare i kommuner med hög utbildningsnivå.
Partier med negativ korrelation tenderar att vara starkare i kommuner med lägre utbildningsnivå.
`);

        // ─── SPRIDNINGSDIAGRAM ───

        addMdToPage(`## 📈 Spridningsdiagram: Högskoleutbildning vs Politiska block`);

        let hogerPartier = ["Moderaterna", "Kristdemokraterna", "Liberalerna", "Sverigedemokraterna"];
        let vansterPartier = [
          "Socialdemokraterna",
          "Arbetarepartiet-Socialdemokraterna",
          "Vänsterpartiet",
          "Miljöpartiet",
          "Centerpartiet"
        ];

        let spridningsData = korrelationsData.map(d => {
          let hoger = hogerPartier.reduce((sum, p) => sum + (d[p] || 0), 0);
          let vanster = vansterPartier.reduce((sum, p) => sum + (d[p] || 0), 0);
          return { andelHogskola: d.andelHogskola, hogerBlock: hoger, vansterBlock: vanster };
        }).filter(d => d.hogerBlock > 0 || d.vansterBlock > 0);

        let utbArr = spridningsData.map(d => d.andelHogskola);
        let korrelHoger = sampleCorrelation(utbArr, spridningsData.map(d => d.hogerBlock));
        let korrelVanster = sampleCorrelation(utbArr, spridningsData.map(d => d.vansterBlock));

        drawGoogleChart({
          type: "ScatterChart",
          data: makeChartFriendly(spridningsData, "Andel högskoleutbildade", "Högerblock (%)", "Vänsterblock (%)"),
          options: {
            height: 500,
            chartArea: { left: 60, right: 20, top: 40, bottom: 60 },
            hAxis: { title: "Andel högskoleutbildade (%)" },
            vAxis: { title: "Röstandel (%)", minValue: 0, maxValue: 100 },
            title: `Högskoleutbildning vs Politisk färg – ${valtAr}`,
            titleTextStyle: { fontSize: 16, bold: true },
            trendlines: {
              0: { type: "linear", showR2: true, visibleInLegend: true },
              1: { type: "linear", showR2: true, visibleInLegend: true }
            },
            series: {
              0: { color: "#e74c3c", pointSize: 6 },
              1: { color: "#3498db", pointSize: 6 }
            }
          }
        });

        addMdToPage(`
**Korrelationsresultat:**
- Högerblocket ↔ högskoleutbildning: **r = ${korrelHoger.toFixed(3)}**
- Vänsterblocket ↔ högskoleutbildning: **r = ${korrelVanster.toFixed(3)}**
`);

        // ─── HYPOTESPRÖVNING: VÄLUTBILDADE VS LÄGRE UTBILDADE ───

        addMdToPage(`## 🧪 Hypotesprövning: Välutbildade vs lägre utbildade kommuner`);

        let hogskolaVarden = korrelationsData.map(d => d.andelHogskola);
        let medianHogskola = median(hogskolaVarden);

        let hogUtbKommuner = korrelationsData.filter(d => d.andelHogskola >= medianHogskola);
        let lagUtbKommuner = korrelationsData.filter(d => d.andelHogskola < medianHogskola);

        let vansterBlock = [
          "Socialdemokraterna",
          "Arbetarepartiet-Socialdemokraterna",
          "Vänsterpartiet",
          "Miljöpartiet",
          "Centerpartiet"
        ];

        let hogUtbVanster = hogUtbKommuner.map(d =>
          vansterBlock.reduce((sum, p) => sum + (d[p] || 0), 0)
        );
        let lagUtbVanster = lagUtbKommuner.map(d =>
          vansterBlock.reduce((sum, p) => sum + (d[p] || 0), 0)
        );

        let hogVansterMedel = mean(hogUtbVanster);
        let lagVansterMedel = mean(lagUtbVanster);
        let tTestRes = ttest2(hogUtbVanster, lagUtbVanster);

        let hypotesBekraftad = hogVansterMedel > lagVansterMedel &&
          tTestRes && tTestRes.pValue < 0.05;

        addMdToPage(`
<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 5px solid #28a745; margin: 20px 0;">
<h4>📐 T-test-resultat (Vänsterblocket)</h4>
<table style="border: none; width: 100%;">
<tr><td style="border: none;"><strong>Median högskoleutbildade (gräns):</strong></td><td style="border: none; text-align: right;">${medianHogskola.toFixed(1)}%</td></tr>
<tr><td style="border: none;"><strong>Hög utbildning (≥ median) – vänsterstöd:</strong></td><td style="border: none; text-align: right;">${hogVansterMedel.toFixed(2)}%</td></tr>
<tr><td style="border: none;"><strong>Låg utbildning (< median) – vänsterstöd:</strong></td><td style="border: none; text-align: right;">${lagVansterMedel.toFixed(2)}%</td></tr>
<tr><td style="border: none;"><strong>Skillnad:</strong></td><td style="border: none; text-align: right;">${(hogVansterMedel - lagVansterMedel).toFixed(2)} procentenheter</td></tr>
${tTestRes
            ? `<tr><td style="border: none;"><strong>p-värde (approx.):</strong></td><td style="border: none; text-align: right;">${tTestRes.pValue.toFixed(4)}</td></tr>
<tr><td style="border: none;"><strong>Signifikansnivå (α = 0.05):</strong></td><td style="border: none; text-align: right;">${tTestRes.pValue < 0.05 ? "✅ SIGNIFIKANT" : "❌ Ej signifikant"}</td></tr>`
            : "<tr><td style=\"border: none;\" colspan=\"2\"><em>T-test kunde inte utföras (otillräcklig data)</em></td></tr>"
          }
</table>
</div>

<div style="background: ${hypotesBekraftad
            ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"}; color: white; padding: 25px; border-radius: 12px; margin: 20px 0;">
<h3 style="color: white; margin-top: 0;">${hypotesBekraftad ? "✅ HYPOTES BEKRÄFTAD" : "⚠️ HYPOTES EJ STATISTISKT BEKRÄFTAD"}</h3>
<p style="font-size: 1.1em; line-height: 1.6;">
<strong>Hypotes:</strong> "Kommuner med hög utbildningsnivå röstar mer på vänsterblocket"
</p>
<p style="font-size: 1.1em; line-height: 1.6;">
${hypotesBekraftad
            ? `Kommuner med hög andel högskoleutbildade har signifikant högre stöd för vänsterblocket (${hogVansterMedel.toFixed(1)}% vs ${lagVansterMedel.toFixed(1)}%). Skillnaden är statistiskt signifikant (p < 0.05).`
            : `Kommuner med hög utbildningsnivå har ${hogVansterMedel > lagVansterMedel ? "något" : "inte"} högre stöd för vänsterblocket (${hogVansterMedel.toFixed(1)}% vs ${lagVansterMedel.toFixed(1)}%). ${tTestRes && tTestRes.pValue >= 0.05 ? "Skillnaden är inte statistiskt signifikant (p ≥ 0.05)." : ""}`
          }
</p>
</div>
`);

        // ─── TABELL: KOMMUNER MED HÖG UTBILDNING ───

        addMdToPage(`## 📋 Kommuner med högst högskoleutbildning och deras röstmönster`);

        let tabellData = korrelationsData
          .sort((a, b) => b.andelHogskola - a.andelHogskola)
          .slice(0, 30)
          .map(d => ({
            "Kommun": d.kommun,
            "Län": d.lan,
            "Högskoleutb. (%)": d.andelHogskola.toFixed(1),
            "S (%)": (d["Socialdemokraterna"] || d["Arbetarepartiet-Socialdemokraterna"] || 0).toFixed(1),
            "M (%)": (d["Moderaterna"] || 0).toFixed(1),
            "SD (%)": (d["Sverigedemokraterna"] || 0).toFixed(1),
            "V (%)": (d["Vänsterpartiet"] || 0).toFixed(1),
            "MP (%)": (d["Miljöpartiet"] || 0).toFixed(1)
          }));

        tableFromData({
          data: tabellData,
          columnNames: ["Kommun", "Län", "Högskoleutb. (%)", "S (%)", "M (%)", "SD (%)", "V (%)", "MP (%)"],
          fixedHeader: true
        });

      }

    }

    // ─── SLUTSATS ───

    addMdToPage(`
<div style="
background:#F8FAFC;
padding:30px;
border-radius:18px;
margin-top:35px;
border-left:8px solid #192c4e;
">

## Slutsats – Utbildning och röstning

Analysen visar att utbildningsnivå är en av de starkaste demografiska faktorerna
för att förutsäga röstningsmönster i Sveriges kommuner.

Nyckelresultat:
- Kommuner med hög andel högskoleutbildade tenderar att rösta annorlunda jämfört med kommuner med lägre utbildningsnivå
- Sambanden varierar mellan partier – vissa partier gynnas tydligare av hög utbildningsnivå
- Utbildning, ålder och inkomst samverkar och är svåra att helt separera analytiskt

**Viktigt:** Korrelation innebär inte kausalitet. Det är sannolikt andra faktorer (urbanisering,
inkomst, ålder) som delvis förklarar sambandet – utbildningsnivå är en bland flera faktorer.

</div>
`);

    addMdToPage(`
---

> 📍 **Fortsätt utforska:** Se ekonomiska faktorers påverkan på röstning → **Ekonomiska faktorer**
`);

  }

}
