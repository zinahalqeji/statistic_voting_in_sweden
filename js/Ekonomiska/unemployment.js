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
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar arbetslöshetsdata från SQLite. Diagram och tabeller visas strax.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

addMdToPage(`
# Arbetslöshet i Sverige

I denna analys undersöker vi hur arbetslösheten skiljer sig mellan olika län. Syftet är att skapa en ekonomisk bakgrund innan arbetslöshet kopplas till röstningsmönster i nästa analys.

## Fråga
**Hur skiljer sig arbetslösheten mellan olika län i Sverige?**
`);

addToPage(infoBox("Analysens hypotes", "Vi tror att arbetslösheten varierar mellan olika delar av Sverige och att vissa län har tydligt högre arbetslöshet än andra."));
addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

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

  const unemploymentRaw = Array.isArray(unemploymentResult) ? unemploymentResult : unemploymentResult?.data || unemploymentResult?.result || [];

  const yearColumns = ["2018", "2022"];

  const unemploymentData = unemploymentRaw
    .flatMap(row => {
      const lan = getField(row, ["lan", "län", "Lan", "Län", "region", "Region"]);
      const kon = getField(row, ["kon", "kön", "Kon", "Kön", "gender", "Gender"]);
      return yearColumns.map(year => ({ lan, year, kon: normalizeGender(kon), arbetsloshet: toNumber(row[year]) }));
    })
    .filter(row => row.lan && row.year && row.arbetsloshet !== null);

  if (!unemploymentData.length) {
    addMdToPage(`## Resultat\n\nDet finns ingen arbetslöshetsdata att visa. Kontrollera att tabellen **arbetsloshet_by_lan** eller **arbetsloshet_clean** finns i SQLite.`);
  }
  else {

    const years = [...new Set(unemploymentData.map(row => row.year))].sort((a, b) => b.localeCompare(a));
    const counties = [...new Set(unemploymentData.map(row => row.lan))].sort((a, b) => a.localeCompare(b, "sv"));
    const hasGenderValues = unemploymentData.some(row => row.kon === "män" || row.kon === "kvinnor");

    const chosenYear = addDropdown("Välj år:", years, years[0]);
    const chosenCounty = addDropdown("Välj län:", ["Alla län", ...counties], "Alla län");
    const chosenGender = hasGenderValues ? addDropdown("Välj kön:", ["Totalt", "Kvinnor", "Män"], "Totalt") : "Totalt";

    const selectedGender = normalizeGender(chosenGender);

    const filteredData = unemploymentData.filter(row => {
      const yearMatch = row.year === chosenYear;
      const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
      const genderMatch = row.kon === selectedGender;
      return yearMatch && countyMatch && genderMatch;
    });

    if (!filteredData.length) {
      addMdToPage(`## Resultat\n\nDet finns ingen arbetslöshetsdata för **${chosenCounty}**, **${chosenGender}**, **${chosenYear}**.\n\nVälj ett annat år, kön eller län för att se tillgänglig data.`);
    }
    else {

      const values = filteredData.map(row => row.arbetsloshet);
      const numberOfCounties = new Set(filteredData.map(row => row.lan)).size;

      const highest = filteredData.reduce((max, row) => row.arbetsloshet > max.arbetsloshet ? row : max, filteredData[0]);
      const lowest = filteredData.reduce((min, row) => row.arbetsloshet < min.arbetsloshet ? row : min, filteredData[0]);

      addMdToPage(`## Sammanfattning av urvalet`);

      if (numberOfCounties === 1) {
        addToPage(statCards([
          { title: "Antal län", value: numberOfCounties },
          { title: "Valt län", value: filteredData[0].lan },
          { title: "Arbetslöshet", value: formatPercent(average(values)) },
          { title: "År", value: chosenYear }
        ]));
      }
      else {
        addToPage(statCards([
          { title: "Antal län", value: numberOfCounties },
          { title: "Genomsnittlig arbetslöshet", value: formatPercent(average(values)) },
          { title: "Högst arbetslöshet", value: highest.lan, note: formatPercent(highest.arbetsloshet) },
          { title: "Lägst arbetslöshet", value: lowest.lan, note: formatPercent(lowest.arbetsloshet) }
        ]));
      }

      const sortedByUnemployment = [...filteredData].sort((a, b) => b.arbetsloshet - a.arbetsloshet);

      addMdToPage(`
## Arbetslöshet per län

Diagrammet visar arbetslösheten per län för det valda året. Län med högre arbetslöshet visas först.
`);

      drawGoogleChart({
        type: "ColumnChart",
        data: [["Län", "Arbetslöshet"], ...sortedByUnemployment.map(row => [row.lan, row.arbetsloshet])],
        options: {
          title: "Arbetslöshet per län (" + chosenYear + ")",
          legend: { position: "none" },
          height: 560,
          chartArea: { width: "82%", height: "70%" },
          hAxis: { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 11 } },
          vAxis: { title: "Arbetslöshet (%)", textStyle: { fontSize: 13 }, titleTextStyle: { fontSize: 15, bold: true }, viewWindow: { min: 0 } }
        }
      });

      if (numberOfCounties === 1) {
        addMdToPage(`## Valt län ${chosenYear}`);
        tableFromData({ data: filteredData.map(row => ({ Län: row.lan, Arbetslöshet: formatPercent(row.arbetsloshet) })) });
      }
      else {
        addMdToPage(`## Län med högst arbetslöshet ${chosenYear}`);
        tableFromData({ data: sortedByUnemployment.slice(0, 5).map(row => ({ Län: row.lan, Arbetslöshet: formatPercent(row.arbetsloshet) })) });
        addMdToPage(`## Län med lägst arbetslöshet ${chosenYear}`);
        tableFromData({ data: sortedByUnemployment.slice(-5).reverse().map(row => ({ Län: row.lan, Arbetslöshet: formatPercent(row.arbetsloshet) })) });
      }

      addMdToPage(`## Kort analys`);

      if (numberOfCounties === 1) {
        addToPage(sectionBox("📊", "Resultat", [
          "Urvalet <strong>" + chosenGender + "</strong>, <strong>" + chosenCounty + "</strong>, <strong>" + chosenYear + "</strong> innehåller ett län",
          "Arbetslöshet: <strong>" + formatPercent(average(values)) + "</strong>",
          "Går inte att jämföra med andra län i detta urval"
        ]));
      }
      else {
        const difference = highest.arbetsloshet - lowest.arbetsloshet;
        addToPage(sectionBox("📊", "Resultat", [
          "Genomsnittlig arbetslöshet <strong>" + chosenGender + "</strong>, <strong>" + chosenYear + "</strong>: <strong>" + formatPercent(average(values)) + "</strong>",
          "Högst: <strong>" + highest.lan + "</strong> med <strong>" + formatPercent(highest.arbetsloshet) + "</strong>",
          "Lägst: <strong>" + lowest.lan + "</strong> med <strong>" + formatPercent(lowest.arbetsloshet) + "</strong>",
          "Skillnad mellan högst och lägst: <strong>" + formatPercent(difference) + "</strong> — tydlig geografisk variation",
          "Resultatet stödjer hypotesen att arbetslösheten skiljer sig mellan län",
          "Skillnader i arbetslöshet <strong>orsakar inte</strong> i sig hur människor röstar — bakomliggande faktorer som industristruktur och utbildning spelar roll"
        ]));
      }

      addToPage(sectionBox("🔍", "Metod och begränsning", [
        "Bygger på arbetslöshetsdata på <strong>länsnivå</strong> — inte kommunnivå",
        "Skillnader inom ett och samma län kan inte fångas upp",
        "Samma länsvärde används för alla kommuner inom länet i nästa analys",
        "Vissa värden är NULL i datan och filtreras bort — antalet län kan bli lägre än 21",
        "Totalt-värdet är inte en summering av män och kvinnor utan ett eget totalvärde"
      ]));

      addToPage(sectionBox("⚠️", "Extremvärden", [
        "<strong>Södermanlands län</strong> har genomgående hög arbetslöshet och ligger klart över rikssnittet",
        "<strong>Norrbottens</strong> och <strong>Västerbottens</strong> län har relativt låg arbetslöshet trots glesbygdskaraktär — tack vare stark offentlig sektor och basindustri",
        "Dessa extremlän kan påverka genomsnittet och bör beaktas vid tolkning av diagrammet"
      ]));
    }
  }
}