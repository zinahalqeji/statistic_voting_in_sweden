import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i sidan.
// De gör koden enklare att läsa och minskar upprepning.
// =====================================================

// Normaliserar text så att kommun- och länsnamn blir lättare att jämföra.
// Exempel: "Stockholms län" och "stockholms lan" kan matchas enklare.
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
// Behövs eftersom vissa värden kan komma som text eller innehålla kommatecken.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(
    String(value)
      .replace(/\s/g, "")
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

// Formaterar inkomst i tusental kronor.
// Exempel: 327 blir "327 tkr".
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

// Skapar sammanfattningskort högst upp på sidan.
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
// Här används den för att visa hypotesen tydligare och matcha de andra inkomstsidorna.
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
        Hämtar inkomstdata, valresultat och kommunernas länskoppling. Diagram och tabeller visas strax.
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

// Delar in kommunerna i tre ungefär lika stora inkomstgrupper.
// Kommunerna sorteras först efter inkomst och delas sedan in i låg, medel och hög inkomst.
function createIncomeGroups(data) {
  const sorted = [...data].sort((a, b) => a.inkomst2022 - b.inkomst2022);
  const groupSize = Math.ceil(sorted.length / 3);

  return sorted.map((row, index) => {
    let group = "Låg inkomst";

    if (index >= groupSize && index < groupSize * 2) {
      group = "Medelinkomst";
    }

    if (index >= groupSize * 2) {
      group = "Hög inkomst";
    }

    return {
      ...row,
      incomeGroup: group
    };
  });
}

// =====================================================
// SIDANS INTRODUKTION
// Här skrivs rubrik, syfte och analysfråga ut på sidan.
// Den här sidan jämför röstningsmönster mellan låg, medel och hög inkomst.
// =====================================================

addMdToPage(`
# Hög vs låg inkomst

I denna analys delar vi in Sveriges kommuner i tre inkomstgrupper: låg inkomst, medelinkomst och hög inkomst. Syftet är att undersöka om stödet för olika partier skiljer sig mellan kommuner med olika ekonomiska förutsättningar.

## Fråga
**Skiljer sig röstningsmönster mellan kommuner med låg, medel och hög genomsnittlig inkomst?**
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
  // Här hämtas inkomstdata, kommun-län-koppling och valresultat.
  // Dessa behövs för att jämföra inkomstgrupper med partistöd.
  // =====================================================

  dbQuery.use("kommun-info-mongodb");
  const incomeResult = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  dbQuery.use("riksdagsval-neo4j");
  const electionResult = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  // Nu är datan hämtad och därför tas laddningsrutan bort.
  removeLoadingBox();

  // Säkerställer att datan alltid blir arrays innan vi använder .map() och .filter()
  const incomeData = Array.isArray(incomeResult)
    ? incomeResult
    : incomeResult?.data || incomeResult?.result || incomeResult?.documents || [];

  const lanKommun = Array.isArray(lanKommunResult)
    ? lanKommunResult
    : lanKommunResult?.data || lanKommunResult?.result || [];

  const electionResults = Array.isArray(electionResult)
    ? electionResult
    : electionResult?.data || electionResult?.result || [];

  // =====================================================
  // KOPPLA KOMMUN TILL LÄN
  // Inkomstdatan innehåller kommuner, men sidan behöver också län för filtrering.
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
  // Här skapas ett rent dataset med kommun, kön, län och inkomst.
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
  // Här skapas ett rent dataset med kommun, parti och röster för 2018 och 2022.
  // Rader med saknade värden tas bort.
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
  // För att räkna ut partiets röstandel behöver vi först veta totalt antal röster i kommunen.
  // Funktionen summerar alla partiers röster per kommun för valt år.
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
  // Dropdownen visar korta partinamn, men koden använder originalnamnen för databasen.
  // =====================================================

  const parties = [...new Set(cleanedElection.map(row => row.parti))]
    .sort((a, b) => displayPartyName(a).localeCompare(displayPartyName(b), "sv"));

  const partyOptions = parties.map(party => displayPartyName(party));

  const counties = [...new Set(cleanedIncome.map(row => row.lan))]
    .sort((a, b) => a.localeCompare(b, "sv"));

  const chosenPartyDisplay = addDropdown("Välj parti:", partyOptions, displayPartyName(parties[0]));
  const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
  const chosenPartyName = displayPartyName(chosenParty);

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
  const chosenYear = addDropdown("Välj år", ["2022", "2018"], "2022");

  const selectedGender = normalizeGender(chosenGender);
  const totalVotesMap = buildTotalVotesMap(chosenYear);

  addToPage(infoBox(
    "Analysens hypotes",
    `Vi undersöker om stödet för ${chosenPartyName} skiljer sig mellan låg-, medel- och höginkomstkommuner. Vår hypotes är att olika inkomstgrupper kan visa olika röstningsmönster, eftersom ekonomiska förutsättningar kan påverka vilka politiska frågor som blir viktiga för väljare.`
  ));

  // =====================================================
  // FILTRERA OCH GRUPPERA INKOMSTDATA
  // Först filtreras inkomstdata efter kön och län.
  // Sedan delas kommunerna in i tre inkomstgrupper.
  // =====================================================

  const filteredIncome = cleanedIncome.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;

    return genderMatch && countyMatch;
  });

  const numberOfMunicipalities = new Set(filteredIncome.map(row => row.kommun)).size;

  // =====================================================
  // HANTERA FÖR LITET URVAL
  // Om urvalet innehåller färre än tre kommuner går det inte att skapa tre grupper.
  // Då visas en tydlig förklaring istället för missvisande diagram.
  // =====================================================

  if (numberOfMunicipalities < 3) {
    addMdToPage(`
## Resultat

Det valda urvalet innehåller endast **${numberOfMunicipalities}** kommun. För att kunna jämföra låg, medel och hög inkomst behövs minst tre kommuner.

Välj **Alla län** eller ett län med fler kommuner för att se gruppjämförelsen.
`);
  }
  else {
    const groupedIncome = createIncomeGroups(filteredIncome);

    // =====================================================
    // SLÅ IHOP INKOMSTGRUPPER MED VALDATA
    // Här kopplas varje kommun i inkomstgrupperna ihop med valresultat för valt parti och år.
    // Partiets röstandel räknas ut som procent av kommunens totala röster.
    // =====================================================

    const mergedData = groupedIncome
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
          incomeGroup: incomeRow.incomeGroup,
          inkomst2022: incomeRow.inkomst2022,
          partyVotes,
          partyShare: (partyVotes / totalVotes) * 100
        };
      })
      .filter(row => row !== null);

    // =====================================================
    // HANTERA TOMT URVAL EFTER SAMMANSLAGNING
    // Om datan inte kan kopplas ihop visas ett meddelande.
    // =====================================================

    if (!mergedData.length) {
      addMdToPage(`
## Resultat

Det finns ingen kopplad data för det valda urvalet.
`);
    }
    else {

      // =====================================================
      // BERÄKNA GRUPPSTATISTIK
      // Här räknas genomsnittlig inkomst och genomsnittligt partistöd per inkomstgrupp.
      // Detta används i kort, diagram, tabell och analys.
      // =====================================================

      const groupOrder = ["Låg inkomst", "Medelinkomst", "Hög inkomst"];

      const groupStats = groupOrder.map(group => {
        const rows = mergedData.filter(row => row.incomeGroup === group);

        return {
          group,
          count: rows.length,
          averageIncome: average(rows.map(row => row.inkomst2022)),
          averageSupport: average(rows.map(row => row.partyShare))
        };
      });

      const lowestGroup = groupStats[0];
      const highestGroup = groupStats[2];

      const supportDifference = highestGroup.averageSupport - lowestGroup.averageSupport;
      const strongestGroup = [...groupStats].sort((a, b) => b.averageSupport - a.averageSupport)[0];

      // =====================================================
      // SAMMANFATTNINGSKORT
      // Visar antal kommuner, valt parti, starkaste inkomstgrupp och skillnad mellan hög och låg inkomst.
      // =====================================================

      addMdToPage(`
## Sammanfattning av urvalet
`);

      addToPage(statCards([
        {
          title: "Antal kommuner",
          value: numberOfMunicipalities
        },
        {
          title: "Valt parti",
          value: chosenPartyName
        },
        {
          title: "Starkast stöd",
          value: strongestGroup.group,
          note: formatPercent(strongestGroup.averageSupport)
        },
        {
          title: "Skillnad hög minus låg",
          value: formatPercent(supportDifference),
          note: "hög inkomst jämfört med låg inkomst"
        }
      ]));

      // =====================================================
      // DIAGRAM: PARTISTÖD PER INKOMSTGRUPP
      // Stapeldiagrammet visar genomsnittligt stöd för valt parti i varje inkomstgrupp.
      // =====================================================

      addMdToPage(`
## Stöd för ${chosenPartyName} per inkomstgrupp

Diagrammet visar genomsnittlig röstandel för **${chosenPartyName}** i kommuner med låg inkomst, medelinkomst och hög inkomst.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: [
          ["Inkomstgrupp", `Stöd för ${chosenPartyName}`],
          ...groupStats.map(row => [row.group, row.averageSupport])
        ],
        options: {
          title: `Genomsnittligt stöd för ${chosenPartyName} per inkomstgrupp (${chosenYear})`,
          legend: { position: "none" },
          height: 520,
          chartArea: { width: "80%", height: "72%" },
          hAxis: {
            textStyle: { fontSize: 13 }
          },
          vAxis: {
            title: "Röstandel (%)",
            textStyle: { fontSize: 13 },
            titleTextStyle: { fontSize: 15, bold: true }
          }
        }
      });

      // =====================================================
      // TABELL: JÄMFÖRELSE MELLAN INKOMSTGRUPPER
      // Tabellen visar antal kommuner, genomsnittlig inkomst och genomsnittligt partistöd per grupp.
      // =====================================================

      addMdToPage(`
## Jämförelse mellan inkomstgrupper
`);

      tableFromData({
        data: groupStats.map(row => ({
          Inkomstgrupp: row.group,
          "Antal kommuner": row.count,
          "Genomsnittlig inkomst": formatIncome(row.averageIncome),
          [`Stöd för ${chosenPartyName}`]: formatPercent(row.averageSupport)
        }))
      });

      // =====================================================
      // TABELL: EXEMPEL PÅ KOMMUNER I VARJE GRUPP
      // Här visas några konkreta kommuner från varje inkomstgrupp.
      // Det gör analysen lättare att förstå.
      // =====================================================

      addMdToPage(`
## Exempel på kommuner i varje inkomstgrupp
`);

      const exampleRows = groupOrder.flatMap(group =>
        mergedData
          .filter(row => row.incomeGroup === group)
          .sort((a, b) => b.partyShare - a.partyShare)
          .slice(0, 3)
          .map(row => ({
            Inkomstgrupp: group,
            Kommun: row.kommun,
            Län: row.lan,
            Inkomst: formatIncome(row.inkomst2022),
            [`Stöd för ${chosenPartyName}`]: formatPercent(row.partyShare)
          }))
      );

      tableFromData({
        data: exampleRows
      });

      // =====================================================
      // ANALYS
      // Här sammanfattas resultatet i text och kopplas tillbaka till frågan och hypotesen.
      // =====================================================

      let differenceText = "";

      if (supportDifference > 0) {
        differenceText = `Stödet för ${chosenPartyName} är högre i höginkomstkommuner än i låginkomstkommuner i detta urval.`;
      }
      else if (supportDifference < 0) {
        differenceText = `Stödet för ${chosenPartyName} är lägre i höginkomstkommuner än i låginkomstkommuner i detta urval.`;
      }
      else {
        differenceText = `Stödet för ${chosenPartyName} är ungefär lika stort i höginkomstkommuner och låginkomstkommuner i detta urval.`;
      }

      addMdToPage(`
## Kort analys

För urvalet **${chosenGender}**, **${chosenCounty}**, **${chosenYear}** visar analysen att **${strongestGroup.group}** har högst genomsnittligt stöd för **${chosenPartyName}** med **${formatPercent(strongestGroup.averageSupport)}**.

${differenceText} Skillnaden mellan höginkomstgruppen och låginkomstgruppen är **${formatPercent(supportDifference)}**.

Resultatet ger en tydligare jämförelse än enbart ett spridningsdiagram, eftersom kommunerna delas in i grupper. Samtidigt är det viktigt att komma ihåg att grupperna bygger på kommunernas genomsnittliga inkomst och inte på enskilda väljares inkomst.

## Metod och begränsning

Kommunerna sorteras efter genomsnittlig inkomst och delas sedan in i tre ungefär lika stora grupper: låg inkomst, medelinkomst och hög inkomst. Därefter beräknas genomsnittligt stöd för det valda partiet i varje grupp.

Inkomstvärdet kommer från 2022 och används även när användaren väljer valåret 2018. Det betyder att analysen för 2018 inte visar inkomsten exakt vid det valet, utan använder samma inkomstmått som jämförelsepunkt.

Analysen visar skillnader mellan grupper, men den bevisar inte att inkomst orsakar ett visst röstningsmönster. Andra faktorer som utbildning, ålder, migration, arbetslöshet och geografisk plats kan också påverka hur människor röstar.
`);
    }
  }
}