import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// ===============================
// HJÄLPFUNKTIONER
// Små funktioner som används flera gånger i sidan
// ===============================

// Gör text enklare att jämföra.
// Exempel: "Stockholms län" och "stockholms lan" blir lättare att matcha.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Gör om olika könsvärden till samma standard.
// Det gör att vi kan filtrera på män, kvinnor och totalt även om datan skrivs lite olika.
function normalizeGender(value) {
  const v = normalize(value);

  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";

  return "totalt";
}

// Gör om textvärden till tal.
// Behövs eftersom vissa värden kan komma som text eller ha kommatecken istället för punkt.
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
// Tomma värden filtreras bort först.
function average(values) {
  const nums = values.filter(v =>
    v !== null &&
    v !== undefined &&
    Number.isFinite(v)
  );

  if (!nums.length) return 0;

  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

// Formaterar inkomst som tusental kronor.
// Exempel: 327 blir "327 tkr".
function formatIncome(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} tkr`;
}

// Skapar sammanfattningskort högst upp på sidan.
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
// Används här för hypotesen så att sidan matchar income-voting.js.
function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

// ===============================
// SIDANS INTRODUKTION
// Här skrivs rubrik, syfte och fråga ut på sidan.
// Hypotesen visas i en egen ruta för att matcha income-voting.js.
// ===============================

addMdToPage(`
# Inkomst i Sverige

För att förstå vilka faktorer som kan ha samband med hur människor röstar undersöker denna del ekonomiska faktorer. Fokus ligger på inkomst och arbetslöshet eftersom de kan säga något om ekonomisk trygghet i olika delar av Sverige.

## Fråga
**Hur skiljer sig inkomstnivåerna mellan olika kommuner och län i Sverige?**
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vi tror att inkomstnivåer skiljer sig tydligt mellan olika delar av Sverige och att storstadsområden generellt har högre genomsnittlig inkomst än mindre kommuner."
));

// ===============================
// DATABASKONTROLL
// Om databasen inte fungerar avbryts sidan och ett felmeddelande visas.
// ===============================

if (!dbInfoOk) {
  displayDbNotOkText();
}
else {

  // ===============================
  // HÄMTA DATA
  // Hämtar inkomstdata från MongoDB och kommun-län-koppling från SQLite.
  // ===============================

  dbQuery.use("kommun-info-mongodb");
  const incomeData = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommun = await dbQuery("SELECT * FROM lan_kommun");

  // ===============================
  // KOPPLA KOMMUN TILL LÄN
  // Inkomstdatan har kommunnamn men behöver län för att vi ska kunna jämföra län.
  // Därför matchas varje kommun mot tabellen lan_kommun.
  // ===============================

  function getCounty(row) {
    const kommunName = normalize(row.kommun);

    const match = lanKommun.find(x =>
      normalize(x.kommun) === kommunName
    );

    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }

  // ===============================
  // GRUPPERA DATA PER LÄN
  // Används till diagrammet som visar genomsnittlig inkomst per län.
  // ===============================

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

  // ===============================
  // RENGÖR DATA
  // Här skapar vi ett mer användbart dataset.
  // Vi normaliserar kön, kopplar på län och gör inkomst till tal.
  // Rader utan kommun, län eller inkomst tas bort.
  // ===============================

  const cleanedData = incomeData
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

  // ===============================
  // SKAPA DROPDOWNS
  // Län-listan skapas automatiskt från datan.
  // addDropdown kommer ihåg användarens val när sidan laddas om.
  // ===============================

  const counties = [...new Set(cleanedData.map(row => row.lan))]
    .sort((a, b) => a.localeCompare(b, "sv"));

  const chosenGender = addDropdown("Välj kön:", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län:", ["Alla län", ...counties], "Alla län");

  const selectedGender = normalizeGender(chosenGender);

  // ===============================
  // FILTRERA DATA
  // Här filtreras datan baserat på användarens val i dropdowns.
  // Om användaren väljer "Alla län" visas alla län.
  // ===============================

  const filteredData = cleanedData.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;

    return genderMatch && countyMatch;
  });

  // ===============================
  // OM URVALET SAKNAR DATA
  // Visar ett meddelande om kombinationen av kön och län inte ger någon data.
  // ===============================

  if (!filteredData.length) {
    addMdToPage(`
## Resultat

Det finns ingen data för det valda urvalet.
`);
  }
  else {

    // ===============================
    // BERÄKNA NYCKELTAL
    // Här räknar vi ut genomsnitt, högsta och lägsta inkomst i det valda urvalet.
    // ===============================

    const incomes = filteredData.map(row => row.inkomst2022);
    const numberOfMunicipalities = new Set(filteredData.map(row => row.kommun)).size;

    const highest = filteredData.reduce((max, row) =>
      row.inkomst2022 > max.inkomst2022 ? row : max,
      filteredData[0]
    );

    const lowest = filteredData.reduce((min, row) =>
      row.inkomst2022 < min.inkomst2022 ? row : min,
      filteredData[0]
    );

    // ===============================
    // SAMMANFATTNINGSKORT
    // Visar viktiga siffror högst upp på sidan.
    // ===============================

    addMdToPage(`
## Sammanfattning av urvalet
`);

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
          value: `${highest.kommun} (${formatIncome(highest.inkomst2022)})`
        },
        {
          title: "Lägsta inkomst",
          value: `${lowest.kommun} (${formatIncome(lowest.inkomst2022)})`
        }
      ]));
    }

    // ===============================
    // DIAGRAM: INKOMST PER LÄN
    // Visar genomsnittlig inkomst per län i ett stapeldiagram.
    // ===============================

    addMdToPage(`
## Inkomst per län

Diagrammet visar genomsnittlig årsinkomst per län för det valda urvalet. Om ett specifikt län väljs visas bara kommunerna inom det länet.
`);

    const chartData = getCountyAverages(filteredData);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Län", "Genomsnittlig inkomst"],
        ...chartData.map(row => [row.lan, row.averageIncome])
      ],
      options: {
        title: "Genomsnittlig årsinkomst per län (2022)",
        legend: { position: "none" },
        height: 550,
        chartArea: { width: "80%", height: "75%" },
        hAxis: {
          slantedText: true,
          slantedTextAngle: 25,
          textStyle: { fontSize: 12 }
        },
        vAxis: {
          title: "Inkomst i tusental kronor",
          textStyle: { fontSize: 12 },
          titleTextStyle: { fontSize: 14, bold: true }
        }
      }
    });

    // ===============================
    // TABELLER
    // Om urvalet bara innehåller en kommun visas en tabell.
    // Annars visas högsta och lägsta kommuner.
    // ===============================

    const sorted = [...filteredData].sort((a, b) => b.inkomst2022 - a.inkomst2022);

    if (numberOfMunicipalities === 1) {
      addMdToPage(`
## Vald kommun
`);

      tableFromData({
        data: filteredData.map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });
    }
    else {
      addMdToPage(`
## Kommuner med högst inkomst
`);

      tableFromData({
        data: sorted.slice(0, 5).map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });

      addMdToPage(`
## Kommuner med lägst inkomst
`);

      tableFromData({
        data: sorted.slice(-5).reverse().map(row => ({
          Kommun: row.kommun,
          Län: row.lan,
          Inkomst: formatIncome(row.inkomst2022)
        }))
      });
    }

    // ===============================
    // ANALYS
    // Här sammanfattas resultatet i text.
    // Detta gör att sidan inte bara visar data utan också tolkar vad vi ser.
    // ===============================

    const countyAverages = getCountyAverages(filteredData);
    const highestCounty = countyAverages[0];
    const lowestCounty = countyAverages[countyAverages.length - 1];

    let analysisText = "";

    if (numberOfMunicipalities === 1) {
      const onlyMunicipality = filteredData[0];

      analysisText = `
## Kort analys

För urvalet **${chosenGender}** i **${chosenCounty}** finns endast en kommun i det valda urvalet: **${onlyMunicipality.kommun}**.

Den genomsnittliga inkomsten för detta urval är **${formatIncome(average(incomes))}**.

Eftersom urvalet bara innehåller en kommun går det inte att jämföra skillnader mellan flera kommuner inom länet. Resultatet visar därför endast inkomstnivån för den valda kommunen.

Detta är viktigt att tänka på vid tolkningen, eftersom sidan främst är gjord för att jämföra inkomstnivåer mellan flera kommuner och län.
`;
    }
    else {
      analysisText = `
## Kort analys

För urvalet **${chosenGender}** i **${chosenCounty}** är den genomsnittliga inkomsten **${formatIncome(average(incomes))}**.

Det län som har högst genomsnittlig inkomst i detta urval är **${highestCounty.lan}** med **${formatIncome(highestCounty.averageIncome)}**. Det län som har lägst genomsnittlig inkomst är **${lowestCounty.lan}** med **${formatIncome(lowestCounty.averageIncome)}**.

Resultatet stödjer hypotesen att inkomstnivåer varierar mellan olika delar av Sverige. Framför allt syns skillnader mellan kommuner och län. Denna sida fungerar som en ekonomisk bakgrund inför nästa analys där inkomst kopplas till partier och valresultat.
`;
    }

    addMdToPage(`
${analysisText}

## Metod och begränsning

Analysen bygger på genomsnittlig årsinkomst per kommun år 2022. Inkomsten anges i tusental kronor. Kommunerna kopplas till län genom tabellen **lan_kommun**.

Denna sida visar ekonomiska skillnader mellan kommuner och län, men den visar inte varför skillnaderna finns. Faktorer som arbetsmarknad, utbildningsnivå, bostadspriser, åldersstruktur och geografisk plats kan påverka inkomstnivåerna.

Det är också viktigt att skilja mellan samband och orsak. Denna sida visar ekonomiska skillnader, men den visar inte att inkomst orsakar ett visst röstningsmönster. Därför används resultatet som bakgrund inför kommande analyser.
`);
  }
}