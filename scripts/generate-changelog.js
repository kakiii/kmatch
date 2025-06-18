#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');

/**
 * Changelog generation utility for KMatch extension releases
 * Generates formatted changelog from commit history
 */

/**
 * Initialize GitHub API client
 * @returns {Octokit} Authenticated Octokit instance
 */
function initGitHubAPI() {
	const token = process.env.GITHUB_TOKEN;

	if (!token) {
		console.warn('⚠️  No GITHUB_TOKEN found, using local git for changelog generation');
		return null;
	}

	return new Octokit({
		auth: token,
		userAgent: 'KMatch-Release-Bot/1.0'
	});
}

/**
 * Get repository information from git remote or environment
 * @returns {Object} Repository owner and name
 */
function getRepositoryInfo() {
	try {
		// Try to get repository info from environment variables (GitHub Actions)
		if (process.env.GITHUB_REPOSITORY) {
			const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
			return { owner, repo };
		}

		// Fallback: try to parse from git remote (local execution)
		const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

		// Parse GitHub URL (both HTTPS and SSH formats, including SSH aliases)
		const match = remoteUrl.match(/github(?:\.com|\.com-[^:]*)[:/]([^/]+)\/([^/.]+)/);
		if (match) {
			const owner = match[1];
			const repo = match[2];
			return { owner, repo };
		}

		throw new Error('Could not determine repository information');
	} catch (error) {
		throw new Error(`Failed to determine repository information: ${error.message}`);
	}
}

/**
 * Get the previous release tag
 * @returns {string|null} Previous tag or null if no previous tags
 */
function getPreviousTag() {
	try {
		// Get all tags sorted by version (descending)
		const tags = execSync('git tag -l "v*" --sort=-version:refname', { encoding: 'utf8' })
			.trim()
			.split('\n')
			.filter(tag => tag.length > 0);

		// Return the second tag (first is current, second is previous)
		return tags.length > 1 ? tags[1] : null;
	} catch (error) {
		console.warn('⚠️  Could not determine previous tag:', error.message);
		return null;
	}
}

/**
 * Get commits since last tag using local git
 * @param {string} fromTag - Starting tag (exclusive)
 * @param {string} toTag - Ending tag (inclusive), defaults to HEAD
 * @returns {Array} Array of commit objects
 */
function getCommitsSinceLastTagLocal(fromTag, toTag = 'HEAD') {
	try {
		const range = fromTag ? `${fromTag}..${toTag}` : toTag;

		// Get commit log with format: hash|author|date|message
		const gitLog = execSync(`git log ${range} --pretty=format:"%H|%an|%ad|%s" --date=iso`, {
			encoding: 'utf8'
		}).trim();

		if (!gitLog) {
			return [];
		}

		return gitLog.split('\n').map(line => {
			const [hash, author, date, message] = line.split('|');
			return {
				sha: hash,
				author: { login: author },
				commit: {
					message: message,
					author: { date: date }
				}
			};
		});
	} catch (error) {
		console.warn('⚠️  Error getting commits from git:', error.message);
		return [];
	}
}

/**
 * Get commits since last tag using GitHub API
 * @param {Octokit} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} fromTag - Starting tag (exclusive)
 * @param {string} toTag - Ending tag (inclusive)
 * @returns {Promise<Array>} Array of commit objects
 */
async function getCommitsSinceLastTagGitHub(octokit, owner, repo, fromTag, toTag) {
	try {
		const { data: comparison } = await octokit.rest.repos.compareCommits({
			owner,
			repo,
			base: fromTag,
			head: toTag
		});

		return comparison.commits;
	} catch (error) {
		console.warn('⚠️  Error getting commits from GitHub API:', error.message);
		return [];
	}
}

/**
 * Categorize commits based on conventional commit patterns
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Categorized commits
 */
function categorizeCommits(commits) {
	const categories = {
		features: [],
		fixes: [],
		chores: [],
		docs: [],
		other: []
	};

	commits.forEach(commit => {
		const message = commit.commit.message;
		const firstLine = message.split('\n')[0];

		// Skip merge commits
		if (firstLine.toLowerCase().startsWith('merge ')) {
			return;
		}

		// Categorize based on conventional commit patterns
		if (/^feat(\(.+\))?:/i.test(firstLine)) {
			categories.features.push(commit);
		} else if (/^fix(\(.+\))?:/i.test(firstLine)) {
			categories.fixes.push(commit);
		} else if (/^(chore|build|ci|perf|refactor|style|test)(\(.+\))?:/i.test(firstLine)) {
			categories.chores.push(commit);
		} else if (/^docs(\(.+\))?:/i.test(firstLine)) {
			categories.docs.push(commit);
		} else {
			categories.other.push(commit);
		}
	});

	return categories;
}

/**
 * Format commit message for changelog
 * @param {Object} commit - Commit object
 * @returns {string} Formatted commit message
 */
function formatCommitMessage(commit) {
	const message = commit.commit.message.split('\n')[0];
	const shortSha = commit.sha.substring(0, 7);
	const author = commit.author ? commit.author.login : 'Unknown';

	// Remove conventional commit prefix for cleaner display
	const cleanMessage = message.replace(
		/^(feat|fix|chore|docs|style|refactor|perf|test|build|ci)(\(.+\))?:\s*/i,
		''
	);

	return `- ${cleanMessage} ([${shortSha}](../../commit/${commit.sha})) by @${author}`;
}

/**
 * Generate markdown changelog from categorized commits
 * @param {Object} categories - Categorized commits
 * @param {string} version - Release version
 * @param {string} previousTag - Previous release tag
 * @returns {string} Formatted markdown changelog
 */
function generateMarkdownChangelog(categories, version, previousTag) {
	const lines = [];

	// Header
	lines.push(`## 🚀 Release ${version}`);
	lines.push('');

	if (previousTag) {
		lines.push(
			`**Full Changelog**: [${previousTag}...v${version}](../../compare/${previousTag}...v${version})`
		);
	} else {
		lines.push('**First Release**: Initial version of KMatch Firefox Extension');
	}
	lines.push('');

	// Features
	if (categories.features.length > 0) {
		lines.push('### ✨ New Features');
		categories.features.forEach(commit => {
			lines.push(formatCommitMessage(commit));
		});
		lines.push('');
	}

	// Bug fixes
	if (categories.fixes.length > 0) {
		lines.push('### 🐛 Bug Fixes');
		categories.fixes.forEach(commit => {
			lines.push(formatCommitMessage(commit));
		});
		lines.push('');
	}

	// Documentation
	if (categories.docs.length > 0) {
		lines.push('### 📚 Documentation');
		categories.docs.forEach(commit => {
			lines.push(formatCommitMessage(commit));
		});
		lines.push('');
	}

	// Other changes
	if (categories.other.length > 0) {
		lines.push('### 🔧 Other Changes');
		categories.other.forEach(commit => {
			lines.push(formatCommitMessage(commit));
		});
		lines.push('');
	}

	// Maintenance (only show if there are no other categories)
	if (
		categories.chores.length > 0 &&
		categories.features.length === 0 &&
		categories.fixes.length === 0 &&
		categories.other.length === 0
	) {
		lines.push('### 🧹 Maintenance');
		categories.chores.forEach(commit => {
			lines.push(formatCommitMessage(commit));
		});
		lines.push('');
	}

	// Footer
	lines.push('---');
	lines.push('');
	lines.push(
		'**Installation**: Download `kmatch-firefox-v' +
			version +
			'.zip` and install manually in Firefox'
	);
	lines.push('**Extension Store**: This release will be submitted to Firefox Add-ons store');

	return lines.join('\n');
}

/**
 * Main function to generate changelog
 * @param {string} version - Release version (e.g., '1.8.6')
 * @param {Object} options - Options object
 * @returns {Promise<string>} Generated changelog
 */
async function main(version, options = {}) {
	try {
		console.log(`📝 Generating changelog for version ${version}...`);

		// Get repository info
		const { owner, repo } = getRepositoryInfo();
		console.log(`📍 Repository: ${owner}/${repo}`);

		// Get previous tag
		const previousTag = getPreviousTag();
		console.log(`📅 Previous release: ${previousTag || 'None (first release)'}`);

		// Initialize GitHub API
		const octokit = initGitHubAPI();

		// Get commits since last release
		let commits = [];
		if (octokit && !options.useLocalGit) {
			console.log('🌐 Fetching commits from GitHub API...');
			commits = await getCommitsSinceLastTagGitHub(
				octokit,
				owner,
				repo,
				previousTag,
				`v${version}`
			);
		} else {
			console.log('📂 Fetching commits from local git...');
			commits = getCommitsSinceLastTagLocal(previousTag, 'HEAD');
		}

		console.log(`📊 Found ${commits.length} commits since last release`);

		if (commits.length === 0) {
			console.log('⚠️  No commits found, generating minimal changelog');
			return `## 🚀 Release ${version}\n\nMinor release with internal updates.\n\n**Installation**: Download \`kmatch-firefox-v${version}.zip\` and install manually in Firefox`;
		}

		// Categorize commits
		const categories = categorizeCommits(commits);
		console.log(
			`📋 Categorized: ${categories.features.length} features, ${categories.fixes.length} fixes, ${categories.other.length} other`
		);

		// Generate changelog
		const changelog = generateMarkdownChangelog(categories, version, previousTag);

		console.log('✅ Changelog generated successfully!');
		return changelog;
	} catch (error) {
		console.error(`❌ Failed to generate changelog: ${error.message}`);

		// Fallback minimal changelog
		return `## 🚀 Release ${version}\n\nRelease notes could not be generated automatically.\n\n**Installation**: Download \`kmatch-firefox-v${version}.zip\` and install manually in Firefox`;
	}
}

// Export functions for use in other scripts
module.exports = {
	initGitHubAPI,
	getRepositoryInfo,
	getPreviousTag,
	getCommitsSinceLastTagLocal,
	getCommitsSinceLastTagGitHub,
	categorizeCommits,
	formatCommitMessage,
	generateMarkdownChangelog,
	main
};

// CLI execution
if (require.main === module) {
	const args = process.argv.slice(2);
	const version = args[0];
	const useLocalGit = args.includes('--local');

	if (!version) {
		console.error('Usage: node generate-changelog.js <version> [--local]');
		console.error('Example: node generate-changelog.js 1.8.6');
		process.exit(1);
	}

	main(version, { useLocalGit })
		.then(changelog => {
			console.log('\n' + '='.repeat(60));
			console.log('GENERATED CHANGELOG:');
			console.log('='.repeat(60));
			console.log(changelog);
		})
		.catch(error => {
			console.error('Failed to generate changelog:', error.message);
			process.exit(1);
		});
}
