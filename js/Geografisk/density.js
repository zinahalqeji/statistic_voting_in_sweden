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

// Stapeldiagrammets färger är alltid mörkröd (2018) och ljusröd (2022)
// oavsett valt parti – färgen visar vilket år stapeln tillhör.
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

function formatDensity(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })} invånare/km²`;
}

function average(values) {
  const nums = values.filter(v => Number.isFinite(v));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function correlation(xValues, yValues) {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 2) return 0;
  const x = xValues.slice(0, n);
  const y = yValues.slice(0, n);
  const avgX = average(x);
  const avgY = average(y);
  let numerator = 0, denominatorX = 0, denominatorY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - avgX;
    const dy = y[i] - avgY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator === 0 ? 0 : numerator / denominator;
}

// Beräknar linjär regression (minsta kvadratmetoden) och returnerar k (lutning) och m (skärning)
// Används för att rita trendlinjen i scatterdiagrammet.
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
  if (r > 0.1) return `${partyLabel} tenderar att få <strong>högre</strong> röstandel i tätbefolkade kommuner.`;
  if (r < -0.1) return `${partyLabel} tenderar att få <strong>lägre</strong> röstandel i tätbefolkade kommuner, dvs. starkare stöd på landsbygden.`;
  return `Det finns inget tydligt samband mellan befolkningstäthet och stöd för ${partyLabel}.`;
}

// Genererar kausalitetsdiskussion baserat på korrelationsvärde och valt parti.
// Diskuterar mellanliggande variabler och hur troligt det är att sambandet är kausalt.
function causalityDiscussion(r, partyLabel, partyKey) {
  const abs = Math.abs(r);
  const direction = r > 0 ? "positivt" : "negativt";

  if (abs < 0.1) {
    return `Eftersom korrelationen för ${partyLabel} är nära noll är det osannolikt att befolkningstäthet
    har ett direkt samband med partiets stöd. Det innebär att kausalitet – att tätheten i sig skulle
    <em>orsaka</em> ett visst röstbeteende – är ännu mer osannolik. Andra faktorer som åldersstruktur,
    inkomst eller regionala traditioner kan spela en större roll.`;
  }

  let partyContext = "";
  if (partyKey === "S") {
    partyContext = `Socialdemokraterna har historiskt haft starkt stöd i industriorter och norrländska kommuner,
    som inte alltid är de tätast befolkade. Det kan förklara varför sambandet med täthet inte är entydigt –
    partiet har stöd både i vissa storstadsdelar och på landsbygden, men av olika anledningar.`;
  } else if (partyKey === "SD") {
    partyContext = `Sverigedemokraterna har visat sig vara starka i mindre tätbefolkade kommuner med hög
    arbetslöshet och låg inkomst. Det innebär att ett negativt samband med täthet sannolikt inte beror på
    tätheten i sig, utan på de socioekonomiska förhållanden som ofta samvarierar med glesbefolkade områden.`;
  } else if (partyKey === "M") {
    partyContext = `Moderaterna har traditionellt starkt stöd i välbärgade förorter och storstadsregioner.
    Ett positivt samband med täthet kan alltså delvis förklaras av att tätbefolkade kommuner ofta har
    högre inkomster och högre andel tjänstemän – faktorer som kan påverka röstningen mer direkt än tätheten i sig.`;
  } else if (partyKey === "C") {
    partyContext = `Centerpartiet har historiskt haft sitt stärkaste stöd på landsbygden. Ett negativt
    samband med befolkningstäthet är därför förväntat, men kausaliteten är troligen indirekt – det är
    snarare frågor om landsbygdspolitik, jordbruk och glesbygdsservice som driver stödet, inte tätheten i sig.`;
  } else {
    partyContext = `Det är troligt att sambandet med befolkningstäthet för ${partyLabel} delvis speglar
    andra bakomliggande faktorer som utbildningsnivå, inkomst eller åldersstruktur, snarare än tätheten i sig.`;
  }

  return `Korrelationen är ${direction} (r = ${r.toFixed(2)}), men ett statistiskt samband innebär inte
  automatiskt att befolkningstäthet <em>orsakar</em> röstningsmönstret. Tätheten samvarierar med
  flera andra faktorer som kan ha en mer direkt påverkan på hur folk röstar:

  <ul>
    <li><strong>Inkomstnivå</strong> – tätbefolkade kommuner tenderar att ha högre medianinkomster,
    vilket i sig påverkar partisympatierna.</li>
    <li><strong>Utbildningsnivå</strong> – städer har generellt högre andel med universitetsutbildning,
    vilket korrelerar med specifika röstmönster.</li>
    <li><strong>Åldersstruktur</strong> – yngre befolkning samlas oftare i städer och röstar annorlunda
    än äldre på landsbygden.</li>
    <li><strong>Arbetsmarknad</strong> – tillgång till jobb och typ av arbete skiljer sig mellan stad
    och landsbygd och kan påverka vilka politiska frågor som väger tyngst.</li>
  </ul>

  ${partyContext}

  Slutsatsen är att befolkningstäthet snarare är en <strong>indikatorvariabel</strong> som speglar ett
  helt komplex av socioekonomiska förhållanden, än en direkt orsak till röstningsmönstret. För att
  säkerställa kausalitet skulle man behöva kontrollera för dessa mellanliggande variabler – något som
  kräver mer avancerad statistisk analys än vad som görs här.`;
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
      <p style="margin:0;">Hämtar kommundata, befolkningstäthet och valresultat från 2018 och 2022.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

addMdToPage(`
# Befolkningstäthet och röstning

Här undersöker vi om kommuners befolkningstäthet hänger ihop med hur människor röstade i riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Finns det ett samband mellan befolkningstäthet och partiers röstandel?**

**2. Är vissa partier starkare i tätbefolkade kommuner medan andra är starkare i glesbefolkade kommuner?**

**3. Har sambandet mellan befolkningstäthet och röstning förändrats mellan 2018 och 2022?**

**Enheter:**
- Befolkningstäthet anges i **invånare per km²** – ett mått på hur många människor som bor per kvadratkilometer i kommunen.
- Röstandel anges i **procent (%)** – hur stor andel av de räknade partiernas röster som gick till det valda partiet.
- Förändring mellan år anges i **procentenheter (pe)** – skillnaden mellan två procenttal, t.ex. från 30 % till 33 % = +3 pe.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att befolkningstäthet har samband med röstningsmönster. Vi förväntar oss att vissa partier har starkare stöd i tätbefolkade kommuner, där fler människor bor nära större arbetsmarknader, högre utbildningsnivåer och urbana miljöer. Samtidigt kan andra partier vara starkare i glesbefolkade kommuner, där frågor om landsbygd, service, avstånd och lokal ekonomi kan väga tyngre. Vi undersöker därför om sambandet syns i data och om det förändrades mellan 2018 och 2022."
));

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {
  dbQuery.use("counties-sqlite");

  const rawData = await dbQuery(`
    SELECT *
    FROM valdata_kommun
  `);

  removeLoadingBox();

  const chosenParty = addDropdown("Välj parti:", partyKeys, "S");
  const chosenPartyName = parties[chosenParty].label;

  const cleanedData = rawData
    .map(row => ({
      kommun: row.Kommunnamn,
      valkrets: row.Riksdagsvalkrets,
      density2018: toNumber(row["Befolkningstäthet_2018"]),
      density2022: toNumber(row["Befolkningstäthet_2022"]),
      support2018: partyShare(row, chosenParty, "2018"),
      support2022: partyShare(row, chosenParty, "2022")
    }))
    .filter(row =>
      row.kommun &&
      row.density2018 > 0 &&
      row.density2022 > 0 &&
      row.support2018 >= 0 &&
      row.support2022 >= 0
    );

  const densityValues2018 = cleanedData.map(row => row.density2018);
  const densityValues2022 = cleanedData.map(row => row.density2022);
  const supportValues2018 = cleanedData.map(row => row.support2018);
  const supportValues2022 = cleanedData.map(row => row.support2022);

  const corr2018 = correlation(densityValues2018, supportValues2018);
  const corr2022 = correlation(densityValues2022, supportValues2022);

  // Beräkna trendlinjer med linjär regression (minsta kvadratmetoden)
  // Trendlinjen visar den bäst passande räta linjen genom alla datapunkter
  const reg2018 = linearRegression(densityValues2018, supportValues2018);
  const reg2022 = linearRegression(densityValues2022, supportValues2022);

  const maxDensity2018 = Math.max(...densityValues2018);
  const maxDensity2022 = Math.max(...densityValues2022);

  // Trendlinjens startpunkt (täthet = 0) och slutpunkt (max täthet i urvalet)
  const trendStart2018 = reg2018.m;
  const trendEnd2018 = reg2018.k * maxDensity2018 + reg2018.m;
  const trendStart2022 = reg2022.m;
  const trendEnd2022 = reg2022.k * maxDensity2022 + reg2022.m;

  // Dela in kommuner baserat på percentiler av befolkningstäthet (33:e och 66:e percentilen).
  // Detta speglar den faktiska fördelningen av täthet – inte bara kommunernas plats i en sorterad lista.
  // Grupperna kan vara olika stora eftersom täthetsvärdena är ojämnt fördelade i verkligheten.
  const sortedDensities = [...cleanedData]
    .map(r => r.density2022)
    .sort((a, b) => a - b);

  const p33 = sortedDensities[Math.floor(sortedDensities.length * 0.33)];
  const p66 = sortedDensities[Math.floor(sortedDensities.length * 0.66)];

  const lowDensity = cleanedData.filter(r => r.density2022 <= p33);
  const middleDensity = cleanedData.filter(r => r.density2022 > p33 && r.density2022 <= p66);
  const highDensity = cleanedData.filter(r => r.density2022 > p66);

  const lowAvg2018 = average(lowDensity.map(row => row.support2018));
  const lowAvg2022 = average(lowDensity.map(row => row.support2022));
  const middleAvg2018 = average(middleDensity.map(row => row.support2018));
  const middleAvg2022 = average(middleDensity.map(row => row.support2022));
  const highAvg2018 = average(highDensity.map(row => row.support2018));
  const highAvg2022 = average(highDensity.map(row => row.support2022));

  const mostDense = [...cleanedData].sort((a, b) => b.density2022 - a.density2022)[0];
  const leastDense = [...cleanedData].sort((a, b) => a.density2022 - b.density2022)[0];

  addMdToPage(`
## Sammanfattning av urvalet
`);

  addToPage(statCards([
    {
      title: "Antal kommuner",
      value: cleanedData.length
    },
    {
      title: "Valt parti",
      value: chosenParty,
      note: chosenPartyName
    },
    {
      title: "Korrelation 2018",
      value: corr2018.toFixed(2),
      note: "täthet ↔ röstandel"
    },
    {
      title: "Korrelation 2022",
      value: corr2022.toFixed(2),
      note: "täthet ↔ röstandel"
    }
  ]));

  addMdToPage(`
## Samband mellan befolkningstäthet och röstandel

Diagrammet visar kommunernas befolkningstäthet på x-axeln (invånare/km²) och röstandel för **${chosenPartyName}** på y-axeln (%). Varje punkt motsvarar en kommun.

En punkt **högt upp till höger** = tätbefolkad kommun med högt partistöd. En punkt **nere till vänster** = glesbefolkad kommun med lågt stöd.

**Trendlinjen** (röd linje) är beräknad med linjär regression – minsta kvadratmetoden. Den visar den bäst passande räta linjen genom alla kommuners datapunkter. En stigande trendlinje innebär ett positivt samband, en sjunkande innebär ett negativt samband. Ju brantare lutning, desto starkare är sambandet.
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      [
        { label: "Befolkningstäthet (invånare/km²)", type: "number" },
        { label: "Röstandel (%)", type: "number" },
        { label: "Trendlinje", type: "number" }
      ],
      ...cleanedData.map(row => [row.density2018, row.support2018, null]),
      [0, null, trendStart2018],
      [maxDensity2018, null, trendEnd2018]
    ],
    options: {
      title: `Befolkningstäthet och stöd för ${chosenPartyName} (${chosenParty}) – 2018`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: { title: "Befolkningstäthet (invånare/km²)" },
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
        { label: "Befolkningstäthet (invånare/km²)", type: "number" },
        { label: "Röstandel (%)", type: "number" },
        { label: "Trendlinje", type: "number" }
      ],
      ...cleanedData.map(row => [row.density2022, row.support2022, null]),
      [0, null, trendStart2022],
      [maxDensity2022, null, trendEnd2022]
    ],
    options: {
      title: `Befolkningstäthet och stöd för ${chosenPartyName} (${chosenParty}) – 2022`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: { title: "Befolkningstäthet (invånare/km²)" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      series: {
        0: { color: partyColors[chosenParty], pointSize: 5 },
        1: { color: "#e53935", lineWidth: 2, pointSize: 0 }
      },
      legend: { position: "bottom" }
    }
  });

  addMdToPage(`
## Tätbefolkade och glesbefolkade kommuner

Kommunerna delas in i tre ungefär lika stora grupper baserat på befolkningstäthet år 2022:
- **Låg befolkningstäthet** – ${lowDensity.length} kommuner under 33:e percentilen (täthet ≤ ${formatDensity(p33)})
- **Medel befolkningstäthet** – ${middleDensity.length} kommuner mellan 33:e och 66:e percentilen
- **Hög befolkningstäthet** – ${highDensity.length} kommuner över 66:e percentilen (täthet > ${formatDensity(p66)})

Diagrammet visar genomsnittlig röstandel (%) för respektive grupp. **Mörkröd stapel = 2018, ljusröd stapel = 2022.** Förändringen anges i procentenheter (pe).
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Täthetsgrupp", "2018 (%)", "2022 (%)"],
      ["Låg befolkningstäthet", lowAvg2018, lowAvg2022],
      ["Medel befolkningstäthet", middleAvg2018, middleAvg2022],
      ["Hög befolkningstäthet", highAvg2018, highAvg2022]
    ],
    options: {
      title: `Genomsnittligt stöd för ${chosenPartyName} (${chosenParty}) per täthetsgrupp (%)`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      hAxis: { title: "Täthetsgrupp" },
      colors: [BAR_COLOR_2018, BAR_COLOR_2022]
    }
  });

  addMdToPage(`
## Tabell: täthetsgrupper

Tabellen visar genomsnittlig röstandel per grupp för båda valen. Förändringen anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018. Ett positivt värde betyder att partiet ökade sitt stöd, ett negativt att det minskade.
`);

  tableFromData({
    data: [
      {
        Grupp: "Låg befolkningstäthet",
        "Antal kommuner": lowDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(lowAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(lowAvg2022),
        "Förändring (pe)": formatPE(lowAvg2022 - lowAvg2018)
      },
      {
        Grupp: "Medel befolkningstäthet",
        "Antal kommuner": middleDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(middleAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(middleAvg2022),
        "Förändring (pe)": formatPE(middleAvg2022 - middleAvg2018)
      },
      {
        Grupp: "Hög befolkningstäthet",
        "Antal kommuner": highDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(highAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(highAvg2022),
        "Förändring (pe)": formatPE(highAvg2022 - highAvg2018)
      }
    ]
  });

  addMdToPage(`
## Extremkommuner – högst och lägst befolkningstäthet

Tabellen visar kommunen med högst respektive lägst befolkningstäthet 2022, samt hur det valda partiet presterade i båda valen. Dessa extremkommuner kan ha stor påverkan på korrelationsberäkningen – därför är det viktigt att granska dem separat. Om stödet förändrades kraftigt i dessa kommuner kan det förklara varför korrelationen skiljer sig mellan 2018 och 2022.
`);

  tableFromData({
    data: [
      {
        Kommun: mostDense.kommun,
        Typ: "Högst befolkningstäthet",
        "Befolkningstäthet 2022": formatDensity(mostDense.density2022),
        [`Stöd ${chosenParty} 2018 (%)`]: formatPercent(mostDense.support2018),
        [`Stöd ${chosenParty} 2022 (%)`]: formatPercent(mostDense.support2022),
        "Förändring (pe)": formatPE(mostDense.support2022 - mostDense.support2018)
      },
      {
        Kommun: leastDense.kommun,
        Typ: "Lägst befolkningstäthet",
        "Befolkningstäthet 2022": formatDensity(leastDense.density2022),
        [`Stöd ${chosenParty} 2018 (%)`]: formatPercent(leastDense.support2018),
        [`Stöd ${chosenParty} 2022 (%)`]: formatPercent(leastDense.support2022),
        "Förändring (pe)": formatPE(leastDense.support2022 - leastDense.support2018)
      }
    ]
  });

  addMdToPage(`
## Analys

För **${chosenPartyName}** är korrelationen mellan befolkningstäthet och röstandel **${corr2018.toFixed(2)}** år 2018 och **${corr2022.toFixed(2)}** år 2022.

Korrelationen 2018 innebär ett **${corrStrength(corr2018)}**. ${corrExplain(corr2018, chosenPartyName)}

Korrelationen 2022 innebär ett **${corrStrength(corr2022)}**. ${corrExplain(corr2022, chosenPartyName)}

Trendlinjens lutning 2018 är **${reg2018.k.toFixed(4)} procentenheter per invånare/km²**, och 2022 är den **${reg2022.k.toFixed(4)} procentenheter per invånare/km²**. ${Math.abs(reg2022.k) > Math.abs(reg2018.k)
      ? "Lutningen har blivit brantare mellan valen, vilket tyder på att sambandet stärkts."
      : Math.abs(reg2022.k) < Math.abs(reg2018.k)
        ? "Lutningen har blivit flackare mellan valen, vilket tyder på att sambandet försvagats."
        : "Lutningen är i stort sett oförändrad mellan valen."}

I kommuner med **låg befolkningstäthet** förändrades stödet med **${formatPE(lowAvg2022 - lowAvg2018)}** mellan valen. I kommuner med **hög befolkningstäthet** förändrades stödet med **${formatPE(highAvg2022 - highAvg2018)}**.
`);

  addToPage(infoBox(
    "Kausalitet – orsakar befolkningstäthet röstningsmönstret?",
    causalityDiscussion(corr2022, chosenPartyName, chosenParty)
  ));

  addMdToPage(`
## Metod och begränsningar

Analysen använder tabellen **valdata_kommun** från databasen **counties-sqlite**.

**Hur röstandel räknas ut:** Partiets röster divideras med summan av röster för S, M, SD, V, C, KD, L och MP i kommunen. Övriga partier ingår inte i nämnaren.

**Hur korrelation räknas ut:** Pearsons korrelationskoefficient beräknas mellan befolkningstäthet och röstandel för samtliga kommuner. Värdet ligger alltid mellan -1 och +1:
- Nära **+1** = starkt positivt samband (hög täthet → högt stöd)
- Nära **-1** = starkt negativt samband (hög täthet → lågt stöd)
- Nära **0** = inget linjärt samband

**Hur trendlinjen räknas ut:** Linjär regression med minsta kvadratmetoden beräknar den räta linje som minimerar summan av kvadrerade avstånd från alla datapunkter. Lutningen (k) anger hur många procentenheter röstandelen förändras per extra invånare/km², och skärningspunkten (m) anger förväntat stöd vid täthet = 0.

**Hur täthetsgrupperna räknas ut:** Kommunerna delas in i tre grupper baserat på befolkningstäthetens 33:e och 66:e percentil. Gränsen för låg-gruppen sätts vid det täthetsvärde som 33 % av kommunerna ligger under, och gränsen för hög-gruppen vid det värde som 66 % av kommunerna ligger under. Grupperna kan vara olika stora eftersom täthetsvärdena inte är jämnt fördelade i verkligheten – de flesta svenska kommuner är glesbefolkade medan ett fåtal storstadskommuner har extremt hög täthet.

**Begränsningar:** Analysen sker på kommunnivå. Inom en kommun kan det finnas både tätorter och landsbygd, vilket gör att befolkningstätheten kan förenkla verkligheten. Kommuner med extremt hög täthet (storstäder) kan påverka korrelationen oproportionerligt mycket.

**Datakvalitet – befolkningstäthet:** Befolkningstäthetsdata är hämtad från SCB (Statistiska centralbyrån) och anger invånare per km² landareal per kommun för åren 2018 och 2022. Källa: SCB Statistikdatabasen – Befolkningstäthet per kommun. [statistikdatabasen.scb.se](https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BE__BE0101__BE0101C/BefArealTathetKon/)
`);
}