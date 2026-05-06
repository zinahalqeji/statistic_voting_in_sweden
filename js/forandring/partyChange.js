import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

 // Intro text

addMdToPage(`
## Jämförelse av valresultat mellan 2018 och 2022

### Syfte
Syftet med denna sida är att analysera hur stödet för ett valt riksdagsparti har förändrats mellan riksdagsvalen 2018 och 2022 på nationell nivå. Genom att studera partiets andel av rösterna över tid kan vi identifiera om stödet ökar, minskar eller förblir stabilt.

### Analysupplägg
Analysen bygger på röster från **samtliga 290 kommuner** i Sverige. För varje parti beräknas:

- totalt antal röster i hela landet  
- partiets andel av rösterna för respektive valår  
- förändring i procentenheter mellan 2018 och 2022  

Dessa mått visualiseras i två separata diagram (ett per valår) samt ett tredje diagram som visar förändringen över tid.

### Kontext
Även om denna sida inte direkt inkluderar socioekonomiska variabler, utgår analysen från en teoretisk ram där faktorer som **inkomstnivåer**, **arbetslöshet** och **lokala socioekonomiska skillnader** kan påverka röstningsmönster. Genom att först kartlägga hur stödet förändras över tid skapas en grund för vidare analys där dessa faktorer kan kopplas till förändringarna i partistöd.
`);



  // Dropdowns

  const allParties = [...new Set(electionResults.map(r => r.parti))].sort();
  let chosenParti = addDropdown("Välj parti", allParties);

  let viewMode = addDropdown("Visa som", ["Procent (%)", "Antal röster"]);


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

  let chosenColor = partyColors[chosenParti] || "#888888";
  let otherColor = "#cccccc";


  // Totals för ett år

  function getTotals(year) {
    const totalVotes = electionResults.reduce((s, r) =>
      s + Number(year === 2018 ? r.roster2018 : r.roster2022), 0
    );

    const partyVotes = electionResults
      .filter(r => r.parti === chosenParti)
      .reduce((s, r) =>
        s + Number(year === 2018 ? r.roster2018 : r.roster2022), 0
      );

    const percent = ((partyVotes / totalVotes) * 100).toFixed(1);

    return { totalVotes, partyVotes, percent };
  }


  // Rita diagram för varje år

  function drawYearChart(year) {
    const { totalVotes, partyVotes, percent } = getTotals(year);

    let chartValueParty, chartValueOther, chartTitle, axisTitle;

    if (viewMode === "Procent (%)") {
      chartValueParty = Number(percent);
      chartValueOther = 100 - Number(percent);
      chartTitle = `Andel av röster (${year}) – Nationellt`;
      axisTitle = "Procent (%)";
    } else {
      chartValueParty = partyVotes;
      chartValueOther = totalVotes - partyVotes;
      chartTitle = `Antal röster (${year}) – Nationellt`;
      axisTitle = "Antal röster";
    }

    drawGoogleChart({
      type: "BarChart",
      data: [
        ["Parti", chosenParti, "Övriga"],
        ["Röster", chartValueParty, chartValueOther]
      ],
      options: {
        title: chartTitle,
        height: 300,
        colors: [chosenColor, otherColor],
        legend: { position: "top" },
        hAxis: { title: axisTitle },
        vAxis: { title: "Parti" }
      }
    });

    if (viewMode === "Procent (%)") {
      addMdToPage(`
### Resultat – ${year}

- **Andel för ${chosenParti}:** ${percent}%
- **Andel för övriga partier:** ${(100 - percent).toFixed(1)}%
- **Totalt:** 100%
`);
    } else {
      addMdToPage(`
### Resultat – ${year}

- **Antal röster för ${chosenParti}:** ${partyVotes.toLocaleString("sv-SE")}
- **Antal röster för övriga partier:** ${(totalVotes - partyVotes).toLocaleString("sv-SE")}
- **Totalt antal röster i Sverige:** ${totalVotes.toLocaleString("sv-SE")}
`);
    }

    return { percent, partyVotes };
  }


  // Rita 2018 + 2022

  addMdToPage("## Resultat för 2018");
  const { percent: percent2018, partyVotes: votes2018 } = drawYearChart(2018);

  addMdToPage("## Resultat för 2022");
  const { percent: percent2022, partyVotes: votes2022 } = drawYearChart(2022);


  let changeValue2018, changeValue2022, changeChartTitle, changeAxisTitle;

  if (viewMode === "Procent (%)") {
    changeValue2018 = Number(percent2018);
    changeValue2022 = Number(percent2022);
    changeChartTitle = `Förändring i stöd för ${chosenParti} (2018–2022) – Procent`;
    changeAxisTitle = "Andel (%)";
  } else {
    changeValue2018 = votes2018;
    changeValue2022 = votes2022;
    changeChartTitle = `Förändring i stöd för ${chosenParti} (2018–2022) – Antal röster`;
    changeAxisTitle = "Antal röster";
  }

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["År", "Värde", { role: "style" }],
      ["2018", changeValue2018, chosenColor],
      ["2022", changeValue2022, chosenColor]
    ],
    options: {
      title: changeChartTitle,
      height: 350,
      legend: "none",
      vAxis: { title: changeAxisTitle }
    }
  });


  // Tolkning av förändringen

  addMdToPage(`## Statistisk analys av förändringen`);

  if (viewMode === "Procent (%)") {
    const changePercent = (percent2022 - percent2018).toFixed(1);

    addMdToPage(`
### Förändring i procent

- **Andel 2018:** ${percent2018}%
- **Andel 2022:** ${percent2022}%
- **Förändring:** ${changePercent} procentenheter  
- ${
        changePercent > 0
          ? `Stödet har **ökat** med ${changePercent} procentenheter.`
          : changePercent < 0
            ? `Stödet har **minskat** med ${Math.abs(changePercent)} procentenheter.`
            : `Stödet är **oförändrat** mellan valen.`
      }
`);
  } else {
    const changeVotes = votes2022 - votes2018;

    addMdToPage(`
### Förändring i antal röster

- **Antal röster 2018:** ${votes2018.toLocaleString("sv-SE")}
- **Antal röster 2022:** ${votes2022.toLocaleString("sv-SE")}
- **Förändring:** ${changeVotes.toLocaleString("sv-SE")} röster  
- ${
        changeVotes > 0
          ? `Stödet har **ökat** med ${changeVotes.toLocaleString("sv-SE")} röster.`
          : changeVotes < 0
            ? `Stödet har **minskat** med ${Math.abs(changeVotes).toLocaleString("sv-SE")} röster.`
            : `Stödet är **oförändrat** mellan valen.`
      }
Denna förändring visar hur partiets nationella stöd har utvecklats mellan valen. Resultatet utgör en grund för vidare studier där socioekonomiska faktorer kan kopplas till förändringar i röstningsmönster.
`);
  };
  addMdToPage(`

  Denna förändring visar hur partiets nationella stöd har utvecklats mellan valen.Resultatet utgör en grund för vidare studier där socioekonomiska faktorer kan kopplas till förändringar i röstningsmönster.
  `);

}
