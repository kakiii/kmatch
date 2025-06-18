#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./config');
const logger = require('./logger');

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch sponsor data from IND website with retry logic
 * @returns {Promise<string>} HTML content
 */
async function fetchSponsorData() {
  logger.info('Starting to fetch sponsor data from IND website');
  logger.debug('URL:', CONFIG.IND_URL);
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      logger.info(`Fetch attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS}`);
      
      const response = await axios.get(CONFIG.IND_URL, {
        timeout: CONFIG.HTTP_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KMatch-Bot/1.0; +https://github.com/kakiii/kmatch)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (response.status === 200 && response.data) {
        logger.info('Successfully fetched sponsor data');
        logger.debug(`Response size: ${response.data.length} characters`);
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      logger.error(`Fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        throw new Error(`Failed to fetch sponsor data after ${CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
      }
      
      logger.info(`Retrying in ${CONFIG.RETRY_DELAY}ms...`);
      await sleep(CONFIG.RETRY_DELAY);
    }
  }
}

/**
 * Parse HTML content and extract sponsor table data
 * @param {string} html - HTML content from IND website
 * @returns {Array<Array<string>>} Array of [Organisation, KVK number] pairs
 */
function parseHTML(html) {
  logger.info('Parsing HTML content for sponsor table');
  
  try {
    const $ = cheerio.load(html);
    
    // Find the container with wysiwyg class (similar to Python code)
    const container = $('.paragraph--wysiwyg');
    if (container.length === 0) {
      throw new Error('Could not find paragraph--wysiwyg container');
    }
    
    // Find the table within the container
    const table = container.find('table').first();
    if (table.length === 0) {
      throw new Error('Could not find sponsor table in container');
    }
    
    logger.debug('Found sponsor table, extracting data...');
    
    const data = [];
    const rows = table.find('tr');
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = $(rows[i]);
      const cells = row.find('td');
      
      if (cells.length >= 2) {
        const organisation = $(cells[0]).text().trim();
        const kvkNumber = $(cells[1]).text().trim();
        
        if (organisation && kvkNumber) {
          data.push([organisation, kvkNumber]);
        }
      }
    }
    
    logger.info(`Successfully parsed ${data.length} sponsor records`);
    
    if (data.length === 0) {
      throw new Error('No sponsor data found in table');
    }
    
    return data;
    
  } catch (error) {
    logger.error('HTML parsing failed:', error.message);
    throw new Error(`Failed to parse sponsor data from HTML: ${error.message}`);
  }
}

/**
 * Convert sponsor data to CSV format
 * @param {Array<Array<string>>} data - Sponsor data array
 * @returns {string} CSV content
 */
function convertToCSV(data) {
  logger.info('Converting sponsor data to CSV format');
  
  try {
    // Add headers
    const csvLines = [CONFIG.CSV_HEADERS.join(',')];
    
    // Add data rows
    data.forEach(row => {
      // Escape commas and quotes in CSV fields
      const escapedRow = row.map(field => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });
      csvLines.push(escapedRow.join(','));
    });
    
    const csvContent = csvLines.join('\n');
    logger.debug(`Generated CSV with ${csvLines.length - 1} data rows`);
    
    return csvContent;
    
  } catch (error) {
    logger.error('CSV conversion failed:', error.message);
    throw new Error(`Failed to convert data to CSV: ${error.message}`);
  }
}

/**
 * Generate filename with current date in MM_DD_YYYY format
 * @returns {string} Filename
 */
function generateFilename() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  
  return `KMatch - ${month}_${day}_${year}.csv`;
}

/**
 * Save CSV content to file
 * @param {string} csvContent - CSV content to save
 * @returns {string} Path to saved file
 */
function saveCSVFile(csvContent) {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
      fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
      logger.info('Created data directory');
    }
    
    const filename = generateFilename();
    const filePath = path.join(CONFIG.DATA_DIR, filename);
    
    logger.info(`Saving CSV to: ${filePath}`);
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    logger.info(`Successfully saved sponsor data to ${filename}`);
    logger.debug(`File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
    return filePath;
    
  } catch (error) {
    logger.error('File save failed:', error.message);
    throw new Error(`Failed to save CSV file: ${error.message}`);
  }
}

/**
 * Main function to fetch and save sponsor data
 * @returns {Promise<{filePath: string, recordCount: number, csvContent: string}>}
 */
async function main() {
  try {
    logger.info('Starting sponsor data fetch process');
    
    // Step 1: Fetch HTML from IND website
    const html = await fetchSponsorData();
    
    // Step 2: Parse HTML and extract sponsor data
    const sponsorData = parseHTML(html);
    
    // Step 3: Convert to CSV format
    const csvContent = convertToCSV(sponsorData);
    
    // Step 4: Save to file
    const filePath = saveCSVFile(csvContent);
    
    logger.info('✅ Sponsor data fetch completed successfully!');
    logger.info(`📊 Total records: ${sponsorData.length}`);
    logger.info(`📁 Saved to: ${path.basename(filePath)}`);
    
    return {
      filePath,
      recordCount: sponsorData.length,
      csvContent
    };
    
  } catch (error) {
    logger.error('❌ Sponsor data fetch failed:', error.message);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  fetchSponsorData,
  parseHTML,
  convertToCSV,
  saveCSVFile,
  generateFilename,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:', error.message);
    process.exit(1);
  });
} 