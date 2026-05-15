import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i sidan.
// De gör koden enklare att läsa och minskar upprepning.
// =====================================================

// Normaliserar text så att kommun- och länsnamn blir lättare att jämföra.
// Exempel: "Västra Götalands län" och "vastra gotalands lan" kan matchas enklare.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Standardiserar könsvärden från arbetslöshetsdatan.
// Det gör att dropdownen kan filtrera på totalt, kvinnor och män även om datan skrivs på olika sätt.
function normalizeGender(value) {
  const v = normalize(value);

  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";

  return "totalt";
}

// Visar kortare och renare partinamn på sidan.
// Originalnamnen används fortfarande i datan så att matchningen mot databasen fungerar.
function displayPartyName(party) {
  const names = {
    "Arbetarepartiet-Socialdemokraterna": "Socialdemokraterna",
    "Miljöpartiet de gröna": "Miljöpartiet"
  };

  return names[party] || party;
}

// Hämtar värde från flera möjliga kolumnnamn.
// Detta gör sidan mer robust eftersom olika datakällor kan använda olika namn.
function getField(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }

  return null;
}

// Gör om värden till tal.
// Behövs eftersom vissa siffror kan komma som text eller använda kommatecken istället för punkt.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(
    String(value)
      .replace(/\s/g, "")
      .replace("%", "")
      .replace(",", ".")
  );

  return Number.isFinite(num) ? num : null;
}

// Räknar ut genomsnittet av en lista med tal.
// Tomma eller ogiltiga värden tas bort innan beräkningen.
function average(values) {
  const nums = values.filter(v =>
    v !== null &&
    v !== undefined &&
    Number.isFinite(v)
  );

  if (!nums.length) return 0;

  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// Formaterar procentvärden med en decimal.
// Exempel: 7.234 blir "7,2 %".
function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

// Beräknar korrelation mellan två variabler.
// Här används den för att mäta sambandet mellan arbetslöshet och partistöd.
function correlation(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const avgX = average(xs);
  const avgY = average(ys);

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - avgX;
    const dy = ys[i] - avgY;

    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  const denominator = Math.sqrt(sumX * sumY);
  if (denominator === 0) return null;

  return numerator / denominator;
}

// Tolkar hur stark korrelationen är.
// Detta gör att sidan kan visa text som "svagt", "måttligt" eller "starkt" samband.
function correlationStrength(value) {
  if (value === null) return "kan inte beräknas";

  const abs = Math.abs(value);

  if (abs >= 0.5) return "starkt";
  if (abs >= 0.2) return "måttligt";
  return "svagt";
}

// Avgör om korrelationen är positiv eller negativ.
// Positiv betyder att partistödet ökar när arbetslösheten ökar.
// Negativ betyder att partistödet minskar när arbetslösheten ökar.
function correlationDirection(value) {
  if (value === null) return "oklart";
  if (value > 0) return "positivt";
  if (value < 0) return "negativt";
  return "inget tydligt";
}

// Skapar en kort beskrivning av korrelationen.
// Exempel: "måttligt positivt samband".
function correlationLabel(value) {
  if (value === null) return "kan inte beräknas";

  const strength = correlationStrength(value);
  const direction = correlationDirection(value);

  if (direction === "inget tydligt") return "inget tydligt samband";
  return `${strength} ${direction} samband`;
}

// Skapar en längre förklaring av korrelationen.
// Texten ändras automatiskt beroende på om sambandet är positivt eller negativt.
function describeCorrelation(value, party) {
  const partyName = displayPartyName(party);

  if (value === null) {
    return `Korrelationen kunde inte beräknas för ${partyName} eftersom det saknas tillräckligt med data i det valda urvalet.`;
  }

  const strength = correlationStrength(value);

  if (value > 0) {
    return `Korrelationen är positiv, vilket innebär att stödet för ${partyName} tenderar att vara högre i kommuner som tillhör län med högre arbetslöshet. Sambandet är ${strength}, vilket betyder att det finns ett mönster, men att arbetslöshet inte ensamt kan förklara hur människor röstar.`;
  }

  if (value < 0) {
    return `Korrelationen är negativ, vilket innebär att stödet för ${partyName} tenderar att vara lägre i kommuner som tillhör län med högre arbetslöshet. Sambandet är ${strength}, vilket betyder att det finns ett mönster, men att arbetslöshet inte ensamt kan förklara hur människor röstar.`;
  }

  return `Korrelationen är nära noll, vilket innebär att analysen inte visar något tydligt linjärt samband mellan arbetslöshet och stöd för ${partyName} i det valda urvalet.`;
}

// Förklarar om resultatet ger stöd för hypotesen.
// Detta gör resultatdelen mer analytisk och inte bara beskrivande.
function hypothesisConclusion(value) {
  if (value === null) {
    return "Det går därför inte att avgöra om hypotesen får stöd i det valda urvalet.";
  }

  if (Math.abs(value) >= 0.2) {
    return "Resultatet ger delvis stöd för hypotesen, eftersom analysen visar att arbetslöshet och partistöd samvarierar i det valda urvalet.";
  }

  return "Resultatet ger svagt stöd för hypotesen, eftersom sambandet mellan arbetslöshet och partistöd är litet i det valda urvalet.";
}

// Skapar hypotesen som visas på sidan.
// Partinamnet är dynamiskt och ändras beroende på vilket parti användaren väljer.
function hypothesisText(party) {
  const partyName = displayPartyName(party);
  return `Vi undersöker om stödet för ${partyName} har ett samband med arbetslöshet. Vår hypotes är att partistödet kan skilja sig mellan kommuner som ligger i län med högre eller lägre arbetslöshet. Samtidigt är det viktigt att komma ihåg att arbetslösheten finns på länsnivå, medan valresultatet finns på kommunnivå.`;
}

// Skapar sammanfattningskort.
// Korten används för att snabbt visa viktiga nyckeltal i urvalet.
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

// Skapar en informationsruta.
// Här används den för att visa hypotesen tydligare på sidan.
function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

// Skapar en laddningsruta som visas medan databaserna hämtar data.
// Detta gör att sidan inte ser tom ut under tiden.
function loadingBox() {
  return `
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 8px 0; font-size:19px;">Laddar analysen...</h3>
      <p style="margin:0; line-height:1.6; font-size:16px;">
        Hämtar arbetslöshetsdata, valresultat och kommunernas länskoppling. Diagram och tabeller visas strax.
      </p>
    </div>
  `;
}

// Tar bort laddningsrutan när datan är färdighämtad.
function removeLoadingBox() {
  const loadingMessage = document.getElementById("loading-message");

  if (loadingMessage) {
    loadingMessage.remove();
  }
}

// =====================================================
// SIDANS INTRODUKTION
// Här skrivs rubrik, syfte och analysfråga ut på sidan.
// Den här sidan kopplar arbetslöshetsdata till valresultat.
// =====================================================

addMdToPage(`
# Arbetslöshet vs röstning

I denna analys undersöker vi om det finns ett samband mellan arbetslöshet och stöd för olika partier. Arbetslösheten finns på länsnivå, medan valresultatet finns på kommunnivå. Därför kopplas varje kommun till sitt län och får samma arbetslöshetsvärde som länet.

## Fråga
**Finns det ett samband mellan arbetslöshet och hur människor röstar på olika partier?**
`);

addToPage(loadingBox());

// =====================================================
// DATABASKONTROLL
// Om databasuppkopplingen inte fungerar visas ett felmeddelande.
// Annars fortsätter sidan med att hämta och bearbeta data.
// =====================================================

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  // =====================================================
  // HÄMTA DATA
  // Här hämtas arbetslöshetsdata, kommun-län-koppling och valresultat.
  // Dessa tre datakällor behövs för att koppla arbetslöshet till partistöd.
  // =====================================================

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  let unemploymentResult = [];

  try {
    unemploymentResult = await dbQuery("SELECT * FROM arbetsloshet_by_lan");
  }
  catch (error) {
    try {
      unemploymentResult = await dbQuery("SELECT * FROM arbetsloshet_clean");
    }
    catch (secondError) {
      unemploymentResult = [];
    }
  }

  dbQuery.use("riksdagsval-neo4j");
  const electionResult = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  // Nu är datan hämtad och därför tas laddningsrutan bort.
  removeLoadingBox();

  // Säkerställer att datan alltid blir arrays innan vi använder .map(), .filter() och .find().
  const lanKommun = Array.isArray(lanKommunResult)
    ? lanKommunResult
    : lanKommunResult?.data || lanKommunResult?.result || [];

  const unemploymentRaw = Array.isArray(unemploymentResult)
    ? unemploymentResult
    : unemploymentResult?.data || unemploymentResult?.result || [];

  const electionResults = Array.isArray(electionResult)
    ? electionResult
    : electionResult?.data || electionResult?.result || [];

  // =====================================================
  // KOPPLA KOMMUN TILL LÄN
  // Valresultatet finns på kommunnivå men arbetslösheten finns på länsnivå.
  // Därför används tabellen lan_kommun för att hitta rätt län för varje kommun.
  // =====================================================

  function getCountyByMunicipality(kommun) {
    const kommunName = normalize(kommun);

    const match = lanKommun.find(row =>
      normalize(row.kommun) === kommunName
    );

    return match?.Lan || match?.lan || match?.län || match?.Län || null;
  }

  // =====================================================
  // RENGÖR ARBETSLÖSHETSDATA
  // Tabellen arbetsloshet_by_lan är i brett format.
  // Det betyder att årtalen 2018 och 2022 ligger som egna kolumner.
  // Här gör vi om datan till långt format så varje rad får: län, kön, år och arbetslöshet.
  // =====================================================

  const yearColumns = ["2018", "2022"];

  const unemploymentData = unemploymentRaw
    .flatMap(row => {
      const lan = getField(row, ["lan", "län", "Lan", "Län", "region", "Region"]);
      const kon = getField(row, ["kon", "kön", "Kon", "Kön", "gender", "Gender"]);

      return yearColumns.map(year => ({
        lan,
        year,
        kon: normalizeGender(kon),
        arbetsloshet: toNumber(row[year])
      }));
    })
    .filter(row =>
      row.lan &&
      row.year &&
      row.arbetsloshet !== null
    );

  // =====================================================
  // RENGÖR VALDATA
  // Här skapas ett rent dataset med kommun, län, parti och röster för 2018 och 2022.
  // Kommuner utan län eller röster tas bort.
  // =====================================================

  const cleanedElection = electionResults
    .map(row => ({
      kommun: row.kommun,
      lan: getCountyByMunicipality(row.kommun),
      parti: row.parti,
      roster2018: toNumber(row.roster2018),
      roster2022: toNumber(row.roster2022)
    }))
    .filter(row =>
      row.kommun &&
      row.lan &&
      row.parti &&
      row.roster2018 !== null &&
      row.roster2022 !== null
    );

  // =====================================================
  // HANTERA TOM DATA
  // Om arbetslöshetsdatan eller valresultatet saknas visas ett tydligt meddelande.
  // =====================================================

  if (!unemploymentData.length || !cleanedElection.length) {
    addMdToPage(`
## Resultat

Det finns inte tillräckligt med data för att göra analysen. Kontrollera att arbetslöshetsdata, kommun-län-koppling och valresultat finns tillgängliga.
`);
  }
  else {

    // =====================================================
    // RÄKNA TOTALA RÖSTER PER KOMMUN
    // För att kunna räkna ut partiets röstandel behövs totalt antal röster i kommunen.
    // Funktionen summerar därför alla partiers röster per kommun för valt år.
    // =====================================================

    function buildTotalVotesMap(year) {
      const map = new Map();

      cleanedElection.forEach(row => {
        const key = normalize(row.kommun);
        const votes = year === "2018" ? row.roster2018 : row.roster2022;

        if (!map.has(key)) {
          map.set(key, 0);
        }

        map.set(key, map.get(key) + votes);
      });

      return map;
    }

    // =====================================================
    // SKAPA DROPDOWNS
    // Här skapas filtren som användaren kan styra analysen med.
    // Dropdownen visar korta partinamn, men koden använder originalnamnen för att matcha databasen.
    // =====================================================

    const parties = [...new Set(cleanedElection.map(row => row.parti))]
      .sort((a, b) => displayPartyName(a).localeCompare(displayPartyName(b), "sv"));

    const partyOptions = parties.map(party => displayPartyName(party));

    const years = [...new Set(unemploymentData.map(row => row.year))]
      .sort((a, b) => b.localeCompare(a));

    const counties = [...new Set(unemploymentData.map(row => row.lan))]
      .sort((a, b) => a.localeCompare(b, "sv"));

    const hasGenderValues = unemploymentData.some(row => row.kon === "män" || row.kon === "kvinnor");

    const chosenPartyDisplay = addDropdown("Välj parti:", partyOptions, displayPartyName(parties[0]));
    const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
    const chosenPartyName = displayPartyName(chosenParty);

    const chosenYear = addDropdown("Välj år", years, years[0]);
    const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
    const chosenGender = hasGenderValues
      ? addDropdown("Välj arbetslöshet för", ["Totalt", "Kvinnor", "Män"], "Totalt")
      : "Totalt";

    const selectedGender = normalizeGender(chosenGender);
    const totalVotesMap = buildTotalVotesMap(chosenYear);

    // Hypotesen skrivs ut efter dropdowns eftersom den innehåller valt parti.
    addToPage(infoBox("Analysens hypotes", hypothesisText(chosenParty)));

    // =====================================================
    // SKAPA ARBETSLÖSHETSKARTA
    // Här skapas en karta där varje län kopplas till sitt arbetslöshetsvärde.
    // Den används sedan för att ge varje kommun sitt läns arbetslöshet.
    // =====================================================

    const unemploymentRows = unemploymentData.filter(row => {
      const yearMatch = row.year === chosenYear;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      const genderMatch = row.kon === selectedGender;

      return yearMatch && countyMatch && genderMatch;
    });

    const unemploymentMap = new Map(
      unemploymentRows.map(row => [normalize(row.lan), row.arbetsloshet])
    );

    // =====================================================
    // SLÅ IHOP ARBETSLÖSHETSDATA OCH VALDATA
    // Här kopplas varje kommun till sitt läns arbetslöshetsvärde.
    // Sedan räknas partiets röstandel ut som procent av kommunens totala röster.
    // =====================================================

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

        return {
          kommun: row.kommun,
          lan: row.lan,
          parti: row.parti,
          partyName: chosenPartyName,
          year: chosenYear,
          arbetsloshet,
          partyVotes,
          partyShare: (partyVotes / totalVotes) * 100
        };
      })
      .filter(row => row !== null);

    // =====================================================
    // HANTERA TOMT URVAL
    // Om filtren gör att det inte finns någon data visas ett meddelande.
    // =====================================================

    if (!mergedData.length) {
      addMdToPage(`
## Resultat

Det finns ingen kopplad data för **${chosenPartyName}**, **${chosenCounty}**, **${chosenGender}**, **${chosenYear}**.

Det kan bero på att arbetslöshetsvärdet saknas för det valda länet, året eller könet. Vissa arbetslöshetsvärden är **NULL** i datan och filtreras därför bort.
`);
    }
    else {

      // =====================================================
      // BERÄKNA NYCKELTAL
      // Här räknas värden fram som används i kort, diagram och analys.
      // =====================================================

      const unemploymentValues = mergedData.map(row => row.arbetsloshet);
      const shares = mergedData.map(row => row.partyShare);

      const corr = correlation(unemploymentValues, shares);
      const corrLabel = correlationLabel(corr);

      const highestSupport = mergedData.reduce((max, row) =>
        row.partyShare > max.partyShare ? row : max,
        mergedData[0]
      );

      const lowestSupport = mergedData.reduce((min, row) =>
        row.partyShare < min.partyShare ? row : min,
        mergedData[0]
      );

      const highestUnemployment = mergedData.reduce((max, row) =>
        row.arbetsloshet > max.arbetsloshet ? row : max,
        mergedData[0]
      );

      const lowestUnemployment = mergedData.reduce((min, row) =>
        row.arbetsloshet < min.arbetsloshet ? row : min,
        mergedData[0]
      );

      // =====================================================
      // SAMMANFATTNINGSKORT
      // Visar en snabb översikt över urvalet.
      // Här ser användaren antal kommuner, genomsnittlig arbetslöshet, genomsnittligt stöd och korrelation.
      // =====================================================

      addMdToPage(`
## Sammanfattning av urvalet
`);

      addToPage(statCards([
        {
          title: "Antal kommuner",
          value: new Set(mergedData.map(row => row.kommun)).size
        },
        {
          title: "Genomsnittlig arbetslöshet",
          value: formatPercent(average(unemploymentValues))
        },
        {
          title: `Genomsnittligt stöd för ${chosenPartyName}`,
          value: formatPercent(average(shares))
        },
        {
          title: "Korrelation",
          value: corr === null ? "saknas" : corr.toFixed(3),
          note: corrLabel
        }
      ]));

      // =====================================================
      // DIAGRAM: ARBETSLÖSHET VS PARTISTÖD
      // Scatterploten visar varje kommun som en punkt.
      // X-axeln visar arbetslösheten i kommunens län, eftersom arbetslöshetsdatan finns på länsnivå.
      // Y-axeln visar partiets röstandel.
      // Trendlinjen hjälper användaren att se sambandet visuellt.
      // =====================================================

      addMdToPage(`
## Hur varierar stödet för ${chosenPartyName} beroende på arbetslöshet?

Diagrammet visar varje kommun som en punkt. X-axeln visar arbetslösheten i kommunens län, eftersom arbetslöshetsdatan finns på länsnivå. Y-axeln visar hur stor andel av rösterna som gick till det valda partiet. Eftersom arbetslösheten finns på länsnivå får alla kommuner inom samma län samma arbetslöshetsvärde. Därför syns punkterna ofta i lodräta grupper i diagrammet.
`);

      drawGoogleChart({
        type: "ScatterChart",
        data: [
          ["Arbetslöshet", `Stöd för ${chosenPartyName}`],
          ...mergedData.map(row => [row.arbetsloshet, row.partyShare])
        ],
        options: {
          title: `Arbetslöshet vs stöd för ${chosenPartyName} (${chosenYear})`,
          height: 650,
          chartArea: { width: "84%", height: "74%" },
          hAxis: {
            title: "Arbetslöshet i länet (%)",
            textStyle: { fontSize: 14 },
            titleTextStyle: { fontSize: 16, bold: true }
          },
          vAxis: {
            title: `Röstandel för ${chosenPartyName} (%)`,
            textStyle: { fontSize: 14 },
            titleTextStyle: { fontSize: 16, bold: true }
          },
          trendlines: {
            0: {
              type: "linear",
              showR2: true,
              visibleInLegend: true
            }
          },
          legend: { position: "bottom", textStyle: { fontSize: 13 } }
        }
      });

      // =====================================================
      // RESULTAT
      // Här skrivs den viktigaste tolkningen av analysen ut.
      // Texten anpassas automatiskt efter korrelationens riktning och styrka.
      // =====================================================

      addMdToPage(`
## Resultat

Analysen visar ett **${corrLabel}** mellan arbetslöshet och stöd för **${chosenPartyName}** i det valda urvalet.

${describeCorrelation(corr, chosenParty)}

${hypothesisConclusion(corr)}

Det högsta stödet för **${chosenPartyName}** finns i **${highestSupport.kommun}** där partiet får **${formatPercent(highestSupport.partyShare)}** av rösterna. Det lägsta stödet finns i **${lowestSupport.kommun}** där partiet får **${formatPercent(lowestSupport.partyShare)}** av rösterna.
`);

      // =====================================================
      // TABELLER: HÖGST OCH LÄGST PARTISTÖD
      // Tabellerna gör det lättare att se konkreta exempel från datan.
      // De visar var det valda partiet har starkast och svagast stöd.
      // =====================================================

      const sortedBySupport = [...mergedData].sort((a, b) => b.partyShare - a.partyShare);

      addMdToPage(`
## Kommuner där ${chosenPartyName} har högst stöd
`);

      tableFromData({
        data: sortedBySupport.slice(0, 5).map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Arbetslöshet: formatPercent(row.arbetsloshet),
          Röstandel: formatPercent(row.partyShare)
        }))
      });

      addMdToPage(`
## Kommuner där ${chosenPartyName} har lägst stöd
`);

      tableFromData({
        data: sortedBySupport.slice(-5).reverse().map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Arbetslöshet: formatPercent(row.arbetsloshet),
          Röstandel: formatPercent(row.partyShare)
        }))
      });

      // =====================================================
      // KORT ANALYS
      // Här kopplas resultatet tillbaka till frågan och hypotesen.
      // Texten förklarar också varför resultatet ska tolkas försiktigt.
      // =====================================================

      addMdToPage(`
## Kort analys

För urvalet **${chosenPartyName}**, **${chosenGender}**, **${chosenCounty}**, **${chosenYear}** visar analysen att arbetslöshet och partistöd har ett **${corrLabel}**.

Den högsta arbetslösheten i det kopplade urvalet finns i **${highestUnemployment.lan}** med **${formatPercent(highestUnemployment.arbetsloshet)}**. Den lägsta arbetslösheten finns i **${lowestUnemployment.lan}** med **${formatPercent(lowestUnemployment.arbetsloshet)}**.

Resultatet kan tyda på att ekonomiska skillnader mellan län hänger ihop med politiska röstningsmönster. Samtidigt är det viktigt att komma ihåg att analysen använder arbetslöshet på länsnivå och valresultat på kommunnivå. Därför blir analysen mindre detaljerad än inkomstanalysen.

## Metod och begränsning

Analysen kopplar arbetslöshet på länsnivå till kommunernas valresultat. Varje kommun får samma arbetslöshetsvärde som sitt län. Detta är nödvändigt eftersom arbetslöshetsdatan inte finns på kommunnivå i vårt dataset.

Detta skiljer sig från inkomstanalysen, där inkomst finns på kommunnivå. Därför kan inkomstanalysen jämföra kommuner mer direkt, medan denna analys behöver tolka resultaten mer försiktigt.

När könsfiltret står på Totalt används totalvärdet från arbetslöshetsdatan. Det är alltså inte en enkel summering av män och kvinnor, utan arbetslösheten för hela gruppen tillsammans.

Vissa värden saknas i datan, till exempel om ett län har **NULL** för ett visst år eller kön. Dessa rader filtreras bort från analysen, vilket kan göra att vissa län saknas i ett urval.

Det är också viktigt att skilja mellan samband och orsak. En korrelation visar att två variabler varierar tillsammans, men den bevisar inte att arbetslöshet orsakar ett visst röstningsmönster. Andra faktorer som utbildning, ålder, migration, inkomst och geografisk plats kan också påverka hur människor röstar.
`);
    }
  }
}