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

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function average(values) {
  const nums = values.filter(v => v !== null && v !== undefined && Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function formatIncome(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} tkr`;
}

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
      <p style="margin:0; line-height:1.6; font-size:16px;">Hämtar inkomstdata och kommunernas länskoppling. Diagram och tabeller visas strax.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

addMdToPage(`
# Inkomst i Sverige

För att förstå vilka faktorer som kan ha samband med hur människor röstar undersöker denna del ekonomiska faktorer. Fokus ligger på inkomst och arbetslöshet eftersom de kan säga något om ekonomisk trygghet i olika delar av Sverige.

## Fråga
**Hur skiljer sig inkomstnivåerna mellan olika kommuner och län i Sverige?**
`);

addToPage(infoBox("Analysens hypotes", "Vi tror att inkomstnivåer skiljer sig tydligt mellan olika delar av Sverige och att storstadsområden generellt har högre genomsnittlig inkomst än mindre kommuner."));
addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {

  dbQuery.use("kommun-info-mongodb");
  const incomeResult = await dbQuery.collection("incomeByKommun").find({});

  dbQuery.use("counties-sqlite");
  const lanKommunResult = await dbQuery("SELECT * FROM lan_kommun");

  removeLoadingBox();

  const incomeData = Array.isArray(incomeResult) ? incomeResult : incomeResult?.data || incomeResult?.result || incomeResult?.documents || [];
  const lanKommun = Array.isArray(lanKommunResult) ? lanKommunResult : lanKommunResult?.data || lanKommunResult?.result || [];

  function getCounty(row) {
    const kommunName = normalize(row.kommun);
    const match = lanKommun.find(x => normalize(x.kommun) === kommunName);
    return match?.Lan || match?.lan || match?.län || match?.Län || "Okänt län";
  }

  function getCountyAverages(data) {
    const groups = {};
    data.forEach(row => {
      if (!groups[row.lan]) groups[row.lan] = [];
      groups[row.lan].push(row.inkomst2022);
    });
    return Object.entries(groups)
      .map(([lan, values]) => ({ lan, averageIncome: average(values) }))
      .sort((a, b) => b.averageIncome - a.averageIncome);
  }

  const cleanedData = incomeData
    .map(row => ({
      kommun: row.kommun,
      kon: normalizeGender(row.kon),
      lan: getCounty(row),
      inkomst2022: toNumber(row.medelInkomst2022)
    }))
    .filter(row => row.kommun && row.lan !== "Okänt län" && row.inkomst2022 !== null);

  const counties = [...new Set(cleanedData.map(row => row.lan))].sort((a, b) => a.localeCompare(b, "sv"));

  const chosenGender = addDropdown("Välj kön", ["Totalt", "Kvinnor", "Män"], "Totalt");
  const chosenCounty = addDropdown("Välj län", ["Alla län", ...counties], "Alla län");

  const selectedGender = normalizeGender(chosenGender);

  const filteredData = cleanedData.filter(row => {
    const genderMatch = row.kon === selectedGender;
    const countyMatch = chosenCounty === "Alla län" || row.lan === chosenCounty;
    return genderMatch && countyMatch;
  });

  if (!filteredData.length) {
    addMdToPage(`## Resultat\n\nDet finns ingen data för det valda urvalet.`);
  }
  else {

    const incomes = filteredData.map(row => row.inkomst2022);
    const numberOfMunicipalities = new Set(filteredData.map(row => row.kommun)).size;

    const highest = filteredData.reduce((max, row) => row.inkomst2022 > max.inkomst2022 ? row : max, filteredData[0]);
    const lowest = filteredData.reduce((min, row) => row.inkomst2022 < min.inkomst2022 ? row : min, filteredData[0]);

    addMdToPage(`## Sammanfattning av urvalet`);

    if (numberOfMunicipalities === 1) {
      const onlyMunicipality = filteredData[0];
      addToPage(statCards([
        { title: "Antal kommuner", value: numberOfMunicipalities },
        { title: "Vald kommun", value: onlyMunicipality.kommun },
        { title: "Genomsnittlig inkomst", value: formatIncome(average(incomes)) },
        { title: "Län", value: onlyMunicipality.lan }
      ]));
    }
    else {
      addToPage(statCards([
        { title: "Antal kommuner", value: numberOfMunicipalities },
        { title: "Genomsnittlig inkomst", value: formatIncome(average(incomes)) },
        { title: "Högsta inkomst", value: highest.kommun + " (" + formatIncome(highest.inkomst2022) + ")" },
        { title: "Lägsta inkomst", value: lowest.kommun + " (" + formatIncome(lowest.inkomst2022) + ")" }
      ]));
    }

    addMdToPage(`
## Inkomst per län

Diagrammet visar genomsnittlig årsinkomst per län för det valda urvalet. Om ett specifikt län väljs visas bara kommunerna inom det länet.
`);

    const chartData = getCountyAverages(filteredData);

    drawGoogleChart({
      type: "ColumnChart",
      data: [["Län", "Genomsnittlig inkomst"], ...chartData.map(row => [row.lan, row.averageIncome])],
      options: {
        title: "Genomsnittlig årsinkomst per län (2022)",
        legend: { position: "none" },
        height: 550,
        chartArea: { width: "80%", height: "70%" },
        hAxis: { slantedText: true, slantedTextAngle: 45, textStyle: { fontSize: 11 } },
        vAxis: { title: "Inkomst i tusental kronor", textStyle: { fontSize: 12 }, titleTextStyle: { fontSize: 14, bold: true } }
      }
    });

    const sorted = [...filteredData].sort((a, b) => b.inkomst2022 - a.inkomst2022);

    if (numberOfMunicipalities === 1) {
      addMdToPage(`## Vald kommun`);
      tableFromData({ data: filteredData.map(row => ({ Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022) })) });
    }
    else {
      addMdToPage(`## Kommuner med högst inkomst`);
      tableFromData({ data: sorted.slice(0, 5).map(row => ({ Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022) })) });
      addMdToPage(`## Kommuner med lägst inkomst`);
      tableFromData({ data: sorted.slice(-5).reverse().map(row => ({ Kommun: row.kommun, Län: row.lan, Inkomst: formatIncome(row.inkomst2022) })) });
    }

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
        "Storstadslänen — framför allt Stockholms län — dominerar toppen av inkomstligan",
        "Kommuner i norra Sverige och glesbygd återfinns konsekvent i botten",
        "Skillnaden bekräftar att inkomst inte är jämnt fördelad geografiskt"
      ]));
    }

    addToPage(sectionBox("🔍", "Metod och begränsning", [
      "Bygger på <strong>genomsnittlig</strong> årsinkomst per kommun år 2022 (ej median)",
      "Höga inkomster hos ett fåtal kan dra upp snittet och ge en missvisande bild",
      "Data från ett enskilt år (2022) — tillfälliga variationer kan påverka",
      "Visar ekonomiska skillnader men inte varför de finns — arbetsmarknad, utbildning och bostadspriser spelar roll",
      "Inkomst <strong>orsakar inte</strong> ett visst röstningsmönster — används som bakgrund inför kommande analyser"
    ]));

    addToPage(sectionBox("⚠️", "Extremvärden", [
      "<strong>Danderyd</strong> och <strong>Lidingö</strong> i Stockholms län har exceptionellt höga inkomster och drar upp länets genomsnitt",
      "Kommuner i Kalmar och Örebro län ligger klart under rikssnittet — präglat av glesbygd och begränsad arbetsmarknad",
      "Ett fåtal extremkommuner kan påverka helhetsbilden påtagligt"
    ]));
  }
}