#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Find the latest Excel files in directory
 * @param {string} directory - Directory to search
 * @returns {Array} Array of [latest, secondLatest] file paths
 */
function findLatestFiles(directory) {
  try {
    const files = fs.readdirSync(directory)
      .filter(file => file.match(/^KMatch - \d{2}_\d{2}_\d{4}\.xlsx$/))
      .map(file => {
        const match = file.match(/KMatch - (\d{2})_(\d{2})_(\d{4})\.xlsx/);
        const [, day, month, year] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return {
          filename: file,
          path: path.join(directory, file),
          date: date
        };
      })
      .sort((a, b) => b.date - a.date);

    if (files.length < 2) {
      throw new Error('Need at least 2 Excel files to compare');
    }

    console.log(`Found ${files.length} Excel files`);
    console.log(`Latest: ${files[0].filename} (${files[0].date.toDateString()})`);
    console.log(`Previous: ${files[1].filename} (${files[1].date.toDateString()})`);

    return [files[0].path, files[1].path];
  } catch (error) {
    console.error('Error finding Excel files:', error.message);
    throw error;
  }
}

/**
 * Compare sponsors between two Excel files
 * @param {string} file1 - Path to latest file
 * @param {string} file2 - Path to previous file
 * @returns {Object} Comparison results
 */
function compareSponsors(file1, file2) {
  try {
    console.log('\nReading Excel files...');
    
    // Read both files
    const data1 = readExcelData(file1);
    const data2 = readExcelData(file2);
    
    console.log(`Latest file: ${data1.length} sponsors`);
    console.log(`Previous file: ${data2.length} sponsors`);
    
    // Extract company names (assuming first column)
    const sponsors1 = new Set(data1.map(row => row[0]?.toString().trim()).filter(Boolean));
    const sponsors2 = new Set(data2.map(row => row[0]?.toString().trim()).filter(Boolean));
    
    // Find differences
    const newSponsors = Array.from(sponsors1).filter(sponsor => !sponsors2.has(sponsor));
    const removedSponsors = Array.from(sponsors2).filter(sponsor => !sponsors1.has(sponsor));
    const commonSponsors = Array.from(sponsors1).filter(sponsor => sponsors2.has(sponsor));
    
    const results = {
      latest: {
        file: path.basename(file1),
        total: sponsors1.size,
        data: data1
      },
      previous: {
        file: path.basename(file2),
        total: sponsors2.size,
        data: data2
      },
      changes: {
        new: newSponsors,
        removed: removedSponsors,
        common: commonSponsors,
        newCount: newSponsors.length,
        removedCount: removedSponsors.length,
        commonCount: commonSponsors.length
      }
    };
    
    console.log(`\nComparison complete:`);
    console.log(`- New sponsors: ${results.changes.newCount}`);
    console.log(`- Removed sponsors: ${results.changes.removedCount}`);
    console.log(`- Common sponsors: ${results.changes.commonCount}`);
    
    return results;
  } catch (error) {
    console.error('Error comparing sponsors:', error.message);
    throw error;
  }
}

/**
 * Read Excel data from file
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Array of data rows
 */
function readExcelData(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip header row and filter out empty rows
  return jsonData.slice(1).filter(row => row && row.length > 0 && row[0]);
}

/**
 * Generate detailed comparison report
 * @param {Object} changes - Comparison results
 * @returns {string} Formatted report
 */
function generateReport(changes) {
  const { latest, previous, changes: diff } = changes;
  
  let report = `# Sponsor Changes Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n`;
  report += `- **Latest File**: ${latest.file} (${latest.total} sponsors)\n`;
  report += `- **Previous File**: ${previous.file} (${previous.total} sponsors)\n`;
  report += `- **Net Change**: ${diff.newCount - diff.removedCount} sponsors\n\n`;
  
  if (diff.newCount > 0) {
    report += `## New Sponsors (${diff.newCount})\n\n`;
    diff.new.forEach((sponsor, index) => {
      report += `${index + 1}. ${sponsor}\n`;
    });
    report += `\n`;
  }
  
  if (diff.removedCount > 0) {
    report += `## Removed Sponsors (${diff.removedCount})\n\n`;
    diff.removed.forEach((sponsor, index) => {
      report += `${index + 1}. ${sponsor}\n`;
    });
    report += `\n`;
  }
  
  report += `## Statistics\n`;
  report += `- Total sponsors in latest: ${latest.total}\n`;
  report += `- Total sponsors in previous: ${previous.total}\n`;
  report += `- New sponsors: ${diff.newCount}\n`;
  report += `- Removed sponsors: ${diff.removedCount}\n`;
  report += `- Unchanged sponsors: ${diff.commonCount}\n`;
  report += `- Change rate: ${((diff.newCount + diff.removedCount) / previous.total * 100).toFixed(2)}%\n`;
  
  return report;
}

/**
 * Export new entries to Excel file
 * @param {Array} newEntries - Array of new sponsor names
 * @param {string} outputDir - Output directory
 * @returns {string} Output file path
 */
function exportNewEntriesToExcel(newEntries, outputDir) {
  if (newEntries.length === 0) {
    console.log('No new entries to export');
    return null;
  }
  
  try {
    // Create worksheet data
    const wsData = [
      ['Company Name'], // Header
      ...newEntries.map(entry => [entry])
    ];
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'New Entries');
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const filename = `new_entries_${currentDate}.xlsx`;
    const outputPath = path.join(outputDir, filename);
    
    // Write file
    XLSX.writeFile(wb, outputPath);
    
    console.log(`✅ Exported ${newEntries.length} new entries to: ${filename}`);
    return outputPath;
  } catch (error) {
    console.error('Error exporting new entries:', error.message);
    throw error;
  }
}

/**
 * Save comparison results to JSON
 * @param {Object} results - Comparison results
 * @param {string} outputPath - Output file path
 */
function saveComparisonResults(results, outputPath) {
  try {
    const jsonData = {
      timestamp: new Date().toISOString(),
      comparison: results
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Saved comparison results to: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error('Error saving comparison results:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    console.log('Starting sponsor comparison...');
    console.log(`Data directory: ${dataDir}`);
    
    // Find latest files
    const [latestFile, previousFile] = findLatestFiles(dataDir);
    
    // Compare sponsors
    const results = compareSponsors(latestFile, previousFile);
    
    // Generate report
    const report = generateReport(results);
    console.log('\n' + '='.repeat(50));
    console.log(report);
    console.log('='.repeat(50));
    
    // Save report to file
    const reportPath = path.join(dataDir, `comparison_report_${new Date().toISOString().split('T')[0]}.md`);
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${path.basename(reportPath)}`);
    
    // Export new entries to Excel
    if (results.changes.newCount > 0) {
      exportNewEntriesToExcel(results.changes.new, dataDir);
    }
    
    // Save full comparison results as JSON
    const jsonPath = path.join(dataDir, `comparison_results_${new Date().toISOString().split('T')[0]}.json`);
    saveComparisonResults(results, jsonPath);
    
    console.log('\n✅ Comparison completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during comparison:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  findLatestFiles,
  compareSponsors,
  generateReport,
  exportNewEntriesToExcel,
  saveComparisonResults
}; 