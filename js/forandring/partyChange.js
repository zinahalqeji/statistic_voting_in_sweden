import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
import { mean, median, standardDeviation } from "../helper/statistics.js";
import { partyColors } from "../helper/partyConfig.js";

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
    [...new Set(
      electionResults.map(r => r.parti)
    )].sort();

  let chosenParti =
    addDropdown("Välj parti", allParties);

  let chosenColor =
    partyColors[chosenParti] || "#888888";

  let otherColor = "#cccccc";

  // Funktion för nationella totalsiffror

  function getTotals(year) {

    const totalVotes =
      electionResults.reduce((sum, row) =>
        sum + Number(
          year === 2018
            ? row.roster2018
            : row.roster2022
        ), 0
      );

    const partyVotes =
      electionResults
        .filter(row =>
          row.parti === chosenParti
        )
        .reduce((sum, row) =>
          sum + Number(
            year === 2018
              ? row.roster2018
              : row.roster2022
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

  // Kommunala förändringar

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
        kommunRows.reduce((sum, row) =>
          sum + Number(row.roster2018), 0
        );

      const total2022 =
        kommunRows.reduce((sum, row) =>
          sum + Number(row.roster2022), 0
        );

      const party2018 =
        kommunRows
          .filter(row =>
            row.parti === chosenParti
          )
          .reduce((sum, row) =>
            sum + Number(row.roster2018), 0
          );

      const party2022 =
        kommunRows
          .filter(row =>
            row.parti === chosenParti
          )
          .reduce((sum, row) =>
            sum + Number(row.roster2022), 0
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
        change:
          percent2022 - percent2018
      };

    });

  }

  // Diagram för nationella resultat

  function drawYearChart(year) {

    const { percent } =
      getTotals(year);

    drawGoogleChart({

      type: "BarChart",

      data: [
        ["Parti", chosenParti, "Övriga"],
        ["Röstandel", percent, 100 - percent]
      ],

      options: {

        title:
          `Andel av röster (${year}) – Nationellt`,

        height: 300,

        colors: [
          chosenColor,
          otherColor
        ],

        legend: {
          position: "top"
        },

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

  // Resultat 2018

  addMdToPage(`
## Resultat för 2018
`);

  const percent2018 =
    drawYearChart(2018);

  // Resultat 2022

  addMdToPage(`
## Resultat för 2022
`);

  const percent2022 =
    drawYearChart(2022);

  // Nationell förändring

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

  // Kommunala förändringar

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

  // Diagram för kommunala förändringar

  addMdToPage(`
## Kommunala förändringar i röstandel
`);

  const chartData = [
    ["Kommun", "Förändring", { role: "style" }]
  ];

  municipalityChanges
    .sort((a, b) =>
      b.change - a.change
    )
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
        title:
          "Förändring i procentenheter"
      }

    }

  });

  // Statistisk analys

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

  addMdToPage(`
### Statistiska mått mellan kommuner

- **Genomsnittlig förändring:** ${meanChange.toFixed(2)} procentenheter
- **Medianförändring:** ${medianChange.toFixed(2)} procentenheter
- **Standardavvikelse:** ${stdChange.toFixed(2)}

Standardavvikelsen visar hur mycket förändringarna varierar mellan kommuner. Ett högre värde indikerar större regionala skillnader i partiets utveckling.
`);

  // Största ökning och minskning

  const strongest =
    [...municipalityChanges]
      .sort((a, b) =>
        b.change - a.change
      )
      .slice(0, 10);

  const weakest =
    [...municipalityChanges]
      .sort((a, b) =>
        a.change - b.change
      )
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