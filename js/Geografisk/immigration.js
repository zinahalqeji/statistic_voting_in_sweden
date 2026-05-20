import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

const parties = {
  "S": {
    label: "Socialdemokraterna",
    col2018: "Arbetarepartiet-Socialdemokraterna_2018",
    col2022: "Arbetarepartiet-Socialdemokraterna_2022"
  },
  "M": {
    label: "Moderaterna",
    col2018: "Moderaterna_2018",
    col2022: "Moderaterna_2022"
  },
  "SD": {
    label: "Sverigedemokraterna",
    col2018: "Sverigedemokraterna_2018",
    col2022: "Sverigedemokraterna_2022"
  },
  "V": {
    label: "Vänsterpartiet",
    col2018: "Vänsterpartiet_2018",
    col2022: "Vänsterpartiet_2022"
  },
  "C": {
    label: "Centerpartiet",
    col2018: "Centerpartiet_2018",
    col2022: "Centerpartiet_2022"
  },
  "KD": {
    label: "Kristdemokraterna",
    col2018: "Kristdemokraterna_2018",
    col2022: "Kristdemokraterna_2022"
  },
  "L": {
    label: "Liberalerna",
    col2018: "Liberalerna (tidigare Folkpartiet)_2018",
    col2022: "Liberalerna (tidigare Folkpartiet)_2022"
  },
  "MP": {
    label: "Miljöpartiet",
    col2018: "Miljöpartiet de gröna_2018",
    col2022: "Miljöpartiet de gröna_2022"
  }
};

const partyKeys = Object.keys(parties);

const partyColors = {
  S: "#E4003B",
  M: "#1B66AE",
  SD: "#DDCC00",
  V: "#9B1D20",
  C: "#009933",
  KD: "#005F8D",
  L: "#006AB3",
  MP: "#83CF39"
};

// Stapeldiagrammets färger visar vilket år stapeln tillhör
// oavsett valt parti – mörkröd = 2018, ljusröd = 2022.
const BAR_COLOR_2018 = "#A32D2D";
const BAR_COLOR_2022 = "#F09595";

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

function formatPE(value) {
  const abs = Math.abs(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  if (value > 0) return "+" + abs + " pe";
  if (value < 0) return "-" + abs + " pe";
  return "0,0 pe";
}

function average(values) {
  const nums = values.filter(v => Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function correlation(xValues, yValues) {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 2) return 0;
  const avgX = average(xValues);
  const avgY = average(yValues);
  let numerator = 0, denominatorX = 0, denominatorY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xValues[i] - avgX;
    const dy = yValues[i] - avgY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator === 0 ? 0 : numerator / denominator;
}

// Beräknar linjär regression (minsta kvadratmetoden).
// Returnerar lutning (k) och skärningspunkt (m) för trendlinjen.
// Formel: k = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²), m = ȳ - k * x̄
function linearRegression(xValues, yValues) {
  const n = Math.min(xValues.length, yValues.length);
  const x = xValues.slice(0, n);
  const y = yValues.slice(0, n);
  const avgX = average(x);
  const avgY = average(y);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - avgX) * (y[i] - avgY);
    den += (x[i] - avgX) ** 2;
  }
  const k = den === 0 ? 0 : num / den;
  const m = avgY - k * avgX;
  return { k, m };
}

function totalVotes(row, year) {
  return partyKeys.reduce((sum, partyKey) => {
    const col = year === "2018" ? parties[partyKey].col2018 : parties[partyKey].col2022;
    return sum + toNumber(row[col]);
  }, 0);
}

function partyShare(row, partyKey, year) {
  const party = parties[partyKey];
  const col = year === "2018" ? party.col2018 : party.col2022;
  const total = totalVotes(row, year);
  if (!total) return 0;
  return (toNumber(row[col]) / total) * 100;
}

function corrStrength(r) {
  const abs = Math.abs(r);
  const dir = r > 0 ? "positivt" : "negativt";
  if (abs >= 0.6) return `starkt ${dir} samband`;
  if (abs >= 0.3) return `måttligt ${dir} samband`;
  if (abs >= 0.1) return `svagt ${dir} samband`;
  return "inget tydligt linjärt samband";
}

function corrExplain(r, partyLabel) {
  if (r > 0.1) return `${partyLabel} tenderar att få <strong>högre</strong> röstandel i kommuner med hög andel utrikes födda.`;
  if (r < -0.1) return `${partyLabel} tenderar att få <strong>lägre</strong> röstandel i kommuner med hög andel utrikes födda, dvs. starkare stöd där andelen utrikes födda är låg.`;
  return `Det finns inget tydligt samband mellan andel utrikes födda och stöd för ${partyLabel}.`;
}

// Genererar en djup kausalitetsdiskussion anpassad efter valt parti.
// Diskuterar om sambandet är direkt eller indirekt och vilka faktorer
// som kan ligga bakom röstningsmönstret.
function causalityDiscussion(r, partyLabel, partyKey) {
  const abs = Math.abs(r);
  const direction = r > 0 ? "positivt" : "negativt";

  if (abs < 0.1) {
    return `Eftersom korrelationen för ${partyLabel} är nära noll är det osannolikt att andelen
    utrikes födda har ett direkt samband med partiets stöd. Det innebär att kausalitet – att
    andelen utrikes födda i sig skulle <em>orsaka</em> ett visst röstbeteende – är ännu mer
    osannolik. Andra faktorer som åldersstruktur, inkomst eller regionala traditioner kan
    spela en större roll.`;
  }

  let partyContext = "";
  if (partyKey === "SD") {
    partyContext = `Sverigedemokraterna har invandringsfrågan som en central del av sin politik.
    Ett negativt samband – att SD är starkare där andelen utrikes födda är <em>lägre</em> – är
    ett välkänt fenomen i forskningen och kallas ibland för "the halo effect": oro för invandring
    kan vara starkare på platser där man <em>inte</em> bor nära invandrare och saknar personliga
    erfarenheter som nyanserar bilden. Det gör att sambandet troligen inte är direkt kausalt –
    det är snarare föreställningar och upplevd konkurrens om jobb och välfärd som driver stödet,
    inte andelen utrikes födda i sig.`;
  } else if (partyKey === "S") {
    partyContext = `Socialdemokraterna har historiskt haft stöd i invandrartäta förorter och
    industriorter. Ett positivt samband med andel utrikes födda kan delvis förklaras av att
    nyanlända och utrikes födda i högre utsträckning röstar på S, men också av att dessa kommuner
    ofta har lägre medelinkomst och högre andel arbetare – faktorer som traditionellt gynnar S.
    Sambandet är alltså troligen indirekt.`;
  } else if (partyKey === "M") {
    partyContext = `Moderaterna profilerar sig som ett parti för integration och arbete. I kommuner
    med hög andel utrikes födda kan stödet för M variera beroende på hur integrationen fungerat.
    Sambandet med andel utrikes födda är troligen indirekt och påverkas mer av socioekonomiska
    faktorer som inkomst och utbildning än av andelen utrikes födda i sig.`;
  } else if (partyKey === "MP") {
    partyContext = `Miljöpartiet har en generellt positiv inställning till invandring och har
    profilerat sig på flyktingfrågor. Ett positivt samband kan delvis förklaras av att MP
    attraherar väljare i storstäder och universitetsorter, som också tenderar att ha högre
    andel utrikes födda. Sambandet är alltså troligen indirekt – det är urbaniseringsgraden
    och utbildningsnivån som driver stödet snarare än andelen utrikes födda i sig.`;
  } else {
    partyContext = `Det är troligt att sambandet med andel utrikes födda för ${partyLabel}
    delvis speglar andra bakomliggande faktorer som utbildningsnivå, inkomst eller
    urbaniseringsgrad, snarare än andelen utrikes födda i sig.`;
  }

  return `Korrelationen är ${direction} (r = ${r.toFixed(2)}), men ett statistiskt samband
  innebär inte automatiskt att andelen utrikes födda <em>orsakar</em> röstningsmönstret.
  Andelen utrikes födda samvarierar med flera andra faktorer som kan ha en mer direkt
  påverkan på hur folk röstar:

  <ul>
    <li><strong>Socioekonomisk status</strong> – kommuner med hög andel utrikes födda har
    ofta lägre medianinkomst och högre arbetslöshet, vilket i sig påverkar partisympatierna.</li>
    <li><strong>Urbaniseringsgrad</strong> – storstäder har både hög andel utrikes födda och
    specifika röstmönster som skiljer sig från landsbygden.</li>
    <li><strong>Utbildningsnivå</strong> – kommuner med hög andel högutbildade har ofta
    andra politiska preferenser och kan också ha en viss andel utrikes födda.</li>
    <li><strong>Politisk mobilisering</strong> – invandringstäta kommuner kan ha olika
    nivåer av politiskt deltagande bland utrikes födda, vilket påverkar valresultaten.</li>
  </ul>

  ${partyContext}

  Slutsatsen är att andelen utrikes födda snarare är en <strong>indikatorvariabel</strong>
  som speglar ett komplex av socioekonomiska och geografiska förhållanden, än en direkt
  orsak till röstningsmönstret. För att säkerställa kausalitet skulle man behöva kontrollera
  för dessa mellanliggande variabler – något som kräver mer avancerad statistisk analys
  än vad som görs här.`;
}

function partyBadge(partyKey, partyName) {
  return `
    <div style="display:flex; align-items:center; gap:12px; margin:12px 0 8px 0;">
      <div style="
        width:44px; height:44px; border-radius:50%;
        background:${partyColors[partyKey]};
        display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:15px; color:#fff; flex-shrink:0;">
        ${partyKey}
      </div>
      <span style="font-size:16px; font-weight:500; color:#222;">${partyName}</span>
    </div>
  `;
}

function statCards(cards) {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">
      ${cards.map(card => `
        <div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h3 style="margin:0 0 10px 0; font-size:19px;">${card.title}</h3>
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
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0;">
      <h3 style="margin:0 0 8px 0;">Laddar analysen...</h3>
      <p style="margin:0;">Hämtar kommundata, invandringssiffror och valresultat från 2018 och 2022.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

addMdToPage(`
# Invandring och röstning

Här undersöker vi om andelen utrikes födda i en kommun hänger ihop med hur människor röstade i riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Finns det ett samband mellan andel utrikes födda och partiers röstandel?**

**2. Är vissa partier starkare i kommuner med högre eller lägre andel utrikes födda?**

**3. Har sambandet mellan invandring och röstning förändrats mellan 2018 och 2022?**

**Enheter:**
- Andel utrikes födda anges i **procent (%)** – hur stor andel av kommunens befolkning som är född utomlands.
- Röstandel anges i **procent (%)** – hur stor andel av de räknade partiernas röster som gick till det valda partiet.
- Förändring mellan år anges i **procentenheter (pe)** – skillnaden mellan två procenttal, t.ex. från 20 % till 23 % = +3 pe.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att andelen utrikes födda kan ha samband med röstningsmönster. Kommuner med högre andel utrikes födda kan ha andra politiska preferenser än kommuner med lägre andel. Vi förväntar oss t.ex. att partier med en restriktiv syn på invandring kan vara starkare i kommuner med lägre andel utrikes födda, medan partier med en mer positiv syn kan vara starkare där andelen är högre. Vi undersöker om dessa mönster syns i data och om de förändrades mellan 2018 och 2022."
));

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {
  dbQuery.use("counties-sqlite");

  const electionData = await dbQuery(`
    SELECT *
    FROM valdata_kommun
  `);

  const immigrationData = await dbQuery(`
    SELECT *
    FROM utrikes_fodda
  `);

  removeLoadingBox();

  const chosenParty = addDropdown("Välj parti:", partyKeys, "S");
  const chosenPartyName = parties[chosenParty].label;

  // Koppla ihop valdata med invandingsdata per kommun.
  // Andel utrikes födda räknas ut som antal utrikes födda / kommunens befolkning * 100.
  const mergedData = electionData.map(row => {
    const immigrationRow = immigrationData.find(
      x => x.kommun === row.Kommunnamn
    );
    if (!immigrationRow) return null;

    const foreign2018 =
      (toNumber(immigrationRow.antal_utrikes_2018) /
        toNumber(row.Befolkning_2018)) * 100;

    const foreign2022 =
      (toNumber(immigrationRow.antal_utrikes_2022) /
        toNumber(row.Befolkning_2022)) * 100;

    return {
      kommun: row.Kommunnamn,
      foreign2018,
      foreign2022,
      support2018: partyShare(row, chosenParty, "2018"),
      support2022: partyShare(row, chosenParty, "2022")
    };
  }).filter(row =>
    row !== null &&
    row.foreign2018 > 0 &&
    row.foreign2022 > 0 &&
    row.support2018 >= 0 &&
    row.support2022 >= 0
  );

  const foreignValues2018 = mergedData.map(x => x.foreign2018);
  const foreignValues2022 = mergedData.map(x => x.foreign2022);
  const supportValues2018 = mergedData.map(x => x.support2018);
  const supportValues2022 = mergedData.map(x => x.support2022);

  const corr2018 = correlation(foreignValues2018, supportValues2018);
  const corr2022 = correlation(foreignValues2022, supportValues2022);

  // Beräkna trendlinjer med linjär regression (minsta kvadratmetoden)
  const reg2018 = linearRegression(foreignValues2018, supportValues2018);
  const reg2022 = linearRegression(foreignValues2022, supportValues2022);

  const maxForeign2018 = Math.max(...foreignValues2018);
  const maxForeign2022 = Math.max(...foreignValues2022);

  const trendStart2018 = reg2018.m;
  const trendEnd2018 = reg2018.k * maxForeign2018 + reg2018.m;
  const trendStart2022 = reg2022.m;
  const trendEnd2022 = reg2022.k * maxForeign2022 + reg2022.m;

  // Dela in kommuner i tre grupper baserat på percentiler (33:e och 66:e).
  // Speglar den faktiska fördelningen av andel utrikes födda – inte bara kommunernas listplats.
  const sortedForeign = [...mergedData]
    .map(r => r.foreign2022)
    .sort((a, b) => a - b);

  const p33 = sortedForeign[Math.floor(sortedForeign.length * 0.33)];
  const p66 = sortedForeign[Math.floor(sortedForeign.length * 0.66)];

  const lowGroup = mergedData.filter(r => r.foreign2022 <= p33);
  const middleGroup = mergedData.filter(r => r.foreign2022 > p33 && r.foreign2022 <= p66);
  const highGroup = mergedData.filter(r => r.foreign2022 > p66);

  const low2018 = average(lowGroup.map(x => x.support2018));
  const low2022 = average(lowGroup.map(x => x.support2022));
  const middle2018 = average(middleGroup.map(x => x.support2018));
  const middle2022 = average(middleGroup.map(x => x.support2022));
  const high2018 = average(highGroup.map(x => x.support2018));
  const high2022 = average(highGroup.map(x => x.support2022));

  const mostForeign = [...mergedData].sort((a, b) => b.foreign2022 - a.foreign2022)[0];
  const leastForeign = [...mergedData].sort((a, b) => a.foreign2022 - b.foreign2022)[0];

  addMdToPage(`
## Sammanfattning av urvalet
`);

  addToPage(statCards([
    {
      title: "Antal kommuner",
      value: mergedData.length
    },
    {
      title: "Valt parti",
      value: chosenParty,
      note: chosenPartyName
    },
    {
      title: "Korrelation 2018",
      value: corr2018.toFixed(2),
      note: "utrikes födda ↔ röstandel"
    },
    {
      title: "Korrelation 2022",
      value: corr2022.toFixed(2),
      note: "utrikes födda ↔ röstandel"
    }
  ]));

  addMdToPage(`
## Samband mellan andel utrikes födda och röstandel

Diagrammet visar andel utrikes födda på x-axeln (%) och röstandel för **${chosenPartyName}** på y-axeln (%). Varje punkt motsvarar en kommun.

En punkt **högt upp till höger** = hög andel utrikes födda och högt partistöd. En punkt **nere till vänster** = låg andel utrikes födda och lågt stöd.

**Trendlinjen** (röd linje) är beräknad med linjär regression – minsta kvadratmetoden. En stigande trendlinje innebär ett positivt samband, en sjunkande ett negativt samband. Ju brantare lutning, desto starkare är sambandet.
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      [
        { label: "Andel utrikes födda (%)", type: "number" },
        { label: "Röstandel (%)", type: "number" },
        { label: "Trendlinje", type: "number" }
      ],
      ...mergedData.map(row => [row.foreign2018, row.support2018, null]),
      [0, null, trendStart2018],
      [maxForeign2018, null, trendEnd2018]
    ],
    options: {
      title: `Andel utrikes födda och stöd för ${chosenPartyName} (${chosenParty}) – 2018`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: { title: "Andel utrikes födda (%)" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      series: {
        0: { color: partyColors[chosenParty], pointSize: 5 },
        1: { color: "#e53935", lineWidth: 2, pointSize: 0 }
      },
      legend: { position: "bottom" }
    }
  });

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      [
        { label: "Andel utrikes födda (%)", type: "number" },
        { label: "Röstandel (%)", type: "number" },
        { label: "Trendlinje", type: "number" }
      ],
      ...mergedData.map(row => [row.foreign2022, row.support2022, null]),
      [0, null, trendStart2022],
      [maxForeign2022, null, trendEnd2022]
    ],
    options: {
      title: `Andel utrikes födda och stöd för ${chosenPartyName} (${chosenParty}) – 2022`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: { title: "Andel utrikes födda (%)" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      series: {
        0: { color: partyColors[chosenParty], pointSize: 5 },
        1: { color: "#e53935", lineWidth: 2, pointSize: 0 }
      },
      legend: { position: "bottom" }
    }
  });

  addMdToPage(`
## Kommungrupper efter andel utrikes födda

Kommunerna delas in i tre grupper baserat på andel utrikes föddas 33:e och 66:e percentil år 2022:
- **Låg andel** – ${lowGroup.length} kommuner under 33:e percentilen (andel ≤ ${formatPercent(p33)})
- **Medel andel** – ${middleGroup.length} kommuner mellan 33:e och 66:e percentilen
- **Hög andel** – ${highGroup.length} kommuner över 66:e percentilen (andel > ${formatPercent(p66)})

Diagrammet visar genomsnittlig röstandel (%) per grupp. **Mörkröd stapel = 2018, ljusröd stapel = 2022.** Förändringen anges i procentenheter (pe).
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Grupp", "2018 (%)", "2022 (%)"],
      ["Låg andel utrikes födda", low2018, low2022],
      ["Medel andel utrikes födda", middle2018, middle2022],
      ["Hög andel utrikes födda", high2018, high2022]
    ],
    options: {
      title: `Genomsnittligt stöd för ${chosenPartyName} (${chosenParty}) per grupp (%)`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      hAxis: { title: "Kommungrupp" },
      colors: [BAR_COLOR_2018, BAR_COLOR_2022]
    }
  });

  addMdToPage(`
## Tabell: kommungrupper

Tabellen visar genomsnittlig röstandel per grupp för båda valen. Förändringen anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018. Ett positivt värde betyder att partiet ökade sitt stöd, ett negativt att det minskade.
`);

  tableFromData({
    data: [
      {
        Grupp: "Låg andel utrikes födda",
        "Antal kommuner": lowGroup.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(low2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(low2022),
        "Förändring (pe)": formatPE(low2022 - low2018)
      },
      {
        Grupp: "Medel andel utrikes födda",
        "Antal kommuner": middleGroup.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(middle2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(middle2022),
        "Förändring (pe)": formatPE(middle2022 - middle2018)
      },
      {
        Grupp: "Hög andel utrikes födda",
        "Antal kommuner": highGroup.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(high2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(high2022),
        "Förändring (pe)": formatPE(high2022 - high2018)
      }
    ]
  });

  addMdToPage(`
## Extremkommuner – högst och lägst andel utrikes födda

Tabellen visar kommunen med högst respektive lägst andel utrikes födda 2022, samt hur det valda partiet presterade i båda valen. Dessa extremkommuner kan påverka korrelationsberäkningen oproportionerligt mycket och är därför viktiga att granska separat.
`);

  tableFromData({
    data: [
      {
        Kommun: mostForeign.kommun,
        Typ: "Högst andel utrikes födda",
        "Andel utrikes födda 2022": formatPercent(mostForeign.foreign2022),
        [`Stöd ${chosenParty} 2018 (%)`]: formatPercent(mostForeign.support2018),
        [`Stöd ${chosenParty} 2022 (%)`]: formatPercent(mostForeign.support2022),
        "Förändring (pe)": formatPE(mostForeign.support2022 - mostForeign.support2018)
      },
      {
        Kommun: leastForeign.kommun,
        Typ: "Lägst andel utrikes födda",
        "Andel utrikes födda 2022": formatPercent(leastForeign.foreign2022),
        [`Stöd ${chosenParty} 2018 (%)`]: formatPercent(leastForeign.support2018),
        [`Stöd ${chosenParty} 2022 (%)`]: formatPercent(leastForeign.support2022),
        "Förändring (pe)": formatPE(leastForeign.support2022 - leastForeign.support2018)
      }
    ]
  });

  addMdToPage(`
## Analys

För **${chosenPartyName}** är korrelationen mellan andel utrikes födda och röstandel **${corr2018.toFixed(2)}** år 2018 och **${corr2022.toFixed(2)}** år 2022.

Korrelationen 2018 innebär ett **${corrStrength(corr2018)}**. ${corrExplain(corr2018, chosenPartyName)}

Korrelationen 2022 innebär ett **${corrStrength(corr2022)}**. ${corrExplain(corr2022, chosenPartyName)}

Trendlinjens lutning 2018 är **${reg2018.k.toFixed(4)} procentenheter per procentenhet utrikes födda**, och 2022 är den **${reg2022.k.toFixed(4)} procentenheter**. ${Math.abs(reg2022.k) > Math.abs(reg2018.k)
      ? "Lutningen har blivit brantare mellan valen, vilket tyder på att sambandet stärkts."
      : Math.abs(reg2022.k) < Math.abs(reg2018.k)
        ? "Lutningen har blivit flackare mellan valen, vilket tyder på att sambandet försvagats."
        : "Lutningen är i stort sett oförändrad mellan valen."}

I kommuner med **låg andel utrikes födda** förändrades stödet med **${formatPE(low2022 - low2018)}** mellan valen. I kommuner med **hög andel utrikes födda** förändrades stödet med **${formatPE(high2022 - high2018)}**.
`);

  addToPage(infoBox(
    "Kausalitet – orsakar andel utrikes födda röstningsmönstret?",
    causalityDiscussion(corr2022, chosenPartyName, chosenParty)
  ));

  addMdToPage(`
## Metod och begränsningar

Analysen använder tabellerna **valdata_kommun** och **utrikes_fodda** från databasen **counties-sqlite**.

**Hur andel utrikes födda räknas ut:** Antal utrikes födda i kommunen divideras med kommunens totala befolkning och multipliceras med 100 för att ge en procentsats.

**Hur röstandel räknas ut:** Partiets röster divideras med summan av röster för S, M, SD, V, C, KD, L och MP i kommunen. Övriga partier ingår inte i nämnaren.

**Hur korrelation räknas ut:** Pearsons korrelationskoefficient beräknas mellan andel utrikes födda och röstandel för samtliga kommuner. Värdet ligger alltid mellan -1 och +1:
- Nära **+1** = starkt positivt samband (hög andel utrikes födda → högt stöd)
- Nära **-1** = starkt negativt samband (hög andel utrikes födda → lågt stöd)
- Nära **0** = inget linjärt samband

**Hur trendlinjen räknas ut:** Linjär regression med minsta kvadratmetoden beräknar den räta linje som minimerar summan av kvadrerade avstånd från alla datapunkter. Lutningen (k) anger hur många procentenheter röstandelen förändras per procentenhet ökning av andel utrikes födda.

**Hur grupperna räknas ut:** Kommunerna delas in baserat på andel utrikes föddas 33:e och 66:e percentil. Grupperna kan vara olika stora eftersom fördelningen av andel utrikes födda inte är jämnt fördelad i verkligheten.

**Begränsningar:** Analysen sker på kommunnivå vilket döljer variation inom kommuner. Kommuner med extremt hög andel utrikes födda kan påverka korrelationen oproportionerligt. Dessutom röstar inte alla utrikes födda – svenska medborgare med utländsk bakgrund är de som faktiskt kan rösta i riksdagsvalet.
`);
}