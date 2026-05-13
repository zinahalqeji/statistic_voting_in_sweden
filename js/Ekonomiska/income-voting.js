import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i sidan.
// De gör koden enklare att läsa och minskar upprepning.
// =====================================================

// Normaliserar text så att namn blir lättare att jämföra.
// Exempel: "Göteborg" och "goteborg" kan matchas enklare.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Standardiserar könsvärden från olika datakällor.
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

// Gör om värden till tal.
// Används eftersom vissa siffror kan komma som text eller innehålla kommatecken.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

// Räknar ut genomsnittet av en lista med tal.
// Tomma eller ogiltiga värden tas bort innan beräkningen.
function average(values) {
  const nums = values.filter(v => v !== null && v !== undefined && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// Formaterar inkomst i tusental kronor.
// Exempel: 325 blir "325 tkr".
function formatIncome(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} tkr`;
}

// Formaterar procentvärden med en decimal.
// Exempel: 23.456 blir "23,5 %".
function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

// Beräknar korrelation mellan två variabler.
// Här används den för att mäta sambandet mellan inkomst och partistöd.
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
// Positiv betyder att partistödet ökar när inkomsten ökar.
// Negativ betyder att partistödet minskar när inkomsten ökar.
function correlationDirection(value) {
  if (value === null) return "oklart";
  if (value > 0) return "positivt";
  if (value < 0) return "negativt";
  return "inget tydligt";
}

// Skapar en kort beskrivning av korrelationen.
// Exempel: "måttligt negativt samband".
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
    return `Korrelationen är positiv, vilket innebär att stödet för ${partyName} tenderar att vara högre i kommuner med högre genomsnittlig inkomst. Sambandet är ${strength}, vilket betyder att det finns ett mönster, men att det inte ensamt kan förklara hur människor röstar.`;
  }

  if (value < 0) {
    return `Korrelationen är negativ, vilket innebär att stödet för ${partyName} tenderar att vara lägre i kommuner med högre genomsnittlig inkomst. Sambandet är ${strength}, vilket betyder att det finns ett mönster, men att det inte ensamt kan förklara hur människor röstar.`;
  }

  return `Korrelationen är nära noll, vilket innebär att analysen inte visar något tydligt linjärt samband mellan inkomst och stöd för ${partyName} i det valda urvalet.`;
}

// Förklarar om resultatet ger stöd för hypotesen.
// Detta gör resultatdelen mer analytisk och inte bara beskrivande.
function hypothesisConclusion(value) {
  if (value === null) {
    return "Det går därför inte att avgöra om hypotesen får stöd i det valda urvalet.";
  }

  if (Math.abs(value) >= 0.2) {
    return "Resultatet ger delvis stöd för hypotesen, eftersom analysen visar att inkomstnivå och partistöd samvarierar i det valda urvalet.";
  }

  return "Resultatet ger svagt stöd för hypotesen, eftersom sambandet mellan inkomstnivå och partistöd är litet i det valda urvalet.";
}

// Skapar hypotesen som visas på sidan.
// Partinamnet är dynamiskt och ändras beroende på vilket parti användaren väljer.
function hypothesisText(party) {
  const partyName = displayPartyName(party);
  return `Vi undersöker om ${partyName} har starkare stöd i kommuner med högre eller lägre genomsnittlig inkomst. Vår hypotes är att inkomstnivå kan ha ett samband med röstningsmönster, eftersom ekonomiska förutsättningar kan påverka vilka politiska frågor som blir viktiga för väljare. Samtidigt är det viktigt att komma ihåg att ett samband inte betyder att inkomsten direkt orsakar hur människor röstar.`;
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

// =====================================================
// SIDANS INTRODUKTION
// Här skrivs rubrik, syfte och analysfråga ut på sidan.
// Hypotesen visas senare, efter dropdowns, eftersom den beror på valt parti.
// =====================================================

addMdToPage(`
# Inkomst vs röstning

I denna analys undersöker vi om det finns ett samband mellan genomsnittlig inkomst och stöd för olika partier i Sveriges kommuner. Genom att koppla ihop inkomstdata med valresultat kan vi se om vissa partier har starkare stöd i kommuner med högre eller lägre inkomstnivå.

## Fråga
**Finns det ett samband mellan inkomstnivå och hur människor röstar på olika partier?**
`);

// =====================================================
// DATABASKONTROLL
// Om databasuppkopplingen inte fungerar visas ett felmeddelande.
// Annars fortsätter sidan med att hämta och bearbeta data.
// =====================================================

if (!dbInfoOk) {
  displayDbNotOkText();
}
else {

  // =====================================================
  // HÄMTA DATA
  // Här hämtas inkomstdata, kommun-län-koppling och valresultat.
  // Dessa tre datakällor behövs för att koppla inkomst till partistöd.
  // =====================================================

  dbQuery.use("kommun-info-mongodb");
  const incomeData = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommun = await dbQuery("SELECT * FROM lan_kommun");

  dbQuery.use("riksdagsval-neo4j");
  const electionResults = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  // =====================================================
  // KOPPLA KOMMUN TILL LÄN
  // Inkomstdata innehåller kommuner, men sidan behöver också län.
  // Därför matchas varje kommun mot tabellen lan_kommun.
  // =====================================================

  function getCounty(row) {
    const kommunName = normalize(row.kommun);

    const match = lanKommun.find(x =>
      normalize(x.kommun) === kommunName
    );

    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }

  // =====================================================
  // RENGÖR INKOMSTDATA
  // Här skapas ett renare dataset med kommun, kön, län och inkomst.
  // Rader utan kommun, län eller inkomst tas bort.
  // =====================================================

  const cleanedIncome = incomeData
    .map(row => ({
      kommun: row.kommun,
      kon: normalizeGender(row.kon),
      lan: getCounty(row),
      inkomst2022: toNumber(row.medelInkomst2022)
    }))
    .filter(row =>
      row.kommun &&
      row.lan !== "Okänt län" &&
      row.inkomst2022 !== null
    );

  // =====================================================
  // RENGÖR VALDATA
  // Här skapas ett renare dataset med kommun, parti och röster för 2018 och 2022.
  // Rader med saknade värden tas bort så att beräkningarna inte blir fel.
  // =====================================================

  const cleanedElection = electionResults
    .map(row => ({
      kommun: row.kommun,
      parti: row.parti,
      roster2018: toNumber(row.roster2018),
      roster2022: toNumber(row.roster2022)
    }))
    .filter(row =>
      row.kommun &&
      row.parti &&
      row.roster2018 !== null &&
      row.roster2022 !== null
    );

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

  const counties = [...new Set(cleanedIncome.map(row => row.lan))]
    .sort((a, b) => a.localeCompare(b, "sv"));

  const chosenPartyDisplay = addDropdown("Välj parti", partyOptions, displayPartyName(parties[0]));
  const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
  const chosenPartyName = displayPartyName(chosenParty);

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
  const chosenYear = addDropdown("Välj år", ["2022", "2018"], "2022");

  const selectedGender = normalizeGender(chosenGender);
  const totalVotesMap = buildTotalVotesMap(chosenYear);

  // Hypotesen skrivs ut efter dropdowns eftersom den innehåller valt parti.
  addToPage(infoBox("Analysens hypotes", hypothesisText(chosenParty)));

  // =====================================================
  // SLÅ IHOP INKOMSTDATA OCH VALDATA
  // Här kopplas varje kommun i inkomstdata ihop med samma kommun i valdata.
  // Sedan räknas partiets röstandel ut som procent av kommunens totala röster.
  // =====================================================

  const mergedData = cleanedIncome
    .filter(row => {
      const genderMatch = row.kon === selectedGender;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;

      return genderMatch && countyMatch;
    })
    .map(incomeRow => {
      const electionRow = cleanedElection.find(voteRow =>
        normalize(voteRow.kommun) === normalize(incomeRow.kommun) &&
        voteRow.parti === chosenParty
      );

      if (!electionRow) return null;

      const totalVotes = totalVotesMap.get(normalize(incomeRow.kommun));
      const partyVotes = chosenYear === "2018"
        ? electionRow.roster2018
        : electionRow.roster2022;

      if (!totalVotes || totalVotes === 0) return null;

      return {
        kommun: incomeRow.kommun,
        lan: incomeRow.lan,
        kon: incomeRow.kon,
        inkomst2022: incomeRow.inkomst2022,
        parti: chosenParty,
        partyName: chosenPartyName,
        year: chosenYear,
        partyVotes,
        partyShare: (partyVotes / totalVotes) * 100
      };
    })
    .filter(row => row !== null);

  // =====================================================
  // HANTERA TOMT URVAL
  // Om filtren gör att det inte finns någon data visas ett meddelande.
  // Annars fortsätter sidan med nyckeltal, diagram och analys.
  // =====================================================

  if (!mergedData.length) {
    addMdToPage(`
## Resultat

Det finns ingen data för det valda urvalet.
`);
  }
  else {

    // =====================================================
    // BERÄKNA NYCKELTAL
    // Här räknas värden fram som används i kort, diagram och analys.
    // =====================================================

    const incomes = mergedData.map(row => row.inkomst2022);
    const shares = mergedData.map(row => row.partyShare);

    const corr = correlation(incomes, shares);
    const corrLabel = correlationLabel(corr);

    const highestSupport = mergedData.reduce((max, row) =>
      row.partyShare > max.partyShare ? row : max,
      mergedData[0]
    );

    const lowestSupport = mergedData.reduce((min, row) =>
      row.partyShare < min.partyShare ? row : min,
      mergedData[0]
    );

    // =====================================================
    // SAMMANFATTNINGSKORT
    // Visar en snabb översikt över urvalet.
    // Här ser användaren antal kommuner, genomsnittlig inkomst, genomsnittligt stöd och korrelation.
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
        title: "Genomsnittlig inkomst",
        value: formatIncome(average(incomes))
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
    // DIAGRAM: INKOMST VS PARTISTÖD
    // Scatterploten visar varje kommun som en punkt.
    // X-axeln visar inkomst och Y-axeln visar partiets röstandel.
    // Trendlinjen hjälper användaren att se sambandet visuellt.
    // =====================================================

    addMdToPage(`
## Hur varierar stödet för ${chosenPartyName} beroende på inkomst?

Diagrammet visar varje kommun som en punkt. X-axeln visar genomsnittlig årsinkomst och Y-axeln visar hur stor andel av rösterna som gick till det valda partiet. Trendlinjen gör det lättare att se om stödet tenderar att öka eller minska när inkomsten ökar.
`);

    drawGoogleChart({
      type: "ScatterChart",
      data: [
        ["Inkomst 2022", `Stöd för ${chosenPartyName}`],
        ...mergedData.map(row => [row.inkomst2022, row.partyShare])
      ],
      options: {
        title: `Inkomst vs stöd för ${chosenPartyName} (${chosenYear})`,
        height: 650,
        chartArea: { width: "84%", height: "74%" },
        hAxis: {
          title: "Genomsnittlig årsinkomst 2022 (tkr)",
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

Analysen visar ett **${corrLabel}** mellan inkomstnivå och stöd för **${chosenPartyName}** i det valda urvalet.

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
        Inkomst: formatIncome(row.inkomst2022),
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
        Inkomst: formatIncome(row.inkomst2022),
        Röstandel: formatPercent(row.partyShare)
      }))
    });

    // =====================================================
    // KORT ANALYS
    // Här kopplas resultatet tillbaka till frågan och hypotesen.
    // Texten förklarar varför resultatet ska tolkas försiktigt.
    // =====================================================

    addMdToPage(`
## Kort analys

För urvalet **${chosenGender}**, **${chosenCounty}**, **${chosenYear}** visar analysen att inkomstnivå och stöd för **${chosenPartyName}** har ett **${corrLabel}**.

Resultatet kan tyda på att ekonomiska skillnader mellan kommuner hänger ihop med politiska röstningsmönster. Kommuner med olika inkomstnivåer kan ha olika prioriteringar, exempelvis kring välfärd, skatter, arbetsmarknad, boende och trygghet.

Samtidigt går det inte att säga att inkomsten ensam förklarar hur människor röstar. Röstningsmönster påverkas ofta av flera faktorer samtidigt, till exempel utbildningsnivå, ålder, migration, arbetslöshet, geografisk plats och lokala samhällsfrågor.

## Metod och begränsning

Analysen jämför genomsnittlig inkomst per kommun med partiets röstandel i riksdagsvalet ${chosenYear}. Röstandelen beräknas genom att partiets röster divideras med det totala antalet röster i kommunen.

Inkomstvärdet kommer från 2022 och används även när användaren väljer valåret 2018. Det betyder att analysen för 2018 inte visar inkomsten exakt vid det valet, utan använder samma inkomstmått som jämförelsepunkt. Detta är en begränsning som bör tas med i tolkningen.

Det är också viktigt att skilja mellan samband och orsak. En korrelation visar att två variabler varierar tillsammans, men den bevisar inte att den ena variabeln orsakar den andra.

## Extremvärden

I analysen kan vissa kommuner fungera som extremvärden. Exempelvis har **Danderyd** och **Lidingö** betydligt högre genomsnittlig inkomst än majoriteten av Sveriges kommuner. Samtidigt kan vissa kommuner ha ovanligt högt eller lågt stöd för ett parti.

Sådana extremvärden kan påverka korrelationen och trendlinjen i diagrammet. Ett fåtal kommuner med mycket höga inkomster eller mycket starkt partistöd kan göra sambandet starkare eller svagare än vad som gäller för majoriteten av kommunerna.

Därför bör resultatet tolkas som en indikation på möjliga samband, inte som ett definitivt bevis på vad som orsakar människors röstande.
`);
  }
}
