import { electionResults, ages, income, educationInfo } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";
 
if (!dbInfoOk) {
  displayDbNotOkText();
} else {
 
  // INTRO
 
  addMdToPage(`
# Vem röstar? – En översikt
 
<div style="
  background:#F1F5F9;
  padding:30px;
  border-radius:16px;
  margin-top:20px;
  border-left:8px solid #192c4e;
">
 
## Vad vet vi om Sveriges väljare?
 
Att förstå *vem* som röstar är lika viktigt som att förstå *hur* de röstar.
Denna sida ger en övergripande bild av tre centrala faktorer som formar väljarprofilerna i Sveriges kommuner:
 
- **Ålder** – Hur ser medelåldern ut i kommuner med många respektive få röster?
- **Inkomst** – Finns det ett samband mellan inkomstnivå och röstmönster?
- **Utbildning** – Hur ser utbildningsnivån ut bland väljarna?
 
Använd könsfiltren nedan för att se skillnader mellan män, kvinnor och totalt.
 
</div>
  `);
 
  // DATA PREP — total votes per kommun
 
  const kommunVotes = new Map();
  electionResults.forEach(row => {
    const k = row.kommun;
    if (!kommunVotes.has(k)) kommunVotes.set(k, { votes2018: 0, votes2022: 0 });
    const v = kommunVotes.get(k);
    v.votes2018 += Number(row.roster2018 || 0);
    v.votes2022 += Number(row.roster2022 || 0);
  });
 
  // SECTION 1 — ÅLDER
 
  addMdToPage(`---\n## 1. Ålder – Röstar äldre kommuner mer?`);
 
  let ageGender = addDropdown("Filtrera efter kön (ålder)", ["Totalt", "Män", "Kvinnor"]);
  const ageGenderKey = ageGender.toLowerCase();
 
  const ageFiltered = ages.filter(a => a.kon === ageGenderKey && a.medelalderAr2022);
  const sortedByAge = [...ageFiltered].sort((a, b) =>
    Number(b.medelalderAr2022) - Number(a.medelalderAr2022)
  );
 
  const oldest10 = sortedByAge.slice(0, 10);
  const youngest10 = sortedByAge.slice(-10).reverse();
 
  // Oldest 10
  addMdToPage(`### De 10 äldsta kommunerna – röster 2018 vs 2022 (${ageGender})`);
 
  const oldestData = [["Kommun", "Röster 2018", "Röster 2022"]];
  oldest10.forEach(a => {
    const votes = kommunVotes.get(a.kommun);
    if (votes) {
      oldestData.push([
        `${a.kommun} (${a.medelalderAr2022} år)`,
        votes.votes2018,
        votes.votes2022
      ]);
    }
  });
 
  drawGoogleChart({
    type: "BarChart",
    data: oldestData,
    options: {
      title: `Äldsta kommuner – totala röster (${ageGender})`,
      height: 420,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Antal röster", format: "#,###" },
      vAxis: { title: "Kommun (medelålder)" },
      legend: { position: "top" }
    }
  });
 
  // Youngest 10
  addMdToPage(`### De 10 yngsta kommunerna – röster 2018 vs 2022 (${ageGender})`);
 
  const youngestData = [["Kommun", "Röster 2018", "Röster 2022"]];
  youngest10.forEach(a => {
    const votes = kommunVotes.get(a.kommun);
    if (votes) {
      youngestData.push([
        `${a.kommun} (${a.medelalderAr2022} år)`,
        votes.votes2018,
        votes.votes2022
      ]);
    }
  });
 
  drawGoogleChart({
    type: "BarChart",
    data: youngestData,
    options: {
      title: `Yngsta kommuner – totala röster (${ageGender})`,
      height: 420,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Antal röster", format: "#,###" },
      vAxis: { title: "Kommun (medelålder)" },
      legend: { position: "top" }
    }
  });
 
  // SECTION 2 — INKOMST
 
  addMdToPage(`---\n## 2. Inkomst – Röstar rikare kommuner annorlunda?`);
 
  let incomeGender = addDropdown("Filtrera efter kön (inkomst)", ["Totalt", "Män", "Kvinnor"]);
  const incomeGenderKey = incomeGender.toLowerCase();
 
  const incomeFiltered = income.filter(i => i.kon === incomeGenderKey && i.medelInkomst2022);
  const sortedByIncome = [...incomeFiltered].sort((a, b) =>
    Number(b.medelInkomst2022) - Number(a.medelInkomst2022)
  );
 
  const richest10 = sortedByIncome.slice(0, 10);
  const poorest10 = sortedByIncome.slice(-10).reverse();
 
  // Richest 10
  addMdToPage(`### De 10 rikaste kommunerna – röster 2018 vs 2022 (${incomeGender})`);
 
  const richestData = [["Kommun", "Röster 2018", "Röster 2022"]];
  richest10.forEach(i => {
    const votes = kommunVotes.get(i.kommun);
    if (votes) {
      richestData.push([
        `${i.kommun} (${i.medelInkomst2022} tkr)`,
        votes.votes2018,
        votes.votes2022
      ]);
    }
  });
 
  drawGoogleChart({
    type: "BarChart",
    data: richestData,
    options: {
      title: `Högst inkomst – totala röster (${incomeGender})`,
      height: 420,
      colors: ["#6EE7B7", "#059669"],
      chartArea: { left: 220, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Antal röster", format: "#,###" },
      vAxis: { title: "Kommun (medelinkomst)" },
      legend: { position: "top" }
    }
  });
 
  // Poorest 10
  addMdToPage(`### De 10 kommunerna med lägst inkomst – röster 2018 vs 2022 (${incomeGender})`);
 
  const poorestData = [["Kommun", "Röster 2018", "Röster 2022"]];
  poorest10.forEach(i => {
    const votes = kommunVotes.get(i.kommun);
    if (votes) {
      poorestData.push([
        `${i.kommun} (${i.medelInkomst2022} tkr)`,
        votes.votes2018,
        votes.votes2022
      ]);
    }
  });
 
  drawGoogleChart({
    type: "BarChart",
    data: poorestData,
    options: {
      title: `Lägst inkomst – totala röster (${incomeGender})`,
      height: 420,
      colors: ["#6EE7B7", "#059669"],
      chartArea: { left: 220, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Antal röster", format: "#,###" },
      vAxis: { title: "Kommun (medelinkomst)" },
      legend: { position: "top" }
    }
  });
 
  // SECTION 3 — UTBILDNING
 
  addMdToPage(`---\n## 3. Utbildning – Vilka utbildningsnivåer dominerar?`);
 
  let eduGender = addDropdown("Filtrera efter kön (utbildning)", ["Alla", "Män", "Kvinnor"]);
  const eduGenderKey = eduGender.toLowerCase();
 
  const eduMap = new Map();
  educationInfo.forEach(e => {
    if (eduGenderKey !== "alla" && e.gender !== eduGenderKey) return;
    const level = e.educationalLevel;
    if (!eduMap.has(level)) eduMap.set(level, { votes2018: 0, votes2022: 0 });
    const d = eduMap.get(level);
    d.votes2018 += Number(e["2018"] || 0);
    d.votes2022 += Number(e["2022"] || 0);
  });
 
  const eduChartData = [["Utbildningsnivå", "2018", "2022"]];
  eduMap.forEach((v, level) => {
    eduChartData.push([level, v.votes2018, v.votes2022]);
  });
 
  addMdToPage(`### Röster per utbildningsnivå – 2018 vs 2022 (${eduGender})`);
 
  drawGoogleChart({
    type: "BarChart",
    data: eduChartData,
    options: {
      title: `Röster per utbildningsnivå (${eduGender})`,
      height: 500,
      colors: ["#C4B5FD", "#7C3AED"],
      chartArea: { left: 280, right: 60, top: 50, bottom: 50 },
      hAxis: { title: "Antal röster", format: "#,###" },
      vAxis: { title: "Utbildningsnivå" },
      legend: { position: "top" }
    }
  });
 
  // INTERPRETATION
 
  addMdToPage(`
<div style="
  background:#F8FAFC;
  padding:30px;
  border-radius:18px;
  margin-top:35px;
  border-left:8px solid #192c4e;
">
 
## Sammanfattning – Vem röstar?
 
Analysen av både 2018 och 2022 visar att väljarprofilerna i Sverige formas av ett samspel mellan ålder, inkomst och utbildning:
 
- **Ålder**: Äldre kommuner visar ett stabilt röstmönster. Yngre kommuner — ofta växande förortskommuner — visar tydligare förändringar mellan valåren.
- **Inkomst**: Könsskillnaderna i inkomst är tydliga — män har genomgående högre medelinkomst, men kvinnors röstdeltagande är minst lika högt.
- **Utbildning**: Fördelningen skiljer sig mellan könen — kvinnor är överrepresenterade på högre utbildningsnivåer i flera kommuner.
 
Dessa tre faktorer utgör grunden för de kommande sektionerna om *Demografi*, *Ekonomiska faktorer* och *Geografisk plats*.
 
</div>
  `);
 
}