import { electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {


// Introduktion

addMdToPage(`
## Jämförelse av valresultat mellan 2018 och 2022

### Syfte
Syftet med denna sida är att analysera hur stödet för ett valt riksdagsparti har förändrats mellan riksdagsvalen 2018 och 2022 i ett urval av svenska kommuner. Genom att studera partiets andel av rösterna över tid kan vi identifiera om stödet ökar, minskar eller förblir stabilt.

### Analysupplägg
Analysen bygger på summerade röster från 20 kommuner som representerar olika geografiska och demografiska förutsättningar. För varje parti beräknas:

- totalt antal röster i urvalet  
- partiets andel av rösterna för respektive valår  
- förändring i procentenheter mellan 2018 och 2022  

Dessa mått visualiseras i två separata diagram (ett per valår) samt ett tredje diagram som visar förändringen över tid.

### Kontext
Även om denna sida inte direkt inkluderar socioekonomiska variabler, utgår analysen från en teoretisk ram där faktorer som **inkomstnivåer**, **arbetslöshet** och **lokala socioekonomiska skillnader** kan påverka röstningsmönster. Genom att först kartlägga hur stödet förändras över tid skapas en grund för vidare analys där dessa faktorer kan kopplas till förändringarna i partistöd.
`);


  // Filterinställningar
  
const selectedCommunes = [
  'Flen','Perstorp','Eskilstuna','Malmö','Fagersta','Sandviken',
  'Ronneby','Filipstad','Södertälje','Söderhamn',
  'Pajala','Kiruna','Kungsbacka','Tjörn','Öckerö',
  'Krokom','Sotenäs','Gällivare','Habo','Mörbylånga'
];

const selectedParties = [...new Set(electionResults.map(r => r.parti))].sort();
let chosenParti = addDropdown("Välj parti", selectedParties);

let electionResultsForWork = electionResults.filter(r =>
  r &&
  selectedCommunes.includes(r.kommun) &&
  selectedParties.includes(r.parti)
);


// Parti färger

const partyColors = {
  'Arbetarepartiet-Socialdemokraterna': '#EE2020',
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


// FUNKTION: Rita diagram för ett år

function drawYearChart(year) {

  const totalVotes = electionResultsForWork.reduce((sum, r) =>
    sum + (year === 2018 ? +r.roster2018 : +r.roster2022), 0
  );

  const partyVotes = electionResultsForWork
    .filter(r => r.parti === chosenParti)
    .reduce((sum, r) =>
      sum + (year === 2018 ? +r.roster2018 : +r.roster2022), 0
    );

  const percent = ((partyVotes / totalVotes) * 100).toFixed(1);

  // Rita diagram
  
  drawGoogleChart({
    type: "BarChart",
    data: [
      ["Parti", chosenParti, "Övriga"],
      ["Röster", partyVotes, totalVotes - partyVotes]
    ],
    options: {
      title: `Andel av röster för ${chosenParti} (${year})`,
      height: 300,
      colors: [chosenColor, otherColor],
      legend: { position: "top" },
      hAxis: { title: "Röster" },
      vAxis: { title: "Parti" },
      isStacked: false
    }
  });

  // Förklarande text

  addMdToPage(`
### Resultat – ${year}

- **Antal röster för ${chosenParti}:** ${partyVotes.toLocaleString("sv-SE")}
- **Antal röster för övriga partier:** ${(totalVotes - partyVotes).toLocaleString("sv-SE")}
- **Totalt antal röster i urvalet:** ${totalVotes.toLocaleString("sv-SE")}
- **Andel av totalen:** ${percent}%
`);

  return percent;
}

// Rita diagram för 2018 & 2022

addMdToPage("## Resultat för 2018");
const percent2018 = drawYearChart(2018);

addMdToPage("## Resultat för 2022");
const percent2022 = drawYearChart(2022);


// Statistisk förändringsanalys

const change = (percent2022 - percent2018).toFixed(1);

const changeText =
  change > 0
    ? `Stödet har **ökat** med ${change} procentenheter.`
    : change < 0
      ? `Stödet har **minskat** med ${Math.abs(change)} procentenheter.`
      : `Stödet är **oförändrat** mellan valen.`;



drawGoogleChart({
  type: "ColumnChart",
  data: [
    ["År", "Andel %", { role: "style" }],
    ["2018", Number(percent2018), chosenColor],
    ["2022", Number(percent2022), chosenColor]
  ],
  options: {
    title: `Förändring i stöd för ${chosenParti} (2018–2022)`,
    height: 350,
    legend: "none",
    vAxis: { title: "Andel (%)" }
  }
});


// Tolkning

addMdToPage(`
## Statistisk analys av förändringen

För det valda partiet **${chosenParti}** ser vi följande utveckling mellan 2018 och 2022:

- **Andel 2018:** ${percent2018}%
- **Andel 2022:** ${percent2022}%
- **Förändring:** ${change} procentenheter  
- ${changeText}

Denna förändring ger en tydlig indikation på hur partiets stöd utvecklats i de 20 kommuner som ingår i analysen. Resultatet utgör en grund för vidare studier där socioekonomiska faktorer kan kopplas till förändringar i röstningsmönster.
`);

}
