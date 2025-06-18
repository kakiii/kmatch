#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const logger = require('./logger');

// Import sponsor processing functions
const {
  readCSVFile,
  processCompanyData,
  buildSearchIndexes,
  writeSponsorData,
  findLatestCSVFile
} = require('./process-sponsors.js');

/**
 * Modern Extension Build Script
 * Replaces build.sh with JavaScript-based build process
 */

// Build configuration
const BUILD_CONFIG = {
  extensionName: 'kmatch-firefox',
  distDir: 'dist',
  srcDir: 'src',

  // Files to copy to extension root
  rootFiles: [
    'manifest.json',
    'data/json/sponsors.json',
    'LICENSE',
    'README.md',
    'popup.html',
    'popup.css',
    'welcome.html',
    'welcome.css',
    'confetti.js'
  ],

  // Image files
  imageFiles: ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'],

  // Source files from src directory
  srcFiles: ['background.js', 'content.js', 'popup.js'],

  // Development vs production settings
  development: {
    minify: false,
    sourceMaps: true,
    optimization: false,
    createZip: false, // For dev, just copy files
    target: 'firefox'
  },

  production: {
    minify: true,
    sourceMaps: false,
    optimization: true,
    createZip: true, // For production, create zip for Firefox Add-ons store
    target: 'firefox'
  }
};

/**
 * Copy files to distribution directory
 * @param {Array<string>} files - Files to copy
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 */
function copyFiles(files, sourceDir = '.', targetDir = BUILD_CONFIG.distDir) {
  logger.info(`Copying files from ${sourceDir} to ${targetDir}...`);

  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    if (fs.existsSync(sourcePath)) {
      try {
        // Ensure target directory exists
        const targetDirPath = path.dirname(targetPath);
        if (!fs.existsSync(targetDirPath)) {
          fs.mkdirSync(targetDirPath, { recursive: true });
        }

        fs.copyFileSync(sourcePath, targetPath);
        logger.info(`✓ Copied: ${file}`);
      } catch (error) {
        logger.error(`✗ Failed to copy ${file}:`, error.message);
        throw error;
      }
    } else {
      logger.warn(`⚠ File not found: ${sourcePath}`);
    }
  });
}

/**
 * Update sponsors data from latest CSV file
 * @param {boolean} skipSponsors - Whether to skip sponsor update
 * @returns {Promise<Object>} Sponsor update results
 */
async function updateSponsors(skipSponsors = false) {
  if (skipSponsors) {
    logger.info('⏭ Skipping sponsor update (--skip-sponsors flag)');
    return { skipped: true };
  }

  try {
    logger.info('🔄 Checking for sponsor updates...');

    const CONFIG = require('./config');

    // Find latest CSV file
    const latestCSV = findLatestCSVFile(CONFIG.CSV_DIR);
    logger.info(`📁 Latest CSV: ${path.basename(latestCSV)}`);

    // Check if update is needed (compare file timestamps)
    const csvStats = fs.statSync(latestCSV);
    const sponsorsExists = fs.existsSync(CONFIG.SPONSORS_JSON_PATH);

    let needsUpdate = true;
    if (sponsorsExists) {
      const sponsorsStats = fs.statSync(CONFIG.SPONSORS_JSON_PATH);
      needsUpdate = csvStats.mtime > sponsorsStats.mtime;

      if (!needsUpdate) {
        logger.info('✅ Sponsors data is up to date');
        return { skipped: false, updated: false, reason: 'up-to-date' };
      }
    }

    logger.info('📊 Processing sponsor data...');

    // Load existing sponsors for diff comparison
    let existingSponsors = new Set();
    if (sponsorsExists) {
      try {
        const existingData = JSON.parse(fs.readFileSync(CONFIG.SPONSORS_JSON_PATH, 'utf8'));
        existingSponsors = new Set(
          Object.values(existingData.sponsors || {}).map(s => s.primaryName)
        );
      } catch (error) {
        logger.warning('⚠ Could not read existing sponsors for diff comparison');
      }
    }

    // Process new data
    const rawData = await readCSVFile(latestCSV);
    const sponsors = processCompanyData(rawData);
    const indexes = buildSearchIndexes(sponsors);

    // Calculate diff
    const newSponsors = new Set(Object.values(sponsors).map(s => s.primaryName));

    const added = [...newSponsors].filter(name => !existingSponsors.has(name));
    const removed = [...existingSponsors].filter(name => !newSponsors.has(name));

    // Prepare final data structure
    const sponsorData = {
      lastUpdated: new Date().toISOString().split('T')[0],
      version: '2.0.0',
      totalSponsors: Object.keys(sponsors).length,
      sourceFile: path.basename(latestCSV),
      sponsors: sponsors,
      index: indexes
    };

    // Write updated data
    writeSponsorData(sponsorData, CONFIG.SPONSORS_JSON_PATH);

    // Report changes
    logger.info('📈 Sponsor update summary:');
    logger.info(`   Total sponsors: ${sponsorData.totalSponsors}`);
    logger.info(`   Added: ${added.length} companies`);
    logger.info(`   Removed: ${removed.length} companies`);

    if (added.length > 0 && added.length <= 10) {
      logger.info(`   New companies: ${added.slice(0, 10).join(', ')}`);
    } else if (added.length > 10) {
      logger.info(
        `   New companies: ${added.slice(0, 10).join(', ')} ... and ${added.length - 10} more`
      );
    }

    if (removed.length > 0 && removed.length <= 10) {
      logger.info(`   Removed companies: ${removed.slice(0, 10).join(', ')}`);
    } else if (removed.length > 10) {
      logger.info(
        `   Removed companies: ${removed.slice(0, 10).join(', ')} ... and ${removed.length - 10} more`
      );
    }

    return {
      skipped: false,
      updated: true,
      totalSponsors: sponsorData.totalSponsors,
      added: added.length,
      removed: removed.length,
      sourceFile: path.basename(latestCSV)
    };
  } catch (error) {
    logger.error('❌ Error updating sponsors:', error.message);
    logger.warn('⚠ Continuing build with existing sponsors.json...');
    return { skipped: false, updated: false, error: error.message };
  }
}

/**
 * Copy extension files to dist directory
 * @param {boolean} tempDir - Whether to use temporary directory for zip creation
 * @param {boolean} skipSponsors - Whether to skip sponsor update
 */
async function copyExtensionFiles(tempDir = false, skipSponsors = false) {
  const targetDir = tempDir ? path.join(BUILD_CONFIG.distDir, 'temp') : BUILD_CONFIG.distDir;

  // Ensure target directory exists and is clean
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // Update sponsors before copying files
  await updateSponsors(skipSponsors);

  logger.info('Copying extension files...');

  // Copy root files
  copyFiles(BUILD_CONFIG.rootFiles, '.', targetDir);

  // Copy image files
  copyFiles(BUILD_CONFIG.imageFiles, '.', targetDir);

  // Copy source files
  copyFiles(BUILD_CONFIG.srcFiles, BUILD_CONFIG.srcDir, targetDir);

  logger.info('✅ All extension files copied successfully');
  return targetDir;
}

/**
 * Validate manifest.json
 * @returns {Object} Parsed manifest
 */
function validateManifest() {
  logger.info('Validating manifest.json...');

  const manifestPath = path.join(BUILD_CONFIG.distDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found in dist directory');
  }

  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Basic validation
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required manifest fields: ${missingFields.join(', ')}`);
    }

    // Firefox-specific validation
    if (
      BUILD_CONFIG.production.target === 'firefox' ||
      BUILD_CONFIG.development.target === 'firefox'
    ) {
      if (
        !manifest.browser_specific_settings ||
        !manifest.browser_specific_settings.gecko ||
        !manifest.browser_specific_settings.gecko.id
      ) {
        logger.warn('⚠ Firefox target detected but browser_specific_settings.gecko.id is missing');
        logger.warn('  This is required for Firefox Add-ons store submission');
      }

      if (manifest.background && manifest.background.service_worker) {
        logger.warn('⚠ service_worker detected in background - Firefox uses scripts array');
      }
    }

    // Validate file references
    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((script, _index) => {
        if (script.js) {
          script.js.forEach(jsFile => {
            const filePath = path.join(BUILD_CONFIG.distDir, jsFile);
            if (!fs.existsSync(filePath)) {
              logger.warn(`⚠ Content script file not found: ${jsFile}`);
            }
          });
        }
      });
    }

    if (manifest.background && manifest.background.scripts) {
      manifest.background.scripts.forEach(scriptFile => {
        const filePath = path.join(BUILD_CONFIG.distDir, scriptFile);
        if (!fs.existsSync(filePath)) {
          logger.warn(`⚠ Background script file not found: ${scriptFile}`);
        }
      });
    }

    logger.info('✅ Manifest validation passed');
    logger.info(`Extension: ${manifest.name} v${manifest.version}`);

    return manifest;
  } catch (error) {
    logger.error('✗ Manifest validation failed:', error.message);
    throw error;
  }
}

/**
 * Create ZIP archive for extension
 * @param {Object} manifest - Parsed manifest
 * @param {boolean} isDev - Development build flag
 * @returns {Promise<string>} Path to created ZIP file
 */
function createZipArchive(manifest, isDev = false) {
  return new Promise((resolve, reject) => {
    logger.info('Creating extension archive...');

    const version = manifest.version;
    const suffix = isDev ? '-dev' : '';
    const zipFileName = `${BUILD_CONFIG.extensionName}-v${version}${suffix}.zip`;
    const zipPath = path.join(BUILD_CONFIG.distDir, zipFileName);

    // Create write stream
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle events
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      logger.info(`✅ Archive created: ${zipFileName} (${sizeKB} KB)`);

      // Clean up temp directory
      const tempDir = path.join(BUILD_CONFIG.distDir, 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      resolve(zipPath);
    });

    archive.on('error', err => {
      logger.error('✗ Archive creation failed:', err.message);
      reject(err);
    });

    // Pipe archive data to output file
    archive.pipe(output);

    // Add files to archive (excluding the zip file itself)
    const sourceDir = path.join(BUILD_CONFIG.distDir, 'temp');
    const distFiles = fs.readdirSync(sourceDir);
    distFiles.forEach(file => {
      if (!file.endsWith('.zip')) {
        const filePath = path.join(sourceDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          archive.file(filePath, { name: file });
        } else if (stats.isDirectory()) {
          archive.directory(filePath, file);
        }
      }
    });

    // Finalize archive
    archive.finalize();
  });
}

/**
 * Run development build
 * @param {boolean} skipSponsors - Whether to skip sponsor update
 */
async function runDevelopmentBuild(skipSponsors = false) {
  logger.info('🔨 Starting Firefox development build...');

  try {
    await copyExtensionFiles(false, skipSponsors);
    const manifest = validateManifest();

    const config = BUILD_CONFIG.development;
    if (config.createZip) {
      const zipPath = await createZipArchive(manifest, true);
      logger.info('\n🎉 Development build completed successfully!');
      logger.info(`📦 Package: ${path.basename(zipPath)}`);
      logger.info(`📁 Location: ${BUILD_CONFIG.distDir}/`);
      return zipPath;
    } else {
      logger.info('\n🎉 Development build completed successfully!');
      logger.info(`📁 Extension files ready in: ${BUILD_CONFIG.distDir}/`);
      logger.info('🦊 Ready for Firefox development testing!');
      logger.info(`   Load extension from: ${path.resolve(BUILD_CONFIG.distDir)}`);
      return BUILD_CONFIG.distDir;
    }
  } catch (error) {
    logger.error('\n💥 Development build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run production build
 * @param {boolean} skipSponsors - Whether to skip sponsor update
 */
async function runProductionBuild(skipSponsors = false) {
  logger.info('🏭 Starting Firefox production build...');

  try {
    // Ensure dist directory exists and is clean
    if (fs.existsSync(BUILD_CONFIG.distDir)) {
      fs.rmSync(BUILD_CONFIG.distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(BUILD_CONFIG.distDir, { recursive: true });

    const config = BUILD_CONFIG.production;
    if (config.createZip) {
      // For production zip, use temp directory and create only zip
      const tempPath = await copyExtensionFiles(true, skipSponsors);

      // Validate manifest from temp directory
      const manifestPath = path.join(tempPath, 'manifest.json');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      const zipPath = await createZipArchive(manifest, false);
      logger.info('\n🎉 Production build completed successfully!');
      logger.info(`📦 Package: ${path.basename(zipPath)}`);
      logger.info(`📁 Location: ${BUILD_CONFIG.distDir}/`);
      logger.info('🦊 Ready for Firefox Add-ons store upload!');
      return zipPath;
    } else {
      // For production files, copy directly to dist
      await copyExtensionFiles(false, skipSponsors);
      validateManifest();
      logger.info('\n🎉 Production build completed successfully!');
      logger.info(`📁 Extension files ready in: ${BUILD_CONFIG.distDir}/`);
      logger.info('🦊 Ready for Firefox production deployment!');
      return BUILD_CONFIG.distDir;
    }
  } catch (error) {
    logger.error('\n💥 Production build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean dist directory
 */
function clean() {
  logger.info('🧹 Cleaning dist directory...');

  if (fs.existsSync(BUILD_CONFIG.distDir)) {
    fs.rmSync(BUILD_CONFIG.distDir, { recursive: true, force: true });
    logger.info('✅ Dist directory cleaned');
  } else {
    logger.info('ℹ Dist directory does not exist');
  }
}

/**
 * Show build information
 */
function showInfo() {
  logger.info('\n📋 Build Configuration:');
  logger.info(`Extension Name: ${BUILD_CONFIG.extensionName}`);
  logger.info(`Source Directory: ${BUILD_CONFIG.srcDir}/`);
  logger.info(`Distribution Directory: ${BUILD_CONFIG.distDir}/`);
  logger.info(`Root Files: ${BUILD_CONFIG.rootFiles.length} files`);
  logger.info(`Source Files: ${BUILD_CONFIG.srcFiles.length} files`);
  logger.info(`Image Files: ${BUILD_CONFIG.imageFiles.length} files`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isDev = args.includes('--dev') || args.includes('-d');
  const isClean = args.includes('--clean') || args.includes('-c');
  const isInfo = args.includes('--info') || args.includes('-i');
  const skipSponsors = args.includes('--skip-sponsors');

  logger.info('🔧 KMatch Extension Build Tool\n');

  if (isInfo) {
    showInfo();
    return;
  }

  if (isClean) {
    clean();
    return;
  }

  try {
    if (isDev) {
      await runDevelopmentBuild(skipSponsors);
    } else {
      await runProductionBuild(skipSponsors);
    }
  } catch (error) {
    logger.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  copyExtensionFiles,
  updateSponsors,
  validateManifest,
  createZipArchive,
  runDevelopmentBuild,
  runProductionBuild,
  clean,
  BUILD_CONFIG
};
