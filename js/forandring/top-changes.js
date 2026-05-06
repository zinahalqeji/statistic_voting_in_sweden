import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

 // Intro

  addMdToPage(`
# Vinnare & förlorare (2018–2022)

### Syfte
Denna sida analyserar vilka riksdagspartier som ökade respektive minskade mest i röster mellan valen 2018 och 2022. Underlaget bygger på röster från **samtliga 290 kommuner** i Sverige och visar både nationella förändringar och geografiska mönster per län.

### Frågor som besvaras
- Vilka partier är de största **vinnarna** i antal röster?  
- Vilka partier är de största **förlorarna**?  
- Hur stora är förändringarna nationellt – i **antal röster** och i **procent**?  
- Hur fördelas partiernas vinst/förlust **geografiskt per län**?  
 
`);


  // Fixera kommunnamn i lanKommun (för att matcha med electionResults)

  lanKommun.forEach(row => {
    if (row.kommun.toLowerCase() === "strängns") {
      row.kommun = "Strängnäs";
    }
  });

  // Skapa en snabb uppslagning från kommun till län

  const kommunToLan = new Map();
  lanKommun.forEach(row => kommunToLan.set(row.kommun, row.lan));


  //  Partifärger (för att matcha valresultat.se och skapa enhetliga diagram)

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


  // Aggregera röster per parti och räkna ut förändringar

  const partyStats = new Map();

  electionResults.forEach(row => {
    const parti = row.parti.trim();  

    if (!partyStats.has(parti)) {
      partyStats.set(parti, { votes2018: 0, votes2022: 0 });
    }

    const stats = partyStats.get(parti);
    stats.votes2018 += Number(row.roster2018 || 0);
    stats.votes2022 += Number(row.roster2022 || 0);
  });

  const changes = Array.from(partyStats.entries()).map(([parti, stats]) => ({
    parti,
    votes2018: stats.votes2018,
    votes2022: stats.votes2022,
    diff: stats.votes2022 - stats.votes2018,
    pct: stats.votes2018 > 0 ? ((stats.votes2022 - stats.votes2018) / stats.votes2018) * 100 : 0
  }));


  // Dropdown för att välja visningsläge (antal röster vs procent)
 
  addMdToPage(`### Visa nationell förändring som`);

  addDropdown(
    "Visa som (ranking + diagram)",
    ["Antal röster", "Procent (%)"],
    "Antal röster"
  );

  // Get dropdown element
  const selects0 = document.querySelectorAll("select");
  const rankingModeSelect = selects0[selects0.length - 1];


  // Ranking av vinnare/förlorare baserat på valt visningsläge

  addMdToPage(`## Nationell ranking`);

  function drawRanking(mode) {
    let sorted;

    if (mode === "Antal röster") {
      sorted = [...changes].sort((a, b) => b.diff - a.diff);
    } else {
      sorted = [...changes].sort((a, b) => b.pct - a.pct);
    }

    const rankingText = sorted.map((row, i) => {
      const arrow = row.diff > 0 ? "⬆️" : row.diff < 0 ? "⬇️" : "⏺";
      const value = mode === "Antal röster"
        ? `${row.diff.toLocaleString("sv-SE")} röster`
        : `${row.pct.toFixed(2)} %`;

      return `**${i + 1}. ${row.parti}** — ${arrow} ${value}`;
    }).join("  \n");

    addMdToPage(rankingText, { replace: true });
  }


  // Chart som visar förändring per parti i antal röster eller procent

  function getNationalChartData(mode) {
    const data = [['Parti', 'Förändring', { role: 'style' }]];

    changes.forEach(row => {
      const color = partyColors[row.parti] || '#888';

      let value = mode === "Antal röster" ? row.diff : row.pct;

      data.push([row.parti, value, `color: ${color}`]);
    });

    return data;
  }

  function drawNationalChart(mode) {
    const data = getNationalChartData(mode);

    drawGoogleChart({
      type: 'ColumnChart',
      data: data,
      options: {
        title: `Nationell förändring per parti (${mode})`,
        height: 500,
        width: 1200,
        legend: 'none',
        hAxis: { title: 'Parti' },
        vAxis: {
          title: mode === "Antal röster" ? "Förändring i röster" : "Förändring i %",
        }
      }
    });
  }


  // Event listener för dropdown som uppdaterar både ranking och diagram när användaren ändrar visningsläge

  rankingModeSelect.addEventListener("change", () => {
    const mode = rankingModeSelect.value;
    drawRanking(mode);
    drawNationalChart(mode);
  });

  // First draw
  drawRanking(rankingModeSelect.value);
  drawNationalChart(rankingModeSelect.value);


  // Aggregera förändringar per län för valt parti

  function getLanData(parti) {
    const lanStats = new Map();

    electionResults.forEach(row => {
      if (row.parti.trim() !== parti) return;

      const lan = kommunToLan.get(row.kommun) || "Okänt län";
      const diff = Number(row.roster2022 || 0) - Number(row.roster2018 || 0);

      if (!lanStats.has(lan)) lanStats.set(lan, 0);
      lanStats.set(lan, lanStats.get(lan) + diff);
    });

    return Array.from(lanStats.entries());
  }


  // Pie chart som visar vinst/förlust per län för valt parti

  function drawLanPieChart(parti) {
    const lanData = getLanData(parti);

    const data = [["Län", "Förändring"]];
    lanData.forEach(([lan, diff]) => data.push([lan, Math.abs(diff)]));

    const slices = {};
    lanData.forEach(([lan, diff], index) => {
      slices[index] = { color: diff >= 0 ? "#2ECC71" : "#E74C3C" };
    });

    drawGoogleChart({
      type: "PieChart",
      data: data,
      options: {
        title: `Vinst/förlust per län — ${parti}`,
        height: 550,
        width: 900,
        pieHole: 0.35,
        legend: { position: "right" },
        slices: slices,
        tooltip: { text: "both" }
      }
    });
  }


  // Dropdown för att välja parti och visa geografisk analys per län

  addMdToPage(`## Geografisk analys per län`);

  addDropdown(
    "Välj parti (alla län)",
    changes.map(r => r.parti),
    changes[0].parti
  );

  const selects = document.querySelectorAll("select");
  const partiSelect = selects[selects.length - 1];

  partiSelect.addEventListener("change", () => {
    drawLanPieChart(partiSelect.value);
  });

  drawLanPieChart(partiSelect.value);
}
