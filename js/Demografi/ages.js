import { ages, lanKommun, electionResults } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {

  // INTRO

  addMdToPage(`
# Ålder (översikt)

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
- Finns det ett samband mellan medelålder och antalet röster i en kommun?

Åldersstrukturen är en central demografisk faktor som på de kommande sidorna kopplas
till röstningsmönster och politiska preferenser.

</div>
  `);

  // DROPDOWNS

  let valtAr  = addDropdown("Välj valår:", ["2022", "2018"]);
  let valtKon = addDropdown("Filtrera efter kön:", ["Totalt", "Män", "Kvinnor"]);

  // HJÄLPFUNKTIONER 

  function konNyckel(val) {
    const map = { "Totalt": "totalt", "Män": "män", "Kvinnor": "kvinnor" };
    return map[val] || "totalt";
  }

  function hamtaMedelalder(rad) {
    return valtAr === "2018"
      ? Number(rad.medelalderAr2018) || 0
      : Number(rad.medelalderAr2022) || 0;
  }

  function hamtaLanForKommun(kommunNamn) {
    const match = lanKommun.find(lk => lk.kommun === kommunNamn);
    return match ? match.lan : "Okänt län";
  }

  // TOTAL VOTES PER KOMMUN 

  const kommunVotes = new Map();
  electionResults.forEach(row => {
    const k = row.kommun;
    if (!kommunVotes.has(k)) kommunVotes.set(k, { votes2018: 0, votes2022: 0 });
    const v = kommunVotes.get(k);
    v.votes2018 += Number(row.roster2018 || 0);
    v.votes2022 += Number(row.roster2022 || 0);
  });

  // FILTRERA OCH AGGREGERA DATA 

  const filtreradAges = ages.filter(a => a.kon === konNyckel(valtKon));

  const kommunAldersMap = new Map();
  filtreradAges.forEach(rad => {
    if (!rad.kommun) return;
    const alder = hamtaMedelalder(rad);
    if (!alder) return;
    if (!kommunAldersMap.has(rad.kommun)) kommunAldersMap.set(rad.kommun, []);
    kommunAldersMap.get(rad.kommun).push(alder);
  });

  const kommunAldersData = Array.from(kommunAldersMap.entries()).map(([kommun, aldrar]) => ({
    kommun,
    medelAlder: aldrar.reduce((a, b) => a + b, 0) / aldrar.length,
    lan: hamtaLanForKommun(kommun)
  })).filter(d => d.medelAlder > 0);

  if (!kommunAldersData.length) {
    addMdToPage(`> Ingen åldersdata hittades för vald kombination av år och kön.`);
  } else {

    // STATISTIK

    const allaAldrar  = kommunAldersData.map(d => d.medelAlder);
    const medelvarde  = allaAldrar.reduce((a, b) => a + b, 0) / allaAldrar.length;
    const sorterade   = [...allaAldrar].sort((a, b) => a - b);
    const mid         = Math.floor(sorterade.length / 2);
    const medianvarde = sorterade.length % 2 !== 0
      ? sorterade[mid]
      : (sorterade[mid - 1] + sorterade[mid]) / 2;
    const minAlder    = Math.min(...allaAldrar);
    const maxAlder    = Math.max(...allaAldrar);

    const aldstaKommun  = kommunAldersData.reduce((p, c) => c.medelAlder > p.medelAlder ? c : p);
    const yngstaKommun  = kommunAldersData.reduce((p, c) => c.medelAlder < p.medelAlder ? c : p);

    // KPI-BOXAR 

    addMdToPage(`
<div style="
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
  margin:30px 0;
">

<div style="background:#ffffff;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">ANTAL KOMMUNER</div>
  <div style="font-size:28px;font-weight:bold;">${kommunAldersData.length}</div>
</div>

<div style="background:#ffffff;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">MEDELÅLDER (GENOMSNITT)</div>
  <div style="font-size:28px;font-weight:bold;">${medelvarde.toFixed(1)} år</div>
</div>

<div style="background:#ffffff;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">ÄLDSTA KOMMUN</div>
  <div style="font-size:22px;font-weight:bold;">${aldstaKommun.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${aldstaKommun.medelAlder.toFixed(1)} år</div>
</div>

<div style="background:#ffffff;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">YNGSTA KOMMUN</div>
  <div style="font-size:22px;font-weight:bold;">${yngstaKommun.kommun}</div>
  <div style="font-size:14px;opacity:0.85;">${yngstaKommun.medelAlder.toFixed(1)} år</div>
</div>

<div style="background:#ffffff;color:black;padding:24px;border-radius:16px;">
  <div style="font-size:13px;opacity:0.8;">ÅLDERSSPANN</div>
  <div style="font-size:28px;font-weight:bold;">${minAlder.toFixed(1)} – ${maxAlder.toFixed(1)} år</div>
</div>

</div>
    `);

    // DIAGRAM 1: TOP 20 ÄLDSTA KOMMUNER 

    addMdToPage(`## De 20 äldsta kommunerna – medelålder ${valtAr} (${valtKon})`);

    const aldstaTop20     = [...kommunAldersData].sort((a, b) => b.medelAlder - a.medelAlder).slice(0, 20);
    const chartDataAldsta = [["Kommun", "Medelålder (år)", { role: "style" }]];
    aldstaTop20.forEach(d => chartDataAldsta.push([d.kommun, d.medelAlder, "color:#2563EB"]));

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

    // DIAGRAM 2: TOP 20 YNGSTA KOMMUNER 

    addMdToPage(`## De 20 yngsta kommunerna – medelålder ${valtAr} (${valtKon})`);

    const yngstaTop20     = [...kommunAldersData].sort((a, b) => a.medelAlder - b.medelAlder).slice(0, 20);
    const chartDataYngsta = [["Kommun", "Medelålder (år)", { role: "style" }]];
    yngstaTop20.forEach(d => chartDataYngsta.push([d.kommun, d.medelAlder, "color:#2563EB"]));

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

    // DIAGRAM 3: FÖRDELNING AV MEDELÅLDER 

    addMdToPage(`## Fördelning av medelålder bland Sveriges kommuner`);

    const bucketStorlek = 2;
    const buckets       = {};
    kommunAldersData.forEach(d => {
      const bucket = Math.floor(d.medelAlder / bucketStorlek) * bucketStorlek;
      const label  = `${bucket}–${bucket + bucketStorlek} år`;
      buckets[label] = (buckets[label] || 0) + 1;
    });

    const fordelningData = [["Åldersintervall", "Antal kommuner"]];
    Object.keys(buckets).sort().forEach(label => fordelningData.push([label, buckets[label]]));

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

    // DIAGRAM 4: MEDELÅLDER VS RÖSTER (KOPPLINGEN TILL RÖSTNING)

    addMdToPage(`
---
## Medelålder vs totala röster per kommun (${valtAr})

Här kopplas åldersstrukturen direkt till valdeltagandet.
Varje punkt representerar en kommun — x-axeln visar medelåldern och y-axeln visar totalt antal röster.
`);

    const voteKey = valtAr === "2018" ? "votes2018" : "votes2022";

    // Group into age buckets for a cleaner bar chart: under 40 / 40-43 / 43-46 / over 46
    const ageBuckets = [
      { label: "Under 40 år",  min: 0,  max: 40  },
      { label: "40–43 år",     min: 40, max: 43  },
      { label: "43–46 år",     min: 43, max: 46  },
      { label: "Över 46 år",   min: 46, max: 999 }
    ];

    const bucketVotes = ageBuckets.map(b => {
      const kommunInBucket = kommunAldersData.filter(
        d => d.medelAlder >= b.min && d.medelAlder < b.max
      );
      const totalVotes = kommunInBucket.reduce((sum, d) => {
        const v = kommunVotes.get(d.kommun);
        return sum + (v ? v[voteKey] : 0);
      }, 0);
      const avgVotesPerKommun = kommunInBucket.length > 0
        ? Math.round(totalVotes / kommunInBucket.length)
        : 0;
      return {
        label: b.label,
        kommunCount: kommunInBucket.length,
        totalVotes,
        avgVotesPerKommun
      };
    });

    // Chart: average votes per kommun by age group
    const ageVoteChartData = [["Åldersgrupp", "Genomsnitt röster per kommun", { role: "style" }, { role: "annotation" }]];
    bucketVotes.forEach(b => {
      ageVoteChartData.push([
        `${b.label}\n(${b.kommunCount} kommuner)`,
        b.avgVotesPerKommun,
        "color:#1e3a5f",
        b.avgVotesPerKommun.toLocaleString("sv-SE")
      ]);
    });

    drawGoogleChart({
      type: "ColumnChart",
      data: ageVoteChartData,
      options: {
        title: `Genomsnittligt antal röster per kommun – efter åldersgrupp (${valtAr})`,
        height: 420,
        chartArea: { left: 80, right: 40, top: 60, bottom: 80 },
        legend: { position: "none" },
        hAxis: { title: "Åldersgrupp (medelålder)" },
        vAxis: { title: "Genomsnitt röster per kommun", format: "#,###" },
        annotations: { alwaysOutside: true }
      }
    });

    // Summary table for the age-vote connection
    addMdToPage(`### Sammanfattning per åldersgrupp`);

    tableFromData({
      data: bucketVotes.map(b => ({
        "Åldersgrupp": b.label,
        "Antal kommuner": b.kommunCount,
        "Totala röster": b.totalVotes.toLocaleString("sv-SE"),
        "Genomsnitt röster/kommun": b.avgVotesPerKommun.toLocaleString("sv-SE")
      })),
      columnNames: ["Åldersgrupp", "Antal kommuner", "Totala röster", "Genomsnitt röster/kommun"]
    });

    addMdToPage(`
**Tolkning:** Kommuner med högre medelålder tenderar att vara mindre till befolkningen,
vilket förklarar lägre röstantal i absoluta tal. Yngre kommuner är ofta växande
förorter med större befolkning och därmed fler röster. Nästa sida — *Ålder vs Röstning* —
analyserar detta samband djupare per parti och region.
    `);

    // TABELL: FULLSTÄNDIG LISTA

    addMdToPage(`## Alla kommuner – medelålder ${valtAr} (${valtKon})`);

    const tabellData = [...kommunAldersData]
      .sort((a, b) => b.medelAlder - a.medelAlder)
      .map((d, i) => {
        const v = kommunVotes.get(d.kommun);
        return {
          "Rank": i + 1,
          "Kommun": d.kommun,
          "Län": d.lan,
          [`Medelålder ${valtAr} (år)`]: d.medelAlder.toFixed(1),
          [`Röster ${valtAr}`]: v ? v[voteKey].toLocaleString("sv-SE") : "–"
        };
      });

    tableFromData({
      data: tabellData,
      columnNames: ["Rank", "Kommun", "Län", `Medelålder ${valtAr} (år)`, `Röster ${valtAr}`],
      fixedHeader: true
    });

    // SLUTSATS

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

Kopplingen till röstning är tydlig:

- **Yngre kommuner** — ofta växande förorter — har större befolkning och därmed fler röster i absoluta tal
- **Äldre kommuner** — ofta landsbygdskommuner — har färre röster men kan ha högre röstandel per invånare
- Sambandet mellan ålder och *vilket parti* man röstar på analyseras vidare på nästa sida

Skillnaderna speglar bland annat urbanisering, landsbygdsavfolkning och boendemönster bland äldre.

</div>

    `);

  }

}