// SQLITE
dbQuery.use('counties-sqlite');
export let countyInfo = await dbQuery('SELECT * FROM countyInfo');
export let unemployment = await dbQuery('SELECT * FROM arbetsloshet_by_lan');
export let incomes = await dbQuery('SELECT * FROM income_kommun');
export let lanKommun = await dbQuery('SELECT * FROM lan_kommun');
export let valdataKommun = await dbQuery('SELECT * FROM valdata_kommun');

dbQuery.use('education-sqlite');
export let educationInfo = await dbQuery('SELECT * FROM educationSweden');

dbQuery.use('undersokning_2018');
export let undersokning2018 = await dbQuery('SELECT * FROM roster_2018');

dbQuery.use('undersokning_2022');
export let undersokning2022 = await dbQuery('SELECT * FROM roster_2022');

dbQuery.use('valresultat');
export let rostningInfo = await dbQuery('SELECT * FROM rostning');

// MYSQL
dbQuery.use('geo-mysql');
export let geoData = await dbQuery('SELECT * FROM geoData ORDER BY latitude');

// MONGODB (income)
dbQuery.use('kommun-info-mongodb');
export let income = await dbQuery.collection('incomeByKommun').find({});

// MONGODB (age)
dbQuery.use('kommun-info-mongodb');
export let ages = await dbQuery.collection('ageByKommun').find({});

// NEO4J
dbQuery.use('riksdagsval-neo4j');
export let electionResults = await dbQuery('MATCH (n:Partiresultat) RETURN n');
