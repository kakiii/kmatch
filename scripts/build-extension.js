#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Modern Extension Build Script
 * Replaces build.sh with JavaScript-based build process
 */

// Build configuration
const BUILD_CONFIG = {
  extensionName: 'kmatch-extension',
  distDir: 'dist',
  srcDir: 'src',
  
  // Files to copy to extension root
  rootFiles: [
    'manifest.json',
    'sponsors.json',
    'LICENSE',
    'README.md',
    'popup.html',
    'popup.css',
    'welcome.html',
    'welcome.css',
    'confetti.js'
  ],
  
  // Image files
  imageFiles: [
    'icon16.png',
    'icon32.png', 
    'icon48.png',
    'icon128.png'
  ],
  
  // Source files from src directory
  srcFiles: [
    'background.js',
    'content.js',
    'popup.js'
  ],
  
  // Development vs production settings
  development: {
    minify: false,
    sourceMaps: true,
    optimization: false
  },
  
  production: {
    minify: true,
    sourceMaps: false,
    optimization: true
  }
};

/**
 * Copy files to distribution directory
 * @param {Array<string>} files - Files to copy
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 */
function copyFiles(files, sourceDir = '.', targetDir = BUILD_CONFIG.distDir) {
  console.log(`Copying files from ${sourceDir} to ${targetDir}...`);
  
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
        console.log(`✓ Copied: ${file}`);
      } catch (error) {
        console.error(`✗ Failed to copy ${file}:`, error.message);
        throw error;
      }
    } else {
      console.warn(`⚠ File not found: ${sourcePath}`);
    }
  });
}

/**
 * Copy extension files to dist directory
 */
function copyExtensionFiles() {
  const distPath = BUILD_CONFIG.distDir;
  
  // Ensure dist directory exists and is clean
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });
  
  console.log('Copying extension files...');
  
  // Copy root files
  copyFiles(BUILD_CONFIG.rootFiles, '.', distPath);
  
  // Copy image files
  copyFiles(BUILD_CONFIG.imageFiles, '.', distPath);
  
  // Copy source files
  copyFiles(BUILD_CONFIG.srcFiles, BUILD_CONFIG.srcDir, distPath);
  
  console.log('✅ All extension files copied successfully');
}

/**
 * Validate manifest.json
 * @returns {Object} Parsed manifest
 */
function validateManifest() {
  console.log('Validating manifest.json...');
  
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
    
    // Validate file references
    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((script, index) => {
        if (script.js) {
          script.js.forEach(jsFile => {
            const filePath = path.join(BUILD_CONFIG.distDir, jsFile);
            if (!fs.existsSync(filePath)) {
              console.warn(`⚠ Content script file not found: ${jsFile}`);
            }
          });
        }
      });
    }
    
    if (manifest.background && manifest.background.scripts) {
      manifest.background.scripts.forEach(scriptFile => {
        const filePath = path.join(BUILD_CONFIG.distDir, scriptFile);
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠ Background script file not found: ${scriptFile}`);
        }
      });
    }
    
    console.log('✅ Manifest validation passed');
    console.log(`Extension: ${manifest.name} v${manifest.version}`);
    
    return manifest;
    
  } catch (error) {
    console.error('✗ Manifest validation failed:', error.message);
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
    console.log('Creating extension archive...');
    
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
      console.log(`✅ Archive created: ${zipFileName} (${sizeKB} KB)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      console.error('✗ Archive creation failed:', err.message);
      reject(err);
    });
    
    // Pipe archive data to output file
    archive.pipe(output);
    
    // Add files to archive (excluding the zip file itself)
    const distFiles = fs.readdirSync(BUILD_CONFIG.distDir);
    distFiles.forEach(file => {
      if (!file.endsWith('.zip')) {
        const filePath = path.join(BUILD_CONFIG.distDir, file);
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
 */
async function runDevelopmentBuild() {
  console.log('🔨 Starting development build...');
  
  try {
    copyExtensionFiles();
    const manifest = validateManifest();
    const zipPath = await createZipArchive(manifest, true);
    
    console.log('\n🎉 Development build completed successfully!');
    console.log(`📦 Package: ${path.basename(zipPath)}`);
    console.log(`📁 Location: ${BUILD_CONFIG.distDir}/`);
    
    return zipPath;
    
  } catch (error) {
    console.error('\n💥 Development build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run production build
 */
async function runProductionBuild() {
  console.log('🏭 Starting production build...');
  
  try {
    copyExtensionFiles();
    
    // Additional production optimizations could go here
    // - Minification
    // - Dead code elimination
    // - Asset optimization
    
    const manifest = validateManifest();
    const zipPath = await createZipArchive(manifest, false);
    
    console.log('\n🎉 Production build completed successfully!');
    console.log(`📦 Package: ${path.basename(zipPath)}`);
    console.log(`📁 Location: ${BUILD_CONFIG.distDir}/`);
    console.log('🚀 Ready for Chrome Web Store upload!');
    
    return zipPath;
    
  } catch (error) {
    console.error('\n💥 Production build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean dist directory
 */
function clean() {
  console.log('🧹 Cleaning dist directory...');
  
  if (fs.existsSync(BUILD_CONFIG.distDir)) {
    fs.rmSync(BUILD_CONFIG.distDir, { recursive: true, force: true });
    console.log('✅ Dist directory cleaned');
  } else {
    console.log('ℹ Dist directory does not exist');
  }
}

/**
 * Show build information
 */
function showInfo() {
  console.log('\n📋 Build Configuration:');
  console.log(`Extension Name: ${BUILD_CONFIG.extensionName}`);
  console.log(`Source Directory: ${BUILD_CONFIG.srcDir}/`);
  console.log(`Distribution Directory: ${BUILD_CONFIG.distDir}/`);
  console.log(`Root Files: ${BUILD_CONFIG.rootFiles.length} files`);
  console.log(`Source Files: ${BUILD_CONFIG.srcFiles.length} files`);
  console.log(`Image Files: ${BUILD_CONFIG.imageFiles.length} files`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isDev = args.includes('--dev') || args.includes('-d');
  const isClean = args.includes('--clean') || args.includes('-c');
  const isInfo = args.includes('--info') || args.includes('-i');
  
  console.log('🔧 KMatch Extension Build Tool\n');
  
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
      await runDevelopmentBuild();
    } else {
      await runProductionBuild();
    }
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  copyExtensionFiles,
  validateManifest,
  createZipArchive,
  runDevelopmentBuild,
  runProductionBuild,
  clean,
  BUILD_CONFIG
}; 