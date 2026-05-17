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

function getField(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") return row[name];
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/\s/g, "").replace("%", "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function average(values) {
  const nums = values.filter(v => v !== null && v !== undefined && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
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
  if (value > 0) return "Korrelationen är positiv — stödet för " + partyName + " tenderar att vara högre i kommuner med högre arbetslöshet. Sambandet är " + strength + ".";
  if (value < 0) return "Korrelationen är negativ — stödet för " + partyName + " tenderar att vara lägre i kommuner med högre arbetslöshet. Sambandet är " + strength + ".";
  return "Korrelationen är nära noll — inget tydligt linjärt samband mellan arbetslöshet och stöd för " + partyName + ".";
}

function hypothesisConclusion(value) {
  if (value === null) return "Det går inte att avgöra om hypotesen får stöd i det valda urvalet.";
  if (Math.abs(value) >= 0.2) return "Resultatet ger delvis stöd för hypotesen — arbetslöshet och partistöd samvarierar i det valda urvalet.";
  return "Resultatet ger svagt stöd för hypotesen — sambandet mellan arbetslöshet och partistöd är litet.";
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
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar arbetslöshetsdata, valresultat och kommunernas länskoppling. Diagram och tabeller visas strax.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

addMdToPage(`
# Arbetslöshet vs röstning

I denna analys undersöker vi om det finns ett samband mellan arbetslöshet och stöd för olika partier. Arbetslösheten finns på länsnivå, medan valresultatet finns på kommunnivå.

## Fråga
**Finns det ett samband mellan arbetslöshet och hur människor röstar på olika partier?**
`);

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  let unemploymentResult = [];
  try {
    unemploymentResult = await dbQuery("SELECT * FROM arbetsloshet_by_lan");
  } catch (error) {
    try {
      unemploymentResult = await dbQuery("SELECT * FROM arbetsloshet_clean");
    } catch (secondError) {
      unemploymentResult = [];
    }
  }

  dbQuery.use("riksdagsval-neo4j");
  const electionResult = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  removeLoadingBox();

  const lanKommun = Array.isArray(lanKommunResult) ? lanKommunResult : lanKommunResult?.data || lanKommunResult?.result || [];
  const unemploymentRaw = Array.isArray(unemploymentResult) ? unemploymentResult : unemploymentResult?.data || unemploymentResult?.result || [];
  const electionResults = Array.isArray(electionResult) ? electionResult : electionResult?.data || electionResult?.result || [];

  function getCountyByMunicipality(kommun) {
    const kommunName = normalize(kommun);
    const match = lanKommun.find(row => normalize(row.kommun) === kommunName);
    return match?.Lan || match?.lan || match?.län || match?.Län || null;
  }

  const yearColumns = ["2018", "2022"];

  const unemploymentData = unemploymentRaw
    .flatMap(row => {
      const lan = getField(row, ["lan", "län", "Lan", "Län", "region", "Region"]);
      const kon = getField(row, ["kon", "kön", "Kon", "Kön", "gender", "Gender"]);
      return yearColumns.map(year => ({ lan, year, kon: normalizeGender(kon), arbetsloshet: toNumber(row[year]) }));
    })
    .filter(row => row.lan && row.year && row.arbetsloshet !== null);

  const cleanedElection = electionResults
    .map(row => ({
      kommun: row.kommun,
      lan: getCountyByMunicipality(row.kommun),
      parti: row.parti,
      roster2018: toNumber(row.roster2018),
      roster2022: toNumber(row.roster2022)
    }))
    .filter(row => row.kommun && row.lan && row.parti && row.roster2018 !== null && row.roster2022 !== null);

  if (!unemploymentData.length || !cleanedElection.length) {
    addMdToPage(`## Resultat\n\nDet finns inte tillräckligt med data för att göra analysen.`);
  }
  else {

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
    const years = [...new Set(unemploymentData.map(row => row.year))].sort((a, b) => b.localeCompare(a));
    const counties = [...new Set(unemploymentData.map(row => row.lan))].sort((a, b) => a.localeCompare(b, "sv"));
    const hasGenderValues = unemploymentData.some(row => row.kon === "män" || row.kon === "kvinnor");

    const chosenPartyDisplay = addDropdown("Välj parti:", partyOptions, displayPartyName(parties[0]));
    const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
    const chosenPartyName = displayPartyName(chosenParty);

    const chosenYear = addDropdown("Välj år", years, years[0]);
    const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
    const chosenGender = hasGenderValues ? addDropdown("Välj arbetslöshet för", ["Totalt", "Kvinnor", "Män"], "Totalt") : "Totalt";

    const selectedGender = normalizeGender(chosenGender);
    const totalVotesMap = buildTotalVotesMap(chosenYear);

    addToPage(infoBox("Analysens hypotes", "Vi undersöker om stödet för " + chosenPartyName + " har ett samband med arbetslöshet. Vår hypotes är att partistödet kan skilja sig mellan kommuner i län med högre eller lägre arbetslöshet."));

    const unemploymentRows = unemploymentData.filter(row => {
      const yearMatch = row.year === chosenYear;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      const genderMatch = row.kon === selectedGender;
      return yearMatch && countyMatch && genderMatch;
    });

    const unemploymentMap = new Map(unemploymentRows.map(row => [normalize(row.lan), row.arbetsloshet]));

    const mergedData = cleanedElection
      .filter(row => {
        const partyMatch = row.parti === chosenParty;
        const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
        return partyMatch && countyMatch;
      })
      .map(row => {
        const arbetsloshet = unemploymentMap.get(normalize(row.lan));
        const totalVotes = totalVotesMap.get(normalize(row.kommun));
        const partyVotes = chosenYear === "2018" ? row.roster2018 : row.roster2022;
        if (arbetsloshet === undefined || !totalVotes || totalVotes === 0) return null;
        return { kommun: row.kommun, lan: row.lan, arbetsloshet, partyVotes, partyShare: (partyVotes / totalVotes) * 100 };
      })
      .filter(row => row !== null);

    if (!mergedData.length) {
      addMdToPage(`## Resultat\n\nDet finns ingen kopplad data för **${chosenPartyName}**, **${chosenCounty}**, **${chosenGender}**, **${chosenYear}**.`);
    }
    else {

      const unemploymentValues = mergedData.map(row => row.arbetsloshet);
      const shares = mergedData.map(row => row.partyShare);
      const corr = correlation(unemploymentValues, shares);
      const corrLabel = correlationLabel(corr);

      const highestSupport = mergedData.reduce((max, row) => row.partyShare > max.partyShare ? row : max, mergedData[0]);
      const lowestSupport = mergedData.reduce((min, row) => row.partyShare < min.partyShare ? row : min, mergedData[0]);
      const highestUnemployment = mergedData.reduce((max, row) => row.arbetsloshet > max.arbetsloshet ? row : max, mergedData[0]);
      const lowestUnemployment = mergedData.reduce((min, row) => row.arbetsloshet < min.arbetsloshet ? row : min, mergedData[0]);

      addMdToPage(`## Sammanfattning av urvalet`);
      addToPage(statCards([
        { title: "Antal kommuner", value: new Set(mergedData.map(row => row.kommun)).size },
        { title: "Genomsnittlig arbetslöshet", value: formatPercent(average(unemploymentValues)) },
        { title: "Genomsnittligt stöd för " + chosenPartyName, value: formatPercent(average(shares)) },
        { title: "Korrelation", value: corr === null ? "saknas" : corr.toFixed(3), note: corrLabel }
      ]));

      addMdToPage(`
## Hur varierar stödet för ${chosenPartyName} beroende på arbetslöshet?

Diagrammet visar varje kommun som en punkt. X-axeln visar arbetslösheten i kommunens län. Eftersom arbetslösheten finns på länsnivå får alla kommuner inom samma län samma värde — därför syns punkterna i lodräta grupper.
`);

      drawGoogleChart({
        type: "ScatterChart",
        data: [["Arbetslöshet", "Stöd för " + chosenPartyName], ...mergedData.map(row => [row.arbetsloshet, row.partyShare])],
        options: {
          title: "Arbetslöshet vs stöd för " + chosenPartyName + " (" + chosenYear + ")",
          height: 650,
          chartArea: { width: "84%", height: "74%" },
          hAxis: { title: "Arbetslöshet i länet (%)", textStyle: { fontSize: 14 }, titleTextStyle: { fontSize: 16, bold: true } },
          vAxis: { title: "Röstandel för " + chosenPartyName + " (%)", textStyle: { fontSize: 14 }, titleTextStyle: { fontSize: 16, bold: true } },
          trendlines: { 0: { type: "linear", showR2: true, visibleInLegend: true } },
          legend: { position: "bottom", textStyle: { fontSize: 13 } }
        }
      });

      addMdToPage(`## Resultat`);
      addToPage(sectionBox("📊", "Samband", [
        "Analysen visar ett <strong>" + corrLabel + "</strong> mellan arbetslöshet och stöd för <strong>" + chosenPartyName + "</strong>",
        describeCorrelation(corr, chosenParty),
        hypothesisConclusion(corr),
        "Högst stöd för <strong>" + chosenPartyName + "</strong>: <strong>" + highestSupport.kommun + "</strong> med <strong>" + formatPercent(highestSupport.partyShare) + "</strong>",
        "Lägst stöd: <strong>" + lowestSupport.kommun + "</strong> med <strong>" + formatPercent(lowestSupport.partyShare) + "</strong>"
      ]));

      const sortedBySupport = [...mergedData].sort((a, b) => b.partyShare - a.partyShare);

      addMdToPage(`## Kommuner där ${chosenPartyName} har högst stöd`);
      tableFromData({ data: sortedBySupport.slice(0, 5).map(row => ({ Kommun: row.kommun, Län: row.lan, Arbetslöshet: formatPercent(row.arbetsloshet), Röstandel: formatPercent(row.partyShare) })) });

      addMdToPage(`## Kommuner där ${chosenPartyName} har lägst stöd`);
      tableFromData({ data: sortedBySupport.slice(-5).reverse().map(row => ({ Kommun: row.kommun, Län: row.lan, Arbetslöshet: formatPercent(row.arbetsloshet), Röstandel: formatPercent(row.partyShare) })) });

      addMdToPage(`## Kort analys`);
      addToPage(sectionBox("📊", "Analys", [
        "Urvalet <strong>" + chosenPartyName + "</strong>, <strong>" + chosenGender + "</strong>, <strong>" + chosenCounty + "</strong>, <strong>" + chosenYear + "</strong>: <strong>" + corrLabel + "</strong>",
        "Högst arbetslöshet i urvalet: <strong>" + highestUnemployment.lan + "</strong> med <strong>" + formatPercent(highestUnemployment.arbetsloshet) + "</strong>",
        "Lägst arbetslöshet: <strong>" + lowestUnemployment.lan + "</strong> med <strong>" + formatPercent(lowestUnemployment.arbetsloshet) + "</strong>",
        "Sambandet tyder på att ekonomiska skillnader hänger ihop med politiska röstningsmönster",
        "Arbetslöshet <strong>orsakar inte</strong> hur människor röstar — bakomliggande faktorer som industristruktur och utbildning driver troligen både arbetslöshet och röstbeteende"
      ]));

      addToPage(sectionBox("🔍", "Metod och begränsning", [
        "Arbetslöshet på <strong>länsnivå</strong> kopplas till valresultat på <strong>kommunnivå</strong> — alla kommuner i samma län får samma arbetslöshetsvärde",
        "Gör analysen mindre detaljerad än inkomstanalysen",
        "Vissa länsvärden är NULL och filtreras bort",
        "Totalt-värdet är inte en summering av kön utan ett eget totalvärde",
        "Korrelation bevisar inte kausalitet — andra faktorer kan påverka"
      ]));

      addToPage(sectionBox("⚠️", "Extremvärden", [
        "<strong>Södermanlands län</strong> har genomgående hög arbetslöshet och kan påverka trendlinjen oproportionerligt",
        "<strong>Norrbottens</strong> och <strong>Västerbottens</strong> län avviker från glesbygdsmönstret — låg arbetslöshet tack vare stark offentlig sektor",
        "Dessa extremlän kan påverka korrelationen påtagligt — tolka som indikation, inte bevis"
      ]));
    }
  }
}