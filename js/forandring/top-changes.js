import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
import { mean, standardDeviation } from "../helper/statistics.js";
import { partyColors } from "../helper/partyConfig.js";

if (!dbInfoOk) {

  displayDbNotOkText();

} else {

  // Intro

  addMdToPage(`
# Vinnare & förlorare (2018–2022)

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Vilka partier ökade och vilka tappade mest?

Denna analys undersöker hur riksdagspartiernas röstandelar förändrades mellan valen 2018 och 2022.  
Genom att analysera utvecklingen på nationell nivå och bryta ned resultaten per län kan vi identifiera:

- vilka partier som ökade mest i röstandel  
- vilka partier som tappade mest  
- hur stora förändringarna var i procentenheter  
- hur förändringarna varierade geografiskt  
- hur stor spridningen var mellan partiernas utveckling  

Analysen är en central del av projektets huvudfråga:  
**Vad påverkar röstning i Sverige?**  

Genom att först kartlägga *vilka partier som vann och förlorade* kan vi senare koppla dessa förändringar till socioekonomiska och geografiska faktorer.

</div>
`);

  // Fix municipality names

  lanKommun.forEach(row => {

    if (row.kommun.toLowerCase() === "strängns") {
      row.kommun = "Strängnäs";
    }

  });

  // Kommun → Län mapping

  const kommunToLan = new Map();

  lanKommun.forEach(row => {

    kommunToLan.set(
      row.kommun,
      row.lan
    );

  });

  // Total votes

  const totalVotes2018 =
    electionResults.reduce(
      (sum, row) =>
        sum + Number(row.roster2018 || 0),
      0
    );

  const totalVotes2022 =
    electionResults.reduce(
      (sum, row) =>
        sum + Number(row.roster2022 || 0),
      0
    );

  // Aggregate votes per party

  const partyStats = new Map();

  electionResults.forEach(row => {

    const parti =
      row.parti.trim();

    if (!partyStats.has(parti)) {

      partyStats.set(parti, {
        votes2018: 0,
        votes2022: 0
      });

    }

    const stats =
      partyStats.get(parti);

    stats.votes2018 +=
      Number(row.roster2018 || 0);

    stats.votes2022 +=
      Number(row.roster2022 || 0);

  });

  // Calculate changes

  const changes =
    Array.from(
      partyStats.entries()
    ).map(([parti, stats]) => {

      const percent2018 =
        (stats.votes2018 / totalVotes2018) * 100;

      const percent2022 =
        (stats.votes2022 / totalVotes2022) * 100;

      return {
        parti,
        percent2018,
        percent2022,
        change:
          percent2022 - percent2018
      };

    });

  // National ranking

  addMdToPage(`
## Nationell ranking
`);

  const sortedRanking =
    [...changes]
      .sort((a, b) =>
        b.change - a.change
      );

  const rankingText =
    sortedRanking
      .map((row, i) => {

        const arrow =
          row.change > 0
            ? "⬆️"
            : row.change < 0
              ? "⬇️"
              : "⏺";

        return `
**${i + 1}. ${row.parti}**  
${arrow} ${row.change.toFixed(2)} procentenheter
`;

      })
      .join("  \n");

  addMdToPage(rankingText);

  // National chart

  const nationalChartData = [
    ["Parti", "Förändring", { role: "style" }]
  ];

  changes.forEach(row => {

    nationalChartData.push([
      row.parti,
      row.change,
      `color:${partyColors[row.parti] || "#888888"}`
    ]);

  });

  drawGoogleChart({

    type: "ColumnChart",

    data: nationalChartData,

    options: {

      title:
        "Nationell förändring i röstandel per parti (2018–2022)",

      height: 500,
      width: 1200,

      legend: "none",

      hAxis: {
        title: "Parti"
      },

      vAxis: {
        title:
          "Förändring i procentenheter"
      }

    }

  });

  // Statistical spread

  const allPartyChanges =
    changes.map(r => r.change);

  const meanChange =
    mean(allPartyChanges);

  const stdChange =
    standardDeviation(allPartyChanges);

  const maxChange =
    Math.max(...allPartyChanges);

  const minChange =
    Math.min(...allPartyChanges);

  addMdToPage(`
## Statistisk spridning mellan partier

- **Genomsnittlig förändring:** ${meanChange.toFixed(2)} procentenheter
- **Standardavvikelse:** ${stdChange.toFixed(2)}
- **Största ökning:** ${maxChange.toFixed(2)} procentenheter
- **Största minskning:** ${minChange.toFixed(2)} procentenheter

### Tolkning

Resultaten visar att förändringarna mellan partierna var måttliga.  
Standardavvikelsen visar hur mycket partiernas utveckling varierade mellan valen.

Ett högre värde innebär större skillnader mellan partiernas förändringar, medan ett lägre värde tyder på ett mer stabilt väljarbeteende.

Standardavvikelsen på 1.53 procentenheter indikerar att förändringarna mellan partierna generellt var relativt begränsade.
`);

  // County analysis

  function getLanData(parti) {

    const lanStats =
      new Map();

    electionResults.forEach(row => {

      if (
        row.parti.trim() !== parti
      ) return;

      const lan =
        kommunToLan.get(row.kommun)
        || "Okänt län";

      if (!lanStats.has(lan)) {

        lanStats.set(lan, {
          votes2018: 0,
          votes2022: 0,
          total2018: 0,
          total2022: 0
        });

      }

      const stats =
        lanStats.get(lan);

      stats.votes2018 +=
        Number(row.roster2018 || 0);

      stats.votes2022 +=
        Number(row.roster2022 || 0);

    });

    // Total votes per county

    electionResults.forEach(row => {

      const lan =
        kommunToLan.get(row.kommun)
        || "Okänt län";

      if (!lanStats.has(lan)) return;

      const stats =
        lanStats.get(lan);

      stats.total2018 +=
        Number(row.roster2018 || 0);

      stats.total2022 +=
        Number(row.roster2022 || 0);

    });

    return Array.from(
      lanStats.entries()
    ).map(([lan, stats]) => {

      const percent2018 =
        (stats.votes2018 / stats.total2018) * 100;

      const percent2022 =
        (stats.votes2022 / stats.total2022) * 100;

      return {
        lan,
        change:
          percent2022 - percent2018
      };

    });

  }

  // Top & bottom counties

  function getTopAndBottomLan(parti) {

    const lanData =
      getLanData(parti);

    return {

      strongest:
        [...lanData]
          .sort((a, b) =>
            b.change - a.change
          )
          .slice(0, 3),

      weakest:
        [...lanData]
          .sort((a, b) =>
            a.change - b.change
          )
          .slice(0, 3)

    };

  }

  // Pie chart

  function drawLanPieChart(parti) {

    const lanData =
      getLanData(parti);

    const data = [
      ["Län", "Förändring"]
    ];

    lanData.forEach(row => {

      data.push([
        row.lan,
        Math.abs(row.change)
      ]);

    });

    const slices = {};

    lanData.forEach((row, index) => {

      slices[index] = {
        color:
          row.change >= 0
            ? "#2ECC71"
            : "#E74C3C"
      };

    });

    drawGoogleChart({

      type: "PieChart",

      data: data,

      options: {

        title:
          `Förändring i röstandel per län — ${parti}`,

        height: 550,
        width: 900,

        pieHole: 0.35,

        legend: {
          position: "right",
          textStyle: {
            fontSize: 14
          }
        },

        slices: slices,

        tooltip: {
          text: "both"
        }

      }

    });

    addMdToPage(`
<div style="display:flex; gap:20px; margin-top:10px;">

<div style="display:flex; align-items:center; gap:6px;">
<div style="width:16px; height:16px; background:#2ECC71; border:1px solid #000;"></div>
<span>Ökning i röstandel</span>
</div>

<div style="display:flex; align-items:center; gap:6px;">
<div style="width:16px; height:16px; background:#E74C3C; border:1px solid #000;"></div>
<span>Minskning i röstandel</span>
</div>

</div>
`);

    const {
      strongest,
      weakest
    } = getTopAndBottomLan(parti);

    let md =
      `### Topp 3 starkaste län för ${parti}\n`;

    strongest.forEach((row, i) => {

      md +=
        `${i + 1}. **${row.lan}** — +${row.change.toFixed(2)} procentenheter\n`;

    });

    md +=
      `\n### Topp 3 svagaste län för ${parti}\n`;

    weakest.forEach((row, i) => {

      md +=
        `${i + 1}. **${row.lan}** — ${row.change.toFixed(2)} procentenheter\n`;

    });

    md += `
### Statistisk kommentar

Förändringarna visar hur ${parti} utvecklades geografiskt mellan valen 2018 och 2022.

- Positiva värden visar län där partiet ökade sin röstandel.
- Negativa värden visar län där partiet tappade röstandel.

Analysen använder röstandelar istället för absoluta rösttal, vilket gör jämförelser mellan län mer statistiskt rättvisa.
`;

    addMdToPage(md);

  }

  // Dropdown

  addMdToPage(`
## Geografisk analys per län
`);

  addDropdown(
    "Välj parti",
    changes.map(r => r.parti),
    changes[0].parti
  );

  const selects =
    document.querySelectorAll("select");

  const partiSelect =
    selects[selects.length - 1];

  partiSelect.addEventListener(
    "change",
    () => {

      drawLanPieChart(
        partiSelect.value
      );

    }
  );

  drawLanPieChart(
    partiSelect.value
  );

  // Winners & losers

  const winners =
    [...changes]
      .sort((a, b) =>
        b.change - a.change
      )
      .slice(0, 3);

  const losers =
    [...changes]
      .sort((a, b) =>
        a.change - b.change
      )
      .slice(0, 3);

  addMdToPage(`
### Största vinnare

${winners.map((p, i) =>
  `${i + 1}. **${p.parti}** — +${p.change.toFixed(2)} procentenheter`
).join("  \n")}

### Största förlorare

${losers.map((p, i) =>
  `${i + 1}. **${p.parti}** — ${p.change.toFixed(2)} procentenheter`
).join("  \n")}

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Slutsats

Analysen visar att vissa partier stärkte sitt nationella väljarstöd samtidigt som andra tappade stöd mellan valen.

Den statistiska spridningen visar dessutom att förändringarna inte var jämnt fördelade mellan partierna. Vissa partier uppvisade större förändringar än genomsnittet, vilket tyder på omfördelningar i väljarnas partipreferenser.

Den geografiska analysen visar samtidigt att utvecklingen varierade mellan olika län. Ett parti kunde öka kraftigt i vissa delar av landet men samtidigt minska i andra, vilket tyder på regionala skillnader i väljarnas beteende och politiska utveckling.

Eftersom analysen bygger på hela populationen av registrerade röster beskriver resultaten faktiska förändringar i valresultaten och inte statistiska uppskattningar från ett stickprov.

</div>
`);

}