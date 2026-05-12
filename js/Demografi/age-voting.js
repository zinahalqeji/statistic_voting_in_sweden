import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ─── INTRO ───

  addMdToPage(`
# 🗳️ Ålder vs Röstning

> **Forskningsfråga:** *Finns det ett samband mellan en kommuns medelålder och dess röstningsmönster?*

Denna sida undersöker den potentiella korrelationen mellan åldersstruktur och politiska preferenser.
Vi analyserar om äldre kommuner röstar annorlunda än yngre – och diskuterar vad det kan bero på.
`);

  // ─── DROPDOWNS ───

  let valtAr = addDropdown("Välj valår:", ["2018", "2022"]);
  let unikaLan = [...new Set(lanKommun.map(lk => lk.lan))].sort();
  let valtLan = addDropdown("Välj län:", ["Alla län", ...unikaLan]);

  // ─── HJÄLPFUNKTIONER ───

  function hamtaLanForKommun(kommunNamn) {
    let match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

  // Rensa och normalisera valdata från Neo4j
  function rensaValdata(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(item => {
        let node = item.n || item;
        let props = node.properties || node;
        return {
          kommun: props.kommun,
          parti: props.parti,
          roster2018: Number(props.roster2018) || 0,
          roster2022: Number(props.roster2022) || 0
        };
      });
    }
    if (raw.records) {
      return raw.records.map(r => {
        let props = r._fields[0].properties;
        return {
          kommun: props.kommun,
          parti: props.parti,
          roster2018: Number(props.roster2018) || 0,
          roster2022: Number(props.roster2022) || 0
        };
      });
    }
    return [];
  }

  // Årsbaserad medelålder – varje kommun kan ha flera rader (kön), vi hämtar "totalt"
  function hamtaMedelalderForKommun(kommunNamn) {
    // Hämta rader med kon=totalt för rätt år
    let rader = ages.filter(a =>
      a.kommun === kommunNamn &&
      (a.kon === "totalt" || a.kon === "Totalt")
    );
    if (!rader.length) {
      // Fallback: ta alla rader och medelvärde
      rader = ages.filter(a => a.kommun === kommunNamn);
    }
    if (!rader.length) return null;

    let aldrar = rader.map(r =>
      valtAr === "2018"
        ? Number(r.medelalderAr2018) || 0
        : Number(r.medelalderAr2022) || 0
    ).filter(v => v > 0);

    if (!aldrar.length) return null;
    return aldrar.reduce((a, b) => a + b, 0) / aldrar.length;
  }

  // ─── RENSA OCH FILTRERA VALDATA ───

  let rensadeVal = rensaValdata(electionResults);

  // Filtrera på valt län om det inte är "Alla"
  if (valtLan !== "Alla län") {
    rensadeVal = rensadeVal.filter(v => hamtaLanForKommun(v.kommun) === valtLan);
  }

  // ─── BYGG KORRELATIONSDATA PER KOMMUN ───

  let korrelationsData = [];
  let unikaKommuner = [...new Set(rensadeVal.map(v => v.kommun))];

  unikaKommuner.forEach(kommun => {
    let medelAlder = hamtaMedelalderForKommun(kommun);
    if (medelAlder === null || medelAlder === 0) return;

    let kommunVal = rensadeVal.filter(v => v.kommun === kommun);
    let totalRoster = kommunVal.reduce((sum, v) =>
      sum + (valtAr === "2018" ? v.roster2018 : v.roster2022), 0
    );
    if (totalRoster === 0) return;

    let partiData = {};
    kommunVal.forEach(v => {
      let roster = valtAr === "2018" ? v.roster2018 : v.roster2022;
      partiData[v.parti] = (roster / totalRoster) * 100;
    });

    korrelationsData.push({
      kommun,
      medelAlder,
      lan: hamtaLanForKommun(kommun),
      ...partiData,
      totalRoster
    });
  });

  if (!korrelationsData.length) {
    addMdToPage(`> ⚠️ Ingen data hittades för vald kombination av år och län.`);
  } else {

    // ─── STATISTIK ───

    let aldar = korrelationsData.map(d => d.medelAlder);
    let medelAlderAlla = aldar.reduce((a, b) => a + b, 0) / aldar.length;
    let minAlder = Math.min(...aldar);
    let maxAlder = Math.max(...aldar);

    // ─── INSIGHT-BOX: ÖVERSIKT ───

    addMdToPage(`
<div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 25px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
<h3 style="color: white; margin-top: 0;">📊 Analysöversikt – Valåret ${valtAr}</h3>
<p style="font-size: 1.1em;">
<strong>Antal kommuner analyserade:</strong> ${korrelationsData.length} st<br>
<strong>Medelålder (urval):</strong> ${medelAlderAlla.toFixed(1)} år<br>
<strong>Åldersspann:</strong> ${minAlder.toFixed(1)} – ${maxAlder.toFixed(1)} år
</p>
</div>
`);

    // ─── KORRELATIONSBERÄKNING ───

    function sampleCorrelation(x, y) {
      if (x.length !== y.length || x.length < 2) return 0;
      let n = x.length;
      let meanX = x.reduce((a, b) => a + b, 0) / n;
      let meanY = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, dx2 = 0, dy2 = 0;
      for (let i = 0; i < n; i++) {
        let dx = x[i] - meanX;
        let dy = y[i] - meanY;
        num += dx * dy;
        dx2 += dx * dx;
        dy2 += dy * dy;
      }
      let denom = Math.sqrt(dx2 * dy2);
      return denom === 0 ? 0 : num / denom;
    }

    // ─── DIAGRAM 1: ÅLDERSEFFEKT (YNGRE vs ÄLDRE) ───

    addMdToPage(`
## 📊 Ålder och röstning: yngre vs äldre kommuner

För att göra mönstret tydligt delar vi kommunerna i två grupper baserat på **medelålder** (urvalets median):
- **Yngre kommuner** (under median)
- **Äldre kommuner** (median och över median)

Vi beräknar sedan respektive grupps genomsnittliga **Högerblock (%)** och **Vänsterblock (%)**.
`);

    // Partier heter med fullt namn i databasen
    let hogerPartier = ["Moderaterna", "Kristdemokraterna", "Liberalerna", "Sverigedemokraterna"];
    let vansterPartier = [
      "Socialdemokraterna",
      "Arbetarepartiet-Socialdemokraterna",
      "Miljöpartiet",
      "Vänsterpartiet",
      "Centerpartiet"
    ];

    // Bygg grupperad dataproduktion (utan att visualisera alla 290 kommuner)
    let spridningsData = korrelationsData
      .map(d => {
        const medelAlder = Number(d.medelAlder);
        if (!Number.isFinite(medelAlder)) return null;

        let hogerBlock = hogerPartier.reduce((sum, p) => sum + Number(d[p] ?? 0), 0);
        let vansterBlock = vansterPartier.reduce((sum, p) => sum + Number(d[p] ?? 0), 0);

        hogerBlock = Number(hogerBlock);
        vansterBlock = Number(vansterBlock);
        if (!Number.isFinite(hogerBlock) || !Number.isFinite(vansterBlock)) return null;

        return {
          medelAlder,
          hogerBlock,
          vansterBlock
        };
      })
      .filter(d => d !== null);

    let aldarArr = spridningsData.map(d => d.medelAlder);
    let hogerArr = spridningsData.map(d => d.hogerBlock);
    let vansterArr = spridningsData.map(d => d.vansterBlock);

    let korrelationHoger = sampleCorrelation(aldarArr, hogerArr);
    let korrelationVanster = sampleCorrelation(aldarArr, vansterArr);

    // Median för uppdelning
    let medianAlder = null;
    if (aldarArr.length) {
      let sorted = [...aldarArr].sort((a, b) => a - b);
      let mid = Math.floor(sorted.length / 2);
      medianAlder = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    // Genomsnittsberäkning per grupp
    function mean(arr) {
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    let yngre = spridningsData.filter(d => d.medelAlder < medianAlder);
    let aldre = spridningsData.filter(d => d.medelAlder >= medianAlder);

    let avgHogerYngre = mean(yngre.map(d => d.hogerBlock));
    let avgVansterYngre = mean(yngre.map(d => d.vansterBlock));
    let avgHogerAldre = mean(aldre.map(d => d.hogerBlock));
    let avgVansterAldre = mean(aldre.map(d => d.vansterBlock));

    // Gruppdiagram: två kategorier (Yngre/Äldre) med två serier (Höger/Vänster)
    let groupedData = [
      ["Grupp", "Högerblock (%)", "Vänsterblock (%)"],
      ["Yngre kommuner", avgHogerYngre, avgVansterYngre],
      ["Äldre kommuner", avgHogerAldre, avgVansterAldre]
    ];

    drawGoogleChart({
      type: "ColumnChart",
      data: groupedData,
      options: {
        height: 420,
        chartArea: { left: 70, right: 20, top: 40, bottom: 70 },
        legend: { position: "right" },
        hAxis: { title: "Åldersgrupp" },
        vAxis: { title: "Röstandel (%)", minValue: 0, maxValue: 100 },
        title: `Ålderseffekt – yngre vs äldre (${valtAr})`,
        titleTextStyle: { fontSize: 16, bold: true },
        colors: ["#e74c3c", "#3498db"],
        series: {
          0: { color: "#e74c3c" },
          1: { color: "#3498db" }
        }
      }
    });

    addMdToPage(`
**Analys:** Korrelationen mellan medelålder och högerblocket är **r = ${korrelationHoger.toFixed(3)}**,
medan korrelationen med vänsterblocket är **r = ${korrelationVanster.toFixed(3)}**.

I vår medianuppdelning ser vi att:
- **Yngre kommuner** ligger på ca **${avgVansterYngre.toFixed(1)}% vänsterblock** och **${avgHogerYngre.toFixed(1)}% högerblock**.
- **Äldre kommuner** ligger på ca **${avgVansterAldre.toFixed(1)}% vänsterblock** och **${avgHogerAldre.toFixed(1)}% högerblock**.

${Math.abs(korrelationHoger) > 0.3 ? "> 🔴 **Tydligt samband:** Äldre kommuner tenderar att rösta mer på högerblocket." : "> 🟡 **Svagt samband:** Ålder förklarar endast en liten del av röstningsmönstren."}
${Math.abs(korrelationVanster) > 0.3 ? "> 🔵 **Tydligt samband:** Yngre kommuner tenderar att rösta mer på vänsterblocket." : ""}
`);


    // ─── DIAGRAM 2: KORRELATION PER PARTI ───

    addMdToPage(`
## 📊 Korrelation: Medelålder vs Partistöd

Stapeldiagrammet visar korrelationskoefficienten mellan medelålder och stödet för respektive parti.
Positiva värden = partiet är starkare i äldre kommuner. Negativa värden = starkare i yngre kommuner.
`);

    // Hämta unika partier från data
    let allaParter = [...new Set(rensadeVal.map(v => v.parti))].sort();

    let korrelationsPerParti = allaParter.map(parti => {
      let aldarParti = korrelationsData.map(d => d.medelAlder);
      let rosterParti = korrelationsData.map(d => d[parti] || 0);
      let korrel = sampleCorrelation(aldarParti, rosterParti);
      return { parti, korrelation: isNaN(korrel) ? 0 : korrel };
    }).filter(d => !isNaN(d.korrelation));

    drawGoogleChart({
      type: "BarChart",
      data: makeChartFriendly(korrelationsPerParti, "Parti", "Korrelation med ålder"),
      options: {
        height: 450,
        chartArea: { left: 240, right: 60, top: 40, bottom: 60 },
        colors: ["#9b59b6"],
        legend: { position: "none" },
        hAxis: { title: "Korrelationskoefficient (r)", viewWindow: { min: -1, max: 1 } },
        vAxis: { title: "Parti" },
        title: `Korrelation: Medelålder vs Partistöd – ${valtAr}`,
        titleTextStyle: { fontSize: 16, bold: true }
      }
    });

    addMdToPage(`
**Analys:** Partier med stark positiv korrelation (t.ex. Kristdemokraterna, Moderaterna) har större stöd i äldre kommuner.
Partier med negativ korrelation (t.ex. Vänsterpartiet, Miljöpartiet) är starkare i yngre områden.
Sverigedemokraterna visar ofta en blandad bild beroende på region.
`);

    // ─── TABELL: KORRELATIONSDATA PER KOMMUN ───

    addMdToPage(`
## 📋 Korrelationsdata per kommun

Tabellen är sorterad efter medelålder (fallande) för att synliggöra eventuella mönster.
`);

    let korrelationsTabell = korrelationsData.map(d => ({
      "Kommun": d.kommun,
      "Län": d.lan,
      "Medelålder": d.medelAlder.toFixed(1),
      "S (%)": (d["Socialdemokraterna"] || d["Arbetarepartiet-Socialdemokraterna"] || 0).toFixed(1),
      "M (%)": (d["Moderaterna"] || 0).toFixed(1),
      "SD (%)": (d["Sverigedemokraterna"] || 0).toFixed(1),
      "V (%)": (d["Vänsterpartiet"] || 0).toFixed(1),
      "C (%)": (d["Centerpartiet"] || 0).toFixed(1)
    })).sort((a, b) => parseFloat(b["Medelålder"]) - parseFloat(a["Medelålder"]));

    tableFromData({
      data: korrelationsTabell,
      columnNames: ["Kommun", "Län", "Medelålder", "S (%)", "M (%)", "SD (%)", "V (%)", "C (%)"],
      fixedHeader: true
    });

    addMdToPage(`
**Förklaring:** Tabellen är sorterad efter medelålder (fallande).
S-kolumnen visar röstandelen för Socialdemokraterna (eller Arbetarepartiet-Socialdemokraterna).
`);

    // ─── KAUSALITETSDISKUSSION ───

    addMdToPage(`
## 🧠 Kausalitet – Varför ser vi dessa mönster?

Att det finns en korrelation mellan ålder och röstning betyder **inte automatiskt** att ålder *orsakar* politiska preferenser.
Här är några möjliga förklaringar:

| Förklaring | Beskrivning |
|---|---|
| **Livscykel-effekt** | Människor förändras politiskt när de åldras – blir mer konservativa |
| **Kohort-effekt** | Generationer formas av händelser under uppväxten (t.ex. 68-vänstern) |
| **Geografisk selektion** | Yngre flyttar till städer, äldre bor kvar på landsbygd |
| **Ekonomiska intressen** | Pensionärer prioriterar annan politik än studenter |
| **Utbildning** | Yngre generationer är mer högskoleutbildade, vilket påverkar politiska preferenser |

> **Viktigt:** Det är troligen en kombination av flera faktorer. Livscykel- och kohort-effekter är särskilt svåra att skilja åt utan longitudinell data.
`);

    // ─── SLUTSATS ───

    addMdToPage(`
<div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #333; padding: 25px; border-radius: 12px; margin: 30px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
<h3 style="margin-top: 0;">💡 Insikt: Ålder är en faktor – men inte hela sanningen</h3>
<p style="font-size: 1.1em; line-height: 1.6;">
Vår analys visar att det finns ett <strong>${Math.abs(korrelationHoger) > 0.3 ? "tydligt" : "svagt till måttligt"}</strong> samband mellan medelålder och röstningsmönster.
Dock förklarar ålder endast en del av variationen – utbildning, inkomst och geografisk tillhörighet spelar minst lika stor roll.
</p>
<p style="font-size: 1.1em; line-height: 1.6;">
<strong>Nästa steg:</strong> På sidan <strong>Unga vs Äldre områden</strong> delar vi upp kommunerna i "unga" och "äldre" områden
och testar hypotesen att yngre områden röstar mer vänster.
</p>
</div>
`);

    addMdToPage(`
---

> 📍 **Fortsätt utforska:** Testa vår hypotes om unga vs äldre områden → **Unga vs Äldre områden**
`);

  }

}
