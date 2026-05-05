import { ages, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  
  // Into

  addMdToPage(`
# Vinnare & förlorare (2018–2022)

### Syfte
Denna sida analyserar vilka riksdagspartier som har ökat respektive minskat mest i antal röster mellan valen 2018 och 2022. Analysen bygger på röster från **samtliga 290 kommuner** i Sverige.

### Frågor som besvaras
- Vilka partier är de största **vinnarna** i antal röster?  
- Vilka partier är de största **förlorarna**?  
- Hur stora är förändringarna nationellt?  
`);


  // Parti färger

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



  // Utvinna alla partier
 
  const allParties = [...new Set(electionResults.map(r => r.parti))];



  // Beräkna det totala antalet röster per parti 

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


  // Sortera efter största ökningen i antal röster (vinnare överst)

  changes.sort((a, b) => b.diff - a.diff);


  addMdToPage(`
## Rangordning: Vinnare och förlorare i antal röster
`);

  let rankingText = "";

  changes.forEach((row, index) => {
    const arrow = row.diff > 0 ? "⬆️" : row.diff < 0 ? "⬇️" : "⏺";
    rankingText += `**${index + 1}. ${row.parti}** — ${arrow} ${row.diff.toLocaleString("sv-SE")} röster  
`;
  });

  addMdToPage(rankingText);


  // Förbered data för diagram

  let chartData = [['Parti', 'Förändring', { role: 'style' }]];

  changes.forEach(row => {
    const color = partyColors[row.parti] || '#888888';
    chartData.push([row.parti, row.diff, `color: ${color}`]);
  });


  // Rita diagram

  drawGoogleChart({
    type: 'ColumnChart',
    data: chartData,
    options: {
      title: 'Förändring i antal röster per parti (2022 jämfört med 2018)',
      height: 500,
      width: 1250,
      hAxis: { title: 'Parti' },
      vAxis: { title: 'Förändring i antal röster' },
      legend: 'none',
      bar: { groupWidth: '90%' }
    }
  });
}