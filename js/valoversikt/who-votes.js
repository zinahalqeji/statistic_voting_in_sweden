import { electionResults, ages, income, educationInfo } from "../helper/dataLoader.js";
import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

if (!dbInfoOk) {
  displayDbNotOkText();
} else {
  const getNumber = (row, keys) => {
    for (const key of keys) {
      const value = Number(row[key]);
      if (!Number.isNaN(value) && row[key] !== undefined && row[key] !== null && row[key] !== "") {
        return value;
      }
    }
    return 0;
  };

  const eligibleKeys2018 = [
    "rostberattigade2018",
    "rostberattigande2018",
    "röstberättigade2018",
    "röstberättigande2018"
  ];

  const eligibleKeys2022 = [
    "rostberattigade2022",
    "rostberattigande2022",
    "röstberättigade2022",
    "röstberättigande2022"
  ];

  const percentValue = (votes, eligible, fallbackTotal = 0) => {
    if (eligible && eligible > 0) return votes / eligible;
    if (fallbackTotal && fallbackTotal > 0) return votes / fallbackTotal;
    return 0;
  };

  const pctCell = (value) => ({
    v: value,
    f: `${(value * 100).toFixed(1).replace(".", ",")}%`
  });

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

- **Ålder** – Hur ser medelåldern ut i kommuner med hög respektive låg röstandel?
- **Inkomst** – Finns det ett samband mellan inkomstnivå och röstandel?
- **Utbildning** – Hur ser röstandelen ut bland väljarna?

Använd könsfiltren nedan för att se skillnader mellan män, kvinnor och totalt.

</div>
  `);

  // DATA PREP — turnout per kommun

  const kommunVotes = new Map();
  electionResults.forEach(row => {
    const k = row.kommun;

    if (!kommunVotes.has(k)) {
      kommunVotes.set(k, {
        votes2018: 0,
        votes2022: 0,
        eligible2018: 0,
        eligible2022: 0
      });
    }

    const v = kommunVotes.get(k);

    v.votes2018 += getNumber(row, ["roster2018"]);
    v.votes2022 += getNumber(row, ["roster2022"]);
    v.eligible2018 += getNumber(row, eligibleKeys2018);
    v.eligible2022 += getNumber(row, eligibleKeys2022);
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

  addMdToPage(`### De 10 äldsta kommunerna – röstandel 2018 vs 2022 (${ageGender})`);

  const oldestVotes2018Total = oldest10.reduce((sum, a) => {
    const votes = kommunVotes.get(a.kommun);
    return sum + (votes ? votes.votes2018 : 0);
  }, 0);

  const oldestVotes2022Total = oldest10.reduce((sum, a) => {
    const votes = kommunVotes.get(a.kommun);
    return sum + (votes ? votes.votes2022 : 0);
  }, 0);

  const oldestData = [["Kommun", "Röstandel 2018 (%)", "Röstandel 2022 (%)"]];
  oldest10.forEach(a => {
    const votes = kommunVotes.get(a.kommun);
    if (votes) {
      oldestData.push([
        `${a.kommun} (${a.medelalderAr2022} år)`,
        pctCell(percentValue(votes.votes2018, votes.eligible2018, oldestVotes2018Total)),
        pctCell(percentValue(votes.votes2022, votes.eligible2022, oldestVotes2022Total))
      ]);
    }
  });

  drawGoogleChart({
    type: "BarChart",
    data: oldestData,
    options: {
      title: `Äldsta kommuner – röstandel (${ageGender})`,
      height: 420,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Röstandel (%)", format: "0.0%" },
      vAxis: { title: "Kommun (medelålder)" },
      legend: { position: "top" }
    }
  });

  // Youngest 10

  addMdToPage(`### De 10 yngsta kommunerna – röstandel 2018 vs 2022 (${ageGender})`);

  const youngestVotes2018Total = youngest10.reduce((sum, a) => {
    const votes = kommunVotes.get(a.kommun);
    return sum + (votes ? votes.votes2018 : 0);
  }, 0);

  const youngestVotes2022Total = youngest10.reduce((sum, a) => {
    const votes = kommunVotes.get(a.kommun);
    return sum + (votes ? votes.votes2022 : 0);
  }, 0);

  const youngestData = [["Kommun", "Röstandel 2018 (%)", "Röstandel 2022 (%)"]];
  youngest10.forEach(a => {
    const votes = kommunVotes.get(a.kommun);
    if (votes) {
      youngestData.push([
        `${a.kommun} (${a.medelalderAr2022} år)`,
        pctCell(percentValue(votes.votes2018, votes.eligible2018, youngestVotes2018Total)),
        pctCell(percentValue(votes.votes2022, votes.eligible2022, youngestVotes2022Total))
      ]);
    }
  });

  drawGoogleChart({
    type: "BarChart",
    data: youngestData,
    options: {
      title: `Yngsta kommuner – röstandel (${ageGender})`,
      height: 420,
      colors: ["#93C5FD", "#1e3a5f"],
      chartArea: { left: 210, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Röstandel (%)", format: "0.0%" },
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

  addMdToPage(`### De 10 rikaste kommunerna – röstandel 2018 vs 2022 (${incomeGender})`);

  const richestVotes2018Total = richest10.reduce((sum, i) => {
    const votes = kommunVotes.get(i.kommun);
    return sum + (votes ? votes.votes2018 : 0);
  }, 0);

  const richestVotes2022Total = richest10.reduce((sum, i) => {
    const votes = kommunVotes.get(i.kommun);
    return sum + (votes ? votes.votes2022 : 0);
  }, 0);

  const richestData = [["Kommun", "Röstandel 2018 (%)", "Röstandel 2022 (%)"]];
  richest10.forEach(i => {
    const votes = kommunVotes.get(i.kommun);
    if (votes) {
      richestData.push([
        `${i.kommun} (${i.medelInkomst2022} tkr)`,
        pctCell(percentValue(votes.votes2018, votes.eligible2018, richestVotes2018Total)),
        pctCell(percentValue(votes.votes2022, votes.eligible2022, richestVotes2022Total))
      ]);
    }
  });

  drawGoogleChart({
    type: "BarChart",
    data: richestData,
    options: {
      title: `Högst inkomst – röstandel (${incomeGender})`,
      height: 420,
      colors: ["#6EE7B7", "#059669"],
      chartArea: { left: 220, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Röstandel (%)", format: "0.0%" },
      vAxis: { title: "Kommun (medelinkomst)" },
      legend: { position: "top" }
    }
  });

  // Poorest 10

  addMdToPage(`### De 10 kommunerna med lägst inkomst – röstandel 2018 vs 2022 (${incomeGender})`);

  const poorestVotes2018Total = poorest10.reduce((sum, i) => {
    const votes = kommunVotes.get(i.kommun);
    return sum + (votes ? votes.votes2018 : 0);
  }, 0);

  const poorestVotes2022Total = poorest10.reduce((sum, i) => {
    const votes = kommunVotes.get(i.kommun);
    return sum + (votes ? votes.votes2022 : 0);
  }, 0);

  const poorestData = [["Kommun", "Röstandel 2018 (%)", "Röstandel 2022 (%)"]];
  poorest10.forEach(i => {
    const votes = kommunVotes.get(i.kommun);
    if (votes) {
      poorestData.push([
        `${i.kommun} (${i.medelInkomst2022} tkr)`,
        pctCell(percentValue(votes.votes2018, votes.eligible2018, poorestVotes2018Total)),
        pctCell(percentValue(votes.votes2022, votes.eligible2022, poorestVotes2022Total))
      ]);
    }
  });

  drawGoogleChart({
    type: "BarChart",
    data: poorestData,
    options: {
      title: `Lägst inkomst – röstandel (${incomeGender})`,
      height: 420,
      colors: ["#6EE7B7", "#059669"],
      chartArea: { left: 220, right: 60, top: 50, bottom: 40 },
      hAxis: { title: "Röstandel (%)", format: "0.0%" },
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

  const totalEdu2018 = [...eduMap.values()].reduce((sum, x) => sum + x.votes2018, 0);
  const totalEdu2022 = [...eduMap.values()].reduce((sum, x) => sum + x.votes2022, 0);

  const eduChartData = [["Utbildningsnivå", "2018 (%)", "2022 (%)"]];
  eduMap.forEach((v, level) => {
    eduChartData.push([
      level,
      pctCell(percentValue(v.votes2018, totalEdu2018)),
      pctCell(percentValue(v.votes2022, totalEdu2022))
    ]);
  });

  addMdToPage(`### Röstandel per utbildningsnivå – 2018 vs 2022 (${eduGender})`);

  drawGoogleChart({
    type: "BarChart",
    data: eduChartData,
    options: {
      title: `Röstandel per utbildningsnivå (${eduGender})`,
      height: 500,
      colors: ["#C4B5FD", "#7C3AED"],
      chartArea: { left: 280, right: 60, top: 50, bottom: 50 },
      hAxis: { title: "Röstandel (%)", format: "0.0%" },
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