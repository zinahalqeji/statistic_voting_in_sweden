addMdToPage(`
# Källor / Sources

<div style="
background:#F1F5F9;
padding:30px;
border-radius:16px;
margin-top:20px;
border-left:8px solid #192c4e;
">

## Datakällor för projektet

Detta projekt bygger på officiella och öppet tillgängliga datakällor från  
**Valmyndigheten** och **Statistiska centralbyrån (SCB)**.  
Alla dataset har bearbetats, normaliserats och integrerats för att möjliggöra  
statistiska analyser av valresultat, socioekonomiska faktorer och regionala skillnader.

</div>


---

# Primära datakällor

## 1. Valmyndigheten – Riksdagsval 2018 & 2022
**Källa:** Valmyndigheten  
**Dataset:** Officiella valresultat per kommun och parti  
**URL:**  
https://www.val.se/valresultat-och-statistik/statistik-och-data/analyser-och-jamforelser  

https://resultat.val.se/val2022/RD?r=S

**Användning i projektet:**  
- Röster per parti och kommun  
- Nationella röstandelar  
- Partiförändringar 2018–2022  
- Blockanalys (vänster/höger)  
- Vinnare & förlorare  
- Regionala politiska skiften  


---

## 2. SCB – Utbildningsnivå i Sverige
**Källa:** Statistiska centralbyrån  
**Dataset:** Utbildningsnivå per kommun  
**URL:**  
https://www.scb.se/hitta-statistik/sverige-i-siffror/utbildning-jobb-och-pengar/utbildningsnivan-i-sverige/  

**Användning i projektet:**  
- Socioekonomiska analyser  
- Korrelation mellan utbildningsnivå och politiska skiften  
- Regionala drivkrafter  


---

## 3. SCB – Kommuner och län (LAU2)
**Källa:** Statistiska centralbyrån  
**Dataset:** Kommun–län‑mappning  
**URL:**  
https://www.scb.se/en/finding-statistics/regional-statistics/regional-divisions/counties-and-municipalities/counties-and-municipalities-in-numerical-order/  

**Användning i projektet:**  
- Koppling mellan kommun och län  
- Regionala analyser  
- Länsvisa politiska skiften  


---

## 4. SCB – Arbetslöshet (AKU) 2018–2022
**Källa:** Statistiska centralbyrån  
**Dataset:** Arbetslöshet (AKU) efter region, kön, ålder och tid  
**URL:**  
https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__AM__AM0401__AM0401L/NAKUArblosaTAr/

**Användning i projektet:**  
- Arbetslöshet (%) per kommun  
- Köns- och åldersspecifika jämförelser  
- Socioekonomiska analyser kopplade till valresultat  
- Tidsserieanalys 2018–2022

---

# Databearbetning

För att möjliggöra jämförbara analyser har följande steg genomförts:

- Normalisering av kommunnamn (t.ex. *"Strängns" → "Strängnäs"*)  
- Aggregering av röster per parti och kommun  
- Beräkning av röstandelar (%)  
- Beräkning av förändringar i procentenheter  
- Blockindelning (vänster/höger)  
- Sammanfogning av SCB‑data med valresultat  
- Normalisering av socioekonomiska variabler  
- Korrelationer mellan socioekonomi och politiska skiften  


---

# Statistiska metoder

Projektet använder följande metoder:

- Deskriptiv statistik (medel, median, standardavvikelse)  
- Förändringsanalys (2018–2022)  
- Korrelation (Pearson r)  
- Rangordning (Top 10 / Bottom 10)  
- Visualiseringar: stapeldiagram, linjediagram, bubbeldiagram  
- Regional analys på läns- och kommunnivå  


---

# Referenser

- Valmyndigheten – Officiella valresultat  
- Statistiska centralbyrån (SCB) – Inkomst, utbildning, befolkning, tätorter  
- SCB – Kommuner och län (LAU2)  
- Sveriges kommuner och regioner (SKR) – Kommunindelning  

---

<div style="
background:#F8FAFC;
padding:25px;
border-radius:16px;
margin-top:30px;
border-left:8px solid #192c4e;
">

## Sammanfattning

Källorna ovan utgör grunden för projektets statistiska analyser.  
Alla dataset kommer från officiella myndigheter och är öppet tillgängliga.  
Bearbetningen har utförts med fokus på transparens, reproducerbarhet och akademisk kvalitet.

</div>
`);
