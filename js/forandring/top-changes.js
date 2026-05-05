import { ages, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // =======================
  // INTRO
  // =======================
  addMdToPage(`
# Vinnare & förlorare (2018–2022)

### Syfte
Denna sida analyserar vilka riksdagspartier som har ökat respektive minskat mest i antal röster mellan valen 2018 och 2022.
`);

  // =======================
  // DROPDOWN: Visa som
  // =======================
  let viewMode = addDropdown("Visa som", ["Antal röster", "Procent (%)"]);

  // =======================
  // PARTY COLORS
  // =======================
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

  // =======================
  // EXTRACT PARTIES
  // =======================
  const allParties = [...new Set(electionResults.map(r => r.parti))];

  // =======================
  // CALCULATE TOTALS
  // =======================
  let changes = [];

  for (let parti of allParties) {

    const votes2018 = electionResults
      .filter(r => r.parti === parti)
      .reduce((sum, r) => sum + Number(r.roster2018 || 0), 0);

    const votes2022 = electionResults
      .filter(r => r.parti === parti)
      .reduce((sum, r) => sum + Number(r.roster2022 || 0), 0);

    const diff = votes2022 - votes2018;

    changes.push({
      parti,
      votes2018,
      votes2022,
      diff
    });
  }

  // =======================
  // NATIONAL TOTALS FOR %
  // =======================
  const total2018 = electionResults.reduce((s, r) => s + Number(r.roster2018), 0);
  const total2022 = electionResults.reduce((s, r) => s + Number(r.roster2022), 0);

  // Add percent values
  changes = changes.map(row => ({
    ...row,
    percent2018: (row.votes2018 / total2018) * 100,
    percent2022: (row.votes2022 / total2022) * 100,
    percentDiff: ((row.votes2022 / total2022) * 100) - ((row.votes2018 / total2018) * 100)
  }));

  // =======================
  // SORT BASED ON DROPDOWN
  // =======================
  if (viewMode === "Antal röster") {
    changes.sort((a, b) => b.diff - a.diff);
  } else {
    changes.sort((a, b) => b.percentDiff - a.percentDiff);
  }

  // =======================
  // RANKING TEXT
  // =======================
  addMdToPage(`
## Rangordning: Vinnare och förlorare (${viewMode})
`);

  let rankingText = "";

  changes.forEach((row, index) => {
    const arrow = (viewMode === "Antal röster")
      ? (row.diff > 0 ? "⬆️" : row.diff < 0 ? "⬇️" : "⏺")
      : (row.percentDiff > 0 ? "⬆️" : row.percentDiff < 0 ? "⬇️" : "⏺");

    const value = (viewMode === "Antal röster")
      ? `${row.diff.toLocaleString("sv-SE")} röster`
      : `${row.percentDiff.toFixed(2)} procentenheter`;

    rankingText += `**${index + 1}. ${row.parti}** — ${arrow} ${value}  
`;
  });

  addMdToPage(rankingText);

  // =======================
  // CHART DATA
  // =======================
  let chartData = [['Parti', 'Förändring', { role: 'style' }]];

  changes.forEach(row => {
    const color = partyColors[row.parti] || '#888888';

    const value = (viewMode === "Antal röster")
      ? row.diff
      : row.percentDiff;

    chartData.push([row.parti, value, `color: ${color}`]);
  });

  // =======================
  // DRAW CHART
  // =======================
  drawGoogleChart({
    type: 'ColumnChart',
    data: chartData,
    options: {
      title: `Förändring per parti (2018–2022) — ${viewMode}`,
      height: 500,
      width: 1250,
      hAxis: { title: 'Parti' },
      vAxis: { title: viewMode },
      legend: 'none',
      bar: { groupWidth: '90%' }
    }
  });

}
