import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// =====================================================
// HJÄLPFUNKTIONER
// Dessa funktioner används på flera ställen i sidan.
// De gör koden enklare att läsa och minskar upprepning.
// =====================================================

// Normaliserar text så att länsnamn och kolumnvärden blir lättare att jämföra.
// Exempel: "Västra Götalands län" och "vastra gotalands lan" kan matchas enklare.
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Standardiserar könsvärden om arbetslöshetsdatan innehåller kön.
// Om datan inte har kön används "totalt" som standard.
function normalizeGender(value) {
  const v = normalize(value);

  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";

  return "totalt";
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

// Formaterar arbetslöshet som procent.
// Exempel: 7.234 blir "7,2 %".
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
// Här används den för att visa hypotesen tydligare och matcha de andra ekonomisidorna.
function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

// Skapar en laddningsruta som visas medan databasen hämtar data.
// Detta gör att sidan inte ser tom ut under tiden.
function loadingBox() {
  return `
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 8px 0; font-size:19px;">Laddar analysen...</h3>
      <p style="margin:0; line-height:1.6; font-size:16px;">
        Hämtar arbetslöshetsdata från SQLite. Diagram och tabeller visas strax.
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
// Den här sidan fungerar som översikt över arbetslöshet innan arbetslöshet kopplas till valresultat.
// =====================================================

addMdToPage(`
# Arbetslöshet i Sverige

I denna analys undersöker vi hur arbetslösheten skiljer sig mellan olika län. Syftet är att skapa en ekonomisk bakgrund innan arbetslöshet kopplas till röstningsmönster i nästa analys.

## Fråga
**Hur skiljer sig arbetslösheten mellan olika län i Sverige?**
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vi tror att arbetslösheten varierar mellan olika delar av Sverige och att vissa län har tydligt högre arbetslöshet än andra."
));

addToPage(loadingBox());

// =====================================================
// DATABASKONTROLL
// Om databasen inte fungerar visas ett felmeddelande.
// Annars fortsätter sidan med att hämta och bearbeta data.
// =====================================================

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  // =====================================================
  // HÄMTA DATA
  // Här hämtas arbetslöshetsdata från SQLite.
  // Tabellen kan heta olika beroende på hur gruppen har importerat datan.
  // =====================================================

  dbQuery.use("counties-sqlite");

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

  // Nu är datan hämtad och därför tas laddningsrutan bort.
  removeLoadingBox();

  // Säkerställer att datan alltid blir en array innan vi använder .map(), .filter() och .flatMap().
  const unemploymentRaw = Array.isArray(unemploymentResult)
    ? unemploymentResult
    : unemploymentResult?.data || unemploymentResult?.result || [];

  // =====================================================
  // RENGÖR DATA
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
  // HANTERA TOM DATA
  // Om tabellen saknas eller kolumnerna inte matchar visas ett tydligt meddelande.
  // =====================================================

  if (!unemploymentData.length) {
    addMdToPage(`
## Resultat

Det finns ingen arbetslöshetsdata att visa. Kontrollera att tabellen **arbetsloshet_by_lan** eller **arbetsloshet_clean** finns i SQLite och att den innehåller län, år och arbetslöshetsvärde.
`);
  }
  else {

    // =====================================================
    // SKAPA DROPDOWNS
    // Här skapas filtren som användaren kan styra analysen med.
    // Användaren kan välja år, län och kön om kön finns i datan.
    // =====================================================

    const years = [...new Set(unemploymentData.map(row => row.year))]
      .sort((a, b) => b.localeCompare(a));

    const counties = [...new Set(unemploymentData.map(row => row.lan))]
      .sort((a, b) => a.localeCompare(b, "sv"));

    const hasGenderValues = unemploymentData.some(row => row.kon === "män" || row.kon === "kvinnor");

    const chosenYear = addDropdown("Välj år:", years, years[0]);
    const chosenCounty = addDropdown("Välj län:", ["Alla län", ...counties], "Alla län");
    const chosenGender = hasGenderValues
      ? addDropdown("Välj kön:", ["Totalt", "Kvinnor", "Män"], "Totalt")
      : "Totalt";

    const selectedGender = normalizeGender(chosenGender);

    // =====================================================
    // FILTRERA DATA
    // Här filtreras arbetslöshetsdatan baserat på användarens val.
    // Om användaren väljer "Alla län" visas alla län.
    // =====================================================

    const filteredData = unemploymentData.filter(row => {
      const yearMatch = row.year === chosenYear;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      const genderMatch = row.kon === selectedGender;

      return yearMatch && countyMatch && genderMatch;
    });

    // =====================================================
    // HANTERA TOMT URVAL
    // Om filtren gör att det inte finns någon data visas ett meddelande.
    // =====================================================

    if (!filteredData.length) {
      addMdToPage(`
## Resultat

Det finns ingen arbetslöshetsdata för **${chosenCounty}**, **${chosenGender}**, **${chosenYear}** i det valda urvalet.

Det betyder inte nödvändigtvis att länet saknas helt, utan att värdet för den valda kombinationen saknas i datan. I arbetslöshetstabellen finns vissa värden som **NULL**, till exempel kan ett län sakna värde för ett visst år eller kön.

Välj ett annat år, kön eller län för att se tillgänglig data.
`);
    }
    else {

      // =====================================================
      // BERÄKNA NYCKELTAL
      // Här räknas genomsnitt, högsta och lägsta arbetslöshet fram.
      // Dessa värden används i kort, tabeller och analys.
      // =====================================================

      const values = filteredData.map(row => row.arbetsloshet);
      const numberOfCounties = new Set(filteredData.map(row => row.lan)).size;

      const highest = filteredData.reduce((max, row) =>
        row.arbetsloshet > max.arbetsloshet ? row : max,
        filteredData[0]
      );

      const lowest = filteredData.reduce((min, row) =>
        row.arbetsloshet < min.arbetsloshet ? row : min,
        filteredData[0]
      );

      // =====================================================
      // SAMMANFATTNINGSKORT
      // Om endast ett län är valt visas kort som passar ett enskilt urval.
      // Om flera län visas högsta och lägsta arbetslöshet.
      // =====================================================

      addMdToPage(`
## Sammanfattning av urvalet
`);

      if (numberOfCounties === 1) {
        addToPage(statCards([
          {
            title: "Antal län",
            value: numberOfCounties
          },
          {
            title: "Valt län",
            value: filteredData[0].lan
          },
          {
            title: "Arbetslöshet",
            value: formatPercent(average(values))
          },
          {
            title: "År",
            value: chosenYear
          }
        ]));
      }
      else {
        addToPage(statCards([
          {
            title: "Antal län",
            value: numberOfCounties
          },
          {
            title: "Genomsnittlig arbetslöshet",
            value: formatPercent(average(values))
          },
          {
            title: "Högst arbetslöshet",
            value: highest.lan,
            note: formatPercent(highest.arbetsloshet)
          },
          {
            title: "Lägst arbetslöshet",
            value: lowest.lan,
            note: formatPercent(lowest.arbetsloshet)
          }
        ]));
      }

      // =====================================================
      // DIAGRAM: ARBETSLÖSHET PER LÄN
      // Stapeldiagrammet visar arbetslöshet per län i det valda urvalet.
      // Datan sorteras från högst till lägst arbetslöshet.
      // =====================================================

      const sortedByUnemployment = [...filteredData].sort((a, b) => b.arbetsloshet - a.arbetsloshet);

      addMdToPage(`
## Arbetslöshet per län

Diagrammet visar arbetslösheten per län för det valda året. Län med högre arbetslöshet visas först.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: [
          ["Län", "Arbetslöshet"],
          ...sortedByUnemployment.map(row => [row.lan, row.arbetsloshet])
        ],
        options: {
          title: `Arbetslöshet per län (${chosenYear})`,
          legend: { position: "none" },
          height: 560,
          chartArea: { width: "82%", height: "72%" },
          hAxis: {
            slantedText: true,
            slantedTextAngle: 25,
            textStyle: { fontSize: 12 }
          },
          vAxis: {
            title: "Arbetslöshet (%)",
            textStyle: { fontSize: 13 },
            titleTextStyle: { fontSize: 15, bold: true }
          }
        }
      });

      // =====================================================
      // TABELLER
      // Om ett län är valt visas endast valt län.
      // Annars visas län med högst och lägst arbetslöshet.
      // Året visas i rubriken istället för i varje tabellrad.
      // =====================================================

      if (numberOfCounties === 1) {
        addMdToPage(`
## Valt län ${chosenYear}
`);

        tableFromData({
          data: filteredData.map(row => ({
            Län: row.lan,
            Arbetslöshet: formatPercent(row.arbetsloshet)
          }))
        });
      }
      else {
        addMdToPage(`
## Län med högst arbetslöshet ${chosenYear}
`);

        tableFromData({
          data: sortedByUnemployment.slice(0, 5).map(row => ({
            Län: row.lan,
            Arbetslöshet: formatPercent(row.arbetsloshet)
          }))
        });

        addMdToPage(`
## Län med lägst arbetslöshet ${chosenYear}
`);

        tableFromData({
          data: sortedByUnemployment.slice(-5).reverse().map(row => ({
            Län: row.lan,
            Arbetslöshet: formatPercent(row.arbetsloshet)
          }))
        });
      }

      // =====================================================
      // ANALYS
      // Här sammanfattas resultatet i text.
      // Texten anpassas beroende på om ett eller flera län visas.
      // =====================================================

      let analysisText = "";

      if (numberOfCounties === 1) {
        analysisText = `
## Kort analys

För urvalet **${chosenGender}**, **${chosenCounty}**, **${chosenYear}** är arbetslösheten **${formatPercent(average(values))}**.

Eftersom urvalet bara innehåller ett län går det inte att jämföra skillnader mellan flera län. Resultatet visar därför endast arbetslösheten för det valda länet.

Detta är viktigt att tänka på vid tolkningen, eftersom sidan främst är gjord för att jämföra arbetslöshet mellan olika län.
`;
      }
      else {
        const difference = highest.arbetsloshet - lowest.arbetsloshet;

        analysisText = `
## Kort analys

För urvalet **${chosenGender}**, **Alla län**, **${chosenYear}** är den genomsnittliga arbetslösheten **${formatPercent(average(values))}**.

Det län som har högst arbetslöshet är **${highest.lan}** med **${formatPercent(highest.arbetsloshet)}**. Det län som har lägst arbetslöshet är **${lowest.lan}** med **${formatPercent(lowest.arbetsloshet)}**.

Skillnaden mellan högsta och lägsta arbetslöshet är **${formatPercent(difference)}**, vilket visar att arbetslösheten varierar mellan olika delar av Sverige. Resultatet stödjer hypotesen att arbetslösheten skiljer sig mellan län.
`;
      }

      // =====================================================
      // METOD OCH BEGRÄNSNING
      // Här förklaras hur analysen har gjorts och vad man ska vara försiktig med.
      // Eftersom arbetslösheten är på länsnivå är detta extra viktigt.
      // =====================================================

      addMdToPage(`
${analysisText}

## Metod och begränsning

Analysen bygger på arbetslöshetsdata på länsnivå. Det betyder att värdet beskriver ett helt län och inte en enskild kommun.

Detta skiljer sig från inkomstsidorna, där inkomst analyseras på kommunnivå. Inkomstdata kan därför jämföras mellan kommuner, medan arbetslöshetsdata i denna sida endast kan jämföras mellan län.

Det är viktigt att skilja mellan samband och orsak. Denna sida visar hur arbetslösheten varierar mellan län, men den visar inte varför skillnaderna finns eller hur arbetslöshet påverkar röstningsmönster.

Eftersom arbetslösheten mäts på länsnivå kan skillnader mellan kommuner inom samma län döljas. Om arbetslösheten senare kopplas till kommunernas valresultat behöver samma länsvärde användas för alla kommuner inom länet. Det gör analysen mindre detaljerad än inkomstanalysen och resultatet måste därför tolkas mer försiktigt.

Därför används denna sida som en ekonomisk bakgrund inför nästa analys där arbetslöshet kopplas till valresultat.

Vissa värden saknas i datan, till exempel om ett län har **NULL** för ett visst år eller kön. Dessa rader filtreras bort från analysen, vilket kan göra att antalet län blir lägre än 21.

När könsfiltret står på Totalt används totalvärdet från datan. Det är alltså inte en enkel summering av män och kvinnor, utan arbetslösheten för hela gruppen tillsammans.
`);
    }
  }
}