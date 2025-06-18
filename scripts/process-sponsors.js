#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fastCsv = require('fast-csv');
const logger = require('./logger');

/**
 * Read CSV file and return parsed data using fast-csv
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Promise resolving to array of company data objects
 */
function readCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    logger.info(`Reading CSV file: ${filePath}`);
    const dataRows = [];

    fs.createReadStream(filePath)
      .pipe(
        fastCsv.parse({
          headers: true, // First row contains headers
          trim: true, // Trim whitespace
          skipEmptyLines: true
        })
      )
      .on('data', row => {
        // Convert row object to array format (for compatibility with existing code)
        // Assuming first column is 'Organisation'
        const companyName = row.Organisation || Object.values(row)[0];
        if (companyName) {
          dataRows.push([companyName.toString().trim()]);
        }
      })
      .on('end', () => {
        logger.info(`Processed ${dataRows.length} companies from CSV`);
        resolve(dataRows);
      })
      .on('error', error => {
        logger.error(`Error reading CSV file ${filePath}:`, error.message);
        reject(error);
      });
  });
}

/**
 * Process raw CSV data into structured company records
 * @param {Array} rawData - Raw CSV data rows
 * @returns {Object} Processed sponsor records
 */
function processCompanyData(rawData) {
  const sponsors = {};
  const processed = new Set(); // Track processed companies to avoid duplicates

  logger.info('Processing company data...');

  rawData.forEach((row, index) => {
    try {
      // First column contains company name
      const companyName = row[0]?.toString().trim();

      if (!companyName || processed.has(companyName.toLowerCase())) {
        return;
      }

      processed.add(companyName.toLowerCase());

      // Generate sponsor record
      const sponsorRecord = generateSponsorRecord(companyName);
      const uniqueId = generateUniqueId(companyName);

      sponsors[uniqueId] = sponsorRecord;

      if (index % 50 === 0) {
        logger.info(`Processed ${index + 1} companies...`);
      }
    } catch (error) {
      logger.warning(`Error processing row ${index + 1}:`, error.message);
    }
  });

  logger.info(`Successfully processed ${Object.keys(sponsors).length} unique sponsors`);
  return sponsors;
}

/**
 * Generate a simplified sponsor record with essential fuzzy search features
 * @param {string} companyName - Primary company name
 * @returns {Object} Sponsor record object
 */
function generateSponsorRecord(companyName) {
  const normalizedName = normalizeCompanyName(companyName);
  const aliases = generateBasicAliases(companyName);
  const firstWords = extractFirstWords(companyName);

  return {
    primaryName: companyName,
    aliases: aliases,
    normalizedName: normalizedName,
    firstWords: firstWords,
    variations: [...new Set([companyName, ...aliases])]
  };
}

/**
 * Build simplified search indexes for optimized matching
 * @param {Object} sponsors - Sponsor records
 * @returns {Object} Search indexes
 */
function buildSearchIndexes(sponsors) {
  const indexes = {
    byFirstWord: {},
    byNormalizedName: {}
  };

  logger.info('Building search indexes...');

  Object.entries(sponsors).forEach(([sponsorId, record]) => {
    // Index by first words
    record.firstWords.forEach(word => {
      if (!indexes.byFirstWord[word]) {
        indexes.byFirstWord[word] = [];
      }
      indexes.byFirstWord[word].push(sponsorId);
    });

    // Index by normalized name
    if (record.normalizedName) {
      indexes.byNormalizedName[record.normalizedName] = sponsorId;
    }
  });

  logger.info(
    `Created indexes: ${Object.keys(indexes.byFirstWord).length} first words, ${Object.keys(indexes.byNormalizedName).length} normalized names`
  );

  return indexes;
}

/**
 * Write processed sponsor data to JSON file
 * @param {Object} data - Complete sponsor data with indexes
 * @param {string} outputPath - Output file path
 */
function writeSponsorData(data, outputPath) {
  try {
    logger.info(`Writing sponsor data to: ${outputPath}`);

    // Create backup of existing file if it exists
    if (fs.existsSync(outputPath)) {
      const CONFIG = require('./config');
      const backupFilename = `sponsors.backup.${Date.now()}.json`;
      const backupPath = path.join(CONFIG.BACKUP_DIR, backupFilename);

      // Ensure backup directory exists
      if (!fs.existsSync(CONFIG.BACKUP_DIR)) {
        fs.mkdirSync(CONFIG.BACKUP_DIR, { recursive: true });
        logger.info('Created backup directory');
      }

      fs.copyFileSync(outputPath, backupPath);
      logger.info(`Created backup: ${backupPath}`);
    }

    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(outputPath, jsonString, 'utf8');

    logger.info(
      `Successfully wrote ${Object.keys(data.sponsors).length} sponsors to ${outputPath}`
    );
    logger.info(`File size: ${(jsonString.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    logger.error('Error writing sponsor data:', error.message);
    throw error;
  }
}

// Utility functions

/**
 * Generate unique ID for sponsor record
 * @param {string} companyName - Company name
 * @returns {string} Unique identifier
 */
function generateUniqueId(companyName) {
  return crypto.createHash('md5').update(companyName.toLowerCase()).digest('hex').substring(0, 8);
}

/**
 * Normalize company name for matching
 * @param {string} name - Company name
 * @returns {string} Normalized name
 */
function normalizeCompanyName(name) {
  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\b(bv|b\.v\.|ltd|limited|inc|corp|corporation|llc|gmbh|sa|nv|n\.v\.)\b/g, '') // Remove business suffixes
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Generate basic company name aliases (simplified version)
 * @param {string} primaryName - Primary company name
 * @returns {Array} Array of name variations
 */
function generateBasicAliases(primaryName) {
  const aliases = new Set();

  // Add original name
  aliases.add(primaryName);

  // Add without business suffixes
  const withoutSuffix = primaryName.replace(
    /\s+(BV|B\.V\.|Ltd|Limited|Inc|Corp|Corporation|LLC|GmbH|SA|NV|N\.V\.)$/i,
    ''
  );
  if (withoutSuffix !== primaryName) {
    aliases.add(withoutSuffix);
  }

  // Add with common suffix variations
  const baseName = withoutSuffix;
  ['BV', 'B.V.'].forEach(suffix => {
    aliases.add(`${baseName} ${suffix}`);
  });

  return Array.from(aliases).filter(alias => alias && alias.length > 0);
}

/**
 * Extract first words from company name
 * @param {string} name - Company name
 * @returns {Array} Array of first words (normalized)
 */
function extractFirstWords(name) {
  if (!name) {
    return [];
  }

  const words = name
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
  const firstWords = new Set();

  // Add actual first word
  if (words.length > 0) {
    firstWords.add(words[0].replace(/[^\w]/g, ''));
  }
  // Add first word of each significant part (after common separators)
  const parts = name.split(/[,-|]/);
  parts.forEach(part => {
    const partWords = part.trim().toLowerCase().split(/\s+/);
    if (partWords.length > 0 && partWords[0].length > 1) {
      firstWords.add(partWords[0].replace(/[^\w]/g, ''));
    }
  });

  return Array.from(firstWords).filter(word => word.length > 0);
}

/**
 * Find latest CSV file in data directory
 * @param {string} dataDir - Data directory path
 * @returns {string} Path to latest CSV file
 */
function findLatestCSVFile(dataDir) {
  const files = fs
    .readdirSync(dataDir)
    .filter(file => file.match(/^KMatch - \d{2}_\d{2}_\d{4}\.csv$/))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('No CSV files found in data directory');
  }

  return path.join(dataDir, files[0]);
}

// Main execution
async function main() {
  try {
    const CONFIG = require('./config');

    logger.info('Starting sponsor data processing...');
    logger.info(`CSV directory: ${CONFIG.CSV_DIR}`);
    logger.info(`Output path: ${CONFIG.SPONSORS_JSON_PATH}`);

    // Find latest CSV file
    const csvFile = findLatestCSVFile(CONFIG.CSV_DIR);
    logger.info(`Using CSV file: ${csvFile}`);

    // Process the data (now async)
    const rawData = await readCSVFile(csvFile);
    const sponsors = processCompanyData(rawData);
    const indexes = buildSearchIndexes(sponsors);

    // Prepare final data structure
    const sponsorData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '2.0.0',
      totalSponsors: Object.keys(sponsors).length,
      sourceFile: path.basename(csvFile),
      sponsors: sponsors,
      index: indexes
    };

    // Write to file
    writeSponsorData(sponsorData, CONFIG.SPONSORS_JSON_PATH);

    logger.info('\n✅ Sponsor processing completed successfully!');
    logger.info(`📊 Processed ${sponsorData.totalSponsors} sponsors`);
    logger.info(`📁 Output: ${CONFIG.SPONSORS_JSON_PATH}`);
  } catch (error) {
    logger.error('\n❌ Error processing sponsors:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  readCSVFile,
  processCompanyData,
  generateSponsorRecord,
  buildSearchIndexes,
  writeSponsorData,
  normalizeCompanyName,
  generateBasicAliases,
  extractFirstWords,
  findLatestCSVFile
};
