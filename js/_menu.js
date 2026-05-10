createMenu('Vad påverkar röstning i Sverige (2018–2022)?', [

  { name: 'Introduktion', script: 'intro.js' },

  { name: 'Valöversikt', sub: [
      { name: 'Nationella valresultat', script: 'valoversikt/national-overview.js' },
      { name: 'Röstandelar per parti', script: 'valoversikt/party-shares.js' },
      { name: 'Jämförelse mellan partier', script: 'valoversikt/party-comparison.js' }
  ]},

  { name: 'Ekonomiska faktorer', sub: [
      { name: 'Inkomst (översikt)', script: 'ekonomiska/incomes.js' },
      { name: 'Inkomst vs röstning', script: 'ekonomiska/income-voting.js' },
      { name: 'Hög vs låg inkomst', script: 'ekonomiska/income-groups.js' },
      { name: 'Arbetslöshet', script: 'ekonomiska/arbetslos.js' },
      { name: 'Arbetslöshet vs Val', script: 'ekonomiska/unemployment-voting.js' } 
  ]},

  { name: 'Demografi', sub: [
      { name: 'Ålder (översikt)', script: 'demografi/ages.js' },
      { name: 'Ålder vs röstning', script: 'demografi/age-voting.js' },
      { name: 'Unga vs äldre områden', script: 'demografi/age-groups.js' },
      { name: 'Utbildning', script: 'demografi/academics.js' }
  ]},

 { name: 'Geografisk plats', sub: [
     { name: 'Regioner (Norr/Söder)', script: 'geografisk/regions.js' },
     { name: 'Stad vs Landsbygd', script: 'geografisk/urban-rural.js' },
     { name: 'Befolkningstäthet', script: 'geografisk/density.js' },
     { name: 'Invandring', script: 'geografisk/immigration.js' },
     { name: 'Populäraste parti', script: 'geografisk/popularParty.js' },
    
  ]},

  { name: 'Förändring 2018–2022', sub: [
      { name: 'Partiförändringar', script: 'forandring/partyChange.js' },
      { name: 'Största vinnare & förlorare', script: 'forandring/top-changes.js' },
      { name: 'Regionala politiska skiften', script: 'forandring/regional-politiska.js' },
      { name: 'Regionala drivkrafter', script: 'forandring/regional-drivkrafter.js' }
]}, 

  { name: 'källor', script: 'sources.js' },
  { name: 'Slutsats', script: 'conclusion.js' },

]);
