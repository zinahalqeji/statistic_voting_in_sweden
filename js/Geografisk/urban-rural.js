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

function getAreaType(area) {
  const bigCityCounties = [
    "Stockholms län",
    "Skåne län",
    "Västra Götalands län"
  ];

  return bigCityCounties.includes(area)
    ? "Storstadslän"
    : "Mindre tätbefolkade län";
}

function buildAreaTypeStats(data, party) {
  const groups = {};

  data
    .filter(row => row.Omrade && row.Omrade.includes("län"))
    .forEach(row => {
      const type = getAreaType(row.Omrade);

      if (!groups[type]) {
        groups[type] = {
          type,
          partyVotes: 0,
          totalVotes: 0,
          areas: 0
        };
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

addMdToPage(`
# Stad vs landsbygd

Här jämför vi Sveriges tre största storstadslän med mindre tätbefolkade län för att undersöka om röstningsmönster skiljer sig geografiskt mellan valen 2018 och 2022.

Med **storstadslän** menar vi:
- Stockholms län
- Skåne län
- Västra Götalands län

Med **mindre tätbefolkade län** menar vi alla andra län.

## Fråga
**Hur skiljer sig röstningsmönster mellan storstadslän och mindre tätbefolkade län, och hur förändrades detta mellan 2018 och 2022?**

**Enheter:** röstandel anges i **procent (%)** och röster anges i **antal röster**.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att röstningsmönster skiljer sig mellan storstadslän och mindre tätbefolkade län, och att dessa skillnader förändrats mellan 2018 och 2022. Skillnaderna kan bero på befolkningstäthet, utbildningsnivå, arbetsmarknad, bostadsort och demografiska faktorer."
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

  const stats2018 = buildAreaTypeStats(data2018, chosenParty);
  const stats2022 = buildAreaTypeStats(data2022, chosenParty);

  const city2018 = stats2018.find(row => row.type === "Storstadslän");
  const lessDense2018 = stats2018.find(row => row.type === "Mindre tätbefolkade län");

  const city2022 = stats2022.find(row => row.type === "Storstadslän");
  const lessDense2022 = stats2022.find(row => row.type === "Mindre tätbefolkade län");

  const cityChange = city2022.share - city2018.share;
  const lessDenseChange = lessDense2022.share - lessDense2018.share;

  const gap2018 = city2018.share - lessDense2018.share;
  const gap2022 = city2022.share - lessDense2022.share;
  const gapChange = gap2022 - gap2018;

  addMdToPage(`
## Sammanfattning av urvalet
`);

  addToPage(statCards([
    {
      title: "Storstadslän 2018",
      value: formatPercent(city2018.share),
      note: chosenParty
    },
    {
      title: "Storstadslän 2022",
      value: formatPercent(city2022.share),
      note: `${cityChange >= 0 ? "+" : ""}${formatPercent(cityChange)} sedan 2018`
    },
    {
      title: "Mindre tätbefolkade län 2018",
      value: formatPercent(lessDense2018.share),
      note: chosenParty
    },
    {
      title: "Mindre tätbefolkade län 2022",
      value: formatPercent(lessDense2022.share),
      note: `${lessDenseChange >= 0 ? "+" : ""}${formatPercent(lessDenseChange)} sedan 2018`
    }
  ]));

  addMdToPage(`
## Jämförelse mellan 2018 och 2022

Diagrammet visar röstandel för **${chosenParty}** i storstadslän och mindre tätbefolkade län vid båda valåren.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Områdestyp", "2018 (%)", "2022 (%)"],
      ["Storstadslän", city2018.share, city2022.share],
      ["Mindre tätbefolkade län", lessDense2018.share, lessDense2022.share]
    ],
    options: {
      title: `Röstandel för ${chosenParty}: 2018 jämfört med 2022`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      hAxis: {
        title: "Områdestyp"
      }
    }
  });

  addMdToPage(`
## Förändring mellan valåren

Diagrammet visar hur mycket stödet för **${chosenParty}** ökade eller minskade mellan 2018 och 2022.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Områdestyp", "Förändring i procentenheter"],
      ["Storstadslän", cityChange],
      ["Mindre tätbefolkade län", lessDenseChange]
    ],
    options: {
      title: `Förändring i röstandel för ${chosenParty}, 2018–2022`,
      legend: { position: "none" },
      height: 460,
      chartArea: { width: "75%", height: "70%" },
      vAxis: {
        title: "Förändring i procentenheter"
      },
      hAxis: {
        title: "Områdestyp"
      }
    }
  });

  addMdToPage(`
## Tabell: röstandel och röster
`);

  tableFromData({
    data: [
      {
        Områdestyp: "Storstadslän",
        "Län som ingår": "Stockholm, Skåne, Västra Götaland",
        "Röstandel 2018 (%)": formatPercent(city2018.share),
        "Röster 2018 (antal)": formatVotes(city2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(city2022.share),
        "Röster 2022 (antal)": formatVotes(city2022.partyVotes),
        "Förändring procentenheter": formatPercent(cityChange)
      },
      {
        Områdestyp: "Mindre tätbefolkade län",
        "Län som ingår": "Alla andra län",
        "Röstandel 2018 (%)": formatPercent(lessDense2018.share),
        "Röster 2018 (antal)": formatVotes(lessDense2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(lessDense2022.share),
        "Röster 2022 (antal)": formatVotes(lessDense2022.partyVotes),
        "Förändring procentenheter": formatPercent(lessDenseChange)
      }
    ]
  });

  const stronger2018 = gap2018 > 0 ? "storstadslän" : "mindre tätbefolkade län";
  const stronger2022 = gap2022 > 0 ? "storstadslän" : "mindre tätbefolkade län";

  addMdToPage(`
## Kort analys

För partiet **${chosenParty}** var stödet högre i **${stronger2018}** år 2018 och högre i **${stronger2022}** år 2022.

I **storstadslän** förändrades stödet från **${formatPercent(city2018.share)}** till **${formatPercent(city2022.share)}**, vilket motsvarar en förändring på **${formatPercent(cityChange)}**.

I **mindre tätbefolkade län** förändrades stödet från **${formatPercent(lessDense2018.share)}** till **${formatPercent(lessDense2022.share)}**, vilket motsvarar en förändring på **${formatPercent(lessDenseChange)}**.

Skillnaden mellan grupperna var **${formatPercent(Math.abs(gap2018))}** år 2018 och **${formatPercent(Math.abs(gap2022))}** år 2022. Förändringen i gapet mellan grupperna är **${formatPercent(gapChange)}**. Det visar om skillnaden mellan storstadslän och mindre tätbefolkade län har blivit större eller mindre över tid.

## Metod och begränsning

Analysen delar in Sveriges län i två grupper:

**Storstadslän:**
- Stockholms län
- Skåne län
- Västra Götalands län

**Mindre tätbefolkade län:**
- alla andra län

Röstandel beräknas som partiets röster dividerat med summan av röster på partierna S, M, SD, V, C, KD, L och MP. Resultatet anges i **procent (%)**. Antal röster anges som **röster (antal)**.

En begränsning är att detta inte är en perfekt stad–landsbygd-indelning. Skåne och Västra Götaland innehåller både stora städer och landsbygd, och flera mindre län kan också ha större städer. Därför ska resultatet ses som en förenklad jämförelse mellan mer urbana län och mindre tätbefolkade län.

## Extremvärden

Stockholms län har många väljare och kan därför påverka gruppen **storstadslän** mycket. Samtidigt kan små län få tydliga procentuella skillnader även om antalet röster är lägre.

Därför är det viktigt att tolka både **antal röster** och **röstandel (%)**. Antal röster visar storleken på stödet, medan röstandel (%) gör jämförelsen mer rättvis mellan grupper med olika många väljare.
`);
}