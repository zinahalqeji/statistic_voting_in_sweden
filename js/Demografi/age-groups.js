import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // INTRO 

  addMdToPage(`
# Unga vs Äldre Områden

<div style="
  background:#F1F5F9;
  padding:24px;
  border-radius:12px;
  margin-top:20px;
  border-left:6px solid #192c4e;
">

<strong>Forskningsfråga:</strong> Hur skiljer sig röstningsmönster mellan kommuner med yngre respektive äldre befolkning?<br><br>
<strong>Hypotes:</strong> Yngre områden (lägre medelålder) röstar i högre utsträckning på vänsterpartier än äldre områden.<br><br>

Denna sida testar vår hypotes genom att dela in Sveriges kommuner i två grupper –
<strong>unga områden</strong> (lägre medelålder än medianen) och <strong>äldre områden</strong> (högre medelålder än medianen) –
och jämföra deras röstningsmönster.

</div>
`);

  // DROPDOWNS 

  let valtAr = addDropdown("Välj valår:", ["2018", "2022"]);
  let valtKon = addDropdown("Åldersdata – kön:", ["Totalt", "Män", "Kvinnor"]);

  // HJÄLPFUNKTIONER 

  function konNyckel(val) {
    const map = { "Totalt": "totalt", "Män": "män", "Kvinnor": "kvinnor" };
    return map[val] || "totalt";
  }

  function hamtaLanForKommun(kommunNamn) {
    let match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

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

    function normalCDF(z) {
      let t2 = 1 / (1 + 0.2316419 * Math.abs(z));
      let d = 0.3989423 * Math.exp(-z * z / 2);
      let p = d * t2 * (0.3193815 + t2 * (-0.3565638 + t2 * (1.7814779 + t2 * (-1.8212560 + t2 * 1.3302744))));
      return z > 0 ? 1 - p : p;
    }

    let pValue = 2 * (1 - normalCDF(Math.abs(t)));
    return { tValue: t, pValue };
  }

  // BYGG ÅLDERSDATA 

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

  let kommunAlderData = new Map();
  kommunAlderMap.forEach((aldrar, kommun) => {
    let snitt = aldrar.reduce((a, b) => a + b, 0) / aldrar.length;
    kommunAlderData.set(kommun, snitt);
  });

  // RENSA VALDATA

  let rensadeVal = rensaValdata(electionResults);

  // MEDIAN 

  let allaAldrar = Array.from(kommunAlderData.values()).filter(v => v > 0);
  if (!allaAldrar.length) {
    addMdToPage(`> Ingen åldersdata hittades för vald kombination.`);
  } else {

    let medianAlder = median(allaAldrar);

    addMdToPage(`
<div style="
  background:#F1F5F9;
  padding:24px;
  border-radius:12px;
  margin:20px 0;
  border-left:6px solid #192c4e;
">

<h3>Hypotestestning</h3>

<strong>Hypotes:</strong> Yngre områden röstar mer vänster än äldre områden.<br>
<strong>Metod:</strong> Dela kommuner i två grupper baserat på medianålder (${medianAlder.toFixed(1)} år)<br>
<strong>Valår:</strong> ${valtAr}

</div>
`);

    // BYGG KOMMUNDATA

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

    let ungaOmraden = kommunData.filter(d => d.grupp === "Unga områden");
    let aldreOmraden = kommunData.filter(d => d.grupp === "Äldre områden");

    if (!ungaOmraden.length || !aldreOmraden.length) {
      addMdToPage(`> Otillräckligt underlag för att jämföra grupper.`);
    } else {

      let allaParter = [...new Set(rensadeVal.map(v => v.parti))].sort();

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

      // DIAGRAM 1

      addMdToPage(`
## Partistöd: Unga vs Äldre områden
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: makeChartFriendly(jamforelseData, "Parti", "Unga områden", "Äldre områden"),
        options: {
          height: 500,
          chartArea: { left: 60, right: 20, top: 40, bottom: 100 },
          colors: ["#1e3a5f", "#9ca3af"],
          hAxis: { title: "Parti", slantedText: true, slantedTextAngle: 30 },
          vAxis: { title: "Medelstöd (%)", minValue: 0 },
          title: `Partistöd: Unga vs Äldre områden – ${valtAr}`,
          titleTextStyle: { fontSize: 16, bold: true },
          legend: { position: "top" }
        }
      });

      // DIAGRAM 2

      addMdToPage(`
## Skillnad i partistöd (Unga – Äldre områden)
`);

      let skillnadData = jamforelseData.map(d => ({ parti: d.parti, skillnad: d.skillnad }));

      drawGoogleChart({
        type: "BarChart",
        data: makeChartFriendly(skillnadData, "Parti", "Skillnad (procentenheter)"),
        options: {
          height: 450,
          chartArea: { left: 240, right: 60, top: 40, bottom: 60 },
          colors: ["#1e3a5f"],
          legend: { position: "none" },
          hAxis: { title: "Skillnad (procentenheter)" },
          vAxis: { title: "Parti" },
          title: `Partistödsskillnad: Unga minus Äldre områden – ${valtAr}`,
          titleTextStyle: { fontSize: 16, bold: true }
        }
      });

      // STATISTISK TESTNING 

      addMdToPage(`
## Statistisk testning av hypotesen
`);

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
<div style="
  background:#F1F5F9;
  padding:24px;
  border-radius:12px;
  margin:20px 0;
  border-left:6px solid #192c4e;
">

<h4>T-test-resultat (Vänsterblocket)</h4>

<table style="border:none; width:100%;">
<tr><td>Unga områden – medelstöd vänster:</td><td style="text-align:right;">${ungaVansterMedel.toFixed(2)}%</td></tr>
<tr><td>Äldre områden – medelstöd vänster:</td><td style="text-align:right;">${aldreVansterMedel.toFixed(2)}%</td></tr>
<tr><td>Skillnad:</td><td style="text-align:right;">${(ungaVansterMedel - aldreVansterMedel).toFixed(2)} procentenheter</td></tr>
${tTestResultat
    ? `<tr><td>p-värde (approx.):</td><td style="text-align:right;">${tTestResultat.pValue.toFixed(4)}</td></tr>
<tr><td>Signifikansnivå (α = 0.05):</td><td style="text-align:right;">${tTestResultat.pValue < 0.05 ? "Signifikant" : "Ej signifikant"}</td></tr>`
    : "<tr><td colspan='2'><em>T-test kunde inte utföras (otillräcklig data)</em></td></tr>"
}
</table>

</div>
`);

      // DETALJERAD TABELL 

      addMdToPage(`
## Detaljerad jämförelse per parti
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
**Förklaring:** Standardavvikelse visar spridningen inom gruppen. En hög standardavvikelse indikerar stor variation mellan kommuner inom samma åldersgrupp.
`);

      // INSIGHT 

      addMdToPage(`
<div style="
  background:#F1F5F9;
  padding:24px;
  border-radius:12px;
  margin:30px 0;
  border-left:6px solid #192c4e;
">

<h3>Insikt: Demografi formar politik – men inte ensamt</h3>

Det finns ett samband mellan åldersstruktur och politiska preferenser,
men sambandet är komplext. Det är inte bara ålder som spelar roll – utbildning,
inkomst och geografisk tillhörighet är också viktiga faktorer.

</div>
`);

    }
  }

}
