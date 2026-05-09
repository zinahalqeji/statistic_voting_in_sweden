import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();

} else {

  // =====================================================
  // INTRO
  // =====================================================

  addMdToPage(`
# Vinnare & förlorare (2018–2022)

### Syfte
Denna sida analyserar vilka riksdagspartier som ökade respektive minskade mest mellan valen 2018 och 2022.

Analysen bygger på röster från **samtliga 290 kommuner** i Sverige och visar både nationella förändringar och geografiska mönster per län.

### Frågor som besvaras
- Vilka partier ökade mest i röstandel?
- Vilka partier minskade mest i röstandel?
- Hur stora var förändringarna nationellt i procentenheter?
- Hur fördelades förändringarna geografiskt mellan Sveriges län?
`);


  // =====================================================
  // FIX KOMMUNNAMN
  // =====================================================

  lanKommun.forEach(row => {

    if (row.kommun.toLowerCase() === "strängns") {
      row.kommun = "Strängnäs";
    }

  });


  // =====================================================
  // KOMMUN → LÄN
  // =====================================================

  const kommunToLan = new Map();

  lanKommun.forEach(row => {
    kommunToLan.set(row.kommun, row.lan);
  });


  // =====================================================
  // PARTIFÄRGER
  // =====================================================

  const partyColors = {
    'Socialdemokraterna': '#EE2020',
    'Arbetarepartiet-Socialdemokraterna': '#EE2020',
    'Moderaterna': '#1D74BB',
    'Sverigedemokraterna': '#DDDD00',
    'Centerpartiet': '#009933',
    'Vänsterpartiet': '#AF0000',
    'Kristdemokraterna': '#003F7D',
    'Liberalerna': '#6AB2E7',
    'Miljöpartiet': '#83CF39'
  };


  // =====================================================
  // TOTALA RÖSTER
  // =====================================================

  const totalVotes2018 =
    electionResults.reduce((sum, r) =>
      sum + Number(r.roster2018 || 0), 0);

  const totalVotes2022 =
    electionResults.reduce((sum, r) =>
      sum + Number(r.roster2022 || 0), 0);


  // =====================================================
  // AGGREGERA PARTIDATA
  // =====================================================

  const partyStats = new Map();

  electionResults.forEach(row => {

    const parti = row.parti.trim();

    if (!partyStats.has(parti)) {

      partyStats.set(parti, {
        votes2018: 0,
        votes2022: 0
      });

    }

    const stats = partyStats.get(parti);

    stats.votes2018 += Number(row.roster2018 || 0);
    stats.votes2022 += Number(row.roster2022 || 0);

  });


  // =====================================================
  // BERÄKNA RÖSTANDELAR
  // =====================================================

  const changes =
    Array.from(partyStats.entries()).map(([parti, stats]) => {

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


  // =====================================================
  // NATIONELL RANKING
  // =====================================================

  addMdToPage(`
## Nationell ranking
`);

  const sortedRanking =
    [...changes]
      .sort((a, b) => b.change - a.change);

  const rankingText =
    sortedRanking.map((row, i) => {

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

    }).join("  \n");

  addMdToPage(rankingText);


  // =====================================================
  // NATIONELLT DIAGRAM
  // =====================================================

  const nationalChartData = [
    ['Parti', 'Förändring', { role: 'style' }]
  ];

  changes.forEach(row => {

    const color =
      partyColors[row.parti] || "#888888";

    nationalChartData.push([
      row.parti,
      row.change,
      `color:${color}`
    ]);

  });

  drawGoogleChart({
    type: 'ColumnChart',

    data: nationalChartData,

    options: {

      title:
        'Nationell förändring i röstandel per parti (2018–2022)',

      height: 500,
      width: 1200,

      legend: 'none',

      hAxis: {
        title: 'Parti'
      },

      vAxis: {
        title: 'Förändring i procentenheter'
      }
    }
  });


  // =====================================================
  // GEOGRAFISK ANALYS
  // =====================================================

  function getLanData(parti) {

    const lanStats = new Map();

    electionResults.forEach(row => {

      if (row.parti.trim() !== parti) return;

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

      const stats = lanStats.get(lan);

      stats.votes2018 += Number(row.roster2018 || 0);
      stats.votes2022 += Number(row.roster2022 || 0);

    });


    // TOTALA RÖSTER PER LÄN

    electionResults.forEach(row => {

      const lan =
        kommunToLan.get(row.kommun)
        || "Okänt län";

      if (!lanStats.has(lan)) return;

      const stats = lanStats.get(lan);

      stats.total2018 += Number(row.roster2018 || 0);
      stats.total2022 += Number(row.roster2022 || 0);

    });


    return Array.from(lanStats.entries()).map(([lan, stats]) => {

      const percent2018 =
        (stats.votes2018 / stats.total2018) * 100;

      const percent2022 =
        (stats.votes2022 / stats.total2022) * 100;

      return [
        lan,
        percent2022 - percent2018
      ];

    });

  }


  // =====================================================
  // TOPP / BOTTEN LÄN
  // =====================================================

  function getTopAndBottomLan(parti) {

    const lanData =
      getLanData(parti);

    const strongest =
      [...lanData]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const weakest =
      [...lanData]
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);

    return {
      strongest,
      weakest
    };

  }


  // =====================================================
  // PIE CHART
  // =====================================================

  function drawLanPieChart(parti) {

    const lanData =
      getLanData(parti);

    const data = [
      ["Län", "Förändring"]
    ];

    lanData.forEach(([lan, diff]) => {

      data.push([
        lan,
        Math.abs(diff)
      ]);

    });

    const slices = {};

    lanData.forEach(([lan, diff], index) => {

      slices[index] = {
        color:
          diff >= 0
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


    // =====================================================
    // FÖRKLARING
    // =====================================================

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


    // =====================================================
    // TOPP 3 / BOTTEN 3
    // =====================================================

    const {
      strongest,
      weakest
    } = getTopAndBottomLan(parti);

    let md =
      `### Topp 3 starkaste län för ${parti}\n`;

    strongest.forEach(([lan, diff], i) => {

      md +=
        `${i + 1}. **${lan}** — +${diff.toFixed(2)} procentenheter\n`;

    });

    md +=
      `\n### Topp 3 svagaste län för ${parti}\n`;

    weakest.forEach(([lan, diff], i) => {

      md +=
        `${i + 1}. **${lan}** — ${diff.toFixed(2)} procentenheter\n`;

    });

    md += `
### Statistisk kommentar

Förändringarna visar hur ${parti} utvecklades geografiskt mellan valen 2018 och 2022.

- Positiva värden visar län där partiet ökade sin röstandel.
- Negativa värden visar län där partiet tappade röstandel.

Eftersom analysen bygger på hela populationen av registrerade röster beskriver resultaten faktiska förändringar i valutfallet och inte statistiska uppskattningar från ett stickprov.
`;

    addMdToPage(md);

  }


  // =====================================================
  // DROPDOWN GEOGRAFISK ANALYS
  // =====================================================

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

  partiSelect.addEventListener("change", () => {

    drawLanPieChart(partiSelect.value);

  });

  drawLanPieChart(partiSelect.value);


  // =====================================================
  // SLUTSATS
  // =====================================================

  const winners =
    [...changes]
      .sort((a, b) => b.change - a.change)
      .slice(0, 3);

  const losers =
    [...changes]
      .sort((a, b) => a.change - b.change)
      .slice(0, 3);

  addMdToPage(`

## Slutsats

Analysen visar tydliga förändringar i partiernas röstandelar mellan riksdagsvalen 2018 och 2022.

### Största vinnare
${winners.map((p, i) =>
  `${i + 1}. **${p.parti}** — +${p.change.toFixed(2)} procentenheter`
).join("  \n")}

### Största förlorare
${losers.map((p, i) =>
  `${i + 1}. **${p.parti}** — ${p.change.toFixed(2)} procentenheter`
).join("  \n")}

Resultaten visar att vissa partier stärkte sina positioner nationellt medan andra tappade stöd. Den geografiska analysen visar samtidigt att förändringarna varierade mellan olika län, vilket tyder på regionala skillnader i väljarnas beteende.

Eftersom analysen bygger på hela populationen av registrerade röster beskriver resultaten faktiska förändringar i valresultaten och inte statistiska uppskattningar från ett stickprov.

`);

}