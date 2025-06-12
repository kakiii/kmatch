#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Read Excel file and return parsed data
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Array of company data objects
 */
function readExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip header row and filter out empty rows
    const dataRows = jsonData.slice(1).filter(row => row && row.length > 0 && row[0]);
    
    console.log(`Processed ${dataRows.length} companies from Excel`);
    return dataRows;
  } catch (error) {
    console.error(`Error reading Excel file ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Process raw Excel data into structured company records
 * @param {Array} rawData - Raw Excel data rows
 * @returns {Object} Processed sponsor records
 */
function processCompanyData(rawData) {
  const sponsors = {};
  const processed = new Set(); // Track processed companies to avoid duplicates
  
  console.log('Processing company data...');
  
  rawData.forEach((row, index) => {
    try {
      // Assuming first column contains company name
      const companyName = row[0]?.toString().trim();
      
      if (!companyName || processed.has(companyName.toLowerCase())) {
        return;
      }
      
      processed.add(companyName.toLowerCase());
      
      // Generate sponsor record
      const sponsorRecord = generateSponsorRecord(companyName);
      const uniqueId = generateUniqueId(companyName);
      
      sponsors[uniqueId] = sponsorRecord;
      
      if ((index + 1) % 100 === 0) {
        console.log(`Processed ${index + 1} companies...`);
      }
    } catch (error) {
      console.warn(`Error processing row ${index + 1}:`, error.message);
    }
  });
  
  console.log(`Successfully processed ${Object.keys(sponsors).length} unique sponsors`);
  return sponsors;
}

/**
 * Generate a sponsor record with aliases and search optimizations
 * @param {string} companyName - Primary company name
 * @returns {Object} Sponsor record object
 */
function generateSponsorRecord(companyName) {
  const normalizedName = normalizeCompanyName(companyName);
  const aliases = generateAliases(companyName);
  const searchTokens = tokenizeCompanyName(companyName);
  const firstWords = extractFirstWords(companyName);
  
  return {
    primaryName: companyName,
    aliases: aliases,
    normalizedName: normalizedName,
    firstWords: firstWords,
    searchTokens: searchTokens,
    variations: [...new Set([companyName, ...aliases])]
  };
}

/**
 * Build search indexes for optimized matching
 * @param {Object} sponsors - Sponsor records
 * @returns {Object} Search indexes
 */
function buildSearchIndexes(sponsors) {
  const indexes = {
    byFirstWord: {},
    byNormalizedName: {},
    bySearchToken: {}
  };
  
  console.log('Building search indexes...');
  
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
    
    // Index by search tokens
    record.searchTokens.forEach(token => {
      if (!indexes.bySearchToken[token]) {
        indexes.bySearchToken[token] = [];
      }
      indexes.bySearchToken[token].push(sponsorId);
    });
  });
  
  console.log(`Created indexes: ${Object.keys(indexes.byFirstWord).length} first words, ${Object.keys(indexes.byNormalizedName).length} normalized names, ${Object.keys(indexes.bySearchToken).length} search tokens`);
  
  return indexes;
}

/**
 * Write processed sponsor data to JSON file
 * @param {Object} data - Complete sponsor data with indexes
 * @param {string} outputPath - Output file path
 */
function writeSponsorData(data, outputPath) {
  try {
    console.log(`Writing sponsor data to: ${outputPath}`);
    
    // Create backup of existing file if it exists
    if (fs.existsSync(outputPath)) {
      const backupPath = outputPath.replace('.json', `.backup.${Date.now()}.json`);
      fs.copyFileSync(outputPath, backupPath);
      console.log(`Created backup: ${backupPath}`);
    }
    
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(outputPath, jsonString, 'utf8');
    
    console.log(`Successfully wrote ${Object.keys(data.sponsors).length} sponsors to ${outputPath}`);
    console.log(`File size: ${(jsonString.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`Error writing sponsor data:`, error.message);
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
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\b(bv|b\.v\.|ltd|limited|inc|corp|corporation|llc|gmbh|sa|nv|n\.v\.)\b/g, '') // Remove business suffixes
    .replace(/\s+/g, '') // Remove all spaces
    .trim();
}

/**
 * Generate company name aliases
 * @param {string} primaryName - Primary company name
 * @returns {Array} Array of name variations
 */
function generateAliases(primaryName) {
  const aliases = new Set();
  
  // Add original name
  aliases.add(primaryName);
  
  // Add without business suffixes
  const withoutSuffix = primaryName.replace(/\s+(BV|B\.V\.|Ltd|Limited|Inc|Corp|Corporation|LLC|GmbH|SA|NV|N\.V\.)$/i, '');
  if (withoutSuffix !== primaryName) {
    aliases.add(withoutSuffix);
  }
  
  // Add with different suffix variations
  const baseName = withoutSuffix;
  ['BV', 'B.V.', 'Ltd', 'Limited'].forEach(suffix => {
    aliases.add(`${baseName} ${suffix}`);
  });
  
  // Add without special characters
  aliases.add(primaryName.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim());
  
  return Array.from(aliases).filter(alias => alias && alias.length > 0);
}

/**
 * Extract first words from company name
 * @param {string} name - Company name
 * @returns {Array} Array of first words (normalized)
 */
function extractFirstWords(name) {
  if (!name) return [];
  
  const words = name.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const firstWords = new Set();
  
  // Add actual first word
  if (words.length > 0) {
    firstWords.add(words[0].replace(/[^\w]/g, ''));
  }
  
  // Add first word of each significant part (after common separators)
  const parts = name.split(/[,\-\|]/);
  parts.forEach(part => {
    const partWords = part.trim().toLowerCase().split(/\s+/);
    if (partWords.length > 0 && partWords[0].length > 1) {
      firstWords.add(partWords[0].replace(/[^\w]/g, ''));
    }
  });
  
  return Array.from(firstWords).filter(word => word.length > 0);
}

/**
 * Tokenize company name for search
 * @param {string} name - Company name
 * @returns {Array} Array of search tokens
 */
function tokenizeCompanyName(name) {
  if (!name) return [];
  
  const tokens = new Set();
  
  // Split by common separators
  const words = name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
  
  words.forEach(word => {
    tokens.add(word);
    
    // Add word without common business suffixes
    const cleaned = word.replace(/^(bv|ltd|inc|corp|llc|gmbh|sa|nv)$/, '');
    if (cleaned && cleaned !== word) {
      tokens.add(cleaned);
    }
  });
  
  return Array.from(tokens);
}

/**
 * Find latest Excel file in data directory
 * @param {string} dataDir - Data directory path
 * @returns {string} Path to latest Excel file
 */
function findLatestExcelFile(dataDir) {
  const files = fs.readdirSync(dataDir)
    .filter(file => file.match(/^KMatch - \d{2}_\d{2}_\d{4}\.xlsx$/))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No Excel files found in data directory');
  }
  
  return path.join(dataDir, files[0]);
}

// Main execution
async function main() {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const outputPath = path.join(__dirname, '..', 'sponsors.json');
    
    console.log('Starting sponsor data processing...');
    console.log(`Data directory: ${dataDir}`);
    console.log(`Output path: ${outputPath}`);
    
    // Find latest Excel file
    const excelFile = findLatestExcelFile(dataDir);
    console.log(`Using Excel file: ${excelFile}`);
    
    // Process the data
    const rawData = readExcelFile(excelFile);
    const sponsors = processCompanyData(rawData);
    const indexes = buildSearchIndexes(sponsors);
    
    // Prepare final data structure
    const sponsorData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '2.0.0',
      totalSponsors: Object.keys(sponsors).length,
      sourceFile: path.basename(excelFile),
      sponsors: sponsors,
      index: indexes
    };
    
    // Write to file
    writeSponsorData(sponsorData, outputPath);
    
    console.log('\n✅ Sponsor processing completed successfully!');
    console.log(`📊 Processed ${sponsorData.totalSponsors} sponsors`);
    console.log(`📁 Output: ${outputPath}`);
    
  } catch (error) {
    console.error('\n❌ Error processing sponsors:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  readExcelFile,
  processCompanyData,
  generateSponsorRecord,
  buildSearchIndexes,
  writeSponsorData,
  normalizeCompanyName,
  generateAliases,
  extractFirstWords,
  tokenizeCompanyName
};