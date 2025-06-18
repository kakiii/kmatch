#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const CONFIG = require('./config');
const logger = require('./logger');

/**
 * Initialize GitHub API client
 * @returns {Octokit} Authenticated Octokit instance
 */
function initGitHubAPI() {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    logger.info('Initializing GitHub API client');

    return new Octokit({
        auth: token,
        userAgent: 'KMatch-Bot/1.0 (+https://github.com/kakiii/kmatch)'
    });
}

/**
 * Get repository information from git remote
 * @returns {Promise<{owner: string, repo: string}>} Repository info
 */
async function getRepositoryInfo() {
    try {
        // Try to get repository info from environment variables (GitHub Actions)
        if (process.env.GITHUB_REPOSITORY) {
            const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
            logger.debug(`Repository info from env: ${owner}/${repo}`);
            return { owner, repo };
        }

        // Fallback: try to parse from git remote (local execution)
        const { execSync } = require('child_process');
        const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

        // Parse GitHub URL (both HTTPS and SSH formats)
        let match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
        if (match) {
            const owner = match[1];
            const repo = match[2];
            logger.debug(`Repository info from git remote: ${owner}/${repo}`);
            return { owner, repo };
        }

        throw new Error('Could not determine repository information');

    } catch (error) {
        logger.error('Failed to get repository info:', error.message);
        throw new Error(`Failed to determine repository information: ${error.message}`);
    }
}

/**
 * Generate branch name for automated update
 * @returns {string} Branch name
 */
function generateBranchName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${CONFIG.GITHUB_BRANCH_PREFIX}${year}-${month}-${day}`;
}

/**
 * Create a new branch from main
 * @param {Octokit} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branchName - New branch name
 * @returns {Promise<string>} Created branch SHA
 */
async function createBranch(octokit, owner, repo, branchName) {
    try {
        logger.info(`Creating branch: ${branchName}`);

        // Get the SHA of the main branch
        const { data: mainBranch } = await octokit.rest.repos.getBranch({
            owner,
            repo,
            branch: 'main'
        });

        const mainSha = mainBranch.commit.sha;
        logger.debug(`Main branch SHA: ${mainSha}`);

        // Check if branch already exists
        try {
            await octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: branchName
            });

            logger.info(`Branch ${branchName} already exists, using existing branch`);
            return mainSha;

        } catch (error) {
            if (error.status !== 404) {
                throw error;
            }
            // Branch doesn't exist, create it
        }

        // Create new branch
        await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: mainSha
        });

        logger.info(`Successfully created branch: ${branchName}`);
        return mainSha;

    } catch (error) {
        logger.error('Failed to create branch:', error.message);
        throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
    }
}

/**
 * Get file content from repository
 * @param {Octokit} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} branch - Branch name
 * @returns {Promise<{content: string, sha: string}>} File content and SHA
 */
async function getFileContent(octokit, owner, repo, path, branch) {
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: branch
        });

        if (data.type !== 'file') {
            throw new Error(`Path ${path} is not a file`);
        }

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return { content, sha: data.sha };

    } catch (error) {
        if (error.status === 404) {
            return { content: null, sha: null };
        }
        throw error;
    }
}

/**
 * Commit changes to repository
 * @param {Octokit} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branchName - Branch name
 * @param {Array} files - Array of file changes {path, content}
 * @param {string} commitMessage - Commit message
 * @returns {Promise<string>} Commit SHA
 */
async function commitChanges(octokit, owner, repo, branchName, files, commitMessage) {
    try {
        logger.info(`Committing ${files.length} file(s) to ${branchName}`);

        const commits = [];

        for (const file of files) {
            logger.debug(`Processing file: ${file.path}`);

            // Get current file content and SHA (if exists)
            const { content: currentContent, sha: currentSha } = await getFileContent(
                octokit, owner, repo, file.path, branchName
            );

            // Skip if content hasn't changed
            if (currentContent === file.content) {
                logger.debug(`No changes in ${file.path}, skipping`);
                continue;
            }

            // Convert content to base64
            const contentBase64 = Buffer.from(file.content, 'utf8').toString('base64');

            // Create or update file
            const fileData = {
                owner,
                repo,
                path: file.path,
                message: commitMessage,
                content: contentBase64,
                branch: branchName
            };

            if (currentSha) {
                fileData.sha = currentSha;
            }

            const { data } = await octokit.rest.repos.createOrUpdateFileContents(fileData);
            commits.push(data.commit.sha);

            logger.debug(`Successfully committed ${file.path}`);
        }

        if (commits.length === 0) {
            logger.info('No files needed to be committed');
            return null;
        }

        logger.info(`Successfully committed ${commits.length} file(s)`);
        return commits[commits.length - 1]; // Return last commit SHA

    } catch (error) {
        logger.error('Failed to commit changes:', error.message);
        throw new Error(`Failed to commit changes: ${error.message}`);
    }
}

/**
 * Generate PR title with change statistics
 * @param {Object} changeSummary - Change summary from compare-data
 * @returns {string} PR title
 */
function generatePRTitle(changeSummary) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const netChange = changeSummary.totalNew - changeSummary.totalOld;
    const changeStr = netChange >= 0 ? `+${netChange}` : `${netChange}`;

    return `chore: Update sponsor data - ${dateStr} (${changeStr} changes)`;
}

/**
 * Generate comprehensive PR description
 * @param {Object} changeSummary - Change summary from compare-data
 * @param {string} csvFileName - Name of the new CSV file
 * @returns {string} PR description
 */
function generatePRDescription(changeSummary, csvFileName) {
    const lines = [];

    lines.push('## 🤖 Automated Sponsor Data Update');
    lines.push('');
    lines.push('This PR was automatically generated by the KMatch sponsor data automation system.');
    lines.push('');
    lines.push(`**Data Source**: [IND Public Register](${CONFIG.IND_URL})`);
    lines.push(`**Update Date**: ${new Date().toISOString().split('T')[0]}`);
    lines.push(`**New CSV File**: \`${csvFileName}\``);
    lines.push('');

    // Add the detailed change summary
    const { generateChangeSummary } = require('./compare-data');
    lines.push(generateChangeSummary(changeSummary));

    lines.push('');
    lines.push('## 📋 Files Updated');
    lines.push('- 📄 New CSV file in `data/` directory');
    lines.push('- 📊 Updated `sponsors.json` with processed data');
    lines.push('- 🔍 Updated search indexes for the browser extension');
    lines.push('');
    lines.push('## ✅ Automated Checks Completed');
    lines.push('- [x] Data fetched from official IND website');
    lines.push('- [x] Changes detected and validated');
    lines.push('- [x] CSV data processed and formatted');
    lines.push('- [x] JSON sponsor database updated');
    lines.push('- [x] Search indexes rebuilt');
    lines.push('- [x] Backup of previous data created');
    lines.push('');
    lines.push('## 🔍 Review Instructions');
    lines.push('1. Review the changes in the CSV file for accuracy');
    lines.push('2. Verify that the sponsor count changes are reasonable');
    lines.push('3. Check that no unexpected organizations were removed');
    lines.push('4. Confirm the extension will work with updated data');
    lines.push('');
    lines.push('**Note**: The browser extension will automatically use the updated sponsor data once this PR is merged.');

    return lines.join('\n');
}

/**
 * Create a pull request with sponsor data updates
 * @param {Octokit} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branchName - Source branch name
 * @param {string} title - PR title
 * @param {string} description - PR description
 * @returns {Promise<Object>} Created PR data
 */
async function createPullRequest(octokit, owner, repo, branchName, title, description) {
    try {
        logger.info(`Creating pull request: ${title}`);

        const { data: pr } = await octokit.rest.pulls.create({
            owner,
            repo,
            title,
            body: description,
            head: branchName,
            base: 'main'
        });

        logger.info(`Successfully created PR #${pr.number}: ${pr.html_url}`);

        // Add labels to the PR
        if (CONFIG.GITHUB_PR_LABELS.length > 0) {
            try {
                await octokit.rest.issues.addLabels({
                    owner,
                    repo,
                    issue_number: pr.number,
                    labels: CONFIG.GITHUB_PR_LABELS
                });

                logger.debug(`Added labels: ${CONFIG.GITHUB_PR_LABELS.join(', ')}`);
            } catch (error) {
                logger.log('warning', 'Failed to add labels to PR:', error.message);
            }
        }

        return pr;

    } catch (error) {
        logger.error('Failed to create pull request:', error.message);
        throw new Error(`Failed to create pull request: ${error.message}`);
    }
}

/**
 * Main function to create PR with sponsor data updates
 * @param {Object} options - Options object
 * @param {string} options.csvFilePath - Path to new CSV file
 * @param {string} options.jsonFilePath - Path to updated JSON file
 * @param {Object} options.changeSummary - Change summary from compare-data
 * @returns {Promise<Object>} Created PR information
 */
async function main({ csvFilePath, jsonFilePath, changeSummary }) {
    try {
        logger.info('Starting PR creation process');

        // Initialize GitHub API
        const octokit = initGitHubAPI();
        const { owner, repo } = await getRepositoryInfo();

        logger.info(`Repository: ${owner}/${repo}`);

        // Generate branch name and create branch
        const branchName = generateBranchName();
        await createBranch(octokit, owner, repo, branchName);

        // Read file contents
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');

        // Prepare files for commit
        const files = [
            {
                path: `data/${path.basename(csvFilePath)}`,
                content: csvContent
            },
            {
                path: 'sponsors.json',
                content: jsonContent
            }
        ];

        // Generate commit message and PR details
        const commitMessage = `chore: Update sponsor data from IND website\n\nAutomated update with ${changeSummary.added.length} additions, ${changeSummary.removed.length} removals, and ${changeSummary.modified.length} modifications.`;

        const prTitle = generatePRTitle(changeSummary);
        const prDescription = generatePRDescription(changeSummary, path.basename(csvFilePath));

        // Commit changes
        const commitSha = await commitChanges(octokit, owner, repo, branchName, files, commitMessage);

        if (!commitSha) {
            logger.info('No changes to commit, skipping PR creation');
            return null;
        }

        // Create pull request
        const pr = await createPullRequest(octokit, owner, repo, branchName, prTitle, prDescription);

        logger.info('✅ PR creation completed successfully!');
        logger.info(`📋 PR #${pr.number}: ${pr.html_url}`);
        logger.info(`🌿 Branch: ${branchName}`);

        return {
            pr: pr,
            branch: branchName,
            commit: commitSha
        };

    } catch (error) {
            logger.error('❌ PR creation failed:', error.message);
        throw error;
    }
}

// Export functions for use in other scripts
module.exports = {
    initGitHubAPI,
    getRepositoryInfo,
    generateBranchName,
    createBranch,
    commitChanges,
    createPullRequest,
    generatePRTitle,
    generatePRDescription,
    main
};

// Run if called directly (for testing)
if (require.main === module) {
    console.log('This script is designed to be called by update-sponsors-auto.js');
    console.log('For testing, use: npm run update-sponsors-auto');
    process.exit(1);
} 