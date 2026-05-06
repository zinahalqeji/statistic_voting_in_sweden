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


  // 🧹 Fixera kommunnamn (för join)

  lanKommun.forEach(row => {
    if (row.kommun.toLowerCase() === "strängns") {
      row.kommun = "Strängnäs";
    }
  });


  // Join-kommun-till-län för geografisk analys

  const kommunToLan = new Map();
  lanKommun.forEach(row => kommunToLan.set(row.kommun, row.lan));

 
  // Partifärger (för diagram)
 
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


  // Aggregera röster per parti och år

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


  // Dropdown: Visa som (ranking + diagram)

  addMdToPage(`### Visa nationell förändring som`);

  addDropdown(
    "Visa som (ranking + diagram)",
    ["Antal röster", "Procent (%)"],
    "Antal röster"
  );

  const selects0 = document.querySelectorAll("select");
  const rankingModeSelect = selects0[selects0.length - 1];


  // Ranking + nationellt diagram

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


  // Nationellt diagram (förändring i antal röster eller procent)

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

  rankingModeSelect.addEventListener("change", () => {
    const mode = rankingModeSelect.value;
    drawRanking(mode);
    drawNationalChart(mode);
  });

  drawRanking(rankingModeSelect.value);
  drawNationalChart(rankingModeSelect.value);


  //Aggreggera röster per parti och år (för geografisk analys)

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

 
  // Top 3 starkaste och svagaste län (för geografisk analys)

  function getTopAndBottomLan(parti) {
    const lanData = getLanData(parti);

    const sorted = [...lanData].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    const strongest = sorted.filter(([lan, diff]) => diff > 0).slice(0, 3);
    const weakest = sorted.filter(([lan, diff]) => diff < 0).slice(0, 3);

    return { strongest, weakest };
  }


  // Pie-chart: Vinst/förlust per län (för geografisk analys)

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

        //Inställningar för legend
        legend: {
          position: "right",
          textStyle: { fontSize: 14 },
        },

        slices: slices,
        tooltip: { text: "both" }
      }
    });

    //Förklaring av färger (för geografisk analys)
    addMdToPage(`
<div style="display:flex; gap:20px; margin-top:10px;">
  <div style="display:flex; align-items:center; gap:6px;">
    <div style="width:16px; height:16px; background:#2ECC71; border:1px solid #000;"></div>
    <span>Ökning i antal röster</span>
  </div>

  <div style="display:flex; align-items:center; gap:6px;">
    <div style="width:16px; height:16px; background:#E74C3C; border:1px solid #000;"></div>
    <span>Minskning i antal röster</span>
  </div>
</div>
`, { replace: false });

    // Topp 3 starkaste och svagaste län (för geografisk analys)
    const { strongest, weakest } = getTopAndBottomLan(parti);

    let md = `### Topp 3 starkaste län för ${parti}\n`;
    strongest.forEach(([lan, diff], i) => {
      md += `${i + 1}. **${lan}** — +${diff.toLocaleString("sv-SE")} röster\n`;
    });

    md += `\n### Topp 3 svagaste län för ${parti}\n`;
    weakest.forEach(([lan, diff], i) => {
      md += `${i + 1}. **${lan}** — ${diff.toLocaleString("sv-SE")} röster\n`;
    });

    //Statistisk kommentar (för geografisk analys)
    md += `
### Statistisk kommentar
Förändringarna i röster per län visar hur ${parti} har utvecklats geografiskt mellan valen 2018 och 2022.  
- De starkaste länen representerar områden där partiet har haft **stabilt eller ökande väljarstöd**.  
- De svagaste länen visar **geografiska förluster**, vilket kan bero på lokala frågor, demografiska förändringar eller konkurrens från andra partier.  

Dessa siffror bygger på **hela populationen av röster**, inte stickprov. Därför behövs inga konfidensintervall — förändringarna är **exakta**, inte uppskattningar.  
Variationerna mellan län kan däremot tolkas som ett mått på **regional spridning** i partiets väljarstöd.  
`;

    addMdToPage(md, { replace: false });
  }


  // Dropdown + initialt diagram för geografisk analys

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
