import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // ─── INTRO ───

  addMdToPage(`
# 👶 Medelålder i Sveriges kommuner

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Hur ser åldersstrukturen ut i Sveriges kommuner?

Denna sida ger en översikt av medelåldern i Sveriges kommuner baserat på data från 2018 och 2022.
Vi undersöker:

- Vilka kommuner har den äldsta respektive yngsta befolkningen?
- Hur har medelåldern förändrats mellan 2018 och 2022?
- Hur fördelas åldersstrukturen per kön och geografiskt?

Åldersstrukturen är en central demografisk faktor som på de kommande sidorna kopplas
till röstningsmönster och politiska preferenser.

</div>
`);

  // ─── DROPDOWNS ───

  let valtAr = addDropdown("Välj valår:", ["2022", "2018"]);
  let valtKon = addDropdown("Filtrera efter kön:", ["Totalt", "Män", "Kvinnor"]);

  // ─── HJÄLPFUNKTIONER ───

  // Normalisera könsnyckel till det format som används i databasen
  function konNyckel(val) {
    const map = { "Totalt": "totalt", "Män": "män", "Kvinnor": "kvinnor" };
    return map[val] || "totalt";
  }

  // Årsbaserad mapping beroende på valt år
  function hamtaMedelalder(rad) {
    return valtAr === "2018"
      ? Number(rad.medelalderAr2018) || 0
      : Number(rad.medelalderAr2022) || 0;
  }

  // Hämta länstillhörighet för en kommun
  function hamtaLanForKommun(kommunNamn) {
    let match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

  // ─── FILTRERA OCH AGGREGERA DATA ───

  let filtreradAges = ages.filter(a => a.kon === konNyckel(valtKon));

  // Bygg en lista med en rad per kommun (aggregera om flera rader per kommun)
  let kommunAldersMap = new Map();

  filtreradAges.forEach(rad => {
    if (!rad.kommun) return;
    let alder = hamtaMedelalder(rad);
    if (!alder) return;
    if (!kommunAldersMap.has(rad.kommun)) {
      kommunAldersMap.set(rad.kommun, []);
    }
    kommunAldersMap.get(rad.kommun).push(alder);
  });

  let kommunAldersData = Array.from(kommunAldersMap.entries()).map(([kommun, aldrar]) => {
    let snittAlder = aldrar.reduce((a, b) => a + b, 0) / aldrar.length;
    return {
      kommun,
      medelAlder: snittAlder,
      lan: hamtaLanForKommun(kommun)
    };
  }).filter(d => d.medelAlder > 0);

  if (!kommunAldersData.length) {
    addMdToPage(`> ⚠️ Ingen åldersdata hittades för vald kombination av år och kön.`);
  } else {

    // ─── STATISTIK ───

    let allaAldrar = kommunAldersData.map(d => d.medelAlder);
    let medelvarde = allaAldrar.reduce((a, b) => a + b, 0) / allaAldrar.length;
    let sorterade = [...allaAldrar].sort((a, b) => a - b);
    let medianvarde = sorterade.length % 2 !== 0
      ? sorterade[Math.floor(sorterade.length / 2)]
      : (sorterade[sorterade.length / 2 - 1] + sorterade[sorterade.length / 2]) / 2;
    let minAlder = Math.min(...allaAldrar);
    let maxAlder = Math.max(...allaAldrar);

    let aldstaKommun = kommunAldersData.reduce((prev, curr) =>
      curr.medelAlder > prev.medelAlder ? curr : prev
    );
    let yngstaKommun = kommunAldersData.reduce((prev, curr) =>
      curr.medelAlder < prev.medelAlder ? curr : prev
    );

    // ─── KPI-BOXAR ───

    addMdToPage(`
<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:20px;
margin:30px 0;
">

<div style="background:#1e3a5f;color:white;padding:24px;border-radius:16px;">
<div style="font-size:13px;opacity:0.8;">ANTAL KOMMUNER</div>
<div style="font-size:28px;font-weight:bold;">${kommunAldersData.length}</div>
</div>

<div style="background:#7C3AED;color:white;padding:24px;border-radius:16px;">
<div style="font-size:13px;opacity:0.8;">MEDELÅLDER (GENOMSNITT)</div>
<div style="font-size:28px;font-weight:bold;">${medelvarde.toFixed(1)} år</div>
</div>

<div style="background:#059669;color:white;padding:24px;border-radius:16px;">
<div style="font-size:13px;opacity:0.8;">ÄLDSTA KOMMUN</div>
<div style="font-size:22px;font-weight:bold;">${aldstaKommun.kommun}</div>
<div style="font-size:14px;opacity:0.85;">${aldstaKommun.medelAlder.toFixed(1)} år</div>
</div>

<div style="background:#2563EB;color:white;padding:24px;border-radius:16px;">
<div style="font-size:13px;opacity:0.8;">YNGSTA KOMMUN</div>
<div style="font-size:22px;font-weight:bold;">${yngstaKommun.kommun}</div>
<div style="font-size:14px;opacity:0.85;">${yngstaKommun.medelAlder.toFixed(1)} år</div>
</div>

<div style="background:#DC2626;color:white;padding:24px;border-radius:16px;">
<div style="font-size:13px;opacity:0.8;">ÅLDERSSPANN</div>
<div style="font-size:28px;font-weight:bold;">${minAlder.toFixed(1)} – ${maxAlder.toFixed(1)} år</div>
</div>

</div>
`);

    // ─── DIAGRAM 1: TOP 20 ÄLDSTA KOMMUNER ───

    addMdToPage(`## 📊 De 20 äldsta kommunerna – medelålder ${valtAr} (${valtKon})`);

    let aldstaTop20 = [...kommunAldersData]
      .sort((a, b) => b.medelAlder - a.medelAlder)
      .slice(0, 20);

    let chartDataAldsta = [["Kommun", "Medelålder (år)", { role: "style" }]];
    aldstaTop20.forEach(d => {
      chartDataAldsta.push([d.kommun, d.medelAlder, "color:#1e3a5f"]);
    });

    drawGoogleChart({
      type: "BarChart",
      data: chartDataAldsta,
      options: {
        title: `De 20 äldsta kommunerna – medelålder ${valtAr} (${valtKon})`,
        height: 550,
        chartArea: { left: 160, right: 60, top: 60, bottom: 40 },
        legend: { position: "none" },
        hAxis: { title: "Medelålder (år)", viewWindow: { min: 35, max: 55 } },
        vAxis: { title: "Kommun" }
      }
    });

    // ─── DIAGRAM 2: TOP 20 YNGSTA KOMMUNER ───

    addMdToPage(`## 📊 De 20 yngsta kommunerna – medelålder ${valtAr} (${valtKon})`);

    let yngstaTop20 = [...kommunAldersData]
      .sort((a, b) => a.medelAlder - b.medelAlder)
      .slice(0, 20);

    let chartDataYngsta = [["Kommun", "Medelålder (år)", { role: "style" }]];
    yngstaTop20.forEach(d => {
      chartDataYngsta.push([d.kommun, d.medelAlder, "color:#2563EB"]);
    });

    drawGoogleChart({
      type: "BarChart",
      data: chartDataYngsta,
      options: {
        title: `De 20 yngsta kommunerna – medelålder ${valtAr} (${valtKon})`,
        height: 550,
        chartArea: { left: 160, right: 60, top: 60, bottom: 40 },
        legend: { position: "none" },
        hAxis: { title: "Medelålder (år)", viewWindow: { min: 30, max: 50 } },
        vAxis: { title: "Kommun" }
      }
    });

    // ─── DIAGRAM 3: FÖRDELNING AV MEDELÅLDER ───

    addMdToPage(`## 📈 Fördelning av medelålder bland Sveriges kommuner`);

    // Skapa åldersintervall (2-årsintervall)
    let bucketStorlek = 2;
    let buckets = {};
    kommunAldersData.forEach(d => {
      let bucket = Math.floor(d.medelAlder / bucketStorlek) * bucketStorlek;
      let label = `${bucket}–${bucket + bucketStorlek} år`;
      buckets[label] = (buckets[label] || 0) + 1;
    });

    let fordelningData = [["Åldersintervall", "Antal kommuner"]];
    Object.keys(buckets).sort().forEach(label => {
      fordelningData.push([label, buckets[label]]);
    });

    drawGoogleChart({
      type: "ColumnChart",
      data: fordelningData,
      options: {
        title: `Fördelning av medelålder – ${valtAr} (${valtKon})`,
        height: 400,
        chartArea: { left: 60, right: 20, top: 60, bottom: 80 },
        colors: ["#7C3AED"],
        legend: { position: "none" },
        hAxis: { title: "Åldersintervall", slantedText: true, slantedTextAngle: 45 },
        vAxis: { title: "Antal kommuner" }
      }
    });

    addMdToPage(`
**Analys:** Fördelningsdiagrammet visar hur medelåldern fördelas bland Sveriges kommuner.
En bred fördelning indikerar stor variation i åldersstrukturen geografiskt,
medan en smal fördelning pekar mot en mer homogen befolkningsstruktur nationellt.
`);

    // ─── TABELL: FULLSTÄNDIG LISTA ───

    addMdToPage(`## 📋 Alla kommuner – medelålder ${valtAr} (${valtKon})`);

    let tabellData = [...kommunAldersData]
      .sort((a, b) => b.medelAlder - a.medelAlder)
      .map((d, i) => ({
        "Rank": i + 1,
        "Kommun": d.kommun,
        "Län": d.lan,
        [`Medelålder ${valtAr} (år)`]: d.medelAlder.toFixed(1)
      }));

    tableFromData({
      data: tabellData,
      columnNames: ["Rank", "Kommun", "Län", `Medelålder ${valtAr} (år)`],
      fixedHeader: true
    });

    // ─── SLUTSATS ───

    addMdToPage(`
<div style="
background:#F8FAFC;
padding:30px;
border-radius:18px;
margin-top:35px;
border-left:8px solid #192c4e;
">

## Slutsats – Åldersstrukturen i Sverige

Analysen visar att medelåldern i Sveriges kommuner varierar från
**${minAlder.toFixed(1)} år** till **${maxAlder.toFixed(1)} år**.
Genomsnittlig medelålder är **${medelvarde.toFixed(1)} år** (medianen: **${medianvarde.toFixed(1)} år**).

Skillnaderna speglar bland annat:

- **Urbanisering** – Yngre kommuner är ofta förorter till stora städer dit unga vuxna inflyttar
- **Landsbygdsavfolkning** – Äldre kommuner återfinns ofta på landsbygden där unga flyttar ut
- **Boendemönster** – Kommuner med attraktiva livsmiljöer för pensionärer kan ha hög medelålder

På de kommande sidorna undersöker vi hur denna åldersstruktur samvarierar med röstningsmönster.

</div>
`);

    addMdToPage(`
---

> 📍 **Fortsätt utforska:** Se hur ålder korrelerar med röstning → **Ålder vs Röstning**
`);

  }

}
