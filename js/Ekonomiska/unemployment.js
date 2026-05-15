import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

// =====================================================
// HJÄLPFUNKTIONER
// =====================================================

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeGender(value) {
  const v = normalize(value);

  if (["man", "män", "male", "m"].includes(v)) return "män";
  if (["kvinna", "kvinnor", "female", "f"].includes(v)) return "kvinnor";

  return "totalt";
}

function getField(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }

  return null;
}

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

function average(values) {
  const nums = values.filter(v =>
    v !== null &&
    v !== undefined &&
    Number.isFinite(v)
  );

  if (!nums.length) return 0;

  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
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

function removeLoadingBox() {
  const loadingMessage = document.getElementById("loading-message");

  if (loadingMessage) {
    loadingMessage.remove();
  }
}

// =====================================================
// SIDANS INTRODUKTION
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
// =====================================================

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  // =====================================================
  // HÄMTA DATA
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

  removeLoadingBox();

  const unemploymentRaw = Array.isArray(unemploymentResult)
    ? unemploymentResult
    : unemploymentResult?.data || unemploymentResult?.result || [];

  // =====================================================
  // RENGÖR DATA
  // Tabellen är i brett format — årtalen 2018 och 2022 är egna kolumner.
  // Här görs om till långt format: varje rad får län, kön, år och arbetslöshet.
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

  if (!unemploymentData.length) {
    addMdToPage(`
## Resultat

Det finns ingen arbetslöshetsdata att visa. Kontrollera att tabellen **arbetsloshet_by_lan** eller **arbetsloshet_clean** finns i SQLite och att den innehåller län, år och arbetslöshetsvärde.
`);
  }
  else {

    // =====================================================
    // SKAPA DROPDOWNS
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
    // =====================================================

    const filteredData = unemploymentData.filter(row => {
      const yearMatch = row.year === chosenYear;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      const genderMatch = row.kon === selectedGender;

      return yearMatch && countyMatch && genderMatch;
    });

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
      // Uppdaterat: slantedTextAngle höjd till 45 för bättre läsbarhet
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
          chartArea: { width: "82%", height: "70%" },
          hAxis: {
            slantedText: true,
            slantedTextAngle: 45,
            textStyle: { fontSize: 11 }
          },
          vAxis: {
            title: "Arbetslöshet (%)",
            textStyle: { fontSize: 13 },
            titleTextStyle: { fontSize: 15, bold: true },
            viewWindow: { min: 0 }
          }
        }
      });

      // =====================================================
      // TABELLER
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
      // KORT ANALYS
      // Uppdaterad: stärkt kausalitetsdiskussion
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

Det är dock viktigt att notera att skillnader i arbetslöshet inte *orsakar* ett visst röstningsmönster, även om ett samband kan finnas. Bakomliggande faktorer som industristruktur, utbildningsnivå och geografisk avskildhet påverkar troligen både arbetslösheten och hur invånarna röstar. Dessa faktorer behöver beaktas innan man drar slutsatser om orsak och verkan.
`;
      }

      // =====================================================
      // METOD OCH BEGRÄNSNING
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

## Extremvärden

I analysen sticker vissa län ut tydligt från övriga. **Södermanlands län** har i regel den högsta arbetslösheten i Sverige och ligger klart över rikssnittet. Detta beror troligen på en kombination av faktorer som begränsad arbetsmarknad, lägre utbildningsnivå och närheten till Stockholm som kan leda till pendling ut ur länet snarare än lokala jobb.

I den nedre änden återfinns **Norrbottens län** och **Västerbottens län** med relativt låg arbetslöshet, trots att de är glesbygdslän. Detta kan delvis förklaras av en stark offentlig sektor och basindustri i dessa regioner.

Dessa extremvärden kan påverka genomsnittet och bör beaktas när man tolkar diagrammet. Ett fåtal län med mycket hög eller låg arbetslöshet drar i viss mån på snittet för hela landet.
`);
    }
  }
}