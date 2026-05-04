addMdToPage(`# Källor / Sources`);

addMdToPage(`
Denna sida sammanställer alla datakällor som används i projektet.  
Syftet är att ge full transparens kring var informationen kommer ifrån, hur den har bearbetats och vilka metoder som använts i analysen.
`);


// =========================
// 1. VALDATA (NEO4J)
// =========================

addMdToPage(`
## 1. Valdata (Neo4j – riksdagsval-neo4j)

**Databas:** \`riksdagsval-neo4j\`  
**Nodtyp:** \`Partiresultat\`  

**Innehåll:**  
- Röster per parti och kommun  
- Valår: 2018 och 2022  

**Använda fält:**  
- \`kommun\`  
- \`parti\`  
- \`roster2018\`  
- \`roster2022\`  

**Syfte:**  
Att jämföra valresultat mellan 2018 och 2022 samt identifiera förändringar i partistöd.
`);


// =========================
// 2. INKOMSTDATA (MONGODB)
// =========================

addMdToPage(`
## 2. Inkomstdata (MongoDB – kommun-info-mongodb)

**Collection:** \`incomeByKommun\`  

**Innehåll:**  
- Medelinkomst per kommun (2018)  
- Medianinkomst per kommun (2022)  
- Könsuppdelning (vi använder \`totalt\`)  

**Använda fält:**  
- \`kommun\`  
- \`kon\`  
- \`medelInkomst2018\`  
- \`medianInkomst2022\`  

**Syfte:**  
Att undersöka sambandet mellan inkomstnivåer och partistöd i valet 2022.
`);


// =========================
// 3. ARBETSLÖSHET (SQLITE)
// =========================

addMdToPage(`
## 3. Arbetslöshetsdata (SQLite)

**Fil:** \`arbetsloshet_nya.db\`  

**Innehåll:**  
- Arbetslöshetsnivåer per kommun  

**Syfte:**  
Att jämföra partistöd i kommuner med hög respektive låg arbetslöshet.
`);


// =========================
// 4. KOMMUNINFORMATION (SQLITE)
// =========================

addMdToPage(`
## 4. Kommuninformation (SQLite)

**Filer:**  
- \`kommuner.db\`  
- \`counties.sqlite3\`  

**Innehåll:**  
- Kommunnamn  
- Länstillhörighet  
- Geografiska attribut  

**Syfte:**  
Att möjliggöra matchning, filtrering och gruppering av kommuner i analysen.
`);


// =========================
// 5. DATABEARBETNING
// =========================

addMdToPage(`
## 5. Databearbetning

Följande steg har genomförts innan analys och visualisering:

- **Filtrering:** Endast 20 utvalda kommuner och 3 partier (S, M, SD) inkluderades.  
- **Gruppering:** Valresultat grupperades per kommun.  
- **Beräkningar:** Röstandelar, procent, medelvärden, medianer och totalsummor.  
- **Normalitetsbedömning:** Jämförelse mellan medelvärde och median.  
- **Korrelation:** Pearson r mellan inkomst och röstandel.  
- **Visualisering:** BarChart och BubbleChart för att visa mönster och skillnader.
`);


// =========================
// 6. METODER
// =========================

addMdToPage(`
## 6. Metoder

Analysen bygger på följande statistiska och analytiska metoder:

- **Deskriptiv statistik:** medelvärde, median, min, max  
- **Korrelation:** Pearson r  
- **Jämförelse mellan år:** 2018 vs 2022  
- **Visualisering:** BarChart, BubbleChart  
- **Kategorisering:** Hög vs låg arbetslöshet, vänster vs höger block
`);


// =========================
// 7. REFERENSER
// =========================

addMdToPage(`
## 7. Referenser

- Statistiska centralbyrån (SCB)  
- Valmyndigheten  
- Kommunala databaser (Neo4j, MongoDB, SQLite)  
- Intern databehandling inom projektet
`);
