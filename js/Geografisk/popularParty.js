import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

const parties = ["S", "M", "SD", "V", "C", "KD", "L", "MP"];

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatVotes(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} röster`;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} %`;
}

function totalVotes(row) {
  return parties.reduce((sum, party) => sum + toNumber(row[party]), 0);
}

function findBiggestParty(row) {
  let biggestParty = "";
  let maxVotes = 0;

  parties.forEach(party => {
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

addMdToPage(`
# Populäraste parti geografiskt

Här undersöker vi vilket parti som är störst i olika län och hur rösterna förändrades mellan riksdagsvalen 2018 och 2022.

## Fråga
**Vilket parti är störst i olika delar av Sverige, och hur varierar det geografiskt?**

**Enheter:** röster anges i **antal röster** och röstandel anges i **procent (%)**.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att det populäraste partiet varierar mellan olika län. Genom att välja ett län i dropdown-menyn kan vi se vilket parti som var störst 2018 och 2022 samt hur rösterna förändrats."
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

  const counties = data2022
    .filter(row => row.Omrade && row.Omrade.includes("län"))
    .map(row => row.Omrade)
    .sort((a, b) => a.localeCompare(b, "sv"));

  const chosenCounty = addDropdown("Välj län:", counties, counties[0]);

  const row2018 = data2018.find(row => row.Omrade === chosenCounty);
  const row2022 = data2022.find(row => row.Omrade === chosenCounty);

  if (!row2018 || !row2022) {
    addMdToPage(`
## Resultat

Det saknas data för det valda länet.
`);
  }
  else {
    const biggest2018 = findBiggestParty(row2018);
    const biggest2022 = findBiggestParty(row2022);

    const total2018 = totalVotes(row2018);
    const total2022 = totalVotes(row2022);

    const partyComparison = parties.map(party => {
      const votes2018 = toNumber(row2018[party]);
      const votes2022 = toNumber(row2022[party]);

      return {
        Parti: party,
        votes2018,
        votes2022,
        share2018: total2018 > 0 ? (votes2018 / total2018) * 100 : 0,
        share2022: total2022 > 0 ? (votes2022 / total2022) * 100 : 0,
        changeVotes: votes2022 - votes2018,
        changeShare: total2022 > 0 && total2018 > 0
          ? (votes2022 / total2022) * 100 - (votes2018 / total2018) * 100
          : 0
      };
    });

    const biggestIncrease = [...partyComparison].sort((a, b) => b.changeVotes - a.changeVotes)[0];
    const biggestDecrease = [...partyComparison].sort((a, b) => a.changeVotes - b.changeVotes)[0];

    addMdToPage(`
## Resultat för ${chosenCounty}
`);

    addToPage(statCards([
      {
        title: "Största parti 2018",
        value: biggest2018.party,
        note: `${formatVotes(biggest2018.votes)} / ${formatPercent(biggest2018.share)}`
      },
      {
        title: "Största parti 2022",
        value: biggest2022.party,
        note: `${formatVotes(biggest2022.votes)} / ${formatPercent(biggest2022.share)}`
      },
      {
        title: "Förändring",
        value: biggest2018.party === biggest2022.party ? "Samma parti" : "Bytte parti",
        note: `${biggest2018.party} → ${biggest2022.party}`
      },
      {
        title: "Störst ökning",
        value: biggestIncrease.Parti,
        note: formatVotes(biggestIncrease.changeVotes)
      }
    ]));

    addMdToPage(`
## Röster per parti

Diagrammet visar hur många röster varje parti fick i **${chosenCounty}** år 2018 och 2022.
`);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Parti", "2018", "2022"],
        ...partyComparison.map(row => [
          row.Parti,
          row.votes2018,
          row.votes2022
        ])
      ],
      options: {
        title: `Röster per parti i ${chosenCounty}, 2018 jämfört med 2022`,
        height: 520,
        chartArea: { width: "80%", height: "70%" },
        vAxis: {
          title: "Antal röster"
        },
        hAxis: {
          title: "Parti"
        }
      }
    });

    addMdToPage(`
## Röstandel per parti

Diagrammet visar partiernas röstandel i **procent (%)**. Detta gör jämförelsen tydligare eftersom antal röster påverkas av hur många personer som röstade.
`);

    drawGoogleChart({
      type: "ColumnChart",
      data: [
        ["Parti", "2018 (%)", "2022 (%)"],
        ...partyComparison.map(row => [
          row.Parti,
          row.share2018,
          row.share2022
        ])
      ],
      options: {
        title: `Röstandel per parti i ${chosenCounty}, 2018 jämfört med 2022`,
        height: 520,
        chartArea: { width: "80%", height: "70%" },
        vAxis: {
          title: "Röstandel (%)",
          viewWindow: { min: 0 }
        },
        hAxis: {
          title: "Parti"
        }
      }
    });

    addMdToPage(`
## Tabell: jämförelse mellan 2018 och 2022
`);

    tableFromData({
      data: partyComparison.map(row => ({
        Parti: row.Parti,
        "Röster 2018 (antal)": formatVotes(row.votes2018),
        "Röster 2022 (antal)": formatVotes(row.votes2022),
        "Förändring röster (antal)": formatVotes(row.changeVotes),
        "Röstandel 2018 (%)": formatPercent(row.share2018),
        "Röstandel 2022 (%)": formatPercent(row.share2022),
        "Förändring procentenheter": formatPercent(row.changeShare)
      }))
    });

    addMdToPage(`
## Kort analys

I **${chosenCounty}** var **${biggest2018.party}** störst år 2018 och **${biggest2022.party}** störst år 2022.

Partiet med störst ökning i antal röster var **${biggestIncrease.Parti}**, med en förändring på **${formatVotes(biggestIncrease.changeVotes)}**. Partiet med störst minskning i antal röster var **${biggestDecrease.Parti}**, med en förändring på **${formatVotes(biggestDecrease.changeVotes)}**.

Om största parti är samma båda åren visar det att länet har haft ett relativt stabilt röstningsmönster. Om största parti har bytts ut tyder det på en tydligare politisk förändring i länet.

## Metod och begränsning

Analysen bygger på valresultat från **roster_2018** och **roster_2022**. För det valda länet jämförs partiernas röster och röstandelar mellan de två valåren.

**Antal röster** visar hur många röster ett parti fick. **Röstandel (%)** visar partiets andel av rösterna bland partierna S, M, SD, V, C, KD, L och MP.

En begränsning är att röstandelen här beräknas utifrån dessa åtta partier, inte alla partier och blankröster. Resultatet är därför bäst för att jämföra de stora riksdagspartierna.

## Extremvärden

Stora län kan få stora förändringar i antal röster även om förändringen i procent är mindre. Därför är det viktigt att titta både på **antal röster** och **röstandel (%)**.

Små skillnader mellan två partier kan också göra att största parti byts, trots att väljarnas beteende bara förändrats lite.
`);
  }
}