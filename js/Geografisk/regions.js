import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

const parties = ["S", "M", "SD", "V", "C", "KD", "L", "MP"];

const partyColors = {
  S: "#E4003B",
  M: "#1B66AE",
  SD: "#DDCC00",
  V: "#9B1D20",
  C: "#009933",
  KD: "#005F8D",
  L: "#006AB3",
  MP: "#83CF39"
};

const partyNames = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "#Sverigedemokraterna",
  V: "Vänsterpartiet",
  C: "Centerpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet"
};

// Stapeldiagrammets färger visar vilket år stapeln tillhör
// oavsett valt parti – mörkröd = 2018, ljusröd = 2022.
const BAR_COLOR_2018 = "#A32D2D";
const BAR_COLOR_2022 = "#F09595";

// Norra Sverige definieras som de fem nordligaste länen.
// Övriga 16 län räknas som södra Sverige.
// Se metod-sektionen för motivering av denna indelning.
const NORTH_COUNTIES = [
  "Norrbottens län",
  "Västerbottens län",
  "Västernorrlands län",
  "Jämtlands län",
  "Gävleborgs län"
];

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

function formatVotes(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} röster`;
}

function formatPE(value) {
  const abs = Math.abs(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  if (value > 0) return `+${abs} pe`;
  if (value < 0) return `\u2212${abs} pe`;
  return `\u00B10,0 pe`;
}

function getRegion(area) {
  return NORTH_COUNTIES.includes(area) ? "Norra Sverige" : "Södra Sverige";
}

function totalPartyVotes(row) {
  return parties.reduce((sum, party) => sum + toNumber(row[party]), 0);
}

function buildRegionStats(data, party) {
  const groups = {};
  data.forEach(row => {
    if (!row.Omrade || !row.Omrade.includes("län")) return;
    const region = getRegion(row.Omrade);
    if (!groups[region]) {
      groups[region] = { region, partyVotes: 0, totalVotes: 0, areas: 0 };
    }
    groups[region].partyVotes += toNumber(row[party]);
    groups[region].totalVotes += totalPartyVotes(row);
    groups[region].areas += 1;
  });
  return Object.values(groups).map(row => ({
    region: row.region,
    areas: row.areas,
    partyVotes: row.partyVotes,
    share: row.totalVotes > 0 ? (row.partyVotes / row.totalVotes) * 100 : 0
  }));
}

function partyBadge(partyKey, label) {
  return `
    <div style="display:flex; align-items:center; gap:12px; margin:12px 0 8px 0;">
      <div style="
        width:44px; height:44px; border-radius:50%;
        background:${partyColors[partyKey]};
        display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:15px; color:#fff; flex-shrink:0;">
        ${partyKey}
      </div>
      <span style="font-size:16px; font-weight:500; color:#222;">${label}</span>
    </div>
  `;
}

function statCards(cards) {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">
      ${cards.map(card => `
        <div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h3 style="margin:0 0 10px 0; font-size:19px;">${card.title}</h3>
          <p style="font-size:23px; font-weight:bold; margin:0 0 6px 0;">${card.value}</p>
          ${card.note ? `<p style="font-size:14px; margin:0; color:#555;">${card.note}</p>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

function loadingBox() {
  return `
    <div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0;">
      <h3 style="margin:0 0 8px 0;">Laddar analysen...</h3>
      <p style="margin:0;">Hämtar valresultat från 2018 och 2022.</p>
    </div>
  `;
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

// Genererar en dynamisk analys baserat på valt parti och regionalt stöd.
// Förklarar varför skillnaden mellan norr och söder ser ut som den gör
// och diskuterar möjliga bakomliggande faktorer.
function regionalAnalysis(party, partyName, north2018, north2022, south2018, south2022) {
  const northChange = north2022.share - north2018.share;
  const southChange = south2022.share - south2018.share;
  const diff2022 = north2022.share - south2022.share;
  const strongerRegion = diff2022 > 0 ? "norra" : "södra";
  const weakerRegion = diff2022 > 0 ? "södra" : "norra";

  let partyContext = "";
  if (party === "S") {
    partyContext = `Socialdemokraterna har historiskt haft sitt starkaste fäste i norra Sverige,
    där industriorter, gruvkommuner och en stark fackföreningsrörelse länge präglat politiken.
    Partiet byggde upp sin dominans under 1900-talets industrialisering och har ett djupt rotat
    väljarstöd i dessa regioner. I södra Sverige, och särskilt i storstadsregionerna, är
    konkurrensen från andra partier hårdare.`;
  } else if (party === "M") {
    partyContext = `Moderaterna är traditionellt starkare i södra Sverige och i storstadsregionerna,
    där välbärgade förorter, höga inkomstnivåer och en stark borgerlig tradition gynnar partiet.
    I norra Sverige, med sin industrihistoria och starka fackföreningsrörelse, är det svårare
    för Moderaterna att nå lika höga siffror.`;
  } else if (party === "SD") {
    partyContext = `Sverigedemokraterna har vuxit i hela landet men visar ofta ett starkt stöd i
    mellansvenska och sydsvenska industri- och landsbygdskommuner. Skillnaden mellan norr och söder
    för SD speglar delvis att norra Sverige har en starkare S-tradition som konkurrerar med SD,
    medan södra Sverige har en mer varierad politisk geografi.`;
  } else if (party === "C") {
    partyContext = `Centerpartiet har historiskt haft starkast stöd på landsbygden och i glesbygden,
    vilket finns i både norra och södra Sverige. Norra Sverige med sina glesbefolkade kommuner
    kan vara en stark bas för C, men partiet har också tappat väljare på landsbygden generellt
    de senaste valen.`;
  } else if (party === "V") {
    partyContext = `Vänsterpartiet har traditionellt starka rötter i norra Sverige och i
    industrikommuner, men har under senare år också växt i storstädernas innerstad i söder.
    Skillnaden mellan norr och söder speglar denna dubbla väljarbase.`;
  } else {
    partyContext = `${partyName} visar ett geografiskt mönster som speglar partiets väljarbase
    och de socioekonomiska förhållanden som råder i norra respektive södra Sverige.`;
  }

  const changeText = `Mellan 2018 och 2022 förändrades stödet i norra Sverige med
  <strong>${formatPE(northChange)}</strong> och i södra Sverige med
  <strong>${formatPE(southChange)}</strong>. ` + (
      Math.abs(northChange - southChange) < 0.5
        ? `Förändringen var ungefär lika stor i båda regionerna, vilket tyder på att nationella
        trender påverkade partiet likartat i hela landet.`
        : northChange > southChange
          ? `Partiet ökade mer i norra Sverige, vilket kan tyda på att partiet stärkte sin position
          i sin traditionella väljarbase.`
          : `Partiet ökade mer i södra Sverige, vilket kan tyda på att partiet lyckades bredda
          sin väljarbase utanför sin traditionella kärna.`
    );

  const cautionText = `Det är viktigt att notera att skillnaden mellan norr och söder inte
  nödvändigtvis beror på geografin i sig. Regionerna skiljer sig åt i befolkningstäthet,
  åldersstruktur, utbildningsnivå, inkomst och industrihistoria – faktorer som var och en
  kan påverka röstningsmönstret mer direkt än var i landet man bor.`;

  return `${partyName} är starkare i <strong>${strongerRegion} Sverige</strong> än i
  ${weakerRegion} Sverige år 2022, med en skillnad på <strong>${formatPercent(Math.abs(diff2022))}</strong>
  i röstandel.<br><br>${partyContext}<br><br>${changeText}<br><br>${cautionText}`;
}

addMdToPage(`
# Regioner: Norr och Söder

Här undersöker vi om röstningsmönster skiljer sig mellan norra och södra Sverige i riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Skiljer sig röstningsmönster mellan norra och södra Sverige?**

**2. Är skillnaden stor eller liten och har den förändrats mellan 2018 och 2022?**

**3. Vilka partier gynnas mest respektive minst i norra Sverige?**

**Enheter:**
- Röstandel anges i **procent (%)** – partiets andel av rösterna bland de åtta riksdagspartierna.
- Förändring anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018 i procenttal.
- Antal röster anges i **antal röster** – det faktiska antalet röster partiet fick i regionen.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att röstningsmönster skiljer sig tydligt mellan norra och södra Sverige. Vi förväntar oss att Socialdemokraterna är starkare i norr, där industriorter och fackföreningsrörelsen historiskt präglat politiken. Vi förväntar oss också att Moderaterna och Sverigedemokraterna är starkare i södra Sverige. Vi undersöker om dessa mönster syns i data och om de förändrades mellan 2018 och 2022."
));

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
}
else {
  dbQuery.use("undersokning_2018");
  const data2018 = await dbQuery("SELECT * FROM roster_2018");

  dbQuery.use("undersokning_2022");
  const data2022 = await dbQuery("SELECT * FROM roster_2022");

  removeLoadingBox();

  const chosenParty = addDropdown("Välj parti:", parties, "S");
  const chosenPartyName = partyNames[chosenParty];

  const stats2018 = buildRegionStats(data2018, chosenParty);
  const stats2022 = buildRegionStats(data2022, chosenParty);

  const north2018 = stats2018.find(r => r.region === "Norra Sverige");
  const south2018 = stats2018.find(r => r.region === "Södra Sverige");
  const north2022 = stats2022.find(r => r.region === "Norra Sverige");
  const south2022 = stats2022.find(r => r.region === "Södra Sverige");

  const northChange = north2022.share - north2018.share;
  const southChange = south2022.share - south2018.share;
  const diff2022 = Math.abs(north2022.share - south2022.share);
  const strongerRegion = north2022.share > south2022.share ? "Norra Sverige" : "Södra Sverige";

  addMdToPage(`## Sammanfattning av urvalet`);

  addToPage(statCards([
    {
      title: "Valt parti",
      value: chosenParty,
      note: chosenPartyName
    },
    {
      title: "Norra Sverige 2022",
      value: formatPercent(north2022.share),
      note: `${north2022.areas} län ingår`
    },
    {
      title: "Södra Sverige 2022",
      value: formatPercent(south2022.share),
      note: `${south2022.areas} län ingår`
    },
    {
      title: "Starkast region 2022",
      value: strongerRegion,
      note: `Skillnad: ${formatPercent(diff2022)}`
    }
  ]));

  addMdToPage(`
## Röststöd i norr och söder

Diagrammet visar röstandel (%) för **${chosenPartyName}** i norra och södra Sverige år 2018 och 2022. **Mörkröd stapel = 2018, ljusröd stapel = 2022.**

Norra Sverige = ${NORTH_COUNTIES.length} nordligaste länen. Södra Sverige = övriga ${south2022.areas} län. Röstandelen för varje region räknas ut som partiets sammanlagda röster i regionen dividerat med summan av alla åtta partiernas röster i regionen.
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Region", "2018 (%)", "2022 (%)"],
      ["Norra Sverige", north2018.share, north2022.share],
      ["Södra Sverige", south2018.share, south2022.share]
    ],
    options: {
      title: `Röstandel för ${chosenPartyName} (${chosenParty}) – Norr vs Söder`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      hAxis: { title: "Region" },
      colors: [BAR_COLOR_2018, BAR_COLOR_2022]
    }
  });

  addMdToPage(`
## Förändring mellan 2018 och 2022

Diagrammet visar hur mycket röstandelen förändrades (i procentenheter) i norra respektive södra Sverige. En stapel ovanför nolllinjen innebär att partiet ökade sin andel – under nolllinjen att det minskade. Varje region har sin egna färg.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Region", "Förändring (pe)", { role: "style" }],
      ["Norra Sverige", northChange, "color: #2f5d50"],
      ["Södra Sverige", southChange, "color: #82b5a8"]
    ],
    options: {
      title: `Förändring i röstandel för ${chosenPartyName} (${chosenParty}) 2018–2022 (pe)`,
      height: 400,
      chartArea: { width: "75%", height: "65%" },
      vAxis: { title: "Förändring (procentenheter)" },
      hAxis: { title: "Region" },
      legend: "none"
    }
  });

  addMdToPage(`
## Tabell: jämförelse norr och söder

Tabellen visar röstandel och antal röster för båda regionerna i båda valen. Förändringen anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018.
`);

  tableFromData({
    data: [
      {
        Region: "Norra Sverige",
        "Antal län": north2018.areas,
        "Röstandel 2018 (%)": formatPercent(north2018.share),
        "Röster 2018": formatVotes(north2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(north2022.share),
        "Röster 2022": formatVotes(north2022.partyVotes),
        "Förändring (pe)": formatPE(northChange)
      },
      {
        Region: "Södra Sverige",
        "Antal län": south2018.areas,
        "Röstandel 2018 (%)": formatPercent(south2018.share),
        "Röster 2018": formatVotes(south2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(south2022.share),
        "Röster 2022": formatVotes(south2022.partyVotes),
        "Förändring (pe)": formatPE(southChange)
      }
    ]
  });

  addToPage(infoBox(
    `Analys – ${chosenPartyName} i norr och söder`,
    regionalAnalysis(chosenParty, chosenPartyName, north2018, north2022, south2018, south2022)
  ));

  addMdToPage(`
## Metod och begränsningar

Analysen bygger på valresultat från tabellerna **roster_2018** och **roster_2022**.

**Hur regionerna definieras:** Norra Sverige = Norrbottens, Västerbottens, Västernorrlands, Jämtlands och Gävleborgs län (de fem nordligaste länen). Södra Sverige = övriga 16 län. Indelningen är geografisk och förrenklad – Dalarna och Värmland är geografiskt mellansvenska men räknas här som södra Sverige. En mer detaljerad analys skulle kunna dela in Sverige i fler regioner.

**Hur röstandel räknas ut:** Partiets sammanlagda röster i regionen divideras med summan av röster för S, M, SD, V, C, KD, L och MP i samma region. Övriga partier och blankröster ingår inte i nämnaren.

**Hur förändring räknas ut:** Förändring i pe = röstandel 2022 minus röstandel 2018. Positivt värde = partiet ökade, negativt = partiet minskade.

**Begränsningar:** Indelningen norr/söder är grov och döljer variation inom regionerna. Södra Sverige innehåller t.ex. både Stockholm och glesbygdslän i Småland, som kan ha mycket olika röstningsmönster. Stora befolkningsrika län som Stockholm, Västra Götaland och Skåne påverkar södra Sveriges genomsnitt mer än mindre län.
`);
}