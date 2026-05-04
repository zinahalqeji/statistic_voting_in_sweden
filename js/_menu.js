createMenu('🇸🇪 Vad påverkar röstning i Sverige (2018–2022)?', [

  { name: 'Introduktion', script: 'intro.js' },

  { name: 'Valöversikt', sub: [
      { name: 'Valresultat 2018 vs 2022', script: 'overview-elections.js' },
      { name: 'Jämförelse mellan partier', script: 'party-comparison.js' },
      { name: 'Största förändringar', script: 'party-change.js' }
  ]},

  { name: 'Ekonomiska faktorer', sub: [
      { name: 'Inkomst (översikt)', script: 'income.js' },
      { name: 'Inkomst vs röstning', script: 'income-voting.js' },
      { name: 'Hög vs låg inkomst', script: 'income-groups.js' },
      { name: 'Arbetslöshet', script: 'arbetslos.js' },
      { name: 'Arbetslöshet vs Val', script: 'unemployment-voting.js' } 
  ]},

  { name: 'Demografi', sub: [
      { name: 'Ålder (översikt)', script: 'ages.js' },
      { name: 'Ålder vs röstning', script: 'age-voting.js' },
      { name: 'Unga vs äldre områden', script: 'age-groups.js' },
      { name: 'Utbildning', script: 'academics.js' }
  ]},

 { name: 'Geografisk plats', sub: [
     { name: 'Regioner (Norr/Söder)', script: 'regions.js' },
     { name: 'Stad vs Landsbygd', script: 'urban-rural.js' },
     { name: 'Befolkningstäthet', script: 'density.js' },
     { name: 'Invandring', script: 'immigration.js' },
     { name: 'Populäraste parti', script: 'popularParty.js' },
    
  ]},

  { name: 'Förändring 2018–2022', sub: [
      { name: 'Partiförändringar', script: 'party-change.js' },
      { name: 'Största vinnare & förlorare', script: 'top-changes.js' },
      { name: 'Regionala förändringar', script: 'regional-change.js' }
]}, 

  { name: 'Data & källor', script: 'sources.js' },
  { name: 'Slutsats', script: 'conclusion.js' },

]);
