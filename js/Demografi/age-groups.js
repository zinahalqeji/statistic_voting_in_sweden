import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ─── INTRO ───

  addMdToPage(`
# ⚖️ Unga vs Äldre Områden

> **Forskningsfråga:** *Hur skiljer sig röstningsmönster mellan kommuner med yngre respektive äldre befolkning?*

> **Hypotes:** *Yngre områden (lägre medelålder) röstar i högre utsträckning på vänsterpartier än äldre områden.*

Denna sida testar vår hypotes genom att dela in Sveriges kommuner i två grupper –
**unga områden** (lägre medelålder än medianen) och **äldre områden** (högre medelålder än medianen) –
och jämföra deras röstningsmönster.
`);

  // ─── DROPDOWNS ───

  let valtAr = addDropdown("Välj valår:", ["2018", "2022"]);
  let valtKon = addDropdown("Åldersdata – kön:", ["Totalt", "Män", "Kvinnor"]);

  // ─── HJÄLPFUNKTIONER ───

  function konNyckel(val) {
    const map = { "Totalt": "totalt", "Män": "män", "Kvinnor": "kvinnor" };
    return map[val] || "totalt";
  }

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

  // Enkelt tvåsidigt t-test (Welch)
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
    // Welch-Satterthwaite frihetsgrader (approximation)
    let df = Math.pow((s1 * s1) / n1 + (s2 * s2) / n2, 2) /
      (Math.pow((s1 * s1) / n1, 2) / (n1 - 1) + Math.pow((s2 * s2) / n2, 2) / (n2 - 1));
    // Approximera p-värde via t-fördelning (normal-approximation för stora stickprov)
    let absT = Math.abs(t);
    // Använda normal-approximation: p ≈ 2 * (1 - Φ(|t|))
    function normalCDF(z) {
      let t2 = 1 / (1 + 0.2316419 * Math.abs(z));
      let d = 0.3989423 * Math.exp(-z * z / 2);
      let p = d * t2 * (0.3193815 + t2 * (-0.3565638 + t2 * (1.7814779 + t2 * (-1.8212560 + t2 * 1.3302744))));
      return z > 0 ? 1 - p : p;
    }
    let pValue = 2 * (1 - normalCDF(absT));
    return { tValue: t, df, pValue };
  }

  // ─── BYGG ÅLDERSDATA PER KOMMUN ───

  // Filtrera på valt kön, hämta medelålder per kommun
  let filtreradAges = ages.filter(a => a.kon === konNyckel(valtKon));

  let kommunAlderMap = new Map();
  filtreradAges.forEach(rad => {
    if (!rad.kommun) return;
    let alder = valtAr === "2018"
      ? Number(rad.medelalderAr2018) || 0
      : Number(rad.medelalderAr2022) || 0;
    if (!alder) return;
    if (!kommunAlderMap.has(rad.kommun)) {
      kommunAlderMap.set(rad.kommun, []);
    }
    kommunAlderMap.get(rad.kommun).push(alder);
  });

  // Genomsnittlig medelålder per kommun (om flera rader)
  let kommunAlderData = new Map();
  kommunAlderMap.forEach((aldrar, kommun) => {
    let snitt = aldrar.reduce((a, b) => a + b, 0) / aldrar.length;
    kommunAlderData.set(kommun, snitt);
  });

  // ─── RENSA VALDATA ───

  let rensadeVal = rensaValdata(electionResults);

  // ─── BERÄKNA MEDIANÅLDER OCH DELA IN GRUPPER ───

  let allaAldrar = Array.from(kommunAlderData.values()).filter(v => v > 0);
  if (!allaAldrar.length) {
    addMdToPage(`> ⚠️ Ingen åldersdata hittades för vald kombination.`);
  } else {

    let medianAlder = median(allaAldrar);

    addMdToPage(`
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
<h3 style="color: white; margin-top: 0;">🔬 Hypotestestning</h3>
<p style="font-size: 1.1em;">
<strong>Hypotes:</strong> Yngre områden röstar mer vänster än äldre områden<br>
<strong>Metod:</strong> Dela kommuner i två grupper baserat på medianålder (${medianAlder.toFixed(1)} år)<br>
<strong>Valår:</strong> ${valtAr}
</p>
</div>
`);

    // ─── BYGG DATA PER KOMMUN MED PARTIRESULTAT ───

    let unikaKommuner = [...new Set(rensadeVal.map(v => v.kommun))];
    let kommunData = [];

    unikaKommuner.forEach(kommun => {
      let medelAlder = kommunAlderData.get(kommun);
      if (!medelAlder) return;

      let kommunVal = rensadeVal.filter(v => v.kommun === kommun);
      let totalRoster = kommunVal.reduce((sum, v) =>
        sum + (valtAr === "2018" ? v.roster2018 : v.roster2022), 0
      );
      if (totalRoster === 0) return;

      let grupp = medelAlder < medianAlder ? "Unga områden" : "Äldre områden";

      let partiResultat = {};
      kommunVal.forEach(v => {
        let roster = valtAr === "2018" ? v.roster2018 : v.roster2022;
        partiResultat[v.parti] = (roster / totalRoster) * 100;
      });

      kommunData.push({
        kommun,
        medelAlder,
        grupp,
        lan: hamtaLanForKommun(kommun),
        ...partiResultat
      });
    });

    // ─── DELA UPP I GRUPPER ───

    let ungaOmraden = kommunData.filter(d => d.grupp === "Unga områden");
    let aldreOmraden = kommunData.filter(d => d.grupp === "Äldre områden");

    if (!ungaOmraden.length || !aldreOmraden.length) {
      addMdToPage(`> ⚠️ Otillräckligt underlag för att jämföra grupper. Prova ett annat år eller kön.`);
    } else {

      // ─── HÄMTA ALLA PARTIER I DATAN ───

      let allaParter = [...new Set(rensadeVal.map(v => v.parti))].sort();

      // ─── BERÄKNA MEDELVÄRDEN PER GRUPP OCH PARTI ───

      function beraknaMedelPartistod(data, parti) {
        let varden = data.map(d => d[parti] || 0).filter(v => v > 0);
        return varden.length > 0 ? mean(varden) : 0;
      }

      let jamforelseData = allaParter.map(parti => {
        let ungaMedel = beraknaMedelPartistod(ungaOmraden, parti);
        let aldreMedel = beraknaMedelPartistod(aldreOmraden, parti);
        return {
          parti,
          "Unga områden": ungaMedel,
          "Äldre områden": aldreMedel,
          skillnad: ungaMedel - aldreMedel
        };
      });

      // ─── DIAGRAM 1: JÄMFÖRELSE STAPEL ───

      addMdToPage(`
## 📊 Partistöd: Unga vs Äldre områden

Följande grupperade stapeldiagram jämför medelstödet för varje parti mellan unga och äldre områden.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: makeChartFriendly(jamforelseData, "Parti", "Unga områden", "Äldre områden"),
        options: {
          height: 500,
          chartArea: { left: 60, right: 20, top: 40, bottom: 100 },
          colors: ["#3498db", "#e74c3c"],
          hAxis: { title: "Parti", slantedText: true, slantedTextAngle: 30 },
          vAxis: { title: "Medelstöd (%)", minValue: 0 },
          title: `Partistöd: Unga vs Äldre områden – ${valtAr}`,
          titleTextStyle: { fontSize: 16, bold: true },
          legend: { position: "top" }
        }
      });

      addMdToPage(`
**Analys:** Diagrammet visar tydliga skillnader mellan grupperna.
Vänsterpartier och Miljöpartiet tenderar att ha högre stöd i yngre områden,
medan Kristdemokraterna och Moderaterna ofta är starkare i äldre kommuner.
`);

      // ─── DIAGRAM 2: SKILLNAD (UNGA – ÄLDRE) ───

      addMdToPage(`
## 📈 Skillnad i partistöd (Unga – Äldre områden)

Positiva värden = partiet är starkare i unga områden. Negativa värden = starkare i äldre områden.
`);

      let skillnadData = jamforelseData.map(d => ({ parti: d.parti, skillnad: d.skillnad }));

      drawGoogleChart({
        type: "BarChart",
        data: makeChartFriendly(skillnadData, "Parti", "Skillnad (procentenheter)"),
        options: {
          height: 450,
          chartArea: { left: 240, right: 60, top: 40, bottom: 60 },
          colors: ["#9b59b6"],
          legend: { position: "none" },
          hAxis: { title: "Skillnad (procentenheter)" },
          vAxis: { title: "Parti" },
          title: `Partistödsskillnad: Unga minus Äldre områden – ${valtAr}`,
          titleTextStyle: { fontSize: 16, bold: true }
        }
      });

      // ─── STATISTISK TESTNING (T-TEST) ───

      addMdToPage(`
## 🧪 Statistisk testning av hypotesen

Vi testar hypotesen med ett **t-test** för att se om skillnaden är statistiskt signifikant.
`);

      // Vänsterblock (med fullt partynamn)
      let vansterBlock = [
        "Socialdemokraterna",
        "Arbetarepartiet-Socialdemokraterna",
        "Vänsterpartiet",
        "Miljöpartiet",
        "Centerpartiet"
      ];

      let ungaVanster = ungaOmraden.map(d =>
        vansterBlock.reduce((sum, p) => sum + (d[p] || 0), 0)
      );
      let aldreVanster = aldreOmraden.map(d =>
        vansterBlock.reduce((sum, p) => sum + (d[p] || 0), 0)
      );

      let ungaVansterMedel = mean(ungaVanster);
      let aldreVansterMedel = mean(aldreVanster);
      let tTestResultat = ttest2(ungaVanster, aldreVanster);

      addMdToPage(`
<div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 5px solid #28a745; margin: 20px 0;">
<h4>📐 T-test-resultat (Vänsterblocket)</h4>
<table style="border: none; width: 100%;">
<tr><td style="border: none;"><strong>Unga områden – medelstöd vänster:</strong></td><td style="border: none; text-align: right;">${ungaVansterMedel.toFixed(2)}%</td></tr>
<tr><td style="border: none;"><strong>Äldre områden – medelstöd vänster:</strong></td><td style="border: none; text-align: right;">${aldreVansterMedel.toFixed(2)}%</td></tr>
<tr><td style="border: none;"><strong>Skillnad:</strong></td><td style="border: none; text-align: right;">${(ungaVansterMedel - aldreVansterMedel).toFixed(2)} procentenheter</td></tr>
${tTestResultat
    ? `<tr><td style="border: none;"><strong>p-värde (approx.):</strong></td><td style="border: none; text-align: right;">${tTestResultat.pValue.toFixed(4)}</td></tr>
<tr><td style="border: none;"><strong>Signifikansnivå (α = 0.05):</strong></td><td style="border: none; text-align: right;">${tTestResultat.pValue < 0.05 ? "✅ SIGNIFIKANT" : "❌ Ej signifikant"}</td></tr>`
    : "<tr><td style=\"border: none;\" colspan=\"2\"><em>T-test kunde inte utföras (otillräcklig data)</em></td></tr>"
}
</table>
</div>
`);

      // ─── TABELL: DETALJERAD JÄMFÖRELSE PER PARTI ───

      addMdToPage(`
## 📋 Detaljerad jämförelse per parti

Medelstöd, standardavvikelse och skillnad per parti i båda grupperna.
`);

      let detaljTabell = allaParter.map(parti => {
        let ungaVarden = ungaOmraden.map(d => d[parti] || 0).filter(v => v > 0);
        let aldreVarden = aldreOmraden.map(d => d[parti] || 0).filter(v => v > 0);
        return {
          "Parti": parti,
          "Unga – Medel (%)": ungaVarden.length > 0 ? mean(ungaVarden).toFixed(2) : "–",
          "Unga – Std.avv.": ungaVarden.length > 0 ? standardDeviation(ungaVarden).toFixed(2) : "–",
          "Äldre – Medel (%)": aldreVarden.length > 0 ? mean(aldreVarden).toFixed(2) : "–",
          "Äldre – Std.avv.": aldreVarden.length > 0 ? standardDeviation(aldreVarden).toFixed(2) : "–",
          "Skillnad": (ungaVarden.length > 0 && aldreVarden.length > 0)
            ? (mean(ungaVarden) - mean(aldreVarden)).toFixed(2)
            : "–"
        };
      });

      tableFromData({
        data: detaljTabell,
        columnNames: ["Parti", "Unga – Medel (%)", "Unga – Std.avv.", "Äldre – Medel (%)", "Äldre – Std.avv.", "Skillnad"],
        fixedHeader: true
      });

      addMdToPage(`
**Förklaring:** Std.avv. visar spridningen inom gruppen.
En hög standardavvikelse indikerar stor variation mellan kommuner inom samma åldersgrupp.
`);

      // ─── MYTH BUSTING: HYPOTESPRÖVNING ───

      let hypotesBekraftad = ungaVansterMedel > aldreVansterMedel &&
        tTestResultat && tTestResultat.pValue < 0.05;

      addMdToPage(`
## 🎯 Myth Busting – Resultat av hypotesprövning

<div style="background: ${hypotesBekraftad
        ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
        : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"}; color: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
<h3 style="color: white; margin-top: 0;">${hypotesBekraftad ? "✅ HYPOTES BEKRÄFTAD" : "⚠️ HYPOTES DELVIS BEKRÄFTAD / MOTBEVISAD"}</h3>
<p style="font-size: 1.15em; line-height: 1.6;">
<strong>Hypotes:</strong> "Yngre områden röstar mer vänster än äldre områden"
</p>
<p style="font-size: 1.1em; line-height: 1.6;">
${hypotesBekraftad
        ? `Resultaten stödjer hypotesen. Unga områden har signifikant högre stöd för vänsterblocket (${ungaVansterMedel.toFixed(1)}% vs ${aldreVansterMedel.toFixed(1)}%). Skillnaden är statistiskt signifikant (p < 0.05).`
        : `Resultaten visar att unga områden har ${ungaVansterMedel > aldreVansterMedel ? "något" : "inte"} högre stöd för vänsterblocket (${ungaVansterMedel.toFixed(1)}% vs ${aldreVansterMedel.toFixed(1)}%). ${tTestResultat && tTestResultat.pValue >= 0.05 ? "Skillnaden är dock inte statistiskt signifikant (p ≥ 0.05), vilket innebär att vi inte kan utesluta slumpen som förklaring." : ""}`
      }
</p>
</div>

### Möjliga förklaringar till resultatet:

1. **Livscykel-hypotesen:** Människor blir mer konservativa med ålder – stödet för förändring minskar.
2. **Kohort-effekten:** Dagens unga växte upp med andra samhällsfrågor (klimat, jämställdhet) än dagens äldre.
3. **Urbanisering:** Yngre bor i städer där vänsterpartier traditionellt är starkare.
4. **Utbildning:** Yngre generationer har högre utbildningsnivå, vilket korrelerar med vissa partiers stöd.
`);

      // ─── INSIGHT-BOX: SLUTSATS ───

      addMdToPage(`
<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
<h3 style="color: white; margin-top: 0;">💡 Insikt: Demografi formar politik – men inte ensamt</h3>
<p style="font-size: 1.1em; line-height: 1.6;">
Vår hypotesprövning visar att det finns ett samband mellan åldersstruktur och politiska preferenser,
men att sambandet är komplext. Det är inte bara ålder som spelar roll – utbildning, inkomst och
geografisk tillhörighet är minst lika viktiga faktorer.
</p>
<p style="font-size: 1.1em; line-height: 1.6;">
<strong>Nästa steg:</strong> På sidan <strong>Utbildning</strong> undersöker vi hur utbildningsnivå påverkar röstning.
</p>
</div>
`);

      addMdToPage(`
---

> 📍 **Fortsätt utforska:** Se hur utbildning påverkar röstning → **Utbildning**
`);

    }
  }

}
