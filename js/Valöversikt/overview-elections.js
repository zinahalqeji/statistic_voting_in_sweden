
addMdToPage("# Här är ett histogram över röster till dem olika partierna med en dropdown på år 2018 noch 2022 ")


dbQuery.use('valdata');

// Hämta tillgängliga år
let valdata = (await dbQuery('SELECT DISTINCT Ar FROM valresultat')).map(x => x.Ar);

// Dropdown för år
let currentage = addDropdown('År', valdata);

addMdToPage(`
  ## Röster per parti (${currentage})
`);

// Hämta data för valt år
let dataForChart = await dbQuery(
  `SELECT Parti, Roster FROM valresultat WHERE Ar = '${currentage}'`
);

// Färgkoder för partier
const partifarger = {
  'Socialdemokraterna': '#EE2020',
  'Moderaterna': '#1D74BB',
  'Sverigedemokraterna': '#DDDD00',
  'Centerpartiet': '#009933',
  'Vänsterpartiet': '#AF0000',
  'Kristdemokraterna': '#003F7D',
  'Liberalerna': '#6AB2E7',
  'Miljöpartiet': '#83CF39'
};

// Skapa ny array i formatet: ['Parti', 'Röster', { role: 'style' }]
let chartData = [['Parti', 'Röster', { role: 'style' }]];
dataForChart.forEach(row => {
  let color = partifarger[row.Parti] || '#888888';
  chartData.push([row.Parti, row.Roster, `color: ${color}`]);
});

drawGoogleChart({
  type: 'ColumnChart',
  data: chartData,
  options: {
    height: 500,
    width: 1250,
    hAxis: { title: 'Parti' },
    vAxis: { title: 'Antal röster' },
    legend: 'none',
    bar: { groupWidth: '90%' }
  }
});