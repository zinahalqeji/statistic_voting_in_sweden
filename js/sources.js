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
- Används i sidorna: Regioner (Norr/Söder), Stad vs Landsbygd, Populäraste parti

**Trovärdighet:**  
Valmyndigheten är den statliga myndighet som ansvarar för genomförande och redovisning av svenska val. Datan är officiell och används som primärkälla av alla svenska medier och myndigheter. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan täcker samtliga 290 kommuner och alla riksdagspartier för valen 2018 och 2022. Valresultaten är slutgiltiga och revideras inte i efterhand. Datakvaliteten bedöms som mycket hög.

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

**Trovärdighet:**  
SCB är Sveriges officiella statistikmyndighet och ansvarar för nationell statistik enligt lag. Datan är tillförlitlig och används av myndigheter, forskning och media. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan baseras på registeruppgifter från Skatteverket och utbildningsregister. Täcker samtliga kommuner. Datakvaliteten bedöms som hög.

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
- Används i sidorna: Regioner (Norr/Söder), Stad vs Landsbygd

**Trovärdighet:**  
SCB ansvarar officiellt för regionala indelningar i Sverige. Indelningen i 21 län och 290 kommuner är fastställd i lag och uppdateras av SCB. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Indelningen är fullständig och täcker hela Sverige. Datakvaliteten bedöms som mycket hög.

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

**Trovärdighet:**  
AKU (Arbetskraftsundersökningen) är SCB:s officiella mätning av arbetsmarknaden och följer EU:s standarder. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan baseras på urvalsundersökning vilket innebär viss osäkerhet på kommunnivå. På länsnivå är tillförlitligheten god. Datakvaliteten bedöms som god men med viss osäkerhet på kommunnivå.

---

## 5. SCB – Inkomstnivå i Sverige
**Källa:** Statistiska centralbyrån  
**Dataset:** Sammanräknad förvärvsinkomst för boende i Sverige hela året efter region, kön, ålder och inkomstklass  
**URL:**  
https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__HE__HE0110__HE0110A/SamForvInk1/

**Urval som användes i projektet:**  
- Region: kommuner  
- Kön: män, kvinnor och totalt  
- Ålder: 20–64 år  
- Inkomstklass: totalt  
- År: 2018 och 2022  
- Mått: Medelinkomst, tkr  

**Användning i projektet:**  
- Inkomstnivå per kommun  
- Socioekonomiska analyser  
- Jämförelse mellan inkomstnivå och valresultat  
- Korrelation mellan inkomst och politiskt stöd  
- Tidsserieanalys 2018–2022

**Trovärdighet:**  
Inkomstdata från SCB baseras på registeruppgifter från Skatteverket och täcker hela befolkningen. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan täcker samtliga kommuner och är baserad på faktiska inkomstdeklarationer. Datakvaliteten bedöms som mycket hög.

---

## 6. SCB – Befolkningstäthet per kommun 2018 & 2022
**Källa:** Statistiska centralbyrån  
**Dataset:** Invånare per kvadratkilometer (landareal) efter region och år  
**URL:**  
https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BE__BE0101__BE0101C/BefArealTathetKon/

**Användning i projektet:**  
- Befolkningstäthet (invånare/km²) per kommun för 2018 och 2022  
- Används i sidan: Befolkningstäthet och röstning

**Trovärdighet:**  
SCB är Sveriges officiella statistikmyndighet. Befolkningstätheten beräknas utifrån folkbokförd befolkning och officiell landareal. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan täcker samtliga 290 kommuner för båda åren. Värdena baseras på landareal exklusive vatten. Datakvaliteten bedöms som hög. Notera att tätheten anges per landareal vilket kan ge lägre värden än om vattenområden inkluderas.

---

## 7. SCB – Utrikes födda per kommun 2018 & 2022
**Källa:** Statistiska centralbyrån  
**Dataset:** Befolkning efter region, födelseregion och år  
**URL:**  
https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BE__BE0101__BE0101Q/UtrikesFoddaR/

**Användning i projektet:**  
- Antal utrikes födda per kommun 2018 och 2022  
- Beräkning av andel utrikes födda (%) som andel av kommunens befolkning  
- Används i sidan: Invandring och röstning

**Trovärdighet:**  
SCB:s data om utrikes födda baseras på folkbokföringsregistret från Skatteverket och täcker hela befolkningen. Trovärdigheten bedöms som mycket hög.

**Datakvalitet:**  
Datan täcker samtliga kommuner. En viktig begränsning är att andelen utrikes födda inkluderar personer utan rösträtt i riksdagsval – endast svenska medborgare har rösträtt. Variabeln mäter därför inte exakt den röstberättigade befolkningens sammansättning, men är det bästa tillgängliga måttet på kommunal nivå. Datakvaliteten bedöms som hög med denna begränsning i åtanke.

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
- Linjär regression (minsta kvadratmetoden) för trendlinjer  
- Percentilindelning för gruppanalys  
- Rangordning (Top 10 / Bottom 10)  
- Visualiseringar: stapeldiagram, linjediagram, scatterplot med trendlinje  
- Regional analys på läns- och kommunnivå  

---

# Referenser

- Valmyndigheten – Officiella valresultat  
- Statistiska centralbyrån (SCB) – Inkomst, utbildning, befolkning, tätorter  
- SCB – Kommuner och län (LAU2)  
- SCB – Befolkningstäthet per kommun  
- SCB – Utrikes födda per kommun  
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