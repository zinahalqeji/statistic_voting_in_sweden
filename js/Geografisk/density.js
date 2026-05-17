import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

addMdToPage(`
# Befolkningstäthet och röstning

Här undersöker vi om det finns samband mellan befolkningstäthet och röstningsmönster i Sverige mellan valen 2018 och 2022.

## Fråga
**Finns det samband mellan befolkningstäthet och röstning, och hur skiljer sig tätbefolkade och glesbefolkade områden?**

**Planerade enheter:**
- Befolkningstäthet: invånare per km²
- Röstandel: procent (%)
- Röster: antal röster
`);

function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att befolkningstäthet kan ha samband med hur människor röstar. Tätbefolkade områden kan ha andra politiska mönster än glesbefolkade områden. Vi vill därför undersöka om vissa partier har starkare stöd i områden med hög eller låg befolkningstäthet."
));

if (!dbInfoOk) {
  displayDbNotOkText();
}
else {

  addMdToPage(`
## Databas under arbete

Den geografiska databasen för befolkningstäthet håller just nu på att kopplas till projektet.

När databasen är färdig kommer sidan att innehålla:

- jämförelser mellan 2018 och 2022
- scatterplots
- korrelationsanalyser
- diagram för olika partier
- jämförelser mellan tätbefolkade och glesbefolkade områden
- tabeller med röstandelar och antal röster
`);

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      ["Befolkningstäthet", "Röstandel (%)"],
      [50, 18],
      [100, 20],
      [200, 24],
      [400, 29],
      [800, 35]
    ],
    options: {
      title: "Exempel på framtida samband mellan befolkningstäthet och röstandel",
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Befolkningstäthet (invånare/km²)"
      },
      vAxis: {
        title: "Röstandel (%)"
      },
      legend: "none"
    }
  });

  addMdToPage(`
## Planerad analys

Den färdiga analysen kommer att undersöka:

- om vissa partier är starkare i tätbefolkade områden
- om vissa partier är starkare i glesbefolkade områden
- hur sambanden förändrades mellan 2018 och 2022
- om skillnaderna ökade eller minskade över tid

Vi kommer också att jämföra:
- antal röster
- röstandelar (%)
- förändring mellan valåren

## Planerad metod

Den framtida databasen kommer att innehålla:
- kommun
- län
- befolkning
- area
- befolkningstäthet
- valresultat 2018
- valresultat 2022

Röstandelar kommer att analyseras tillsammans med befolkningstäthet för att undersöka möjliga geografiska samband.

## Begränsningar

Samband mellan befolkningstäthet och röstning betyder inte automatiskt att det finns ett direkt orsakssamband. Andra faktorer som utbildning, inkomst, ålder och migration kan också påverka hur människor röstar.

## Extremvärden

Storstäder som Stockholm, Göteborg och Malmö kan påverka resultaten mycket eftersom de har både hög befolkningstäthet och många väljare. Därför är det viktigt att analysera både procent och antal röster.
`);
}