import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";


// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i koden.
// De gör datan enklare att jämföra, räkna på och visa.
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


// Konverterar värden från databasen till nummer.
// Funktionen hanterar bland annat tomma värden, mellanslag och kommatecken.
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


// Skapar kort med statistik på sidan.
// Varje kort får en rubrik och ett värde.
function statCards(cards) {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">
      ${cards.map(card => `
        <div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h3 style="margin:0 0 10px 0; font-size:19px; line-height:1.25;">${card.title}</h3>
          <p style="font-size:23px; font-weight:bold; margin:0 0 6px 0;">${card.value}</p>
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


// Skapar en ruta med en ikon, rubrik och punktlista.
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
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar inkomstdata och kommunernas länskoppling. Diagram och tabeller visas strax.</p>
    </div>
  `;
}


// Tar bort laddningsrutan när datan har hämtats klart.
function removeLoadingBox() {
  const el = document.getElementById("loading-message");

  if (el) el.remove();
}


// =====================================================
// SIDANS INTRODUKTION
// Här skrivs rubrik, bakgrund och frågeställning ut på sidan.
// =====================================================

addMdToPage(`
# Inkomst i Sverige

För att förstå vilka faktorer som kan ha samband med hur människor röstar undersöker denna del ekonomiska faktorer. Fokus ligger på inkomst och arbetslöshet eftersom de kan säga något om ekonomisk trygghet i olika delar av Sverige.

## Fråga
**Hur skiljer sig inkomstnivåerna mellan olika kommuner och län i Sverige?**
`);


// Visar analysens hypotes innan resultatet visas.
addToPage(infoBox(
  "Analysens hypotes",
  "Vi tror att inkomstnivåer skiljer sig tydligt mellan olika delar av Sverige och att storstadsområden generellt har högre genomsnittlig inkomst än mindre kommuner."
));


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
  // Här hämtas data från två olika databaser:
  // 1. Inkomst per kommun från MongoDB
  // 2. Koppling mellan län och kommun från SQLite
  // =====================================================

  dbQuery.use("kommun-info-mongodb");
  const incomeResult = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

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


  // Hämtar länet för en viss kommun.
  // Funktionen jämför kommunnamn från inkomstdata med kommunnamn i län-tabellen.
  function getCounty(row) {
    const kommunName = normalize(row.kommun);
    const match = lanKommun.find(x => normalize(x.kommun) === kommunName);

    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }


  // =====================================================
  // GRUPPERAR INKOMST PER LÄN
  // Funktionen samlar kommunernas inkomster per län
  // och räknar sedan ut genomsnittlig inkomst för varje län.
  // =====================================================

  function getCountyAverages(data) {
    const groups = {};

    data.forEach(row => {
      if (!groups[row.lan]) groups[row.lan] = [];

      groups[row.lan].push(row.inkomst2022);
    });

    return Object.entries(groups)
      .map(([lan, values]) => ({
        lan,
        averageIncome: average(values)
      }))
      .sort((a, b) => b.averageIncome - a.averageIncome);
  }


  // =====================================================
  // RENSNING AV INKOMSTDATA
  // Här plockas bara de fält ut som behövs:
  // kommun, kön, län och inkomst 2022.
  // Rader utan kommun, län eller inkomst tas bort.
  // =====================================================

  const cleanedData = incomeData
    .map(row => ({
      kommun: row.kommun,
      kon: normalizeGender(row.kon),
      lan: getCounty(row),
      inkomst2022: toNumber(row.medelInkomst2022)
    }))
    .filter(row => row.kommun && row.lan !== "Okänt län" && row.inkomst2022 !== null);


  // Skapar en lista med alla län som finns i datan.
  // Listan används i dropdown-menyn.
  const counties = [...new Set(cleanedData.map(row => row.lan))]
    .sort((a, b) => a.localeCompare(b, "sv"));


  // =====================================================
  // DROPDOWNS
  // Här skapas filtren som användaren kan välja på sidan:
  // kön och län.
  // =====================================================

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");

  // Normaliserar valt kön så att det matchar värdena i cleanedData.
  const selectedGender = normalizeGender(chosenGender);


  // =====================================================
  // FILTRERING AV DATA
  // Här filtreras datan baserat på valt kön och valt län.
  // Om användaren väljer "Alla län" tas alla län med.
  // =====================================================

  const filteredData = cleanedData.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;

    return genderMatch && countyMatch;
  });


  // Om det inte finns data efter filtreringen visas ett meddelande.
  if (!filteredData.length) {
    addMdToPage(`
## Resultat

Det finns ingen data för det valda urvalet.
`);
  }
  else {

    // =====================================================
    // BERÄKNINGAR FÖR URVALET
    // Här räknas inkomstvärden, antal kommuner,
    // högsta inkomst och lägsta inkomst ut.
    // =====================================================

    const incomes = filteredData.map(row => row.inkomst2022);
    const numberOfMunicipalities = new Set(filteredData.map(row => row.kommun)).size;

    const highest = filteredData.reduce(
      (max, row) => row.inkomst2022 > max.inkomst2022 ? row : max,
      filteredData[0]
    );

    const lowest = filteredData.reduce(
      (min, row) => row.inkomst2022 < min.inkomst2022 ? row : min,
      filteredData[0]
    );


    // =====================================================
    // SAMMANFATTNINGSKORT
    // Om urvalet bara innehåller en kommun visas information
    // om just den kommunen. Annars visas högsta och lägsta inkomst.
    // =====================================================

    addMdToPage(`## Sammanfattning av urvalet`);

    if (numberOfMunicipalities === 1) {
      const onlyMunicipality = filteredData[0];

      addToPage(statCards([
        {
          title: "Antal kommuner",
          value: numberOfMunicipalities
        },
        {
          title: "Vald kommun",
          value: onlyMunicipality.kommun
        },
        {
          title: "Genomsnittlig inkomst",
          value: formatIncome(average(incomes))
        },
        {
          title: "Län",
          value: onlyMunicipality.lan
        }
      ]));
    }
    else {
      addToPage(statCards([
        {
          title: "Antal kommuner",
          value: numberOfMunicipalities
        },
        {
          title: "Genomsnittlig inkomst",
          value: formatIncome(average(incomes))
        },
        {
          title: "Högsta inkomst",
          value: highest.kommun + " (" + formatIncome(highest.inkomst2022) + ")"
        },
        {
          title: "Lägsta inkomst",
          value: lowest.kommun + " (" + formatIncome(lowest.inkomst2022) + ")"
        }
      ]));
    }


    // =====================================================
    // DIAGRAM: INKOMST PER LÄN
    // Diagrammet visar genomsnittlig inkomst per län
    // baserat på det valda urvalet.
    // =====================================================

    addMdToPage(`
## Inkomst per län

Diagrammet visar genomsnittlig årsinkomst per län för det valda urvalet. Om ett specifikt län väljs visas bara kommunerna inom det länet.
`);

    const chartData = getCountyAverages(filteredData);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Län", "Genomsnittlig inkomst"],
        ...chartData.map(row => [
          row.lan,
          row.averageIncome
        ])
      ],
      options: {
        title: "Genomsnittlig årsinkomst per län (2022)",
        legend: { position: "none" },
        height: 550,
        chartArea: { width: "80%", height: "70%" },
        hAxis: {
          slantedText: true,
          slantedTextAngle: 45,
          textStyle: { fontSize: 11 }
        },
        vAxis: {
          title: "Inkomst i tusental kronor",
          textStyle: { fontSize: 12 },
          titleTextStyle: { fontSize: 14, bold: true }
        }
      }
    });


    // =====================================================
    // TABELLER MED KOMMUNER
    // Kommunerna sorteras efter inkomst.
    // Om det bara finns en kommun visas den.
    // Annars visas de fem högsta och fem lägsta.
    // =====================================================

    const sorted = [...filteredData].sort((a, b) => b.inkomst2022 - a.inkomst2022);

    if (numberOfMunicipalities === 1) {
      addMdToPage(`## Vald kommun`);

      tableFromData({
        data: filteredData.map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });
    }
    else {
      addMdToPage(`## Kommuner med högst inkomst`);

      tableFromData({
        data: sorted.slice(0, 5).map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });

      addMdToPage(`## Kommuner med lägst inkomst`);

      tableFromData({
        data: sorted.slice(-5).reverse().map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });
    }


    // =====================================================
    // KORT ANALYS
    // Här tas länet med högst och lägst genomsnittlig inkomst fram.
    // Sedan visas en text som sammanfattar resultatet.
    // =====================================================

    const countyAverages = getCountyAverages(filteredData);
    const highestCounty = countyAverages[0];
    const lowestCounty = countyAverages[countyAverages.length - 1];

    addMdToPage(`## Kort analys`);

    if (numberOfMunicipalities === 1) {
      const onlyMunicipality = filteredData[0];

      addToPage(sectionBox("📊", "Resultat", [
        "Urvalet <strong>" + chosenGender + "</strong> i <strong>" + chosenCounty + "</strong> innehåller endast en kommun: <strong>" + onlyMunicipality.kommun + "</strong>",
        "Genomsnittlig inkomst: <strong>" + formatIncome(average(incomes)) + "</strong>",
        "Eftersom urvalet bara innehåller en kommun går det inte att jämföra skillnader mellan kommuner"
      ]));
    }
    else {
      addToPage(sectionBox("📊", "Resultat", [
        "Genomsnittlig inkomst för <strong>" + chosenGender + "</strong>, <strong>" + chosenCounty + "</strong>: <strong>" + formatIncome(average(incomes)) + "</strong>",
        "Högst genomsnittlig inkomst: <strong>" + highestCounty.lan + "</strong> med <strong>" + formatIncome(highestCounty.averageIncome) + "</strong>",
        "Lägst genomsnittlig inkomst: <strong>" + lowestCounty.lan + "</strong> med <strong>" + formatIncome(lowestCounty.averageIncome) + "</strong>",
        "Storstadslänen - framför allt Stockholms län - dominerar toppen av inkomstligan",
        "Kommuner i norra Sverige och glesbygd återfinns konsekvent i botten",
        "Skillnaden bekräftar att inkomst inte är jämnt fördelad geografiskt"
      ]));
    }


    // =====================================================
    // METOD OCH BEGRÄNSNING
    // Här förklaras hur analysen har gjorts
    // och vilka svagheter som finns i datan.
    // =====================================================

    addToPage(sectionBox("🔍", "Metod och begränsning", [
      "Bygger på <strong>genomsnittlig</strong> årsinkomst per kommun år 2022 (ej median)",
      "Höga inkomster hos ett fåtal kan dra upp snittet och ge en missvisande bild",
      "Data från ett enskilt år (2022) - tillfälliga variationer kan påverka",
      "Visar ekonomiska skillnader men inte varför de finns - arbetsmarknad, utbildning och bostadspriser spelar roll",
      "Inkomst <strong>orsakar inte</strong> ett visst röstningsmönster - används som bakgrund inför kommande analyser"
    ]));


    // =====================================================
    // EXTREMVÄRDEN
    // Förklarar att vissa kommuner kan påverka genomsnittet mycket.
    // Det gör analysen mer nyanserad.
    // =====================================================

    addToPage(sectionBox("⚠️", "Extremvärden", [
      "<strong>Danderyd</strong> och <strong>Lidingö</strong> i Stockholms län har exceptionellt höga inkomster och drar upp länets genomsnitt",
      "Kommuner i Kalmar och Örebro län ligger klart under rikssnittet - präglat av glesbygd och begränsad arbetsmarknad",
      "Ett fåtal extremkommuner kan påverka helhetsbilden påtagligt"
    ]));
  }
}