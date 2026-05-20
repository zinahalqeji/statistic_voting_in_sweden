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
  SD: "Sverigedemokraterna",
  V: "Vänsterpartiet",
  C: "Centerpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet"
};

const BAR_COLOR_2018 = "#A32D2D";
const BAR_COLOR_2022 = "#F09595";

const BIG_CITY_COUNTIES = [
  "Stockholms län",
  "Skåne län",
  "Västra Götalands län"
];

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatVotes(value) {
  return Math.round(value).toLocaleString("sv-SE") + " röster";
}

function formatPercent(value) {
  return value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + " %";
}

function formatPE(value) {
  const abs = Math.abs(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  if (value > 0) return "+" + abs + " pe";
  if (value < 0) return "-" + abs + " pe";
  return "0,0 pe";
}

function totalVotes(row) {
  return parties.reduce((sum, party) => sum + toNumber(row[party]), 0);
}

function getAreaType(area) {
  return BIG_CITY_COUNTIES.includes(area) ? "Storstadslän" : "Mindre tätbefolkade län";
}

function buildAreaTypeStats(data, party) {
  const groups = {};
  data
    .filter(row => row.Omrade && row.Omrade.includes("län"))
    .forEach(row => {
      const type = getAreaType(row.Omrade);
      if (!groups[type]) {
        groups[type] = { type, partyVotes: 0, totalVotes: 0, areas: 0 };
      }
      groups[type].partyVotes += toNumber(row[party]);
      groups[type].totalVotes += totalVotes(row);
      groups[type].areas += 1;
    });
  return Object.values(groups).map(row => ({
    type: row.type,
    areas: row.areas,
    partyVotes: row.partyVotes,
    share: row.totalVotes > 0 ? (row.partyVotes / row.totalVotes) * 100 : 0
  }));
}

function partyBadge(partyKey, label) {
  return '<div style="display:flex; align-items:center; gap:12px; margin:12px 0 8px 0;">'
    + '<div style="width:44px; height:44px; border-radius:50%; background:' + partyColors[partyKey] + '; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:#fff; flex-shrink:0;">'
    + partyKey
    + '</div>'
    + '<span style="font-size:16px; font-weight:500; color:#222;">' + label + '</span>'
    + '</div>';
}

function statCards(cards) {
  var html = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">';
  cards.forEach(function (card) {
    html += '<div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">';
    html += '<h3 style="margin:0 0 10px 0; font-size:19px;">' + card.title + '</h3>';
    html += '<p style="font-size:23px; font-weight:bold; margin:0 0 6px 0;">' + card.value + '</p>';
    if (card.note) {
      html += '<p style="font-size:14px; margin:0; color:#555;">' + card.note + '</p>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function infoBox(title, text) {
  return '<div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">'
    + '<h3 style="margin:0 0 10px 0; font-size:19px;">' + title + '</h3>'
    + '<p style="margin:0; line-height:1.75; font-size:16px;">' + text + '</p>'
    + '</div>';
}

function loadingBox() {
  return '<div id="loading-message" style="background:white; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:22px 0;">'
    + '<h3 style="margin:0 0 8px 0;">Laddar analysen...</h3>'
    + '<p style="margin:0;">Hämtar valresultat från 2018 och 2022.</p>'
    + '</div>';
}

function removeLoadingBox() {
  const el = document.getElementById("loading-message");
  if (el) el.remove();
}

function urbanRuralAnalysis(party, partyName, cityChange, lessDenseChange, gap2018, gap2022) {
  const strongerIn = gap2022 > 0 ? "storstadslän" : "mindre tätbefolkade län";
  const weakerIn = gap2022 > 0 ? "mindre tätbefolkade län" : "storstadslän";

  var partyContext = "";
  if (party === "S") {
    partyContext = "Socialdemokraterna har historiskt haft stöd i båda miljöerna – i industrikommuner på landsbygden och i storstädernas arbetarklasskvarter. Storstadslänen innehåller både välbärgade förorter där S är svaga och invandrartäta förorter och industriorter där S traditionellt är starka.";
  } else if (party === "M") {
    partyContext = "Moderaterna är tydligt starkare i storstadslänen, där välbärgade förorter och en hög andel tjänstemän och företagare finns. I mindre tätbefolkade län är det svårare för M att nå lika höga siffror.";
  } else if (party === "SD") {
    partyContext = "Sverigedemokraterna visar ofta ett starkt stöd i mellansvenska och sydsvenska industri- och landsbygdskommuner. I storstadslänen möter SD hårdare konkurrens från andra partier.";
  } else if (party === "C") {
    partyContext = "Centerpartiet har sin traditionella väljarbase på landsbygden och i glesbygden. Det gör att partiet förväntas vara starkare i mindre tätbefolkade län.";
  } else if (party === "MP") {
    partyContext = "Miljöpartiet är tydligt starkare i storstadslänen, där en högre andel universitetsutbildade och yngre väljare finns.";
  } else if (party === "V") {
    partyContext = "Vänsterpartiet har en blandad väljarbase – starka rötter i norrländska industrikommuner men också ett växande stöd i storstädernas innerstad bland unga och universitetsutbildade.";
  } else {
    partyContext = partyName + " visar ett geografiskt mönster som speglar partiets väljarbase och de socioekonomiska skillnader som råder mellan storstadslänen och landsbygdslänen.";
  }

  var gapText = "Skillnaden i röstandel mellan storstadslän och mindre tätbefolkade län var "
    + formatPercent(Math.abs(gap2018)) + " år 2018 och "
    + formatPercent(Math.abs(gap2022)) + " år 2022. ";
  if (Math.abs(gap2022 - gap2018) < 0.3) {
    gapText += "Gapet är i stort sett oförändrat, vilket tyder på att skillnaden mellan stad och landsbygd är stabil för detta parti.";
  } else if (gap2022 > gap2018) {
    gapText += "Gapet har ökat, vilket tyder på att " + partyName + " stärkt sin position i storstadslänen relativt landsbygdslänen.";
  } else {
    gapText += "Gapet har minskat, vilket tyder på att skillnaden mellan stad och landsbygd blivit mindre för " + partyName + ".";
  }

  var causeText = "Det är viktigt att notera att skillnaden mellan storstadslän och landsbygdslän inte nödvändigtvis beror på om man bor i stad eller på landsbygd i sig. Storstadslänen skiljer sig från landsbygdslänen i utbildningsnivå, inkomstnivå, åldersstruktur och andel utrikes födda – faktorer som kan påverka röstningen mer direkt än var man bor. Stad vs landsbygd är alltså snarare en indikatorvariabel för dessa socioekonomiska skillnader än en direkt orsak till röstningsmönstret.";

  return partyName + " är starkare i " + strongerIn + " än i " + weakerIn + " år 2022."
    + " I storstadslänen förändrades stödet med " + formatPE(cityChange)
    + " och i mindre tätbefolkade län med " + formatPE(lessDenseChange) + " mellan valen."
    + "<br><br>" + partyContext
    + "<br><br>" + gapText
    + "<br><br>" + causeText;
}

addMdToPage(`
# Stad vs landsbygd

Här jämför vi Sveriges tre största storstadslän med mindre tätbefolkade län för att undersöka om röstningsmönster skiljer sig geografiskt mellan riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Skiljer sig röstningsmönster mellan storstadslän och mindre tätbefolkade län?**

**2. Är skillnaden stor eller liten och har den förändrats mellan 2018 och 2022?**

**3. Vilka partier gynnas mest i storstadslänen respektive på landsbygden?**

**Enheter:**
- Röstandel anges i **procent (%)** – partiets andel av rösterna bland de åtta riksdagspartierna.
- Förändring anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018 i procenttal.
- Antal röster anges i **antal röster** – det faktiska antalet röster partiet fick i gruppen.

**Indelning:**
- **Storstadslän** = Stockholms, Skåne och Västra Götalands län.
- **Mindre tätbefolkade län** = övriga 18 län.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att röstningsmönster skiljer sig tydligt mellan storstadslän och mindre tätbefolkade län. Vi förväntar oss att Moderaterna och Miljöpartiet är starkare i storstadslänen, och att Centerpartiet och Sverigedemokraterna är starkare i landsbygdslänen. Vi undersöker också om gapet mellan stad och landsbygd förändrats mellan 2018 och 2022."
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

  const stats2018 = buildAreaTypeStats(data2018, chosenParty);
  const stats2022 = buildAreaTypeStats(data2022, chosenParty);

  const city2018 = stats2018.find(r => r.type === "Storstadslän");
  const lessDense2018 = stats2018.find(r => r.type === "Mindre tätbefolkade län");
  const city2022 = stats2022.find(r => r.type === "Storstadslän");
  const lessDense2022 = stats2022.find(r => r.type === "Mindre tätbefolkade län");

  const cityChange = city2022.share - city2018.share;
  const lessDenseChange = lessDense2022.share - lessDense2018.share;
  const gap2018val = city2018.share - lessDense2018.share;
  const gap2022val = city2022.share - lessDense2022.share;
  const strongerIn = city2022.share > lessDense2022.share ? "Storstadslän" : "Mindre tätbefolkade län";

  addMdToPage("## Sammanfattning av urvalet");

  addToPage(statCards([
    {
      title: "Valt parti",
      value: chosenParty,
      note: chosenPartyName
    },
    {
      title: "Storstadslän 2022",
      value: formatPercent(city2022.share),
      note: "Förändring: " + formatPE(cityChange)
    },
    {
      title: "Landsbygdslän 2022",
      value: formatPercent(lessDense2022.share),
      note: "Förändring: " + formatPE(lessDenseChange)
    },
    {
      title: "Starkast i",
      value: strongerIn,
      note: "Gap: " + formatPercent(Math.abs(gap2022val))
    }
  ]));

  addMdToPage(`
## Röstandel – storstadslän vs landsbygdslän

Diagrammet visar röstandel (%) för **${chosenPartyName}** i storstadslän och mindre tätbefolkade län år 2018 och 2022. **Mörkröd stapel = 2018, ljusröd stapel = 2022.**
`);

  addToPage(partyBadge(chosenParty, chosenPartyName));

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Områdestyp", "2018 (%)", "2022 (%)"],
      ["Storstadslän", city2018.share, city2022.share],
      ["Mindre tätbefolkade län", lessDense2018.share, lessDense2022.share]
    ],
    options: {
      title: "Röstandel för " + chosenPartyName + " (" + chosenParty + ") – Stad vs Landsbygd",
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
      hAxis: { title: "Områdestyp" },
      colors: [BAR_COLOR_2018, BAR_COLOR_2022]
    }
  });

  addMdToPage(`
## Förändring i procentenheter 2018–2022

Diagrammet visar hur mycket röstandelen förändrades mellan 2018 och 2022 i varje grupp. En stapel **ovanför nolllinjen** innebär att partiet ökade – **under nolllinjen** att det minskade.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Områdestyp", "Förändring (pe)", { role: "style" }],
      ["Storstadslän", cityChange, "color: #2f5d50"],
      ["Mindre tätbefolkade län", lessDenseChange, "color: #82b5a8"]
    ],
    options: {
      title: "Förändring i röstandel för " + chosenPartyName + " (" + chosenParty + ") 2018–2022 (pe)",
      height: 400,
      chartArea: { width: "75%", height: "65%" },
      vAxis: { title: "Förändring (procentenheter)" },
      hAxis: { title: "Områdestyp" },
      legend: "none"
    }
  });

  addMdToPage(`
## Tabell: röstandel och röster

Tabellen visar röstandel och antal röster för båda grupperna i båda valen. Förändringen anges i **procentenheter (pe)**. Positivt värde = partiet ökade, negativt = partiet minskade.
`);

  tableFromData({
    data: [
      {
        "Områdestyp": "Storstadslän",
        "Ingående län": "Stockholm, Skåne, V.Götaland",
        "Antal län": city2018.areas,
        "Röstandel 2018 (%)": formatPercent(city2018.share),
        "Röster 2018": formatVotes(city2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(city2022.share),
        "Röster 2022": formatVotes(city2022.partyVotes),
        "Förändring (pe)": formatPE(cityChange)
      },
      {
        "Områdestyp": "Mindre tätbefolkade län",
        "Ingående län": "Övriga 18 län",
        "Antal län": lessDense2018.areas,
        "Röstandel 2018 (%)": formatPercent(lessDense2018.share),
        "Röster 2018": formatVotes(lessDense2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(lessDense2022.share),
        "Röster 2022": formatVotes(lessDense2022.partyVotes),
        "Förändring (pe)": formatPE(lessDenseChange)
      }
    ]
  });

  addToPage(infoBox(
    "Analys – " + chosenPartyName + ": stad vs landsbygd",
    urbanRuralAnalysis(chosenParty, chosenPartyName, cityChange, lessDenseChange, gap2018val, gap2022val)
  ));

  addMdToPage(`
## Metod och begränsningar

Analysen bygger på valresultat från tabellerna **roster_2018** och **roster_2022**.

**Hur indelningen görs:** Storstadslän = Stockholms, Skåne och Västra Götalands län. Övriga 18 län räknas som mindre tätbefolkade.

**Hur röstandel räknas ut:** Partiets sammanlagda röster i gruppen divideras med summan av röster för S, M, SD, V, C, KD, L och MP i samma grupp.

**Hur förändring räknas ut:** Förändring i pe = röstandel 2022 minus röstandel 2018.

**Begränsningar:** Indelningen stad/landsbygd är förenklad. Skåne och Västra Götaland innehåller både stora städer och landsbygd. Stockholms län dominerar storstadsgruppen eftersom det är landets folkrikaste län.
`);
}