#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Validate sponsor data structure and content
 * @param {Object} data - Sponsor data object
 * @returns {Object} Validation results
 */
function validateSponsorData(data) {
  const issues = [];
  const warnings = [];
  
  logger.info('Validating sponsor data structure...');
  
  // Check top-level structure
  if (!data || typeof data !== 'object') {
    issues.push('Data is not a valid object');
    return { valid: false, issues, warnings };
  }
  
  // Required fields
  const requiredFields = ['lastUpdated', 'version', 'sponsors'];
  requiredFields.forEach(field => {
    if (!data.hasOwnProperty(field)) {
      issues.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate lastUpdated
  if (data.lastUpdated) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.lastUpdated)) {
      issues.push('lastUpdated field must be in YYYY-MM-DD format');
    }
  }
  
  // Validate version
  if (data.version) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(data.version)) {
      warnings.push('Version field should follow semantic versioning (e.g., 2.0.0)');
    }
  }
  
  // Validate sponsors object
  if (data.sponsors) {
    if (typeof data.sponsors !== 'object') {
      issues.push('Sponsors field must be an object');
    } else {
      const sponsorCount = Object.keys(data.sponsors).length;
      logger.info(`Validating ${sponsorCount} sponsor records...`);
      
      if (sponsorCount === 0) {
        warnings.push('No sponsors found in data');
      }
      
      // Validate each sponsor record
      Object.entries(data.sponsors).forEach(([sponsorId, record]) => {
        validateSponsorRecord(sponsorId, record, issues, warnings);
      });
    }
  }
  
  // Validate indexes if present
  if (data.index) {
    validateIndexes(data.index, data.sponsors, issues, warnings);
  }
  
  const valid = issues.length === 0;
  
  logger.info(`Validation complete: ${valid ? 'VALID' : 'INVALID'}`);
  logger.info(`Issues: ${issues.length}, Warnings: ${warnings.length}`);
  
  return { valid, issues, warnings };
}

/**
 * Validate individual sponsor record
 * @param {string} sponsorId - Sponsor ID
 * @param {Object} record - Sponsor record
 * @param {Array} issues - Issues array to append to
 * @param {Array} warnings - Warnings array to append to
 */
function validateSponsorRecord(sponsorId, record, issues, warnings) {
  if (!record || typeof record !== 'object') {
    issues.push(`Sponsor ${sponsorId}: Record is not a valid object`);
    return;
  }
  
  // Required fields for sponsor record
  const requiredFields = ['primaryName', 'aliases', 'normalizedName'];
  requiredFields.forEach(field => {
    if (!record.hasOwnProperty(field)) {
      issues.push(`Sponsor ${sponsorId}: Missing required field '${field}'`);
    }
  });
  
  // Validate primaryName
  if (record.primaryName) {
    if (typeof record.primaryName !== 'string' || record.primaryName.trim().length === 0) {
      issues.push(`Sponsor ${sponsorId}: primaryName must be a non-empty string`);
    }
  }
  
  // Validate aliases
  if (record.aliases) {
    if (!Array.isArray(record.aliases)) {
      issues.push(`Sponsor ${sponsorId}: aliases must be an array`);
    } else if (record.aliases.length === 0) {
      warnings.push(`Sponsor ${sponsorId}: No aliases defined`);
    } else {
      record.aliases.forEach((alias, index) => {
        if (typeof alias !== 'string' || alias.trim().length === 0) {
          issues.push(`Sponsor ${sponsorId}: alias[${index}] must be a non-empty string`);
        }
      });
    }
  }
  
  // Validate normalizedName
  if (record.normalizedName) {
    if (typeof record.normalizedName !== 'string') {
      issues.push(`Sponsor ${sponsorId}: normalizedName must be a string`);
    } else if (record.normalizedName.includes(' ')) {
      issues.push(`Sponsor ${sponsorId}: normalizedName should not contain spaces`);
    }
  }
  
  // Validate optional fields
  if (record.firstWords && !Array.isArray(record.firstWords)) {
    issues.push(`Sponsor ${sponsorId}: firstWords must be an array`);
  }
  
  if (record.searchTokens && !Array.isArray(record.searchTokens)) {
    issues.push(`Sponsor ${sponsorId}: searchTokens must be an array`);
  }
  
  if (record.variations && !Array.isArray(record.variations)) {
    issues.push(`Sponsor ${sponsorId}: variations must be an array`);
  }
}

/**
 * Validate search indexes
 * @param {Object} indexes - Index object
 * @param {Object} sponsors - Sponsors object
 * @param {Array} issues - Issues array to append to
 * @param {Array} warnings - Warnings array to append to
 */
function validateIndexes(indexes, sponsors, issues, warnings) {
  logger.info('Validating search indexes...');
  
  if (!indexes || typeof indexes !== 'object') {
    issues.push('Index must be an object');
    return;
  }
  
  const sponsorIds = new Set(Object.keys(sponsors || {}));
  
  // Validate byFirstWord index
  if (indexes.byFirstWord) {
    if (typeof indexes.byFirstWord !== 'object') {
      issues.push('byFirstWord index must be an object');
    } else {
      Object.entries(indexes.byFirstWord).forEach(([word, ids]) => {
        if (!Array.isArray(ids)) {
          issues.push(`byFirstWord['${word}'] must be an array`);
        } else {
          ids.forEach(id => {
            if (!sponsorIds.has(id)) {
              issues.push(`byFirstWord['${word}'] references non-existent sponsor ID: ${id}`);
            }
          });
        }
      });
    }
  }
  
  // Validate byNormalizedName index
  if (indexes.byNormalizedName) {
    if (typeof indexes.byNormalizedName !== 'object') {
      issues.push('byNormalizedName index must be an object');
    } else {
      Object.values(indexes.byNormalizedName).forEach(id => {
        if (!sponsorIds.has(id)) {
          issues.push(`byNormalizedName references non-existent sponsor ID: ${id}`);
        }
      });
    }
  }
  
  // Validate bySearchToken index
  if (indexes.bySearchToken) {
    if (typeof indexes.bySearchToken !== 'object') {
      issues.push('bySearchToken index must be an object');
    } else {
      Object.entries(indexes.bySearchToken).forEach(([token, ids]) => {
        if (!Array.isArray(ids)) {
          issues.push(`bySearchToken['${token}'] must be an array`);
        } else {
          ids.forEach(id => {
            if (!sponsorIds.has(id)) {
              issues.push(`bySearchToken['${token}'] references non-existent sponsor ID: ${id}`);
            }
          });
        }
      });
    }
  }
}

/**
 * Find duplicate sponsors
 * @param {Object} sponsors - Sponsors object
 * @returns {Array} Array of duplicate groups
 */
function findDuplicates(sponsors) {
  logger.info('Checking for duplicate sponsors...');
  
  const duplicates = [];
  const nameToIds = new Map();
  const normalizedToIds = new Map();
  
  // Group by primary name and normalized name
  Object.entries(sponsors).forEach(([id, record]) => {
    const primaryName = record.primaryName?.toLowerCase();
    const normalizedName = record.normalizedName;
    
    if (primaryName) {
      if (!nameToIds.has(primaryName)) {
        nameToIds.set(primaryName, []);
      }
      nameToIds.get(primaryName).push({ id, record });
    }
    
    if (normalizedName) {
      if (!normalizedToIds.has(normalizedName)) {
        normalizedToIds.set(normalizedName, []);
      }
      normalizedToIds.get(normalizedName).push({ id, record });
    }
  });
  
  // Find groups with multiple entries
  nameToIds.forEach((group, name) => {
    if (group.length > 1) {
      duplicates.push({
        type: 'primaryName',
        key: name,
        sponsors: group
      });
    }
  });
  
  normalizedToIds.forEach((group, normalizedName) => {
    if (group.length > 1) {
      duplicates.push({
        type: 'normalizedName',
        key: normalizedName,
        sponsors: group
      });
    }
  });
  
  logger.info(`Found ${duplicates.length} potential duplicate groups`);
  return duplicates;
}

/**
 * Check for missing required fields
 * @param {Object} sponsors - Sponsors object
 * @returns {Array} Array of sponsors with missing fields
 */
function checkMissingFields(sponsors) {
  logger.info('Checking for missing required fields...');
  
  const missingFields = [];
  const requiredFields = ['primaryName', 'aliases', 'normalizedName'];
  
  Object.entries(sponsors).forEach(([id, record]) => {
    const missing = requiredFields.filter(field => !record.hasOwnProperty(field));
    
    if (missing.length > 0) {
      missingFields.push({
        sponsorId: id,
        missingFields: missing,
        record: record
      });
    }
  });
  
  logger.info(`Found ${missingFields.length} sponsors with missing fields`);
  return missingFields;
}

/**
 * Generate validation report
 * @param {Object} validation - Validation results
 * @param {Array} duplicates - Duplicate results
 * @param {Array} missingFields - Missing fields results
 * @returns {string} Formatted report
 */
function generateValidationReport(validation, duplicates, missingFields) {
  let report = `# Data Validation Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Overall status
  report += `## Overall Status: ${validation.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;
  
  // Summary
  report += `## Summary\n`;
  report += `- **Issues**: ${validation.issues.length}\n`;
  report += `- **Warnings**: ${validation.warnings.length}\n`;
  report += `- **Duplicate Groups**: ${duplicates.length}\n`;
  report += `- **Missing Fields**: ${missingFields.length}\n\n`;
  
  // Issues
  if (validation.issues.length > 0) {
    report += `## Issues (${validation.issues.length})\n\n`;
    validation.issues.forEach((issue, index) => {
      report += `${index + 1}. ${issue}\n`;
    });
    report += `\n`;
  }
  
  // Warnings
  if (validation.warnings.length > 0) {
    report += `## Warnings (${validation.warnings.length})\n\n`;
    validation.warnings.forEach((warning, index) => {
      report += `${index + 1}. ${warning}\n`;
    });
    report += `\n`;
  }
  
  // Duplicates
  if (duplicates.length > 0) {
    report += `## Potential Duplicates (${duplicates.length})\n\n`;
    duplicates.forEach((duplicate, index) => {
      report += `### ${index + 1}. Duplicate ${duplicate.type}: "${duplicate.key}"\n`;
      duplicate.sponsors.forEach(sponsor => {
        report += `- ID: ${sponsor.id}, Name: ${sponsor.record.primaryName}\n`;
      });
      report += `\n`;
    });
  }
  
  // Missing fields
  if (missingFields.length > 0) {
    report += `## Missing Required Fields (${missingFields.length})\n\n`;
    missingFields.forEach((item, index) => {
      report += `${index + 1}. **${item.sponsorId}**: Missing ${item.missingFields.join(', ')}\n`;
    });
    report += `\n`;
  }
  
  return report;
}

// Main execution
async function main() {
  try {
    const CONFIG = require('./config');
    
    logger.info('Starting data validation...');
    logger.info(`Sponsors file: ${CONFIG.SPONSORS_JSON_PATH}`);
    
    if (!fs.existsSync(CONFIG.SPONSORS_JSON_PATH)) {
      throw new Error(`Sponsors file not found: ${CONFIG.SPONSORS_JSON_PATH}`);
    }
    
    // Load and parse data
    const rawData = fs.readFileSync(CONFIG.SPONSORS_JSON_PATH, 'utf8');
    const data = JSON.parse(rawData);
    
    logger.info(`Data loaded successfully (${(rawData.length / 1024).toFixed(2)} KB)`);
    
    // Perform validations
    const validation = validateSponsorData(data);
    const duplicates = data.sponsors ? findDuplicates(data.sponsors) : [];
    const missingFields = data.sponsors ? checkMissingFields(data.sponsors) : [];
    
    // Generate report
    const report = generateValidationReport(validation, duplicates, missingFields);
    
    logger.info('\n' + '='.repeat(50));
    logger.info(report);
    logger.info('='.repeat(50));
    
    // Save report
    const reportPath = path.join(__dirname, '..', `validation_report_${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(reportPath, report);
    logger.info(`📄 Report saved to: ${path.basename(reportPath)}`);
    
    // Exit with appropriate code
    if (!validation.valid) {
      logger.info('\n❌ Data validation failed!');
      process.exit(1);
    } else {
      logger.info('\n✅ Data validation passed!');
    }
    
  } catch (error) {
    logger.error('\n❌ Error during validation:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateSponsorData,
  findDuplicates,
  checkMissingFields,
  generateValidationReport
}; 