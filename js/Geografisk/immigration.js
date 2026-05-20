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

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

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

function totalVotes(row, year) {
  return partyKeys.reduce((sum, partyKey) => {
    const col =
      year === "2018"
        ? parties[partyKey].col2018
        : parties[partyKey].col2022;

    return sum + toNumber(row[col]);
  }, 0);
}

function partyShare(row, partyKey, year) {
  const party = parties[partyKey];

  const col =
    year === "2018"
      ? party.col2018
      : party.col2022;

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

addMdToPage(`
# Invandring och röstning

Här undersöker vi om andelen utrikes födda i en kommun hänger ihop med hur människor röstade i riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Finns det ett samband mellan andel utrikes födda och partiers röstandel?**

**2. Är vissa partier starkare i kommuner med högre eller lägre andel utrikes födda?**

**3. Har sambandet mellan invandring och röstning förändrats mellan 2018 och 2022?**

**Enheter:**
- Andel utrikes födda anges i **procent (%)**
- Röstandel anges i **procent (%)**
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att andelen utrikes födda kan ha samband med röstningsmönster. Kommuner med högre andel utrikes födda kan ha andra politiska mönster än kommuner med lägre andel utrikes födda. Vi undersöker därför om vissa partier har starkare stöd i olika typer av kommuner och om sambandet förändrades mellan 2018 och 2022."
));

if (!dbInfoOk) {
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

  const chosenParty = addDropdown("Välj parti:", partyKeys, "S");
  const chosenPartyName = parties[chosenParty].label;

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

  }).filter(Boolean);

  const corr2018 = correlation(
    mergedData.map(x => x.foreign2018),
    mergedData.map(x => x.support2018)
  );

  const corr2022 = correlation(
    mergedData.map(x => x.foreign2022),
    mergedData.map(x => x.support2022)
  );

  const sortedByForeign = [...mergedData]
    .sort((a, b) => a.foreign2022 - b.foreign2022);

  const groupSize = Math.ceil(sortedByForeign.length / 3);

  const lowGroup = sortedByForeign.slice(0, groupSize);
  const middleGroup = sortedByForeign.slice(groupSize, groupSize * 2);
  const highGroup = sortedByForeign.slice(groupSize * 2);

  const low2018 = average(lowGroup.map(x => x.support2018));
  const low2022 = average(lowGroup.map(x => x.support2022));

  const middle2018 = average(middleGroup.map(x => x.support2018));
  const middle2022 = average(middleGroup.map(x => x.support2022));

  const high2018 = average(highGroup.map(x => x.support2018));
  const high2022 = average(highGroup.map(x => x.support2022));

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
## Samband mellan utrikes födda och röstandel
`);

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      ["Andel utrikes födda", "Röstandel (%)"],
      ...mergedData.map(row => [
        row.foreign2018,
        row.support2018
      ])
    ],
    options: {
      title: `Andel utrikes födda och stöd för ${chosenPartyName} 2018`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Andel utrikes födda (%)"
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
      ["Andel utrikes födda", "Röstandel (%)"],
      ...mergedData.map(row => [
        row.foreign2022,
        row.support2022
      ])
    ],
    options: {
      title: `Andel utrikes födda och stöd för ${chosenPartyName} 2022`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Andel utrikes födda (%)"
      },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      legend: "none"
    }
  });

  addMdToPage(`
## Kommungrupper efter andel utrikes födda
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Grupp", "2018 (%)", "2022 (%)"],
      ["Låg andel utrikes födda", low2018, low2022],
      ["Medel andel utrikes födda", middle2018, middle2022],
      ["Hög andel utrikes födda", high2018, high2022]
    ],
    options: {
      title: `Genomsnittligt stöd för ${chosenPartyName}`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: {
        title: "Röstandel (%)"
      },
      hAxis: {
        title: "Kommungrupp"
      }
    }
  });

  tableFromData({
    data: [
      {
        Grupp: "Låg andel utrikes födda",
        "Stöd 2018 (%)": formatPercent(low2018),
        "Stöd 2022 (%)": formatPercent(low2022),
        "Förändring": formatPercent(low2022 - low2018)
      },
      {
        Grupp: "Medel andel utrikes födda",
        "Stöd 2018 (%)": formatPercent(middle2018),
        "Stöd 2022 (%)": formatPercent(middle2022),
        "Förändring": formatPercent(middle2022 - middle2018)
      },
      {
        Grupp: "Hög andel utrikes födda",
        "Stöd 2018 (%)": formatPercent(high2018),
        "Stöd 2022 (%)": formatPercent(high2022),
        "Förändring": formatPercent(high2022 - high2018)
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

För **${chosenPartyName}** är korrelationen mellan andel utrikes födda och röstandel **${corr2018.toFixed(2)}** år 2018 och **${corr2022.toFixed(2)}** år 2022.

Detta innebär att sambandet 2018 kan beskrivas som **${corrText2018}**, medan sambandet 2022 kan beskrivas som **${corrText2022}**.

Resultatet visar om partiet tenderar att vara starkare i kommuner med högre eller lägre andel utrikes födda.

## Metod och begränsning

Analysen använder:
- tabellen **valdata_kommun**
- tabellen **utrikes_fodda**

Andel utrikes födda beräknas som:
- antal utrikes födda dividerat med kommunens befolkning

Röstandelar beräknas som:
- partiets röster dividerat med summan av röster på de åtta riksdagspartierna.

Korrelation används för att undersöka sambandet mellan andel utrikes födda och röstandel.

## Extremvärden

Vissa kommuner med mycket hög eller låg andel utrikes födda kan påverka analysen mycket. Därför används både scatterplots och gruppjämförelser för att göra resultaten tydligare.
`);
}