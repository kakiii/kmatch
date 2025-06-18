#!/usr/bin/env node

/**
 * Configuration constants for KMatch sponsor automation
 */

const path = require('path');

const CONFIG = {
  // IND Website Configuration
  IND_URL:
    'https://ind.nl/nl/openbaar-register-erkende-referenten/openbaar-register-arbeid-regulier-kennismigranten',

  // File Paths
  DATA_DIR: path.join(__dirname, '..', 'data'),
  CSV_DIR: path.join(__dirname, '..', 'data', 'csv'),
  JSON_DIR: path.join(__dirname, '..', 'data', 'json'),
  SPONSORS_JSON_PATH: path.join(__dirname, '..', 'data', 'json', 'sponsors.json'),
  BACKUP_DIR: path.join(__dirname, '..', 'data', 'json', 'backups'),
  HASH_FILE_PATH: path.join(__dirname, '..', 'data', '.last-update-hash'),

  // CSV Configuration
  CSV_HEADERS: ['Organisation', 'KVK number'],
  CSV_FILENAME_FORMAT: 'KMatch - MM_DD_YYYY.csv',

  // GitHub Configuration
  GITHUB_BRANCH_PREFIX: 'automated-update-',
  GITHUB_PR_LABELS: ['automated', 'data-update'],

  // HTTP Configuration
  HTTP_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds

  // Logging
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
};

module.exports = CONFIG;
