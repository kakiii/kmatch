const fetch = require('node-fetch');
const fs = require('fs');

async function fetchSponsors() {
  // You'll need to find the actual API endpoint by inspecting network requests
  const response = await fetch('https://ind.nl/api/sponsors');
  const data = await response.json();
  
  const sponsors = data.map(item => item.name);
  
  fs.writeFileSync('sponsors.json', JSON.stringify(sponsors, null, 2));
  console.log(`Fetched ${sponsors.length} sponsors`);
}

fetchSponsors().catch(console.error); 