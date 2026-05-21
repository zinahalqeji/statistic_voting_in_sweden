import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function normalizeGender(value) {
  const v = normalize(value);
  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";
  return "totalt";
}

function displayPartyName(party) {
  const names = { "Arbetarepartiet-Socialdemokraterna": "Socialdemokraterna", "Miljöpartiet de gröna": "Miljöpartiet" };
  return names[party] || party;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function average(values) {
  const nums = values.filter(v => v !== null && v !== undefined && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function formatIncome(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} tkr`;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function statCards(cards) {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">
      ${cards.map(card => `
        <div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h3 style="margin:0 0 10px 0; font-size:19px; line-height:1.25;">${card.title}</h3>
          <p style="font-size:23px; font-weight:bold; margin:0 0 6px 0;">${card.value}</p>
          ${card.note ? `<p style="font-size:14px; margin:0; color:#555;">${card.note}</p>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

function sectionBox(icon, title, bullets) {
  const items = bullets.map(b => `<li style="margin-bottom:6px;">${b}</li>`).join("");
  return `
    <div style="background:white; border-radius:8px; border:0.5px solid rgba(0,0,0,0.1); padding:16px 20px; margin:16px 0;">
      <p style="margin:0 0 10px 0; font-size:16px; font-weight:500;">${icon} ${title}</p>
      <ul style="margin:0; padding-left:20px; font-size:15px; line-height:1.8;">${items}</ul>
    </div>
  `;
}

function loadingBox() {
  return `
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 8px 0; font-size:19px;">Laddar analysen...</h3>
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar inkomstdata, valresultat och kommunernas länskoppling. Diagram och tabeller visas strax.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

// T-TEST HJÄLPFUNKTIONER
function variance(values) {
  const avg = average(values);
  const nums = values.filter(v => Number.isFinite(v));
  if (nums.length < 2) return 0;
  return nums.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (nums.length - 1);
}

function stdDev(values) { return Math.sqrt(variance(values)); }

function skewness(values) {
  const nums = values.filter(v => Number.isFinite(v));
  const n = nums.length;
  if (n < 3) return null;
  const avg = average(nums), sd = stdDev(nums);
  if (sd === 0) return null;
  const sum = nums.reduce((acc, v) => acc + Math.pow((v - avg) / sd, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

function tTest(group1, group2) {
  const n1 = group1.length, n2 = group2.length;
  if (n1 < 2 || n2 < 2) return null;
  const mean1 = average(group1), mean2 = average(group2);
  const var1 = variance(group1), var2 = variance(group2);
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  if (se === 0) return null;
  const t = (mean1 - mean2) / se;
  const df = Math.pow(var1 / n1 + var2 / n2, 2) / (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
  return { t, df: Math.round(df) };
}

function normalCDF(z) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function approximatePValue(tVal, df) {
  const abst = Math.abs(tVal);
  if (df > 30) return 2 * (1 - normalCDF(abst));
  return Math.min(2 * 0.5 * Math.pow(df / (df + abst * abst), df / 2), 1);
}

function createIncomeGroups(data) {
  const sorted = [...data].sort((a, b) => a.inkomst2022 - b.inkomst2022);
  const groupSize = Math.ceil(sorted.length / 3);
  return sorted.map((row, index) => {
    let group = "Låg inkomst";
    if (index >= groupSize && index < groupSize * 2) group = "Medelinkomst";
    if (index >= groupSize * 2) group = "Hög inkomst";
    return { ...row, incomeGroup: group };
  });
}

addMdToPage(`
# Hög vs låg inkomst

I denna analys delar vi in Sveriges kommuner i tre inkomstgrupper: låg inkomst, medelinkomst och hög inkomst. Syftet är att undersöka om stödet för olika partier skiljer sig mellan kommuner med olika ekonomiska förutsättningar.

## Fråga
**Skiljer sig röstningsmönster mellan kommuner med låg, medel och hög genomsnittlig inkomst?**
`);

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  dbQuery.use("kommun-info-mongodb");
  const incomeResult = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  dbQuery.use("riksdagsval-neo4j");
  const electionResult = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  removeLoadingBox();

  const incomeData = Array.isArray(incomeResult) ? incomeResult : incomeResult?.data || incomeResult?.result || incomeResult?.documents || [];
  const lanKommun = Array.isArray(lanKommunResult) ? lanKommunResult : lanKommunResult?.data || lanKommunResult?.result || [];
  const electionResults = Array.isArray(electionResult) ? electionResult : electionResult?.data || electionResult?.result || [];

  function getCounty(row) {
    const kommunName = normalize(row.kommun);
    const match = lanKommun.find(x => normalize(x.kommun) === kommunName);
    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }

  const cleanedIncome = incomeData
    .map(row => ({ kommun: row.kommun, kon: normalizeGender(row.kon), lan: getCounty(row), inkomst2022: toNumber(row.medelInkomst2022) }))
    .filter(row => row.kommun && row.lan !== "Okänt län" && row.inkomst2022 !== null);

  const cleanedElection = electionResults
    .map(row => ({ kommun: row.kommun, parti: row.parti, roster2018: toNumber(row.roster2018), roster2022: toNumber(row.roster2022) }))
    .filter(row => row.kommun && row.parti && row.roster2018 !== null && row.roster2022 !== null);

  function buildTotalVotesMap(year) {
    const map = new Map();
    cleanedElection.forEach(row => {
      const key = normalize(row.kommun);
      const votes = year === "2018" ? row.roster2018 : row.roster2022;
      if (!map.has(key)) map.set(key, 0);
      map.set(key, map.get(key) + votes);
    });
    return map;
  }

  const parties = [...new Set(cleanedElection.map(row => row.parti))].sort((a, b) => displayPartyName(a).localeCompare(displayPartyName(b), "sv"));
  const partyOptions = parties.map(party => displayPartyName(party));
  const counties = [...new Set(cleanedIncome.map(row => row.lan))].sort((a, b) => a.localeCompare(b, "sv"));

  const chosenPartyDisplay = addDropdown("Välj parti:", partyOptions, displayPartyName(parties[0]));
  const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
  const chosenPartyName = displayPartyName(chosenParty);

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
  const chosenYear = addDropdown("Välj år", ["2022", "2018"], "2022");

  const selectedGender = normalizeGender(chosenGender);
  const totalVotesMap = buildTotalVotesMap(chosenYear);

  addToPage(infoBox("Analysens hypotes", "Vi undersöker om stödet för " + chosenPartyName + " skiljer sig mellan låg-, medel- och höginkomstkommuner. Vår hypotes är att olika inkomstgrupper kan visa olika röstningsmönster."));

  const filteredIncome = cleanedIncome.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
    return genderMatch && countyMatch;
  });

  const numberOfMunicipalities = new Set(filteredIncome.map(row => row.kommun)).size;

  if (numberOfMunicipalities < 3) {
    addMdToPage(`## Resultat\n\nDet valda urvalet innehåller endast **${numberOfMunicipalities}** kommun. Behövs minst tre kommuner. Välj **Alla län** för att se gruppjämförelsen.`);
  }
  else {
    const groupedIncome = createIncomeGroups(filteredIncome);

    const mergedData = groupedIncome
      .map(incomeRow => {
        const electionRow = cleanedElection.find(voteRow => normalize(voteRow.kommun) === normalize(incomeRow.kommun) && voteRow.parti === chosenParty);
        if (!electionRow) return null;
        const totalVotes = totalVotesMap.get(normalize(incomeRow.kommun));
        const partyVotes = chosenYear === "2018" ? electionRow.roster2018 : electionRow.roster2022;
        if (!totalVotes || totalVotes === 0) return null;
        return { kommun: incomeRow.kommun, lan: incomeRow.lan, incomeGroup: incomeRow.incomeGroup, inkomst2022: incomeRow.inkomst2022, partyVotes, partyShare: (partyVotes / totalVotes) * 100 };
      })
      .filter(row => row !== null);

    if (!mergedData.length) {
      addMdToPage(`## Resultat\n\nDet finns ingen kopplad data för det valda urvalet.`);
    }
    else {

      const groupOrder = ["Låg inkomst", "Medelinkomst", "Hög inkomst"];

      const groupStats = groupOrder.map(group => {
        const rows = mergedData.filter(row => row.incomeGroup === group);
        return { group, count: rows.length, averageIncome: average(rows.map(row => row.inkomst2022)), averageSupport: average(rows.map(row => row.partyShare)) };
      });

      const lowestGroup = groupStats[0];
      const highestGroup = groupStats[2];
      const supportDifference = highestGroup.averageSupport - lowestGroup.averageSupport;
      const strongestGroup = [...groupStats].sort((a, b) => b.averageSupport - a.averageSupport)[0];

      addMdToPage(`## Sammanfattning av urvalet`);
      addToPage(statCards([
        { title: "Antal kommuner", value: numberOfMunicipalities },
        { title: "Valt parti", value: chosenPartyName },
        { title: "Starkast stöd", value: strongestGroup.group, note: formatPercent(strongestGroup.averageSupport) },
        { title: "Skillnad hög minus låg", value: formatPercent(supportDifference), note: "hög inkomst jämfört med låg inkomst" }
      ]));

      addMdToPage(`
## Stöd för ${chosenPartyName} per inkomstgrupp

Diagrammet visar genomsnittlig röstandel för **${chosenPartyName}** i kommuner med låg inkomst, medelinkomst och hög inkomst.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: [["Inkomstgrupp", "Stöd för " + chosenPartyName], ...groupStats.map(row => [row.group, row.averageSupport])],
        options: {
          title: "Genomsnittligt stöd för " + chosenPartyName + " per inkomstgrupp (" + chosenYear + ")",
          legend: { position: "none" },
          height: 520,
          chartArea: { width: "80%", height: "72%" },
          hAxis: { textStyle: { fontSize: 13 } },
          vAxis: { title: "Röstandel (%)", textStyle: { fontSize: 13 }, titleTextStyle: { fontSize: 15, bold: true }, viewWindow: { min: 0 } }
        }
      });

      addMdToPage(`## Jämförelse mellan inkomstgrupper`);
      tableFromData({
        data: groupStats.map(row => ({
          Inkomstgrupp: row.group,
          "Antal kommuner": row.count,
          "Genomsnittlig inkomst": formatIncome(row.averageIncome),
          ["Stöd för " + chosenPartyName]: formatPercent(row.averageSupport)
        }))
      });

      addMdToPage(`## Exempel på kommuner i varje inkomstgrupp`);
      const exampleRows = groupOrder.flatMap(group =>
        mergedData.filter(row => row.incomeGroup === group).sort((a, b) => b.partyShare - a.partyShare).slice(0, 3)
          .map(row => ({ Inkomstgrupp: group, Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022), ["Stöd för " + chosenPartyName]: formatPercent(row.partyShare) }))
      );
      tableFromData({ data: exampleRows });

      let differenceText = supportDifference > 0
        ? "Stödet för " + chosenPartyName + " är högre i höginkomstkommuner än i låginkomstkommuner."
        : supportDifference < 0
          ? "Stödet för " + chosenPartyName + " är lägre i höginkomstkommuner än i låginkomstkommuner."
          : "Stödet är ungefär lika stort i båda grupperna.";

      addMdToPage(`## Kort analys`);
      addToPage(sectionBox("📊", "Resultat", [
        "<strong>" + strongestGroup.group + "</strong> har högst genomsnittligt stöd för <strong>" + chosenPartyName + "</strong>: <strong>" + formatPercent(strongestGroup.averageSupport) + "</strong>",
        differenceText + " Skillnad: <strong>" + formatPercent(supportDifference) + "</strong>",
        "Inkomst <strong>orsakar inte</strong> hur människor röstar — utbildningsnivå, ålder och bostadsort påverkar både inkomst och röstbeteende"
      ]));

      addToPage(sectionBox("🔍", "Metod och begränsning", [
        "Kommunerna sorteras efter genomsnittlig inkomst och delas in i tre lika stora grupper",
        "Inkomstvärdet kommer från 2022 — används även för valåret 2018",
        "Visar skillnader mellan grupper men bevisar inte kausalitet",
        "Faktorer som utbildning, ålder och migration kan också påverka resultatet"
      ]));

      // T-TEST
      const lowGroup = mergedData.filter(row => row.incomeGroup === "Låg inkomst").map(row => row.partyShare);
      const highGroup = mergedData.filter(row => row.incomeGroup === "Hög inkomst").map(row => row.partyShare);

      const skewLow = skewness(lowGroup);
      const skewHigh = skewness(highGroup);
      const normalLow = skewLow !== null && Math.abs(skewLow) <= 1;
      const normalHigh = skewHigh !== null && Math.abs(skewHigh) <= 1;

      const tResult = tTest(lowGroup, highGroup);
      const pValue = tResult ? approximatePValue(tResult.t, tResult.df) : null;
      const significant = pValue !== null && pValue < 0.05;

      const normalText = (!normalLow || !normalHigh)
        ? "En eller båda grupperna avviker från normalfördelning. Eftersom stickproven är stora (n > 30) är T-testet ändå robust enligt centrala gränsvärdessatsen."
        : "Båda grupperna bedöms som tillräckligt normalfördelade för att T-testet ska vara giltigt.";

      const tResultText = tResult
        ? [
          "**T-värde:** " + tResult.t.toFixed(3),
          "**Frihetsgrader (df):** " + tResult.df,
          "**P-värde (approximerat):** " + (pValue !== null ? pValue.toFixed(4) : "kan ej beräknas"),
          "**Signifikansnivå:** α = 0.05",
          "",
          significant
            ? "**Slutsats:** P-värdet (" + pValue.toFixed(4) + ") är mindre än 0,05. Vi förkastar nollhypotesen. Skillnaden är **statistiskt signifikant** i det valda urvalet."
            : "**Slutsats:** P-värdet (" + pValue.toFixed(4) + ") är större än eller lika med 0,05. Vi kan inte förkasta nollhypotesen. Skillnaden är **inte statistiskt signifikant** i det valda urvalet."
        ].join("\n")
        : "T-testet kunde inte genomföras eftersom en eller båda grupperna innehåller för få värden.";

      addMdToPage(`
## Hypotesprövning: T-test

För att undersöka om skillnaden i partistöd mellan låginkomst- och höginkomstkommuner är statistiskt signifikant genomförs ett tvåpunkts T-test (Welch's t-test).

**Nollhypotes (H₀):** Det finns ingen skillnad i genomsnittligt stöd för ${chosenPartyName} mellan låginkomst- och höginkomstkommuner.

**Alternativhypotes (H₁):** Det finns en skillnad i genomsnittligt stöd för ${chosenPartyName} mellan låginkomst- och höginkomstkommuner.

### Kontroll av normalfördelning

Tumregel: skevhet mellan -1 och +1 anses godtagbart normalfördelat.

| Grupp | Antal kommuner | Medelvärde | Skevhet | Normalfördelad? |
|-------|---------------|------------|---------|-----------------|
| Låg inkomst | ${lowGroup.length} | ${formatPercent(average(lowGroup))} | ${skewLow !== null ? skewLow.toFixed(3) : "kan ej beräknas"} | ${normalLow ? "✓ Ja" : "✗ Nej — används ändå pga stort stickprov"} |
| Hög inkomst | ${highGroup.length} | ${formatPercent(average(highGroup))} | ${skewHigh !== null ? skewHigh.toFixed(3) : "kan ej beräknas"} | ${normalHigh ? "✓ Ja" : "✗ Nej — används ändå pga stort stickprov"} |

${normalText}

### Resultat av T-testet

${tResultText}

> **Obs:** Statistisk signifikans innebär att skillnaden sannolikt inte beror på slumpen — inte att inkomst *orsakar* skillnaden i röstbeteende.
`);

      addToPage(sectionBox("⚠️", "Extremvärden", [
        "<strong>Danderyd</strong> och <strong>Lidingö</strong> i höginkomstgruppen har exceptionellt höga inkomster och drar upp gruppens genomsnitt",
        "Låginkomstgruppen innehåller kommuner med mycket låga inkomster som drar ner snittet",
        "Genomsnittet per grupp kan påverkas av extremvärden — skillnaderna kan se större ut än för en typisk kommun"
      ]));
    }
  }
}