import dbInfoOk, { displayDbNotOkText } from "../helper/dbInfoOk.js";

function infoBox(title, text) {
  return `
    <div style="background:#ffffff; border-left:5px solid #2f5d50; padding:20px 22px; border-radius:8px; margin:20px 0 24px 0; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h3 style="margin:0 0 10px 0; font-size:19px;">${title}</h3>
      <p style="margin:0; line-height:1.75; font-size:16px;">${text}</p>
    </div>
  `;
}

addMdToPage(`
# Invandring och röstning

Här undersöker vi om det finns samband mellan andel utrikes födda och röstningsmönster i Sverige mellan valen 2018 och 2022.

## Fråga
**Finns det samband mellan andel utrikes födda och röstningsmönster, och hur varierar detta mellan olika regioner?**

**Planerade enheter:**
- Utrikes födda: procent (%)
- Röstandel: procent (%)
- Röster: antal röster
`);

addToPage(infoBox(
  "Analysens hypotes",
  "Vår hypotes är att andelen utrikes födda kan ha samband med röstningsmönster, men att sambandet kan variera mellan olika regioner. Vi vill undersöka om vissa partier har starkare stöd i områden med högre eller lägre andel utrikes födda."
));

if (!dbInfoOk) {
  displayDbNotOkText();
}
else {
  addMdToPage(`
## Databas under arbete

Den geografiska databasen för utrikes födda håller just nu på att kopplas till projektet.

När databasen är färdig kommer sidan att innehålla:

- jämförelser mellan 2018 och 2022
- scatterplots
- korrelationsanalys
- dropdown för parti
- tabeller med röstandel och antal röster
- analys av regionala skillnader
`);

  drawGoogleChart({
    type: "ScatterChart",
    data: [
      ["Utrikes födda (%)", "Röstandel (%)"],
      [8, 30],
      [12, 28],
      [18, 24],
      [25, 22],
      [35, 20]
    ],
    options: {
      title: "Exempel på framtida samband mellan utrikes födda och röstandel",
      height: 520,
      chartArea: { width: "75%", height: "70%" },
      hAxis: {
        title: "Utrikes födda (%)"
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

- om partistödet skiljer sig mellan kommuner med låg och hög andel utrikes födda
- om sambandet förändrades mellan 2018 och 2022
- om mönstret ser olika ut i olika delar av Sverige
- om förändringen gäller antal röster eller röstandel i procent

## Planerad metod

Den framtida databasen bör innehålla:
- kommun
- län
- utrikes födda antal
- utrikes födda procent
- valresultat 2018
- valresultat 2022

Röstandelar kommer att jämföras med andel utrikes födda för att undersöka möjliga samband.

## Begränsningar

Ett samband mellan andel utrikes födda och röstning betyder inte att invandring orsakar ett visst röstningsmönster. Andra faktorer som inkomst, utbildning, arbetslöshet, ålder och befolkningstäthet kan påverka samtidigt.

## Extremvärden

Storstäder och vissa kommuner med mycket hög eller mycket låg andel utrikes födda kan påverka resultatet. Därför behöver analysen senare visa både spridningsdiagram och tabeller så att extremvärden kan identifieras.
`);
}