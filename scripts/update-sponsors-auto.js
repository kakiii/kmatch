#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const CONFIG = require('./config');

// Import our automation modules
const fetchSponsors = require('./fetch-sponsors');
const compareData = require('./compare-data');
const createPR = require('./create-pr');
const processSponsors = require('./process-sponsors');
const logger = require('./logger');

/**
 * Display banner for the automation system
 */
function displayBanner() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 KMatch Sponsor Data Automation System');
  console.log('   Automated data fetching from IND website');
  console.log('   Smart change detection and PR creation');
  console.log('='.repeat(70) + '\n');
}

/**
 * Validate environment and prerequisites
 */
function validateEnvironment() {
  logger.info('Validating environment and prerequisites');

  const errors = [];

  // Check for GITHUB_TOKEN if we're going to create PRs
  if (!process.env.GITHUB_TOKEN) {
    logger.warning('GITHUB_TOKEN environment variable not set');
    logger.info('PR creation will be skipped - set GITHUB_TOKEN to enable');
  }

  // Check if we can access the data directories
  try {
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
      fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
      logger.info('Created data directory');
    }
    if (!fs.existsSync(CONFIG.CSV_DIR)) {
      fs.mkdirSync(CONFIG.CSV_DIR, { recursive: true });
      logger.info('Created CSV directory');
    }
    if (!fs.existsSync(CONFIG.JSON_DIR)) {
      fs.mkdirSync(CONFIG.JSON_DIR, { recursive: true });
      logger.info('Created JSON directory');
    }
  } catch (error) {
    errors.push(`Cannot access data directories: ${error.message}`);
  }

  // Check if existing sponsors.json file exists
  if (!fs.existsSync(CONFIG.SPONSORS_JSON_PATH)) {
    logger.warning('sponsors.json file not found - will be created');
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  logger.info('✅ Environment validation completed');
}

/**
 * Clean up temporary files and handle errors
 * @param {Object} _tempFiles - Object with paths to temporary files
 */
async function cleanup(_tempFiles = {}) {
  logger.info('Performing cleanup...');

  // We don't delete the CSV files as they're permanent data
  // But we could clean up any temporary processing files here

  logger.debug('Cleanup completed');
}

/**
 * Handle fatal errors with proper logging and cleanup
 * @param {Error} error - The error that occurred
 * @param {Object} context - Context information about where the error occurred
 * @param {Object} tempFiles - Temporary files to clean up
 */
async function handleFatalError(error, context = {}, tempFiles = {}) {
  logger.error(`❌ Fatal error in ${context.step || 'unknown step'}:`, error.message);

  if (context.details) {
    logger.error('Error details:', context.details);
  }

  // Perform cleanup
  await cleanup(tempFiles);

  // Log final error summary
  console.log('\n' + '='.repeat(70));
  console.log('💥 AUTOMATION FAILED');
  console.log(`Step: ${context.step || 'Unknown'}`);
  console.log(`Error: ${error.message}`);
  console.log('='.repeat(70));

  process.exit(1);
}

/**
 * Main automation function
 */
async function main() {
  const tempFiles = {};

  try {
    displayBanner();

    // Step 0: Validate environment
    validateEnvironment();

    // Step 1: Fetch latest sponsor data from IND website
    logger.info('🌐 Step 1: Fetching sponsor data from IND website');
    const fetchResult = await fetchSponsors.main();

    tempFiles.csvFile = fetchResult.filePath;

    logger.info(`✅ Step 1 completed: ${fetchResult.recordCount} records fetched`);
    const changeResult = await compareData.checkForChanges(fetchResult.csvContent);

    if (!changeResult.hasChanges) {
      logger.info('✅ No changes detected in sponsor data');
      logger.info('🎉 Automation completed - no updates needed');

      // Save the hash anyway to track that we checked
      compareData.saveLastHash(changeResult.newHash);

      console.log('\n' + '='.repeat(70));
      console.log('✅ AUTOMATION COMPLETED - NO CHANGES');
      console.log('   The sponsor data is already up to date');
      console.log('   Next check will run on the first Monday of next month');
      console.log('='.repeat(70));

      return;
    }

    logger.info('✅ Step 2 completed: Changes detected!');
    logger.info(`   📊 Added: ${changeResult.changeSummary.added.length}`);
    logger.info(`   📊 Removed: ${changeResult.changeSummary.removed.length}`);
    logger.info(`   📊 Modified: ${changeResult.changeSummary.modified.length}`);

    // Step 3: Process the new CSV data using existing logic
    logger.info('⚙️  Step 3: Processing sponsor data with existing logic');

    // Use the existing process-sponsors.js functionality
    const rawData = await processSponsors.readCSVFile(fetchResult.filePath);
    const sponsors = processSponsors.processCompanyData(rawData);
    const indexes = processSponsors.buildSearchIndexes(sponsors);

    // Prepare final data structure (same format as existing system)
    const sponsorData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '2.0.0',
      totalSponsors: Object.keys(sponsors).length,
      sourceFile: path.basename(fetchResult.filePath),
      sponsors: sponsors,
      index: indexes
    };

    // Write processed data to sponsors.json
    processSponsors.writeSponsorData(sponsorData, CONFIG.SPONSORS_JSON_PATH);

    logger.info(`✅ Step 3 completed: ${sponsorData.totalSponsors} sponsors processed`);

    // Step 4: Create GitHub PR if GITHUB_TOKEN is available
    if (process.env.GITHUB_TOKEN) {
      logger.info('🚀 Step 4: Creating GitHub pull request');

      try {
        const prResult = await createPR.main({
          csvFilePath: fetchResult.filePath,
          jsonFilePath: CONFIG.SPONSORS_JSON_PATH,
          changeSummary: changeResult.changeSummary
        });

        if (prResult) {
          logger.info('✅ Step 4 completed: Pull request created successfully');
          logger.info(`   📋 PR #${prResult.pr.number}: ${prResult.pr.html_url}`);
          logger.info(`   🌿 Branch: ${prResult.branch}`);

          // Save the hash after successful PR creation
          compareData.saveLastHash(changeResult.newHash);

          console.log('\n' + '='.repeat(70));
          console.log('🎉 AUTOMATION COMPLETED SUCCESSFULLY!');
          console.log(
            `📊 Total changes: +${changeResult.changeSummary.added.length} -${changeResult.changeSummary.removed.length} ~${changeResult.changeSummary.modified.length}`
          );
          console.log(`📋 Pull Request: ${prResult.pr.html_url}`);
          console.log('📧 You should receive an email notification about the PR');
          console.log('='.repeat(70));
        } else {
          logger.info('⏭️  Step 4: No PR needed (no actual file changes)');
        }
      } catch (prError) {
        logger.error('PR creation failed, but data was processed successfully:', prError.message);
        logger.info('You can manually create a PR with the updated files');

        // Save the hash since the data processing was successful
        compareData.saveLastHash(changeResult.newHash);

        console.log('\n' + '='.repeat(70));
        console.log('⚠️  AUTOMATION PARTIALLY COMPLETED');
        console.log('✅ Data processing: SUCCESS');
        console.log('❌ PR creation: FAILED');
        console.log('   You can manually review and commit the changes');
        console.log('='.repeat(70));
      }
    } else {
      logger.info('⏭️  Step 4: Skipping PR creation (no GITHUB_TOKEN)');
      logger.info('To enable automatic PR creation, set the GITHUB_TOKEN environment variable');

      // Save the hash since the data processing was successful
      compareData.saveLastHash(changeResult.newHash);

      console.log('\n' + '='.repeat(70));
      console.log('✅ AUTOMATION COMPLETED (NO PR)');
      console.log('📊 Data processing completed successfully');
      console.log('📋 No PR created - manual review needed');
      console.log('   Set GITHUB_TOKEN environment variable to enable automatic PRs');
      console.log('='.repeat(70));
    }
  } catch (error) {
    await handleFatalError(
      error,
      {
        step: 'Main automation process',
        details: error.stack
      },
      tempFiles
    );
  }
}

/**
 * Handle process signals for graceful shutdown
 */
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async error => {
  await handleFatalError(error, {
    step: 'Uncaught exception',
    details: error.stack
  });
});

process.on('unhandledRejection', async (reason, promise) => {
  await handleFatalError(new Error(`Unhandled promise rejection: ${reason}`), {
    step: 'Unhandled promise rejection',
    details: `Promise: ${promise}`
  });
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  validateEnvironment,
  cleanup,
  handleFatalError
};
