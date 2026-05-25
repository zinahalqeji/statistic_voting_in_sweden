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

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatVotes(value) {
  return Math.round(value).toLocaleString("sv-SE") + " röster";
}

function formatVoteChange(value) {
  const abs = Math.abs(Math.round(value)).toLocaleString("sv-SE");
  if (value > 0) return "+" + abs + " röster";
  if (value < 0) return "-" + abs + " röster";
  return "0 röster";
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

function findBiggestParty(row) {
  let biggestParty = "";
  let maxVotes = 0;
  parties.forEach(function (party) {
    const votes = toNumber(row[party]);
    if (votes > maxVotes) {
      maxVotes = votes;
      biggestParty = party;
    }
  });
  return {
    party: biggestParty,
    votes: maxVotes,
    share: totalVotes(row) > 0 ? (maxVotes / totalVotes(row)) * 100 : 0
  };
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
    if (card.note) html += '<p style="font-size:14px; margin:0; color:#555;">' + card.note + '</p>';
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

function geographicAnalysis(county, biggest2018, biggest2022, biggestIncrease, biggestDecrease) {
  const sameParty = biggest2018.party === biggest2022.party;
  const dominantParty = biggest2022.party;
  const dominantName = partyNames[dominantParty];

  var stabilityText = "";
  if (sameParty) {
    stabilityText = "I <strong>" + county + "</strong> var <strong>" + partyNames[biggest2018.party] + "</strong> störst i båda valen. Detta tyder på ett stabilt röstningsmönster i länet – väljarna har i stor utsträckning behållit sina partisympatier mellan 2018 och 2022.";
  } else {
    stabilityText = "I <strong>" + county + "</strong> bytte det största partiet från <strong>" + partyNames[biggest2018.party] + "</strong> år 2018 till <strong>" + partyNames[biggest2022.party] + "</strong> år 2022. Detta är en tydlig politisk förändring i länet och värd att undersöka närmare.";
  }

  var partyContext = "";
  if (dominantParty === "S") {
    partyContext = "Socialdemokraterna är traditionellt starka i norra Sverige, i industrikommuner och i områden med hög andel arbetare och LO-anslutna. Ett S-dominerat län speglar ofta en stark facklig tradition och ett historiskt band mellan rörelsen och väljarna.";
  } else if (dominantParty === "M") {
    partyContext = "Moderaterna är traditionellt starka i södra Sverige, i välbärgade förorter och i storstadsregioner med hög andel tjänstemän och företagare. Ett M-dominerat län speglar ofta höga inkomstnivåer och en stark borgerlig tradition.";
  } else if (dominantParty === "SD") {
    partyContext = "Sverigedemokraterna har vuxit kraftigt sedan 2010-talet och är idag störst i flera sydsvenska och mellansvenska län. Partiet är ofta starkt i områden med lägre medianinkomst, högre arbetslöshet och där frågor om trygghet och invandring väger tungt hos väljarna.";
  } else if (dominantParty === "C") {
    partyContext = "Centerpartiet är traditionellt starkast på landsbygden och i glesbygdslän, där jordbruk, lokal service och landsbygdspolitik är centrala frågor. Ett C-dominerat län speglar ofta en stark agrartradition och glesbefolkade kommuner.";
  } else {
    partyContext = dominantName + " är det dominerande partiet i detta län, vilket speglar länets specifika socioekonomiska och demografiska sammansättning.";
  }

  var increaseText = "Partiet med störst ökning i antal röster var <strong>" + partyNames[biggestIncrease.Parti] + "</strong> med " + formatVoteChange(biggestIncrease.changeVotes) + " och en förändring på " + formatPE(biggestIncrease.changeShare) + ". ";
  var decreaseText = "Partiet med störst minskning var <strong>" + partyNames[biggestDecrease.Parti] + "</strong> med " + formatVoteChange(biggestDecrease.changeVotes) + " och en förändring på " + formatPE(biggestDecrease.changeShare) + ".";
  var causeText = "Det är viktigt att notera att röstförändringar inte nödvändigtvis beror på att enskilda väljare bytt parti. Förändringar kan också bero på att olika grupper röstar i olika utsträckning mellan valen, att nya väljare tillkommer (unga som fyller 18) eller att väljare väljer att inte rösta alls.";

  return stabilityText + "<br><br>" + partyContext + "<br><br>" + increaseText + decreaseText + "<br><br>" + causeText;
}

addMdToPage(`
# Populäraste parti geografiskt

Här undersöker vi vilket parti som är störst i olika län och hur rösterna förändrades mellan riksdagsvalen 2018 och 2022.

## Undersökningsfrågor

**1. Vilket parti är störst i olika delar av Sverige?**

**2. Varierar det populäraste partiet geografiskt mellan norr och söder?**

**3. Har det dominerande partiet förändrats mellan 2018 och 2022?**

**Enheter:**
- Antal röster anges i **antal röster** – det faktiska antalet röster partiet fick i länet.
- Röstandel anges i **procent (%)** – partiets andel av rösterna bland de åtta riksdagspartierna.
- Förändring i röstandel anges i **procentenheter (pe)** – skillnaden mellan 2022 och 2018 i procenttal.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att det populäraste partiet varierar tydligt mellan olika delar av Sverige. Vi förväntar oss att Socialdemokraterna dominerar i norra Sverige och i industrilän, medan Moderaterna är starka i södra Sverige och storstadsregioner. Vi undersöker också om Sverigedemokraternas tillväxt syns tydligt i vissa län och om något län bytte dominerande parti mellan 2018 och 2022."
));

addToPage(loadingBox());

if (!dbInfoOk) {
  removeLoadingBox();
  displayDbNotOkText();
} else {
  dbQuery.use("undersokning_2018");
  const data2018 = await dbQuery("SELECT * FROM roster_2018");

  dbQuery.use("undersokning_2022");
  const data2022 = await dbQuery("SELECT * FROM roster_2022");

  removeLoadingBox();

  const counties = data2022
    .filter(function (row) { return row.Omrade && row.Omrade.includes("län"); })
    .map(function (row) { return row.Omrade; })
    .sort(function (a, b) { return a.localeCompare(b, "sv"); });

  const chosenCounty = addDropdown("Välj län:", counties, counties[0]);

  const row2018 = data2018.find(function (row) { return row.Omrade === chosenCounty; });
  const row2022 = data2022.find(function (row) { return row.Omrade === chosenCounty; });

  if (!row2018 || !row2022) {
    addMdToPage("## Resultat\n\nDet saknas data för det valda länet.");
  } else {
    const biggest2018 = findBiggestParty(row2018);
    const biggest2022 = findBiggestParty(row2022);
    const total2018 = totalVotes(row2018);
    const total2022 = totalVotes(row2022);

    const partyComparison = parties.map(function (party) {
      const votes2018 = toNumber(row2018[party]);
      const votes2022 = toNumber(row2022[party]);
      const share2018 = total2018 > 0 ? (votes2018 / total2018) * 100 : 0;
      const share2022 = total2022 > 0 ? (votes2022 / total2022) * 100 : 0;
      return {
        Parti: party,
        votes2018: votes2018,
        votes2022: votes2022,
        share2018: share2018,
        share2022: share2022,
        changeVotes: votes2022 - votes2018,
        changeShare: share2022 - share2018
      };
    });

    const biggestIncrease = [...partyComparison].sort(function (a, b) { return b.changeVotes - a.changeVotes; })[0];
    const biggestDecrease = [...partyComparison].sort(function (a, b) { return a.changeVotes - b.changeVotes; })[0];

    addMdToPage("## Resultat för " + chosenCounty);

    addToPage(statCards([
      { title: "Största parti 2018", value: biggest2018.party, note: formatVotes(biggest2018.votes) + " – " + formatPercent(biggest2018.share) },
      { title: "Största parti 2022", value: biggest2022.party, note: formatVotes(biggest2022.votes) + " – " + formatPercent(biggest2022.share) },
      { title: "Förändring", value: biggest2018.party === biggest2022.party ? "Samma parti" : "Bytte parti", note: biggest2018.party + " → " + biggest2022.party },
      { title: "Störst ökning", value: biggestIncrease.Parti, note: formatVoteChange(biggestIncrease.changeVotes) }
    ]));

    addMdToPage(`
## Röstandel per parti – 2018

Diagrammet visar varje partis röstandel i **procent (%)** år 2018. Varje parti har sin egna färg.
`);

    addToPage(partyBadge(biggest2018.party, "Störst 2018: " + partyNames[biggest2018.party]));

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Parti", "Röstandel 2018 (%)", { role: "style" }],
        ...partyComparison.map(function (row) { return [row.Parti, row.share2018, "color: " + partyColors[row.Parti]]; })
      ],
      options: {
        title: "Röstandel per parti i " + chosenCounty + " – 2018 (%)",
        height: 520,
        chartArea: { width: "80%", height: "70%" },
        vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
        hAxis: { title: "Parti" },
        legend: "none"
      }
    });

    addMdToPage(`
## Röstandel per parti – 2022

Diagrammet visar varje partis röstandel år 2022. Varje parti har sin egna färg.
`);

    addToPage(partyBadge(biggest2022.party, "Störst 2022: " + partyNames[biggest2022.party]));

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Parti", "Röstandel 2022 (%)", { role: "style" }],
        ...partyComparison.map(function (row) { return [row.Parti, row.share2022, "color: " + partyColors[row.Parti]]; })
      ],
      options: {
        title: "Röstandel per parti i " + chosenCounty + " – 2022 (%)",
        height: 520,
        chartArea: { width: "80%", height: "70%" },
        vAxis: { title: "Röstandel (%)", viewWindow: { min: 0 } },
        hAxis: { title: "Parti" },
        legend: "none"
      }
    });

    addMdToPage(`
## Förändring i procentenheter 2018–2022

Staplar ovanför nolllinjen = partiet ökade, under nolllinjen = partiet minskade. Varje parti har sin egna färg.
`);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Parti", "Förändring (pe)", { role: "style" }],
        ...partyComparison.map(function (row) { return [row.Parti, row.changeShare, "color: " + partyColors[row.Parti]]; })
      ],
      options: {
        title: "Förändring i röstandel per parti i " + chosenCounty + " – 2018 till 2022 (pe)",
        height: 520,
        chartArea: { width: "80%", height: "70%" },
        vAxis: { title: "Förändring (procentenheter)" },
        hAxis: { title: "Parti" },
        legend: "none"
      }
    });

    addMdToPage(`
## Tabell: jämförelse 2018 och 2022

Förändring i röstandel anges i **procentenheter (pe)**.
`);

    tableFromData({
      data: partyComparison.map(function (row) {
        return {
          "Parti": row.Parti,
          "Röster 2018": formatVotes(row.votes2018),
          "Röster 2022": formatVotes(row.votes2022),
          "Förändring röster": formatVoteChange(row.changeVotes),
          "Andel 2018 (%)": formatPercent(row.share2018),
          "Andel 2022 (%)": formatPercent(row.share2022),
          "Förändring (pe)": formatPE(row.changeShare)
        };
      })
    });

    addToPage(infoBox(
      "Analys – " + chosenCounty,
      geographicAnalysis(chosenCounty, biggest2018, biggest2022, biggestIncrease, biggestDecrease)
    ));

    addMdToPage(`
## Metod och begränsningar

**Hur röstandel räknas ut:** Partiets röster divideras med summan av röster för S, M, SD, V, C, KD, L och MP i länet.

**Hur förändring räknas ut:** Förändring i antal röster = röster 2022 minus röster 2018. Förändring i röstandel (pe) = röstandel 2022 minus röstandel 2018.

**Varför tre diagram?** Två separata diagram för 2018 och 2022 gör det lättare att se varje partis egna färg. Det tredje diagrammet (förändring i pe) visar direkt vilka partier som vann och tappade.

**Begränsningar:** Analysen visar data på länsnivå. Röstandel (%) är ett bättre mått än antal röster för att jämföra partiernas relativa styrka.
`);
  }
}