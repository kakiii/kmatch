#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const CONFIG = require('./config');
const logger = require('./logger');

/**
 * Generate SHA256 hash of CSV content
 * @param {string} csvContent - CSV content to hash
 * @returns {string} SHA256 hash
 */
function generateHash(csvContent) {
	return crypto.createHash('sha256').update(csvContent, 'utf8').digest('hex');
}

/**
 * Load last update hash from file
 * @returns {string|null} Last hash or null if file doesn't exist
 */
function loadLastHash() {
	try {
		if (fs.existsSync(CONFIG.HASH_FILE_PATH)) {
			const hashData = fs.readFileSync(CONFIG.HASH_FILE_PATH, 'utf8').trim();
			logger.debug('Loaded last hash:', hashData);
			return hashData;
		} else {
			logger.info('No previous hash file found - treating as first run');
			return null;
		}
	} catch (error) {
		logger.error('Failed to load last hash:', error.message);
		return null;
	}
}

/**
 * Save current hash to file
 * @param {string} hash - Hash to save
 */
function saveLastHash(hash) {
	try {
		// Ensure data directory exists
		if (!fs.existsSync(CONFIG.DATA_DIR)) {
			fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
		}

		fs.writeFileSync(CONFIG.HASH_FILE_PATH, hash, 'utf8');
		logger.debug('Saved new hash:', hash);
	} catch (error) {
		logger.error('Failed to save hash:', error.message);
		throw new Error(`Failed to save hash file: ${error.message}`);
	}
}

/**
 * Parse CSV content into array of records
 * @param {string} csvContent - CSV content
 * @returns {Array<{organisation: string, kvk: string}>} Parsed records
 */
function parseCSV(csvContent) {
	const lines = csvContent.split('\n').filter(line => line.trim());
	const records = [];

	// Skip header row
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line) {
			// Simple CSV parsing - handle quoted fields
			const fields = [];
			let current = '';
			let inQuotes = false;

			for (let j = 0; j < line.length; j++) {
				const char = line[j];

				if (char === '"') {
					if (inQuotes && line[j + 1] === '"') {
						// Escaped quote
						current += '"';
						j++; // Skip next quote
					} else {
						// Toggle quote state
						inQuotes = !inQuotes;
					}
				} else if (char === ',' && !inQuotes) {
					// Field separator
					fields.push(current.trim());
					current = '';
				} else {
					current += char;
				}
			}

			// Add last field
			fields.push(current.trim());

			if (fields.length >= 2) {
				records.push({
					organisation: fields[0],
					kvk: fields[1]
				});
			}
		}
	}

	return records;
}

/**
 * Find latest CSV file in data directory
 * @returns {string|null} Path to latest CSV file or null if none found
 */
function findLatestCSVFile() {
	try {
		if (!fs.existsSync(CONFIG.DATA_DIR)) {
			return null;
		}

		const files = fs
			.readdirSync(CONFIG.DATA_DIR)
			.filter(file => file.match(/^KMatch - \d{2}_\d{2}_\d{4}\.csv$/))
			.sort()
			.reverse();

		if (files.length === 0) {
			return null;
		}

		return path.join(CONFIG.DATA_DIR, files[0]);
	} catch (error) {
		logger.error('Failed to find latest CSV file:', error.message);
		return null;
	}
}

/**
 * Compare two sets of records and generate detailed diff
 * @param {Array} oldRecords - Previous records
 * @param {Array} newRecords - New records
 * @returns {Object} Change summary
 */
function compareData(oldRecords, newRecords) {
	logger.info('Performing detailed data comparison');

	// Create maps for efficient lookup
	const oldMap = new Map();
	const newMap = new Map();

	oldRecords.forEach(record => {
		oldMap.set(record.organisation.toLowerCase(), record);
	});

	newRecords.forEach(record => {
		newMap.set(record.organisation.toLowerCase(), record);
	});

	// Find additions and removals
	const added = [];
	const removed = [];
	const modified = [];

	// Check for new organizations
	newRecords.forEach(newRecord => {
		const key = newRecord.organisation.toLowerCase();
		const oldRecord = oldMap.get(key);

		if (!oldRecord) {
			added.push(newRecord);
		} else if (oldRecord.kvk !== newRecord.kvk) {
			modified.push({
				organisation: newRecord.organisation,
				oldKvk: oldRecord.kvk,
				newKvk: newRecord.kvk
			});
		}
	});

	// Check for removed organizations
	oldRecords.forEach(oldRecord => {
		const key = oldRecord.organisation.toLowerCase();
		if (!newMap.has(key)) {
			removed.push(oldRecord);
		}
	});

	const summary = {
		totalOld: oldRecords.length,
		totalNew: newRecords.length,
		added: added,
		removed: removed,
		modified: modified,
		hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0
	};

	logger.info(`Comparison complete: +${added.length} -${removed.length} ~${modified.length}`);

	return summary;
}

/**
 * Generate human-readable change summary for PR description
 * @param {Object} changeSummary - Change summary from compareData
 * @returns {string} Formatted change description
 */
function generateChangeSummary(changeSummary) {
	const lines = [];

	lines.push('## Sponsor Data Update Summary');
	lines.push('');
	lines.push(`- **Previous total**: ${changeSummary.totalOld} organizations`);
	lines.push(`- **New total**: ${changeSummary.totalNew} organizations`);
	lines.push(
		`- **Net change**: ${changeSummary.totalNew - changeSummary.totalOld >= 0 ? '+' : ''}${changeSummary.totalNew - changeSummary.totalOld}`
	);
	lines.push('');

	if (changeSummary.added.length > 0) {
		lines.push(`### ✅ Added Organizations (${changeSummary.added.length})`);
		changeSummary.added.slice(0, 10).forEach(record => {
			lines.push(`- ${record.organisation} (KVK: ${record.kvk})`);
		});
		if (changeSummary.added.length > 10) {
			lines.push(`- ... and ${changeSummary.added.length - 10} more`);
		}
		lines.push('');
	}

	if (changeSummary.removed.length > 0) {
		lines.push(`### ❌ Removed Organizations (${changeSummary.removed.length})`);
		changeSummary.removed.slice(0, 10).forEach(record => {
			lines.push(`- ${record.organisation} (KVK: ${record.kvk})`);
		});
		if (changeSummary.removed.length > 10) {
			lines.push(`- ... and ${changeSummary.removed.length - 10} more`);
		}
		lines.push('');
	}

	if (changeSummary.modified.length > 0) {
		lines.push(`### 🔄 Modified Organizations (${changeSummary.modified.length})`);
		changeSummary.modified.slice(0, 10).forEach(record => {
			lines.push(`- ${record.organisation}: ${record.oldKvk} → ${record.newKvk}`);
		});
		if (changeSummary.modified.length > 10) {
			lines.push(`- ... and ${changeSummary.modified.length - 10} more`);
		}
		lines.push('');
	}

	lines.push('---');
	lines.push(
		'*This update was generated automatically by the KMatch sponsor data automation system.*'
	);

	return lines.join('\n');
}

/**
 * Check if new CSV data differs from the last processed version
 * @param {string} newCSVContent - New CSV content to check
 * @returns {Promise<{hasChanges: boolean, changeSummary?: Object, newHash: string}>}
 */
async function checkForChanges(newCSVContent) {
	try {
		logger.info('Starting change detection process');

		const newHash = generateHash(newCSVContent);
		const lastHash = loadLastHash();

		logger.debug('New hash:', newHash);
		logger.debug('Last hash:', lastHash);

		// Quick hash comparison first
		if (lastHash === newHash) {
			logger.info('No changes detected (hash match)');
			return {
				hasChanges: false,
				newHash: newHash
			};
		}

		logger.info('Hash difference detected, performing detailed comparison');

		// Parse new data
		const newRecords = parseCSV(newCSVContent);
		logger.debug(`Parsed ${newRecords.length} new records`);

		// Get old data for comparison
		let oldRecords = [];
		const latestCSVFile = findLatestCSVFile();

		if (latestCSVFile && fs.existsSync(latestCSVFile)) {
			const oldCSVContent = fs.readFileSync(latestCSVFile, 'utf8');
			oldRecords = parseCSV(oldCSVContent);
			logger.debug(
				`Parsed ${oldRecords.length} old records from ${path.basename(latestCSVFile)}`
			);
		} else {
			logger.info('No previous CSV file found - treating as initial data');
		}

		// Perform detailed comparison
		const changeSummary = compareData(oldRecords, newRecords);

		if (!changeSummary.hasChanges) {
			logger.info('No actual changes detected despite hash difference');
			return {
				hasChanges: false,
				changeSummary: changeSummary,
				newHash: newHash
			};
		}

		logger.info('✅ Changes detected in sponsor data');

		return {
			hasChanges: true,
			changeSummary: changeSummary,
			newHash: newHash
		};
	} catch (error) {
		logger.error('Change detection failed:', error.message);
		throw new Error(`Failed to check for changes: ${error.message}`);
	}
}

/**
 * Main function for testing change detection
 */
async function main() {
	try {
		// This is mainly for testing - in production, this will be called by the main automation script
		const latestCSVFile = findLatestCSVFile();

		if (!latestCSVFile) {
			logger.error('No CSV files found for testing');
			return;
		}

		logger.info(`Testing change detection with: ${path.basename(latestCSVFile)}`);

		const csvContent = fs.readFileSync(latestCSVFile, 'utf8');
		const result = await checkForChanges(csvContent);

		logger.info('Change detection result:', result);
	} catch (error) {
		logger.error('Test failed:', error.message);
		process.exit(1);
	}
}

// Export functions for use in other scripts
module.exports = {
	generateHash,
	loadLastHash,
	saveLastHash,
	parseCSV,
	compareData,
	generateChangeSummary,
	checkForChanges,
	findLatestCSVFile
};

// Run if called directly
if (require.main === module) {
	main();
}
