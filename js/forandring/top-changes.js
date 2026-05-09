import { lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ================================
  // 🧾 INTRO
  // ================================
  addMdToPage(`
# Vinnare & förlorare (2018–2022)

Analys av förändring i antal röster per parti samt geografisk fördelning per län.
  `);

  // ================================
  // 🧹 DATA CLEANING
  // ================================
  const kommunFixes = {
    "strängns": "strängnäs"
  };

  function cleanKommunName(name) {
    const normalized = (name || "").trim().toLowerCase();
    return kommunFixes[normalized] || normalized;
  }

  // ================================
  // 🔗 CREATE LOOKUP (JOIN)
  // ================================
  const kommunToLan = new Map();

  lanKommun.forEach(row => {
    kommunToLan.set(row.kommun, row.lan);

  });

  // ================================
  // 🎨 PARTY COLORS
  // ================================
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

  // ================================
  // 📊 AGGREGATE NATIONAL DATA
  // ================================
  const partyStats = new Map();

  electionResults.forEach(row => {
    const parti = row.parti;

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
    diff: stats.votes2022 - stats.votes2018
  }));

  changes.sort((a, b) => b.diff - a.diff);

  // ================================
  // 🏆 RANKING
  // ================================
  addMdToPage(`## Nationell ranking`);

  const rankingText = changes.map((row, i) => {
    const arrow = row.diff > 0 ? "⬆️" : row.diff < 0 ? "⬇️" : "⏺";
    return `**${i + 1}. ${row.parti}** — ${arrow} ${row.diff.toLocaleString("sv-SE")} röster`;
  }).join("  \n");

  addMdToPage(rankingText);

  // ================================
  // 📊 COLUMN CHART (NATIONAL)
  // ================================
  const chartData = [['Parti', 'Förändring', { role: 'style' }]];

  changes.forEach(row => {
    const color = partyColors[row.parti] || '#888';
    chartData.push([row.parti, row.diff, `color: ${color}`]);
  });

  drawGoogleChart({
    type: 'ColumnChart',
    data: chartData,
    options: {
      title: 'Nationell förändring per parti',
      height: 500,
      width: 1200,
      legend: 'none',
      hAxis: { title: 'Parti' },
      vAxis: { title: 'Förändring i röster' }
    }
  });
  console.log("Unique län values:", [...new Set(electionResults.map(r => r.lan))]);


  // ================================
  // 🎛 DROPDOWN FOR PIECHART
  // ================================
  addMdToPage(`## Geografisk analys per län`);

  const chosenParti = addDropdown("Välj parti (alla län)", changes.map(r => r.parti));

  // ================================
  // 📍 AGGREGATE PER LÄN
  // ================================
  function getLanData(parti) {

    const lanStats = new Map();

    electionResults.forEach(row => {
      if (row.parti !== parti) return;

      const lan = kommunToLan.get(row.kommun) || "Okänt län";

      const diff = Number(row.roster2022 || 0) - Number(row.roster2018 || 0);

      if (!lanStats.has(lan)) {
        lanStats.set(lan, 0);
      }

      lanStats.set(lan, lanStats.get(lan) + diff);
    });

    return Array.from(lanStats.entries());
  }

  // ================================
  // 📊 PIE CHART PER LÄN (GREEN/RED)
  // ================================
  function drawLanPieChart(parti) {

    const lanData = getLanData(parti);

    // PieChart data (absolute values)
    const data = [["Län", "Förändring"]];
    lanData.forEach(([lan, diff]) => {
      data.push([lan, Math.abs(diff)]);
    });

    // Slice colors (green = win, red = loss)
    const slices = {};
    lanData.forEach(([lan, diff], index) => {
      slices[index] = {
        color: diff >= 0 ? "#2ECC71" : "#E74C3C"   // green / red
      };
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

  // ================================
  // 🔁 EVENT
  // ================================
  drawLanPieChart(changes[0].parti);

  document.addEventListener("change", e => {
    if (e.target && e.target.tagName === "SELECT") {
      drawLanPieChart(e.target.value);
    }
  });

}
