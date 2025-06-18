/**
 * Enhanced Sponsor Matcher
 *
 * Provides sophisticated company name matching using multiple strategies:
 * - Exact matching
 * - Fuzzy matching with Levenshtein distance
 * - Token-based matching
 * - Normalized name matching
 * - Search index optimization
 */

const levenshtein = require('fast-levenshtein');
const {
	normalizeCompanyName,
	extractFirstWords,
	tokenizeCompanyName
} = require('./company-normalizer');

class SponsorMatcher {
	constructor(sponsorData = null) {
		this.sponsors = new Map();
		this.indexes = {
			byFirstWord: new Map(),
			byNormalizedName: new Map(),
			bySearchToken: new Map(),
			byDomain: new Map()
		};
		this.matchCache = new Map();
		this.loaded = false;

		if (sponsorData) {
			this.loadSponsorData(sponsorData);
		}
	}

	/**
	 * Load sponsor data and build indexes
	 * @param {Object} sponsorData - Sponsor data object
	 */
	loadSponsorData(sponsorData) {
		try {
			console.log('Loading sponsor data...');

			if (!sponsorData || !sponsorData.sponsors) {
				throw new Error('Invalid sponsor data format');
			}

			// Clear existing data
			this.sponsors.clear();
			Object.values(this.indexes).forEach(index => index.clear());
			this.matchCache.clear();

			// Load sponsors
			Object.entries(sponsorData.sponsors).forEach(([id, record]) => {
				this.sponsors.set(id, record);
			});

			// Build indexes
			if (sponsorData.index) {
				this._loadPrebuiltIndexes(sponsorData.index);
			} else {
				this._buildIndexes();
			}

			this.loaded = true;
			console.log(`Loaded ${this.sponsors.size} sponsors with indexes`);
		} catch (error) {
			console.error('Error loading sponsor data:', error);
			throw error;
		}
	}

	/**
	 * Load pre-built indexes from data
	 * @param {Object} indexData - Index data from sponsors.json
	 * @private
	 */
	_loadPrebuiltIndexes(indexData) {
		// Load byFirstWord index
		if (indexData.byFirstWord) {
			Object.entries(indexData.byFirstWord).forEach(([word, sponsorIds]) => {
				this.indexes.byFirstWord.set(word.toLowerCase(), sponsorIds);
			});
		}

		// Load byNormalizedName index
		if (indexData.byNormalizedName) {
			Object.entries(indexData.byNormalizedName).forEach(([normalizedName, sponsorId]) => {
				this.indexes.byNormalizedName.set(normalizedName.toLowerCase(), sponsorId);
			});
		}

		// Load bySearchToken index
		if (indexData.bySearchToken) {
			Object.entries(indexData.bySearchToken).forEach(([token, sponsorIds]) => {
				this.indexes.bySearchToken.set(token.toLowerCase(), sponsorIds);
			});
		}

		// Load byDomain index
		if (indexData.byDomain) {
			Object.entries(indexData.byDomain).forEach(([domain, sponsorId]) => {
				this.indexes.byDomain.set(domain.toLowerCase(), sponsorId);
			});
		}

		console.log('Loaded pre-built indexes');
	}

	/**
	 * Build indexes from sponsor data
	 * @private
	 */
	_buildIndexes() {
		console.log('Building search indexes...');

		this.sponsors.forEach((record, sponsorId) => {
			// Index by first words
			if (record.firstWords) {
				record.firstWords.forEach(word => {
					const key = word.toLowerCase();
					if (!this.indexes.byFirstWord.has(key)) {
						this.indexes.byFirstWord.set(key, []);
					}
					this.indexes.byFirstWord.get(key).push(sponsorId);
				});
			}

			// Index by normalized name
			if (record.normalizedName) {
				const key = record.normalizedName.toLowerCase();
				this.indexes.byNormalizedName.set(key, sponsorId);
			}

			// Index by search tokens
			if (record.searchTokens) {
				record.searchTokens.forEach(token => {
					const key = token.toLowerCase();
					if (!this.indexes.bySearchToken.has(key)) {
						this.indexes.bySearchToken.set(key, []);
					}
					this.indexes.bySearchToken.get(key).push(sponsorId);
				});
			}

			// Index by domain
			if (record.domain) {
				const key = record.domain.toLowerCase();
				this.indexes.byDomain.set(key, sponsorId);
			}
		});

		console.log('Built search indexes');
	}

	/**
	 * Main sponsor recognition function
	 * @param {string} companyName - Company name to check
	 * @returns {boolean} True if company is a recognized sponsor
	 */
	isRecognizedSponsor(companyName) {
		if (!this.loaded || !companyName || typeof companyName !== 'string') {
			return false;
		}

		const trimmedName = companyName.trim();
		if (trimmedName.length === 0) {
			return false;
		}

		// Check cache first
		const cacheKey = trimmedName.toLowerCase();
		if (this.matchCache.has(cacheKey)) {
			return this.matchCache.get(cacheKey);
		}

		// Try different matching strategies in order of performance
		const result =
			this.checkExactMatch(trimmedName) ||
			this.checkNormalizedMatch(trimmedName) ||
			this.checkTokenMatch(trimmedName) ||
			this.checkFuzzyMatch(trimmedName, 0.85);

		// Cache the result
		this.matchCache.set(cacheKey, result);

		return result;
	}

	/**
	 * Check for exact matches against sponsor names and aliases
	 * @param {string} companyName - Company name to check
	 * @returns {boolean} True if exact match found
	 */
	checkExactMatch(companyName) {
		const lowerName = companyName.toLowerCase();

		for (const [, record] of this.sponsors) {
			// Check primary name
			if (record.primaryName && record.primaryName.toLowerCase() === lowerName) {
				return true;
			}

			// Check aliases
			if (record.aliases) {
				for (const alias of record.aliases) {
					if (alias.toLowerCase() === lowerName) {
						return true;
					}
				}
			}

			// Check variations (backwards compatibility)
			if (record.variations) {
				for (const variation of record.variations) {
					if (variation.toLowerCase() === lowerName) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Check normalized name matching
	 * @param {string} companyName - Company name to check
	 * @returns {boolean} True if normalized match found
	 */
	checkNormalizedMatch(companyName) {
		const normalized = normalizeCompanyName(companyName);
		if (!normalized || normalized.length < 2) {
			return false;
		}

		// Check index first
		if (this.indexes.byNormalizedName.has(normalized)) {
			return true;
		}

		// Fallback to manual check
		for (const [, record] of this.sponsors) {
			if (record.normalizedName && record.normalizedName.toLowerCase() === normalized) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check token-based matching
	 * @param {string} companyName - Company name to check
	 * @returns {boolean} True if token match found
	 */
	checkTokenMatch(companyName) {
		const tokens = tokenizeCompanyName(companyName);
		if (tokens.length === 0) {
			return false;
		}

		// Use first words for quick lookup
		const firstWords = extractFirstWords(companyName);
		const candidateIds = new Set();

		// Get candidates from first word index
		firstWords.forEach(word => {
			const ids = this.indexes.byFirstWord.get(word.toLowerCase());
			if (ids) {
				ids.forEach(id => candidateIds.add(id));
			}
		});

		// Get candidates from token index
		tokens.forEach(token => {
			const ids = this.indexes.bySearchToken.get(token.toLowerCase());
			if (ids) {
				ids.forEach(id => candidateIds.add(id));
			}
		});

		// Check candidates
		for (const sponsorId of candidateIds) {
			const record = this.sponsors.get(sponsorId);
			if (record && this._tokenOverlapMatch(tokens, record)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if tokens have sufficient overlap with sponsor record
	 * @param {Array<string>} queryTokens - Tokens from query company name
	 * @param {Object} record - Sponsor record
	 * @returns {boolean} True if sufficient overlap
	 * @private
	 */
	_tokenOverlapMatch(queryTokens, record) {
		const sponsorTokens = new Set(
			[
				...(record.searchTokens || []),
				...(record.firstWords || []),
				...tokenizeCompanyName(record.primaryName || '')
			].map(token => token.toLowerCase())
		);

		if (sponsorTokens.size === 0) {
			return false;
		}

		// Calculate overlap ratio
		const overlap = queryTokens.filter(token => sponsorTokens.has(token.toLowerCase())).length;
		const minTokens = Math.min(queryTokens.length, sponsorTokens.size);
		const overlapRatio = overlap / minTokens;

		// Require at least 60% overlap for longer names, 80% for shorter names
		const threshold = minTokens >= 3 ? 0.6 : 0.8;

		return overlapRatio >= threshold;
	}

	/**
	 * Check fuzzy matching using Levenshtein distance
	 * @param {string} companyName - Company name to check
	 * @param {number} threshold - Similarity threshold (0-1)
	 * @returns {boolean} True if fuzzy match found
	 */
	checkFuzzyMatch(companyName, threshold = 0.8) {
		const lowerName = companyName.toLowerCase();
		const maxDistance = Math.floor((1 - threshold) * lowerName.length);

		// Only do fuzzy matching for names with reasonable length
		if (lowerName.length < 3 || maxDistance < 1) {
			return false;
		}

		for (const [, record] of this.sponsors) {
			// Check against primary name
			if (record.primaryName) {
				const distance = levenshtein.get(lowerName, record.primaryName.toLowerCase());
				if (distance <= maxDistance) {
					return true;
				}
			}

			// Check against normalized name
			if (record.normalizedName) {
				const normalizedQuery = normalizeCompanyName(companyName);
				const distance = levenshtein.get(normalizedQuery, record.normalizedName);
				if (distance <= Math.floor((1 - threshold) * normalizedQuery.length)) {
					return true;
				}
			}

			// Check against key aliases (limit to avoid performance issues)
			if (record.aliases && record.aliases.length > 0) {
				const keyAliases = record.aliases.slice(0, 3); // Limit to first 3 aliases
				for (const alias of keyAliases) {
					const distance = levenshtein.get(lowerName, alias.toLowerCase());
					if (distance <= maxDistance) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Check domain-based matching
	 * @param {string} companyName - Company name to check
	 * @returns {boolean} True if domain match found
	 */
	checkDomainMatch(companyName) {
		// Extract potential domain from company name
		const normalized = normalizeCompanyName(companyName);
		const words = normalized.split(/\s+/).filter(word => word.length > 2);

		if (words.length === 0) {
			return false;
		}

		// Try different domain combinations
		const potentialDomains = [
			`${words[0]}.com`,
			`${words[0]}.nl`,
			words.length > 1 ? `${words[0]}${words[1]}.com` : null,
			words.length > 1 ? `${words[0]}${words[1]}.nl` : null
		].filter(Boolean);

		for (const domain of potentialDomains) {
			if (this.indexes.byDomain.has(domain.toLowerCase())) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get detailed match information for debugging
	 * @param {string} companyName - Company name to check
	 * @returns {Object} Detailed match information
	 */
	getMatchDetails(companyName) {
		if (!this.loaded || !companyName) {
			return { matched: false, reason: 'Invalid input or data not loaded' };
		}

		const trimmedName = companyName.trim();

		const checks = {
			exact: this.checkExactMatch(trimmedName),
			normalized: this.checkNormalizedMatch(trimmedName),
			token: this.checkTokenMatch(trimmedName),
			fuzzy: this.checkFuzzyMatch(trimmedName, 0.85),
			domain: this.checkDomainMatch(trimmedName)
		};

		const matched = Object.values(checks).some(result => result);
		const matchedTypes = Object.entries(checks)
			.filter(([, result]) => result)
			.map(([type]) => type);

		return {
			matched,
			matchedTypes,
			checks,
			normalized: normalizeCompanyName(trimmedName),
			tokens: tokenizeCompanyName(trimmedName),
			firstWords: extractFirstWords(trimmedName)
		};
	}

	/**
	 * Get statistics about loaded data
	 * @returns {Object} Statistics object
	 */
	getStats() {
		return {
			loaded: this.loaded,
			totalSponsors: this.sponsors.size,
			cacheSize: this.matchCache.size,
			indexSizes: {
				byFirstWord: this.indexes.byFirstWord.size,
				byNormalizedName: this.indexes.byNormalizedName.size,
				bySearchToken: this.indexes.bySearchToken.size,
				byDomain: this.indexes.byDomain.size
			}
		};
	}

	/**
	 * Clear match cache
	 */
	clearCache() {
		this.matchCache.clear();
	}
}

module.exports = SponsorMatcher;
