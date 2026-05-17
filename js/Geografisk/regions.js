import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

const parties = ["S", "M", "SD", "V", "C", "KD", "L", "MP"];

function toNumber(value) {
  const num = Number(String(value || 0).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatPercent(value) {
  return `${value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatVotes(value) {
  return `${Math.round(value).toLocaleString("sv-SE")} röster`;
}

function statCards(cards) {
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:16px; margin:20px 0 24px 0;">
      ${cards.map(card => `
        <div style="background:white; padding:20px; border-radius:8px; min-height:118px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h3 style="margin:0 0 10px 0; font-size:19px;">${card.title}</h3>
          <p style="font-size:23px; font-weight:bold; margin:0;">${card.value}</p>
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

function getRegion(area) {
  const north = [
    "Norrbottens län",
    "Västerbottens län",
    "Västernorrlands län",
    "Jämtlands län",
    "Gävleborgs län"
  ];

  return north.includes(area) ? "Norra Sverige" : "Södra Sverige";
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
      groups[region] = {
        region,
        partyVotes: 0,
        totalVotes: 0,
        areas: 0
      };
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

addMdToPage(`
# Regioner: Norr och Söder

Här undersöker vi om röstningsmönster skiljer sig mellan norra och södra Sverige.

## Fråga
**Skiljer sig röstningsmönster mellan norra och södra Sverige, och finns det tydliga regionala skillnader?**

**Enheter:** röstandel anges i **procent (%)** och röster anges i **antal röster**.
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att röstningsmönster skiljer sig mellan norra och södra Sverige. Skillnaderna kan hänga ihop med befolkningstäthet, arbetsmarknad, traditionella partifästen och andra geografiska faktorer."
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

  const stats2018 = buildRegionStats(data2018, chosenParty);
  const stats2022 = buildRegionStats(data2022, chosenParty);

  const north2018 = stats2018.find(row => row.region === "Norra Sverige");
  const south2018 = stats2018.find(row => row.region === "Södra Sverige");
  const north2022 = stats2022.find(row => row.region === "Norra Sverige");
  const south2022 = stats2022.find(row => row.region === "Södra Sverige");

  const northChange = north2022.share - north2018.share;
  const southChange = south2022.share - south2018.share;

  addMdToPage(`
## Sammanfattning av urvalet
`);

  addToPage(statCards([
    {
      title: "Valt parti",
      value: chosenParty
    },
    {
      title: "Norra Sverige 2022",
      value: formatPercent(north2022.share)
    },
    {
      title: "Södra Sverige 2022",
      value: formatPercent(south2022.share)
    },
    {
      title: "Störst stöd 2022",
      value: north2022.share > south2022.share ? "Norra Sverige" : "Södra Sverige"
    }
  ]));

  addMdToPage(`
## Röststöd i norr och söder

Diagrammet visar röstandel för **${chosenParty}** i norra och södra Sverige vid valen 2018 och 2022.
`);

  drawGoogleChart({
    type: "ColumnChart",
    data: [
      ["Region", "2018 (%)", "2022 (%)"],
      ["Norra Sverige", north2018.share, north2022.share],
      ["Södra Sverige", south2018.share, south2022.share]
    ],
    options: {
      title: `Röstandel för ${chosenParty}: Norr jämfört med Söder`,
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      vAxis: {
        title: "Röstandel (%)",
        viewWindow: { min: 0 }
      },
      hAxis: {
        title: "Region"
      }
    }
  });

  addMdToPage(`
## Tabell: jämförelse 2018 och 2022
`);

  tableFromData({
    data: [
      {
        Region: "Norra Sverige",
        "Röstandel 2018 (%)": formatPercent(north2018.share),
        "Röster 2018 (antal)": formatVotes(north2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(north2022.share),
        "Röster 2022 (antal)": formatVotes(north2022.partyVotes),
        "Förändring 2018–2022": formatPercent(northChange)
      },
      {
        Region: "Södra Sverige",
        "Röstandel 2018 (%)": formatPercent(south2018.share),
        "Röster 2018 (antal)": formatVotes(south2018.partyVotes),
        "Röstandel 2022 (%)": formatPercent(south2022.share),
        "Röster 2022 (antal)": formatVotes(south2022.partyVotes),
        "Förändring 2018–2022": formatPercent(southChange)
      }
    ]
  });

  const strongestRegion = north2022.share > south2022.share ? "norra Sverige" : "södra Sverige";
  const difference2022 = Math.abs(north2022.share - south2022.share);

  addMdToPage(`
## Kort analys

För partiet **${chosenParty}** är stödet högst i **${strongestRegion}** år 2022. Skillnaden mellan norra och södra Sverige är **${formatPercent(difference2022)}**.

I norra Sverige förändrades stödet med **${formatPercent(northChange)}** mellan 2018 och 2022. I södra Sverige förändrades stödet med **${formatPercent(southChange)}** under samma period.

Resultatet visar att det finns geografiska skillnader i röstningsmönster. Skillnaden behöver dock inte bero på geografin i sig, utan kan hänga ihop med andra faktorer som befolkningstäthet, utbildningsnivå, arbetsmarknad, inkomst och demografisk sammansättning.

## Metod och begränsning

Analysen delar in Sveriges län i två grupper: **Norra Sverige** och **Södra Sverige**. Till norra Sverige räknas Norrbottens län, Västerbottens län, Västernorrlands län, Jämtlands län och Gävleborgs län. Övriga län räknas som södra Sverige.

Röstandel beräknas som partiets röster dividerat med summan av röster på de åtta riksdagspartierna i datan. Resultatet anges i **procent (%)**. Antal röster anges som **röster (antal)**.

En begränsning är att uppdelningen norr/söder är förenklad. Sverige kan också delas in i fler regioner, exempelvis storstad, landsbygd, kust och inland. Därför ska resultatet ses som en övergripande geografisk jämförelse, inte som en fullständig förklaring till varför människor röstar som de gör.

## Extremvärden

Stora län och storstadsområden kan påverka resultatet mer än mindre län eftersom de har fler röster. Därför kan exempelvis Stockholms län, Västra Götalands län och Skåne län få stor betydelse för gruppen **Södra Sverige**.

Det är viktigt att tolka resultatet som ett geografiskt mönster, inte som ett bevis på orsakssamband.
`);
}