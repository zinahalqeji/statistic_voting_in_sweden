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

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

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
- Befolkningstäthet anges i **invånare per km²**
- Röstandel anges i **procent (%)**
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

  const sortedByDensity = [...cleanedData].sort((a, b) => a.density2022 - b.density2022);
  const groupSize = Math.ceil(sortedByDensity.length / 3);

  const lowDensity = sortedByDensity.slice(0, groupSize);
  const middleDensity = sortedByDensity.slice(groupSize, groupSize * 2);
  const highDensity = sortedByDensity.slice(groupSize * 2);

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

Diagrammet visar kommunernas befolkningstäthet på x-axeln och röstandel för **${chosenPartyName}** på y-axeln. Varje punkt motsvarar en kommun.
`);

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      ["Befolkningstäthet 2018", "Röstandel 2018 (%)"],
      ...cleanedData.map(row => [row.density2018, row.support2018])
    ],
    options: {
      title: `Befolkningstäthet och stöd för ${chosenPartyName} 2018`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Befolkningstäthet (invånare/km²)"
      },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      legend: "none"
    }
  });

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      ["Befolkningstäthet 2022", "Röstandel 2022 (%)"],
      ...cleanedData.map(row => [row.density2022, row.support2022])
    ],
    options: {
      title: `Befolkningstäthet och stöd för ${chosenPartyName} 2022`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Befolkningstäthet (invånare/km²)"
      },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      legend: "none"
    }
  });

  addMdToPage(`
## Tätbefolkade och glesbefolkade kommuner

Kommunerna delas in i tre ungefär lika stora grupper baserat på befolkningstäthet år 2022: låg, medel och hög befolkningstäthet.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Täthetsgrupp", "2018 (%)", "2022 (%)"],
      ["Låg befolkningstäthet", lowAvg2018, lowAvg2022],
      ["Medel befolkningstäthet", middleAvg2018, middleAvg2022],
      ["Hög befolkningstäthet", highAvg2018, highAvg2022]
    ],
    options: {
      title: `Genomsnittligt stöd för ${chosenPartyName} per täthetsgrupp`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      hAxis: {
        title: "Täthetsgrupp"
      }
    }
  });

  addMdToPage(`
## Tabell: täthetsgrupper
`);

  tableFromData({
    data: [
      {
        Grupp: "Låg befolkningstäthet",
        "Antal kommuner": lowDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(lowAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(lowAvg2022),
        "Förändring procentenheter": formatPercent(lowAvg2022 - lowAvg2018)
      },
      {
        Grupp: "Medel befolkningstäthet",
        "Antal kommuner": middleDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(middleAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(middleAvg2022),
        "Förändring procentenheter": formatPercent(middleAvg2022 - middleAvg2018)
      },
      {
        Grupp: "Hög befolkningstäthet",
        "Antal kommuner": highDensity.length,
        "Genomsnittligt stöd 2018 (%)": formatPercent(highAvg2018),
        "Genomsnittligt stöd 2022 (%)": formatPercent(highAvg2022),
        "Förändring procentenheter": formatPercent(highAvg2022 - highAvg2018)
      }
    ]
  });

  addMdToPage(`
## Exempel på extremkommuner
`);

  tableFromData({
    data: [
      {
        Kommun: mostDense.kommun,
        Typ: "Högst befolkningstäthet",
        "Befolkningstäthet 2022": formatDensity(mostDense.density2022),
        ["Stöd för " + chosenPartyName + " 2022"]: formatPercent(mostDense.support2022)
      },
      {
        Kommun: leastDense.kommun,
        Typ: "Lägst befolkningstäthet",
        "Befolkningstäthet 2022": formatDensity(leastDense.density2022),
        ["Stöd för " + chosenPartyName + " 2022"]: formatPercent(leastDense.support2022)
      }
    ]
  });

  const corrText2018 =
    corr2018 > 0.2 ? "positivt samband" :
      corr2018 < -0.2 ? "negativt samband" :
        "svagt eller inget tydligt samband";

  const corrText2022 =
    corr2022 > 0.2 ? "positivt samband" :
      corr2022 < -0.2 ? "negativt samband" :
        "svagt eller inget tydligt samband";

  addMdToPage(`
## Kort analys

För **${chosenPartyName}** är korrelationen mellan befolkningstäthet och röstandel **${corr2018.toFixed(2)}** år 2018 och **${corr2022.toFixed(2)}** år 2022.

Detta innebär att sambandet 2018 kan beskrivas som **${corrText2018}**, medan sambandet 2022 kan beskrivas som **${corrText2022}**.

I kommuner med **låg befolkningstäthet** förändrades stödet från **${formatPercent(lowAvg2018)}** till **${formatPercent(lowAvg2022)}**. I kommuner med **hög befolkningstäthet** förändrades stödet från **${formatPercent(highAvg2018)}** till **${formatPercent(highAvg2022)}**.

Resultatet visar om partiet tenderar att vara starkare i tätbefolkade eller glesbefolkade kommuner. Det är dock viktigt att sambandet inte automatiskt betyder att befolkningstäthet orsakar ett visst röstningsmönster.

## Metod och begränsning

Analysen använder tabellen **valdata_kommun** från databasen **counties-sqlite**. Befolkningstäthet anges i **invånare per km²** och röstandel anges i **procent (%)**.

Röstandel beräknas som partiets röster dividerat med summan av röster på partierna S, M, SD, V, C, KD, L och MP.

Korrelationen visar hur starkt sambandet är mellan befolkningstäthet och röstandel. Ett värde nära **1** betyder positivt samband, ett värde nära **-1** betyder negativt samband och ett värde nära **0** betyder svagt eller inget linjärt samband.

En begränsning är att analysen använder kommunnivå. Inom en kommun kan det finnas både tätorter och landsbygd, vilket gör att befolkningstätheten kan förenkla verkligheten.

## Extremvärden

Kommuner med mycket hög befolkningstäthet, exempelvis storstadskommuner, kan påverka korrelationen mycket. På samma sätt kan mycket glesbefolkade kommuner påverka analysen i andra riktningen.

Därför visar sidan både scatterplots, täthetsgrupper och exempel på extremkommuner. Detta gör det lättare att se om mönstret gäller brett eller om det påverkas av enstaka kommuner.
`);
}