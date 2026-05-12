import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();

} else {


  // Introduktion

addMdToPage(`
# Partiförändringar (2018–2022)

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Hur förändrades stödet för Sveriges riksdagspartier?

Denna sida analyserar hur partiernas röstandelar förändrades mellan riksdagsvalen 2018 och 2022.  
Genom att studera utvecklingen på både nationell nivå och kommunnivå kan vi se:

- vilka partier som ökade mest  
- vilka partier som tappade stöd  
- hur förändringarna varierade mellan kommuner  
- hur stora skillnaderna var i förändring (spridning)

Analysen utgör ett centralt steg i projektets huvudfråga:  
**Vad påverkar röstning i Sverige?**  
Genom att först kartlägga *vad* som förändrades kan vi senare koppla dessa förändringar till socioekonomiska och geografiska faktorer.

</div>
`);

  // Dropdown för att välja parti

  const allParties =
    [...new Set(electionResults.map(r => r.parti))].sort();

  let chosenParti =
    addDropdown("Välj parti", allParties);


  // Partifärger

  const partyColors = {
    'Arbetarepartiet-Socialdemokraterna': '#EE2020',
    'Socialdemokraterna': '#EE2020',
    'Moderaterna': '#1D74BB',
    'Sverigedemokraterna': '#DDDD00',
    'Centerpartiet': '#009933',
    'Vänsterpartiet': '#AF0000',
    'Kristdemokraterna': '#003F7D',
    'Liberalerna': '#6AB2E7',
    'Miljöpartiet': '#83CF39'
  };

  let chosenColor =
    partyColors[chosenParti] || "#888888";

  let otherColor = "#cccccc";


  // Totalsfunktion för att beräkna årlig röstandel och total röstandel för valt parti

  function getTotals(year) {

    const totalVotes =
      electionResults.reduce((s, r) =>
        s + Number(
          year === 2018
            ? r.roster2018
            : r.roster2022
        ), 0
      );

    const partyVotes =
      electionResults
        .filter(r => r.parti === chosenParti)
        .reduce((s, r) =>
          s + Number(
            year === 2018
              ? r.roster2018
              : r.roster2022
          ), 0
        );

    const percent =
      (partyVotes / totalVotes) * 100;

    return {
      totalVotes,
      partyVotes,
      percent
    };
  }

  // Funktion för att normalisera kommunnamn

  function getMunicipalityChanges() {

    const municipalities =
      [...new Set(
        electionResults.map(r => r.kommun)
      )];

    return municipalities.map(kommun => {

      const kommunRows =
        electionResults.filter(r =>
          r.kommun === kommun
        );

      const total2018 =
        kommunRows.reduce((s, r) =>
          s + Number(r.roster2018), 0
        );

      const total2022 =
        kommunRows.reduce((s, r) =>
          s + Number(r.roster2022), 0
        );

      const party2018 =
        kommunRows
          .filter(r => r.parti === chosenParti)
          .reduce((s, r) =>
            s + Number(r.roster2018), 0
          );

      const party2022 =
        kommunRows
          .filter(r => r.parti === chosenParti)
          .reduce((s, r) =>
            s + Number(r.roster2022), 0
          );

      const percent2018 =
        total2018 === 0
          ? 0
          : (party2018 / total2018) * 100;

      const percent2022 =
        total2022 === 0
          ? 0
          : (party2022 / total2022) * 100;

      return {
        kommun,
        percent2018,
        percent2022,
        change: percent2022 - percent2018
      };

    });

  }

  // Statistiska funktioner för att beräkna genomsnitt, median och standardavvikelse

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function median(arr) {

    const sorted =
      [...arr].sort((a, b) => a - b);

    const mid =
      Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function standardDeviation(arr) {

    const m = mean(arr);

    const variance =
      mean(arr.map(v => (v - m) ** 2));

    return Math.sqrt(variance);
  }

  // Ritdiagram för att visa nationella resultat och förändring över tid

  function drawYearChart(year) {

    const { percent } = getTotals(year);

    drawGoogleChart({
      type: "BarChart",
      data: [
        ["Parti", chosenParti, "Övriga"],
        ["Röstandel", percent, 100 - percent]
      ],
      options: {
        title: `Andel av röster (${year}) – Nationellt`,
        height: 300,
        colors: [chosenColor, otherColor],
        legend: { position: "top" },
        hAxis: {
          title: "Procent (%)"
        },
        vAxis: {
          title: "Parti"
        }
      }
    });

    addMdToPage(`
### Resultat – ${year}

- **Andel för ${chosenParti}:** ${percent.toFixed(2)}%
- **Andel för övriga partier:** ${(100 - percent).toFixed(2)}%
- **Total röstandel:** 100%
`);

    return percent;
  }

  // Ritdiagram för att visa kommunala förändringar i röstandel

  addMdToPage("## Resultat för 2018");

  const percent2018 =
    drawYearChart(2018);

  addMdToPage("## Resultat för 2022");

  const percent2022 =
    drawYearChart(2022);

  // Ritdiagram för att visa förändring i röstandel mellan 2018 och 2022

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["År", "Röstandel (%)", { role: "style" }],
      ["2018", percent2018, `color:${chosenColor}`],
      ["2022", percent2022, `color:${chosenColor}`]
    ],
    options: {
      title:
        `Förändring i stöd för ${chosenParti} (2018–2022)`,

      height: 350,

      legend: "none",

      vAxis: {
        title: "Röstandel (%)"
      }
    }
  });

  // Beräkna kommunala förändringar i röstandel

  const municipalityChanges =
    getMunicipalityChanges();

  const allChanges =
    municipalityChanges.map(r => r.change);

  const meanChange =
    mean(allChanges);

  const medianChange =
    median(allChanges);

  const stdChange =
    standardDeviation(allChanges);

  // Ritdiagram för att visa regionala politiska skiften 

  addMdToPage(`
## Kommunala förändringar i röstandel
`);

  const chartData = [
    ["Kommun", "Förändring", { role: "style" }]
  ];

  municipalityChanges
    .sort((a, b) => b.change - a.change)
    .slice(0, 20)
    .forEach(row => {

      chartData.push([
        row.kommun,
        row.change,
        `color:${chosenColor}`
      ]);

    });

  drawGoogleChart({
    type: "BarChart",
    data: chartData,
    options: {
      title:
        `Kommuner med störst förändring i röstandel`,
      height: 650,
      legend: "none",
      chartArea: {
        left: 180,
        right: 30,
        top: 70,
        bottom: 70
      },
      hAxis: {
        title: "Förändring i procentenheter"
      }
    }
  });

  // Sammanfattning av kommunala förändringar

  addMdToPage(`
## Statistisk analys av förändringen
`);

  const changePercent =
    percent2022 - percent2018;

  addMdToPage(`
### Nationell förändring

- **Andel 2018:** ${percent2018.toFixed(2)}%
- **Andel 2022:** ${percent2022.toFixed(2)}%
- **Förändring:** ${changePercent.toFixed(2)} procentenheter

- ${
    changePercent > 0
      ? `Stödet för ${chosenParti} har **ökat** med ${changePercent.toFixed(2)} procentenheter mellan valen.`
      : changePercent < 0
        ? `Stödet för ${chosenParti} har **minskat** med ${Math.abs(changePercent).toFixed(2)} procentenheter mellan valen.`
        : `Stödet för ${chosenParti} är **oförändrat** mellan valen.`
  }
`);


  // Sammanfattning av kommunala förändringar

  addMdToPage(`
### Statistiska mått mellan kommuner

- **Genomsnittlig förändring:** ${meanChange.toFixed(2)} procentenheter
- **Medianförändring:** ${medianChange.toFixed(2)} procentenheter
- **Standardavvikelse:** ${stdChange.toFixed(2)}

Standardavvikelsen visar hur mycket förändringarna varierar mellan kommuner. Ett högre värde indikerar större regionala skillnader i partiets utveckling.
`);

  // Starka och svaga kommuner

  const strongest =
    [...municipalityChanges]
      .sort((a, b) => b.change - a.change)
      .slice(0, 10);

  const weakest =
    [...municipalityChanges]
      .sort((a, b) => a.change - b.change)
      .slice(0, 10);


  addMdToPage(`
## Kommuner med störst ökning i röstandel
`);

  tableFromData({
    data: strongest.map(r => ({
      "Kommun": r.kommun,
      "2018 (%)": r.percent2018.toFixed(2),
      "2022 (%)": r.percent2022.toFixed(2),
      "Förändring": r.change.toFixed(2)
    })),
    columnNames: [
      "Kommun",
      "2018 (%)",
      "2022 (%)",
      "Förändring"
    ],
    fixedHeader: true
  });


  addMdToPage(`
## Kommuner med störst minskning i röstandel
`);

  tableFromData({
    data: weakest.map(r => ({
      "Kommun": r.kommun,
      "2018 (%)": r.percent2018.toFixed(2),
      "2022 (%)": r.percent2022.toFixed(2),
      "Förändring": r.change.toFixed(2)
    })),
    columnNames: [
      "Kommun",
      "2018 (%)",
      "2022 (%)",
      "Förändring"
    ],
    fixedHeader: true
  });


  // Slutsats

addMdToPage(`
<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Slutsats

Analysen visar att ${chosenParti}
${
  changePercent > 0
    ? `ökade sitt nationella väljarstöd`
    : changePercent < 0
      ? `minskade sitt nationella väljarstöd`
      : `behöll ett i stort sett oförändrat väljarstöd`
}
mellan riksdagsvalen 2018 och 2022.

Partiets röstandel förändrades från
**${percent2018.toFixed(2)}%**
till
**${percent2022.toFixed(2)}%**,
vilket motsvarar
**${changePercent.toFixed(2)} procentenheter**.

Den kommunala analysen visar samtidigt att utvecklingen varierade mellan olika delar av landet. Vissa kommuner uppvisade betydligt större förändringar än andra, vilket framgår av spridningen i resultaten och standardavvikelsen.

Resultaten indikerar därför att förändringen i väljarstöd inte var geografiskt jämnt fördelad utan varierade regionalt mellan Sveriges kommuner.

</div>
`);
}