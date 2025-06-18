#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const semver = require('semver');

/**
 * Version validation and synchronization utility for KMatch extension
 * Ensures consistency between package.json and manifest.json versions
 */

const CONFIG = {
	PACKAGE_JSON_PATH: path.join(__dirname, '..', 'package.json'),
	MANIFEST_JSON_PATH: path.join(__dirname, '..', 'manifest.json')
};

/**
 * Parse and validate a git tag version
 * @param {string} tag - Git tag (e.g., 'v1.8.6')
 * @returns {string} - Clean version string (e.g., '1.8.6')
 */
function validateTagVersion(tag) {
	if (!tag) {
		throw new Error('No tag provided');
	}

	// Remove 'v' prefix if present
	const version = tag.startsWith('v') ? tag.slice(1) : tag;

	// Validate semantic version format
	if (!semver.valid(version)) {
		throw new Error(
			`Invalid semantic version: ${version}. Must be in format major.minor.patch (e.g., 1.8.6)`
		);
	}

	console.log(`✅ Valid semantic version: ${version}`);
	return version;
}

/**
 * Read current versions from package.json and manifest.json
 * @returns {Object} - Object with package and manifest versions
 */
function getFileVersions() {
	try {
		// Read package.json
		const packageData = JSON.parse(fs.readFileSync(CONFIG.PACKAGE_JSON_PATH, 'utf8'));
		const packageVersion = packageData.version;

		// Read manifest.json
		const manifestData = JSON.parse(fs.readFileSync(CONFIG.MANIFEST_JSON_PATH, 'utf8'));
		const manifestVersion = manifestData.version;

		console.log(`📄 Current package.json version: ${packageVersion}`);
		console.log(`📄 Current manifest.json version: ${manifestVersion}`);

		return {
			package: packageVersion,
			manifest: manifestVersion,
			packageData,
			manifestData
		};
	} catch (error) {
		throw new Error(`Failed to read version files: ${error.message}`);
	}
}

/**
 * Update both package.json and manifest.json to target version
 * @param {string} targetVersion - Version to sync to (e.g., '1.8.6')
 * @returns {Object} - Summary of changes made
 */
function syncVersions(targetVersion) {
	const {
		package: currentPackage,
		manifest: currentManifest,
		packageData,
		manifestData
	} = getFileVersions();

	const changes = {
		packageChanged: false,
		manifestChanged: false,
		previousPackage: currentPackage,
		previousManifest: currentManifest,
		newVersion: targetVersion
	};

	// Update package.json if needed
	if (currentPackage !== targetVersion) {
		packageData.version = targetVersion;
		fs.writeFileSync(CONFIG.PACKAGE_JSON_PATH, JSON.stringify(packageData, null, 2) + '\n');
		changes.packageChanged = true;
		console.log(`📝 Updated package.json: ${currentPackage} → ${targetVersion}`);
	}

	// Update manifest.json if needed
	if (currentManifest !== targetVersion) {
		manifestData.version = targetVersion;
		fs.writeFileSync(CONFIG.MANIFEST_JSON_PATH, JSON.stringify(manifestData, null, 2) + '\n');
		changes.manifestChanged = true;
		console.log(`📝 Updated manifest.json: ${currentManifest} → ${targetVersion}`);
	}

	if (!changes.packageChanged && !changes.manifestChanged) {
		console.log(`✅ All versions already synced to ${targetVersion}`);
	}

	return changes;
}

/**
 * Validate that all version files are consistent
 * @param {string} expectedVersion - Expected version (optional)
 * @returns {boolean} - True if all versions match
 */
function validateVersionConsistency(expectedVersion = null) {
	const { package: packageVersion, manifest: manifestVersion } = getFileVersions();

	// Check internal consistency
	if (packageVersion !== manifestVersion) {
		console.error(
			`❌ Version mismatch: package.json (${packageVersion}) != manifest.json (${manifestVersion})`
		);
		return false;
	}

	// Check against expected version if provided
	if (expectedVersion && packageVersion !== expectedVersion) {
		console.error(
			`❌ Version mismatch: files (${packageVersion}) != expected (${expectedVersion})`
		);
		return false;
	}

	console.log(`✅ All versions consistent: ${packageVersion}`);
	return true;
}

/**
 * Validate that target version is higher than current versions
 * @param {string} targetVersion - Target version to validate
 * @returns {boolean} - True if target version is valid for release
 */
function validateVersionUpgrade(targetVersion) {
	const { manifest: manifestVersion } = getFileVersions();

	const currentVersion = manifestVersion; // manifest.json is source of truth for extensions

	if (semver.lte(targetVersion, currentVersion)) {
		console.error(
			`❌ Target version ${targetVersion} is not higher than current version ${currentVersion}`
		);
		console.error('   Use a higher version number for releases');
		return false;
	}

	console.log(`✅ Version upgrade valid: ${currentVersion} → ${targetVersion}`);
	return true;
}

/**
 * Main validation function for use in CI/CD
 * @param {string} tag - Git tag to validate and sync to
 * @param {Object} options - Options object
 * @returns {Object} - Validation and sync results
 */
function main(tag, options = {}) {
	try {
		console.log('🔍 Starting version validation and sync process...\n');

		// Step 1: Validate tag format
		const targetVersion = validateTagVersion(tag);

		// Step 2: Validate version upgrade (only for actual releases)
		if (!options.allowDowngrade) {
			if (!validateVersionUpgrade(targetVersion)) {
				throw new Error('Version upgrade validation failed');
			}
		}

		// Step 3: Sync versions if requested
		let syncResult = null;
		if (options.sync !== false) {
			syncResult = syncVersions(targetVersion);
		}

		// Step 4: Final consistency check
		if (!validateVersionConsistency(targetVersion)) {
			throw new Error('Version consistency validation failed');
		}

		console.log('\n✅ Version validation and sync completed successfully!');

		return {
			success: true,
			version: targetVersion,
			changes: syncResult
		};
	} catch (error) {
		console.error(`\n❌ Version validation failed: ${error.message}`);

		return {
			success: false,
			error: error.message
		};
	}
}

// Export functions for use in other scripts
module.exports = {
	validateTagVersion,
	getFileVersions,
	syncVersions,
	validateVersionConsistency,
	validateVersionUpgrade,
	main
};

// CLI execution
if (require.main === module) {
	const args = process.argv.slice(2);
	const isSync = args.includes('--sync');
	const allowDowngrade = args.includes('--allow-downgrade');

	// Get tag (first non-flag argument)
	const tag = args.find(arg => !arg.startsWith('--')) || process.env.GITHUB_REF_NAME;

	if (!tag) {
		console.error('Usage: node validate-version.js <tag> [--sync] [--allow-downgrade]');
		console.error('Example: node validate-version.js v1.8.6 --sync');
		process.exit(1);
	}

	const result = main(tag, { sync: isSync, allowDowngrade });

	if (!result.success) {
		process.exit(1);
	}
}
