const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeSponsors() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants');
  
  // Wait for the table to load
  await page.waitForSelector('table');

  const sponsors = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    return Array.from(rows)
      .slice(1) // Skip header row
      .map(row => {
        const cells = row.querySelectorAll('td');
        return cells[0]?.textContent?.trim() || ''; // Get company name from first column
      })
      .filter(name => name); // Remove empty entries
  });

  await browser.close();

  // Create content.js with the sponsors data
  const contentJs = `
const recognizedSponsors = new Set([
  ${sponsors.map(name => `"${name}"`).join(',\n  ')}
]);
  `;

  fs.writeFileSync('sponsors.json', JSON.stringify(sponsors, null, 2));
  console.log(`Scraped ${sponsors.length} sponsors`);
}

scrapeSponsors().catch(console.error); 