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

function correlation(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const avgX = average(xs), avgY = average(ys);
  let numerator = 0, sumX = 0, sumY = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - avgX, dy = ys[i] - avgY;
    numerator += dx * dy; sumX += dx * dx; sumY += dy * dy;
  }
  const denominator = Math.sqrt(sumX * sumY);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function correlationStrength(value) {
  if (value === null) return "kan inte beräknas";
  const abs = Math.abs(value);
  if (abs >= 0.5) return "starkt";
  if (abs >= 0.2) return "måttligt";
  return "svagt";
}

function correlationDirection(value) {
  if (value === null) return "oklart";
  if (value > 0) return "positivt";
  if (value < 0) return "negativt";
  return "inget tydligt";
}

function correlationLabel(value) {
  if (value === null) return "kan inte beräknas";
  const strength = correlationStrength(value);
  const direction = correlationDirection(value);
  if (direction === "inget tydligt") return "inget tydligt samband";
  return strength + " " + direction + " samband";
}

function describeCorrelation(value, party) {
  const partyName = displayPartyName(party);
  if (value === null) return "Korrelationen kunde inte beräknas för " + partyName + " eftersom det saknas tillräckligt med data.";
  const strength = correlationStrength(value);
  if (value > 0) return "Korrelationen är positiv — stödet för " + partyName + " tenderar att vara högre i kommuner med högre inkomst. Sambandet är " + strength + ".";
  if (value < 0) return "Korrelationen är negativ — stödet för " + partyName + " tenderar att vara lägre i kommuner med högre inkomst. Sambandet är " + strength + ".";
  return "Korrelationen är nära noll — inget tydligt linjärt samband mellan inkomst och stöd för " + partyName + ".";
}

function hypothesisConclusion(value) {
  if (value === null) return "Det går inte att avgöra om hypotesen får stöd i det valda urvalet.";
  if (Math.abs(value) >= 0.2) return "Resultatet ger delvis stöd för hypotesen — inkomstnivå och partistöd samvarierar i det valda urvalet.";
  return "Resultatet ger svagt stöd för hypotesen — sambandet mellan inkomstnivå och partistöd är litet.";
}

function hypothesisText(party) {
  const partyName = displayPartyName(party);
  return "Vi undersöker om " + partyName + " har starkare stöd i kommuner med högre eller lägre genomsnittlig inkomst. Vår hypotes är att inkomstnivå kan ha ett samband med röstningsmönster. Samtidigt innebär ett samband inte att inkomsten direkt orsakar hur människor röstar.";
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

addMdToPage(`
# Inkomst vs röstning

I denna analys undersöker vi om det finns ett samband mellan genomsnittlig inkomst och stöd för olika partier i Sveriges kommuner. Genom att koppla ihop inkomstdata med valresultat kan vi se om vissa partier har starkare stöd i kommuner med högre eller lägre inkomstnivå.

## Fråga
**Finns det ett samband mellan inkomstnivå och hur människor röstar på olika partier?**
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

  const chosenPartyDisplay = addDropdown("Välj parti", partyOptions, displayPartyName(parties[0]));
  const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
  const chosenPartyName = displayPartyName(chosenParty);

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
  const chosenYear = addDropdown("Välj år", ["2022", "2018"], "2022");

  const selectedGender = normalizeGender(chosenGender);
  const totalVotesMap = buildTotalVotesMap(chosenYear);

  addToPage(infoBox("Analysens hypotes", hypothesisText(chosenParty)));

  const mergedData = cleanedIncome
    .filter(row => {
      const genderMatch = row.kon === selectedGender;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      return genderMatch && countyMatch;
    })
    .map(incomeRow => {
      const electionRow = cleanedElection.find(voteRow => normalize(voteRow.kommun) === normalize(incomeRow.kommun) && voteRow.parti === chosenParty);
      if (!electionRow) return null;
      const totalVotes = totalVotesMap.get(normalize(incomeRow.kommun));
      const partyVotes = chosenYear === "2018" ? electionRow.roster2018 : electionRow.roster2022;
      if (!totalVotes || totalVotes === 0) return null;
      return { kommun: incomeRow.kommun, lan: incomeRow.lan, inkomst2022: incomeRow.inkomst2022, partyVotes, partyShare: (partyVotes / totalVotes) * 100 };
    })
    .filter(row => row !== null);

  if (!mergedData.length) {
    addMdToPage(`## Resultat\n\nDet finns ingen data för det valda urvalet.`);
  }
  else {

    const incomes = mergedData.map(row => row.inkomst2022);
    const shares = mergedData.map(row => row.partyShare);
    const corr = correlation(incomes, shares);
    const corrLabel = correlationLabel(corr);

    const highestSupport = mergedData.reduce((max, row) => row.partyShare > max.partyShare ? row : max, mergedData[0]);
    const lowestSupport = mergedData.reduce((min, row) => row.partyShare < min.partyShare ? row : min, mergedData[0]);

    addMdToPage(`## Sammanfattning av urvalet`);
    addToPage(statCards([
      { title: "Antal kommuner", value: new Set(mergedData.map(row => row.kommun)).size },
      { title: "Genomsnittlig inkomst", value: formatIncome(average(incomes)) },
      { title: "Genomsnittligt stöd för " + chosenPartyName, value: formatPercent(average(shares)) },
      { title: "Korrelation", value: corr === null ? "saknas" : corr.toFixed(3), note: corrLabel }
    ]));

    addMdToPage(`
## Hur varierar stödet för ${chosenPartyName} beroende på inkomst?

Diagrammet visar varje kommun som en punkt. X-axeln visar genomsnittlig årsinkomst och Y-axeln visar hur stor andel av rösterna som gick till det valda partiet. Trendlinjen gör det lättare att se om stödet tenderar att öka eller minska när inkomsten ökar.
`);

    drawGoogleChart({
      type: "ScatterChart",
      data: [["Inkomst 2022", "Stöd för " + chosenPartyName], ...mergedData.map(row => [row.inkomst2022, row.partyShare])],
      options: {
        title: "Inkomst vs stöd för " + chosenPartyName + " (" + chosenYear + ")",
        height: 650,
        chartArea: { width: "84%", height: "74%" },
        hAxis: { title: "Genomsnittlig årsinkomst 2022 (tkr)", textStyle: { fontSize: 14 }, titleTextStyle: { fontSize: 16, bold: true } },
        vAxis: { title: "Röstandel för " + chosenPartyName + " (%)", textStyle: { fontSize: 14 }, titleTextStyle: { fontSize: 16, bold: true } },
        trendlines: { 0: { type: "linear", showR2: true, visibleInLegend: true } },
        legend: { position: "bottom", textStyle: { fontSize: 13 } }
      }
    });

    addMdToPage(`## Resultat`);
    addToPage(sectionBox("📊", "Samband", [
      "Analysen visar ett <strong>" + corrLabel + "</strong> mellan inkomstnivå och stöd för <strong>" + chosenPartyName + "</strong>",
      describeCorrelation(corr, chosenParty),
      hypothesisConclusion(corr),
      "Högst stöd: <strong>" + highestSupport.kommun + "</strong> med <strong>" + formatPercent(highestSupport.partyShare) + "</strong>",
      "Lägst stöd: <strong>" + lowestSupport.kommun + "</strong> med <strong>" + formatPercent(lowestSupport.partyShare) + "</strong>"
    ]));

    const sortedBySupport = [...mergedData].sort((a, b) => b.partyShare - a.partyShare);

    addMdToPage(`## Kommuner där ${chosenPartyName} har högst stöd`);
    tableFromData({ data: sortedBySupport.slice(0, 5).map(row => ({ Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022), Röstandel: formatPercent(row.partyShare) })) });

    addMdToPage(`## Kommuner där ${chosenPartyName} har lägst stöd`);
    tableFromData({ data: sortedBySupport.slice(-5).reverse().map(row => ({ Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022), Röstandel: formatPercent(row.partyShare) })) });

    addMdToPage(`## Kort analys`);
    addToPage(sectionBox("📊", "Analys", [
      "Urvalet <strong>" + chosenGender + "</strong>, <strong>" + chosenCounty + "</strong>, <strong>" + chosenYear + "</strong>: <strong>" + corrLabel + "</strong>",
      "Ekonomiska skillnader mellan kommuner kan hänga ihop med politiska röstningsmönster",
      "Inkomst <strong>orsakar inte</strong> hur människor röstar — utbildningsnivå kan påverka både inkomst och röstbeteende",
      "Röstningsmönster formas av lokala samhällsfrågor, historik och kultur som inte syns i inkomststatistiken"
    ]));

    addToPage(sectionBox("🔍", "Metod och begränsning", [
      "Jämför genomsnittlig inkomst per kommun med partiets röstandel i riksdagsvalet <strong>" + chosenYear + "</strong>",
      "Inkomstvärdet kommer från 2022 — används även för valåret 2018 (begränsning)",
      "Röstandel = partiets röster / totala röster i kommunen",
      "Korrelation bevisar inte kausalitet — två variabler kan samvariera utan att den ena orsakar den andra"
    ]));

    addToPage(sectionBox("⚠️", "Extremvärden", [
      "<strong>Danderyd</strong> och <strong>Lidingö</strong> har betydligt högre inkomst än övriga kommuner och kan påverka trendlinjen",
      "Vissa kommuner kan ha ovanligt högt eller lågt partistöd och dra korrelationen åt ett håll",
      "Resultatet bör tolkas som en indikation — inte som ett definitivt bevis på orsakssamband"
    ]));
  }
}