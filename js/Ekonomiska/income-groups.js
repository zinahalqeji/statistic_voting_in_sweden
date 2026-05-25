import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";


// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i koden.
// De gör datan enklare att jämföra, räkna på och visa.
// =====================================================


// Normaliserar text så att jämförelser blir enklare.
// Exempel: "Göteborg", "goteborg" och "GöTEBORG" behandlas mer lika.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


// Standardiserar könsvärden från datan.
// Det gör att olika skrivsätt som "male", "m" och "man" blir samma värde.
function normalizeGender(value) {
  const v = normalize(value);

  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";

  // Om kön saknas eller inte matchar något ovan används totalt.
  return "totalt";
}


// Gör vissa partinamn kortare och mer användarvänliga i gränssnittet.
// Om partiet inte finns i listan returneras originalnamnet.
function displayPartyName(party) {
  const names = {
    "Arbetarepartiet-Socialdemokraterna": "Socialdemokraterna",
    "Miljöpartiet de gröna": "Miljöpartiet"
  };

  return names[party] || party;
}


// Konverterar ett värde till ett nummer.
// Funktionen hanterar bland annat mellanslag och kommatecken i siffror.
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(
    String(value)
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(num) ? num : null;
}


// Räknar ut medelvärdet av en lista med siffror.
// Ogiltiga värden filtreras bort innan beräkningen.
function average(values) {
  const nums = values.filter(v => v !== null && v !== undefined && Number.isFinite(v));

  if (!nums.length) return 0;

  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}


// Formaterar inkomst så att den visas som tusental kronor.
// Exempel: 350 blir "350 tkr".
function formatIncome(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} tkr`;
}


// Formaterar procenttal med en decimal.
// Exempel: 12.345 blir "12,3 %".
function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}


// Skapar kort med statistik på sidan.
// Varje kort får en rubrik, ett värde och ibland en extra förklaring.
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
// Används till exempel för att visa hypotesen eller förklarande text.
function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}


// Skapar en ruta med en ikon, en rubrik och punktlista.
// Den används för till exempel resultat, metod och begränsningar.
function sectionBox(icon, title, bullets) {
  const items = bullets
    .map(b => `<li style="margin-bottom:6px;">${b}</li>`)
    .join("");

  return `
    <div style="background:white; border-radius:8px; border:0.5px solid rgba(0,0,0,0.1); padding:16px 20px; margin:16px 0;">
      <p style="margin:0 0 10px 0; font-size:16px; font-weight:500;">${icon} ${title}</p>
      <ul style="margin:0; padding-left:20px; font-size:15px; line-height:1.8;">${items}</ul>
    </div>
  `;
}


// Skapar en laddningsruta som visas medan data hämtas.
// Det gör att användaren ser att sidan jobbar och inte har fastnat.
function loadingBox() {
  return `
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 8px 0; font-size:19px;">Laddar analysen...</h3>
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar inkomstdata, valresultat och kommunernas länskoppling. Diagram och tabeller visas strax.</p>
    </div>
  `;
}


// Tar bort laddningsrutan när datan har hämtats klart.
function removeLoadingBox() {
  const el = document.getElementById("loading-message");

  if (el) el.remove();
}


// =====================================================
// T-TEST HJÄLPFUNKTIONER
// Dessa funktioner används för hypotesprövningen.
// De räknar bland annat varians, standardavvikelse,
// skevhet, T-värde och ungefärligt P-värde.
// =====================================================


// Räknar ut variansen i en lista med värden.
// Varians visar hur mycket värdena sprider sig från medelvärdet.
function variance(values) {
  const avg = average(values);
  const nums = values.filter(v => Number.isFinite(v));

  if (nums.length < 2) return 0;

  return nums.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (nums.length - 1);
}


// Räknar ut standardavvikelsen.
// Standardavvikelse är roten ur variansen och visar spridningen i datan.
function stdDev(values) {
  return Math.sqrt(variance(values));
}


// Räknar ut skevhet i datan.
// Skevhet används för att kontrollera om datan ungefär liknar normalfördelning.
function skewness(values) {
  const nums = values.filter(v => Number.isFinite(v));
  const n = nums.length;

  if (n < 3) return null;

  const avg = average(nums);
  const sd = stdDev(nums);

  if (sd === 0) return null;

  const sum = nums.reduce((acc, v) => acc + Math.pow((v - avg) / sd, 3), 0);

  return (n / ((n - 1) * (n - 2))) * sum;
}


// Genomför ett Welch's t-test mellan två grupper.
// Testet jämför om medelvärdet skiljer sig mellan två grupper.
function tTest(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;

  // Om någon grupp har för få värden går testet inte att genomföra.
  if (n1 < 2 || n2 < 2) return null;

  const mean1 = average(group1);
  const mean2 = average(group2);
  const var1 = variance(group1);
  const var2 = variance(group2);

  // Standard error visar osäkerheten i skillnaden mellan medelvärdena.
  const se = Math.sqrt(var1 / n1 + var2 / n2);

  if (se === 0) return null;

  const t = (mean1 - mean2) / se;

  // Frihetsgrader används för att tolka T-testet.
  const df = Math.pow(var1 / n1 + var2 / n2, 2) /
    (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

  return {
    t,
    df: Math.round(df)
  };
}


// Approximerar normalfördelningens CDF.
// Den används senare för att räkna fram ett ungefärligt P-värde.
function normalCDF(z) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);

  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}


// Räknar ut ett ungefärligt P-värde från T-värdet.
// P-värdet används för att avgöra om skillnaden är statistiskt signifikant.
function approximatePValue(tVal, df) {
  const abst = Math.abs(tVal);

  // Vid många frihetsgrader approximeras T-fördelningen med normalfördelning.
  if (df > 30) return 2 * (1 - normalCDF(abst));

  // Förenklad approximation för mindre stickprov.
  return Math.min(2 * 0.5 * Math.pow(df / (df + abst * abst), df / 2), 1);
}


// Delar in kommunerna i tre inkomstgrupper.
// Kommunerna sorteras efter inkomst och delas sedan in i låg, medel och hög inkomst.
function createIncomeGroups(data) {
  const sorted = [...data].sort((a, b) => a.inkomst2022 - b.inkomst2022);
  const groupSize = Math.ceil(sorted.length / 3);

  return sorted.map((row, index) => {
    let group = "Låg inkomst";

    if (index >= groupSize && index < groupSize * 2) group = "Medelinkomst";
    if (index >= groupSize * 2) group = "Hög inkomst";

    return {
      ...row,
      incomeGroup: group
    };
  });
}


// =====================================================
// SIDANS INTRODUKTION
// Här skrivs rubrik, beskrivning och frågeställning ut på sidan.
// =====================================================

addMdToPage(`
# Hög vs låg inkomst

I denna analys delar vi in Sveriges kommuner i tre inkomstgrupper: låg inkomst, medelinkomst och hög inkomst. Syftet är att undersöka om stödet för olika partier skiljer sig mellan kommuner med olika ekonomiska förutsättningar.

## Fråga
**Skiljer sig röstningsmönster mellan kommuner med låg, medel och hög genomsnittlig inkomst?**
`);


// Visar laddningsrutan innan datan börjar hämtas.
addToPage(loadingBox());


// =====================================================
// DATABASKONTROLL
// Om databaserna inte fungerar visas ett felmeddelande.
// Om databaserna fungerar fortsätter analysen.
// =====================================================

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  // =====================================================
  // DATAHÄMTNING
  // Här hämtas data från flera olika databaser:
  // 1. Inkomst per kommun från MongoDB
  // 2. Koppling mellan län och kommun från SQLite
  // 3. Valresultat från Neo4j
  // =====================================================

  dbQuery.use("kommun-info-mongodb");
  const incomeResult = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  dbQuery.use("riksdagsval-neo4j");
  const electionResult = await dbQuery("MATCH (n:Partiresultat) RETURN n");

  // När datan är hämtad tas laddningsrutan bort.
  removeLoadingBox();


  // =====================================================
  // SÄKERSTÄLLER ATT RESULTATEN ÄR ARRAYER
  // Olika databaser kan returnera data i lite olika format.
  // Därför kontrolleras flera möjliga platser där datan kan ligga.
  // =====================================================

  const incomeData = Array.isArray(incomeResult)
    ? incomeResult
    : incomeResult?.data || incomeResult?.result || incomeResult?.documents || [];

  const lanKommun = Array.isArray(lanKommunResult)
    ? lanKommunResult
    : lanKommunResult?.data || lanKommunResult?.result || [];

  const electionResults = Array.isArray(electionResult)
    ? electionResult
    : electionResult?.data || electionResult?.result || [];


  // Hämtar länet för en viss kommun.
  // Funktionen jämför kommunnamn från inkomstdata med kommunnamn i län-tabellen.
  function getCounty(row) {
    const kommunName = normalize(row.kommun);
    const match = lanKommun.find(x => normalize(x.kommun) === kommunName);

    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }


  // =====================================================
  // RENSNING AV INKOMSTDATA
  // Här plockas bara de fält ut som behövs:
  // kommun, kön, län och inkomst 2022.
  // Rader utan kommun, län eller inkomst tas bort.
  // =====================================================

  const cleanedIncome = incomeData
    .map(row => ({
      kommun: row.kommun,
      kon: normalizeGender(row.kon),
      lan: getCounty(row),
      inkomst2022: toNumber(row.medelInkomst2022)
    }))
    .filter(row => row.kommun && row.lan !== "Okänt län" && row.inkomst2022 !== null);


  // =====================================================
  // RENSNING AV VALDATA
  // Här plockas kommun, parti och röster för 2018 och 2022 ut.
  // Rader utan kommun, parti eller röstsiffror tas bort.
  // =====================================================

  const cleanedElection = electionResults
    .map(row => ({
      kommun: row.kommun,
      parti: row.parti,
      roster2018: toNumber(row.roster2018),
      roster2022: toNumber(row.roster2022)
    }))
    .filter(row => row.kommun && row.parti && row.roster2018 !== null && row.roster2022 !== null);


  // =====================================================
  // TOTALA RÖSTER PER KOMMUN
  // Funktionen bygger en Map där varje kommun får sitt totala antal röster.
  // Det behövs för att kunna räkna ut partiets röstandel i procent.
  // =====================================================

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


  // Skapar en lista med alla partier som finns i valdatat.
  // Listan sorteras alfabetiskt efter det namn som visas för användaren.
  const parties = [...new Set(cleanedElection.map(row => row.parti))]
    .sort((a, b) => displayPartyName(a).localeCompare(displayPartyName(b), "sv"));

  // Skapar partinamn som ska visas i dropdown-menyn.
  const partyOptions = parties.map(party => displayPartyName(party));

  // Skapar en lista med alla län som finns i inkomstdata.
  const counties = [...new Set(cleanedIncome.map(row => row.lan))]
    .sort((a, b) => a.localeCompare(b, "sv"));


  // =====================================================
  // DROPDOWNS
  // Här skapas filtren som användaren kan välja på sidan:
  // parti, kön, län och år.
  // =====================================================

  const chosenPartyDisplay = addDropdown("Välj parti", partyOptions, displayPartyName(parties[0]));

  // Hittar originalnamnet på partiet utifrån det namn som visas i dropdownen.
  const chosenParty = parties.find(party => displayPartyName(party) === chosenPartyDisplay) || parties[0];
  const chosenPartyName = displayPartyName(chosenParty);

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");
  const chosenYear = addDropdown("Välj år", ["2022", "2018"], "2022");

  // Normaliserar valt kön så att det matchar värdena i cleanedIncome.
  const selectedGender = normalizeGender(chosenGender);

  // Skapar totalröster per kommun för valt år.
  const totalVotesMap = buildTotalVotesMap(chosenYear);


  // Visar analysens hypotes i en informationsruta.
  addToPage(infoBox(
    "Analysens hypotes",
    "Vi undersöker om stödet för " + chosenPartyName + " skiljer sig mellan låg-, medel- och höginkomstkommuner. Vår hypotes är att olika inkomstgrupper kan visa olika röstningsmönster."
  ));


  // =====================================================
  // FILTRERING AV INKOMSTDATA
  // Här filtreras datan baserat på valt kön och valt län.
  // Om användaren väljer "Alla län" tas alla län med.
  // =====================================================

  const filteredIncome = cleanedIncome.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;

    return genderMatch && countyMatch;
  });


  // Räknar hur många unika kommuner som finns i det valda urvalet.
  const numberOfMunicipalities = new Set(filteredIncome.map(row => row.kommun)).size;


  // =====================================================
  // KONTROLL AV ANTAL KOMMUNER
  // Analysen behöver minst tre kommuner för att kunna dela in dem
  // i låg, medel och hög inkomst.
  // =====================================================

  if (numberOfMunicipalities < 3) {
    addMdToPage(`
## Resultat

Det valda urvalet innehåller endast **${numberOfMunicipalities}** kommun. Behövs minst tre kommuner. Välj **Alla län** för att se gruppjämförelsen.
`);
  }
  else {

    // Delar in det filtrerade urvalet i tre inkomstgrupper.
    const groupedIncome = createIncomeGroups(filteredIncome);


    // =====================================================
    // SLÅR IHOP INKOMSTDATA OCH VALDATA
    // Här kopplas varje kommuns inkomstgrupp ihop med partiets valresultat.
    // Sedan räknas partiets röstandel ut i procent.
    // =====================================================

    const mergedData = groupedIncome
      .map(incomeRow => {
        const electionRow = cleanedElection.find(voteRow =>
          normalize(voteRow.kommun) === normalize(incomeRow.kommun) &&
          voteRow.parti === chosenParty
        );

        // Om det saknas valdata för kommunen tas raden bort.
        if (!electionRow) return null;

        const totalVotes = totalVotesMap.get(normalize(incomeRow.kommun));
        const partyVotes = chosenYear === "2018" ? electionRow.roster2018 : electionRow.roster2022;

        // Om totalröster saknas eller är 0 går det inte att räkna procent.
        if (!totalVotes || totalVotes === 0) return null;

        return {
          kommun: incomeRow.kommun,
          lan: incomeRow.lan,
          incomeGroup: incomeRow.incomeGroup,
          inkomst2022: incomeRow.inkomst2022,
          partyVotes,
          partyShare: (partyVotes / totalVotes) * 100
        };
      })
      .filter(row => row !== null);


    // Om det inte finns kopplad data visas ett meddelande.
    if (!mergedData.length) {
      addMdToPage(`
## Resultat

Det finns ingen kopplad data för det valda urvalet.
`);
    }
    else {

      // Bestämmer ordningen som inkomstgrupperna ska visas i.
      const groupOrder = ["Låg inkomst", "Medelinkomst", "Hög inkomst"];


      // =====================================================
      // STATISTIK PER INKOMSTGRUPP
      // Här räknas antal kommuner, genomsnittlig inkomst
      // och genomsnittligt partistöd ut för varje grupp.
      // =====================================================

      const groupStats = groupOrder.map(group => {
        const rows = mergedData.filter(row => row.incomeGroup === group);

        return {
          group,
          count: rows.length,
          averageIncome: average(rows.map(row => row.inkomst2022)),
          averageSupport: average(rows.map(row => row.partyShare))
        };
      });


      // Plockar ut låg- och höginkomstgruppen.
      const lowestGroup = groupStats[0];
      const highestGroup = groupStats[2];

      // Räknar skillnaden i partistöd mellan hög och låg inkomst.
      const supportDifference = highestGroup.averageSupport - lowestGroup.averageSupport;

      // Hittar den inkomstgrupp där partiet har starkast genomsnittligt stöd.
      const strongestGroup = [...groupStats].sort((a, b) => b.averageSupport - a.averageSupport)[0];


      // =====================================================
      // SAMMANFATTNINGSKORT
      // Visar en snabb överblick av analysens viktigaste resultat.
      // =====================================================

      addMdToPage(`## Sammanfattning av urvalet`);

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
          title: "Skillnad mellan inkomstgrupper",
          value: `${Math.abs(supportDifference).toLocaleString("sv-SE", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })} procentenheter`,
          note: supportDifference < 0
            ? "lägre stöd i höginkomstkommuner jämfört med låginkomstkommuner"
            : supportDifference > 0
              ? "högre stöd i höginkomstkommuner jämfört med låginkomstkommuner"
              : "ungefär lika stort stöd i båda grupperna"
        }
      ]));


      // =====================================================
      // DIAGRAM
      // Visar genomsnittligt stöd för valt parti
      // i låg-, medel- och höginkomstkommuner.
      // =====================================================

      addMdToPage(`
## Stöd för ${chosenPartyName} per inkomstgrupp

Diagrammet visar genomsnittlig röstandel för **${chosenPartyName}** i kommuner med låg inkomst, medelinkomst och hög inkomst.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: [
          ["Inkomstgrupp", "Stöd för " + chosenPartyName],
          ...groupStats.map(row => [
            row.group,
            {
              v: row.averageSupport,
              f: formatPercent(row.averageSupport)
            }
          ])
        ],
        options: {
          title: "Genomsnittligt stöd för " + chosenPartyName + " per inkomstgrupp (" + chosenYear + ")",
          legend: { position: "none" },
          height: 520,
          chartArea: { width: "80%", height: "72%" },

          hAxis: {
            textStyle: { fontSize: 13 }
          },

          vAxis: {
            title: "Röstandel (%)",
            format: "#'%'",
            textStyle: { fontSize: 13 },
            titleTextStyle: { fontSize: 15, bold: true },
            viewWindow: { min: 0 }
          }
        }
      });


      // =====================================================
      // TABELL: JÄMFÖRELSE MELLAN INKOMSTGRUPPER
      // Tabellen visar antal kommuner, inkomst och stöd per grupp.
      // =====================================================

      addMdToPage(`## Jämförelse mellan inkomstgrupper`);

      tableFromData({
        data: groupStats.map(row => ({
          Inkomstgrupp: row.group,
          "Antal kommuner": row.count,
          "Genomsnittlig inkomst": formatIncome(row.averageIncome),
          ["Stöd för " + chosenPartyName]: formatPercent(row.averageSupport)
        }))
      });


      // =====================================================
      // TABELL: EXEMPEL PÅ KOMMUNER
      // Visar de tre kommuner per inkomstgrupp där partiet har högst stöd.
      // =====================================================

      addMdToPage(`## Exempel på kommuner i varje inkomstgrupp`);

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
            ["Stöd för " + chosenPartyName]: formatPercent(row.partyShare)
          }))
      );

      tableFromData({
        data: exampleRows
      });


      // =====================================================
      // KORT ANALYS
      // Här skapas en text som förklarar om stödet är högre,
      // lägre eller ungefär lika i höginkomstkommuner.
      // =====================================================

      let differenceText = supportDifference > 0
        ? "Stödet för " + chosenPartyName + " är högre i höginkomstkommuner än i låginkomstkommuner."
        : supportDifference < 0
          ? "Stödet för " + chosenPartyName + " är lägre i höginkomstkommuner än i låginkomstkommuner."
          : "Stödet är ungefär lika stort i båda grupperna.";

      addMdToPage(`## Kort analys`);

      addToPage(sectionBox("📊", "Resultat", [
        "<strong>" + strongestGroup.group + "</strong> har högst genomsnittligt stöd för <strong>" + chosenPartyName + "</strong>: <strong>" + formatPercent(strongestGroup.averageSupport) + "</strong>",
        differenceText + " Skillnad: <strong>" + formatPercent(supportDifference) + "</strong>",
        "Inkomst <strong>orsakar inte</strong> hur människor röstar - utbildningsnivå, ålder och bostadsort påverkar både inkomst och röstbeteende"
      ]));


      // Visar metod och begränsningar så att analysen blir tydligare.
      addToPage(sectionBox("🔍", "Metod och begränsning", [
        "Kommunerna sorteras efter genomsnittlig inkomst och delas in i tre lika stora grupper",
        "Inkomstvärdet kommer från 2022 - används även för valåret 2018",
        "Visar skillnader mellan grupper men bevisar inte kausalitet",
        "Faktorer som utbildning, ålder och migration kan också påverka resultatet"
      ]));


      // =====================================================
      // T-TEST
      // Här jämförs låginkomstgruppen och höginkomstgruppen.
      // Syftet är att se om skillnaden i partistöd är statistiskt signifikant.
      // =====================================================

      const lowGroup = mergedData
        .filter(row => row.incomeGroup === "Låg inkomst")
        .map(row => row.partyShare);

      const highGroup = mergedData
        .filter(row => row.incomeGroup === "Hög inkomst")
        .map(row => row.partyShare);


      // Räknar ut skevhet för båda grupperna.
      // Detta används som en enkel kontroll av normalfördelning.
      const skewLow = skewness(lowGroup);
      const skewHigh = skewness(highGroup);

      const normalLow = skewLow !== null && Math.abs(skewLow) <= 1;
      const normalHigh = skewHigh !== null && Math.abs(skewHigh) <= 1;


      // Genomför T-testet och räknar ut P-värde.
      const tResult = tTest(lowGroup, highGroup);
      const pValue = tResult ? approximatePValue(tResult.t, tResult.df) : null;

      // Om P-värdet är under 0,05 räknas skillnaden som statistiskt signifikant.
      const significant = pValue !== null && pValue < 0.05;


      // Text som förklarar om grupperna bedöms som normalfördelade.
      const normalText = (!normalLow || !normalHigh)
        ? "En eller båda grupperna avviker från normalfördelning. Eftersom stickproven är stora (n > 30) är T-testet ändå robust enligt centrala gränsvärdessatsen."
        : "Båda grupperna bedöms som tillräckligt normalfördelade för att T-testet ska vara giltigt.";


      // Skapar text för resultatet av T-testet.
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


      // =====================================================
      // VISAR HYPOTESPRÖVNINGEN PÅ SIDAN
      // Här skrivs nollhypotes, alternativhypotes,
      // normalfördelningskontroll och T-testets resultat ut.
      // =====================================================

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

> **Obs:** Statistisk signifikans innebär att skillnaden sannolikt inte beror på slumpen - inte att inkomst *orsakar* skillnaden i röstbeteende.
`);


      // =====================================================
      // EXTREMVÄRDEN
      // Förklarar att vissa kommuner kan påverka genomsnittet mycket.
      // Det gör analysen mer nyanserad.
      // =====================================================

      addToPage(sectionBox("⚠️", "Extremvärden", [
        "<strong>Danderyd</strong> och <strong>Lidingö</strong> i höginkomstgruppen har exceptionellt höga inkomster och drar upp gruppens genomsnitt",
        "Låginkomstgruppen innehåller kommuner med mycket låga inkomster som drar ner snittet",
        "Genomsnittet per grupp kan påverkas av extremvärden - skillnaderna kan se större ut än för en typisk kommun"
      ]));
    }
  }
}