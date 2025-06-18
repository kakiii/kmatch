/**
 * Company Name Normalizer Utility
 *
 * Provides functions for normalizing, tokenizing, and generating variations
 * of company names to improve sponsor matching accuracy.
 */

/**
 * Normalize company name for consistent matching
 * Removes business suffixes, special characters, and standardizes format
 * @param {string} name - Company name to normalize
 * @returns {string} Normalized company name
 */
function normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return (
    name
      .toLowerCase()
      .trim()
      // Remove common business suffixes (case insensitive)
      .replace(
        /\b(bv|b\.?v\.?|ltd|limited|inc|corp|corporation|llc|l\.?l\.?c\.?|gmbh|sa|nv|n\.?v\.?|plc|pty|co|company|group|holding|international|intl)\b\.?/gi,
        ''
      )
      // Remove special characters and punctuation
      .replace(/[^\w\s]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, '')
      .trim()
  );
}

/**
 * Generate company name aliases and variations
 * Creates different representations of the company name for improved matching
 * @param {string} primaryName - Primary company name
 * @returns {Array<string>} Array of name variations
 */
function generateAliases(primaryName) {
  if (!primaryName || typeof primaryName !== 'string') {
    return [];
  }

  const aliases = new Set();
  const trimmedName = primaryName.trim();

  // Add original name
  aliases.add(trimmedName);

  // Common business suffixes to work with
  const suffixes = [
    'BV',
    'B.V.',
    'B.V',
    'bv',
    'b.v.',
    'b.v',
    'Ltd',
    'Limited',
    'ltd',
    'limited',
    'Inc',
    'Incorporated',
    'inc',
    'incorporated',
    'Corp',
    'Corporation',
    'corp',
    'corporation',
    'LLC',
    'L.L.C.',
    'llc',
    'l.l.c.',
    'GmbH',
    'gmbh',
    'SA',
    'sa',
    'NV',
    'N.V.',
    'N.V',
    'nv',
    'n.v.',
    'n.v',
    'PLC',
    'plc',
    'Co',
    'Company',
    'co',
    'company',
    'Group',
    'group',
    'Holding',
    'holding'
  ];

  // Remove existing suffix and add variations
  let baseName = trimmedName;
  const suffixPattern = new RegExp(`\\s+(${suffixes.join('|').replace(/\./g, '\\.')})$`, 'i');
  const match = trimmedName.match(suffixPattern);

  if (match) {
    baseName = trimmedName.replace(suffixPattern, '').trim();
    aliases.add(baseName);
  }

  // Add variations with different suffixes
  const commonSuffixes = ['BV', 'B.V.', 'Ltd', 'Limited', 'Inc', 'Corp', 'LLC'];
  commonSuffixes.forEach(suffix => {
    aliases.add(`${baseName} ${suffix}`);
  });

  // Add without punctuation
  aliases.add(
    trimmedName
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
  aliases.add(
    baseName
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  // Add with different spacing around punctuation
  aliases.add(trimmedName.replace(/\./g, '. ').replace(/\s+/g, ' ').trim());
  aliases.add(trimmedName.replace(/\./g, '').replace(/\s+/g, ' ').trim());

  // Add with ampersand variations
  if (trimmedName.includes('&')) {
    aliases.add(trimmedName.replace(/&/g, 'and'));
    aliases.add(trimmedName.replace(/&/g, ' and ').replace(/\s+/g, ' ').trim());
  }
  if (trimmedName.toLowerCase().includes(' and ')) {
    aliases.add(trimmedName.replace(/ and /gi, ' & '));
    aliases.add(trimmedName.replace(/ and /gi, '&'));
  }

  // Add acronym if multiple words
  const words = baseName.split(/\s+/).filter(word => word.length > 0);
  if (words.length >= 2 && words.length <= 5) {
    const acronym = words.map(word => word[0].toUpperCase()).join('');
    if (acronym.length >= 2) {
      aliases.add(acronym);
    }
  }

  // Filter out empty strings and duplicates
  return Array.from(aliases).filter(alias => alias && alias.length > 0);
}

/**
 * Extract potential domain name from company name
 * Attempts to derive a domain name from the company name
 * @param {string} companyName - Company name
 * @returns {string|null} Potential domain name or null
 */
function extractDomain(companyName) {
  if (!companyName || typeof companyName !== 'string') {
    return null;
  }

  // Normalize the name first
  const normalized = normalizeCompanyName(companyName);

  if (normalized.length < 2) {
    return null;
  }

  // For very short names or single words, add .com
  const words = normalized.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 1 && words[0].length >= 3) {
    return `${words[0]}.com`;
  }

  // For multiple words, try different combinations
  if (words.length >= 2) {
    // Try first word + .com
    if (words[0].length >= 3) {
      return `${words[0]}.com`;
    }

    // Try first two words combined
    if (words[0].length + words[1].length >= 4) {
      return `${words[0]}${words[1]}.com`;
    }
  }

  return null;
}

/**
 * Tokenize company name into searchable tokens
 * Splits company name into individual searchable terms
 * @param {string} name - Company name
 * @returns {Array<string>} Array of search tokens
 */
function tokenizeCompanyName(name) {
  if (!name || typeof name !== 'string') {
    return [];
  }

  const tokens = new Set();

  // Basic word tokenization
  const words = name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1); // Filter out single characters

  words.forEach(word => {
    tokens.add(word);

    // Remove common business suffixes from tokens
    const cleanWord = word.replace(/^(bv|ltd|inc|corp|llc|gmbh|sa|nv|plc|co)$/, '');
    if (cleanWord && cleanWord !== word && cleanWord.length > 1) {
      tokens.add(cleanWord);
    }
  });

  // Add significant substrings for longer words
  words.forEach(word => {
    if (word.length >= 6) {
      // Add prefix substrings
      for (let i = 3; i <= Math.min(word.length - 1, 6); i++) {
        tokens.add(word.substring(0, i));
      }
    }
  });

  // Add combined tokens for multi-word names
  if (words.length >= 2 && words.length <= 3) {
    tokens.add(words.join(''));
  }

  return Array.from(tokens).filter(token => token.length >= 2);
}

/**
 * Extract first words from company name for indexing
 * Gets the first word and significant first words from different parts
 * @param {string} name - Company name
 * @returns {Array<string>} Array of first words (normalized)
 */
function extractFirstWords(name) {
  if (!name || typeof name !== 'string') {
    return [];
  }

  const firstWords = new Set();

  // Get first word of the entire name
  const allWords = name
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0);
  if (allWords.length > 0) {
    const firstWord = allWords[0].replace(/[^\w]/g, '');
    if (firstWord.length > 0) {
      firstWords.add(firstWord);
    }
  }

  // Get first words after common separators
  const separators = [',', '-', '|', '/', '\\', '(', '['];
  separators.forEach(separator => {
    const parts = name.split(separator);
    parts.forEach(part => {
      const trimmedPart = part.trim();
      if (trimmedPart.length > 0) {
        const partWords = trimmedPart.toLowerCase().split(/\s+/);
        if (partWords.length > 0) {
          const firstPartWord = partWords[0].replace(/[^\w]/g, '');
          if (firstPartWord.length > 1) {
            firstWords.add(firstPartWord);
          }
        }
      }
    });
  });

  return Array.from(firstWords);
}

/**
 * Generate search-optimized company record
 * Creates a complete record with all variations and search data
 * @param {string} primaryName - Primary company name
 * @returns {Object} Complete company record
 */
function generateCompanyRecord(primaryName) {
  if (!primaryName || typeof primaryName !== 'string') {
    throw new Error('Primary name is required and must be a string');
  }

  const normalizedName = normalizeCompanyName(primaryName);
  const aliases = generateAliases(primaryName);
  const domain = extractDomain(primaryName);
  const searchTokens = tokenizeCompanyName(primaryName);
  const firstWords = extractFirstWords(primaryName);

  return {
    primaryName: primaryName.trim(),
    normalizedName,
    aliases,
    domain,
    searchTokens,
    firstWords,
    variations: aliases // Keep for backwards compatibility
  };
}

/**
 * Check if two company names are likely the same company
 * Uses multiple normalization strategies to compare names
 * @param {string} name1 - First company name
 * @param {string} name2 - Second company name
 * @returns {boolean} True if names likely represent the same company
 */
function areNamesEquivalent(name1, name2) {
  if (!name1 || !name2) {
    return false;
  }

  // Exact match
  if (name1.toLowerCase() === name2.toLowerCase()) {
    return true;
  }

  // Normalized match
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);

  if (norm1 && norm2 && norm1 === norm2) {
    return true;
  }

  // Check if one is contained in the other (after normalization)
  if (norm1 && norm2) {
    if (norm1.length >= 4 && norm2.length >= 4) {
      if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return true;
      }
    }
  }

  // Check aliases
  const aliases1 = generateAliases(name1);
  const aliases2 = generateAliases(name2);

  for (const alias1 of aliases1) {
    for (const alias2 of aliases2) {
      if (alias1.toLowerCase() === alias2.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

// Export all functions
module.exports = {
  normalizeCompanyName,
  generateAliases,
  extractDomain,
  tokenizeCompanyName,
  extractFirstWords,
  generateCompanyRecord,
  areNamesEquivalent
};
