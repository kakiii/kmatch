const fs = require('fs');
const path = require('path');

console.log('Starting sponsors.json splitting process...');

// Read the original sponsors.json file
const sponsorsPath = path.join(__dirname, '../data/json/sponsors.json');
const sponsorsData = JSON.parse(fs.readFileSync(sponsorsPath, 'utf8'));

console.log(`Loaded sponsors.json with ${sponsorsData.totalSponsors} sponsors`);

// Extract sponsors object and convert to array for sorting
const sponsorsObj = sponsorsData.sponsors;
const sponsorEntries = Object.entries(sponsorsObj);

console.log(`Found ${sponsorEntries.length} sponsor entries`);

// Sort by company name (primaryName) alphabetically
sponsorEntries.sort((a, b) => {
	const nameA = a[1].primaryName.toLowerCase();
	const nameB = b[1].primaryName.toLowerCase();
	return nameA.localeCompare(nameB);
});

console.log('Sorted sponsors alphabetically');

// Define split boundaries (approximate thirds)
const totalEntries = sponsorEntries.length;
const splitSize = Math.ceil(totalEntries / 3);

// Split into three groups
const groups = [
	sponsorEntries.slice(0, splitSize), // A-H approximately
	sponsorEntries.slice(splitSize, splitSize * 2), // I-P approximately
	sponsorEntries.slice(splitSize * 2) // Q-Z approximately
];

console.log(`Split into groups: ${groups[0].length}, ${groups[1].length}, ${groups[2].length}`);

// Determine actual alphabetical boundaries
const boundaries = [
	{
		file: 'sponsors-a-h.json',
		start: groups[0][0][1].primaryName[0].toUpperCase(),
		end: groups[0][groups[0].length - 1][1].primaryName[0].toUpperCase()
	},
	{
		file: 'sponsors-i-p.json',
		start: groups[1][0][1].primaryName[0].toUpperCase(),
		end: groups[1][groups[1].length - 1][1].primaryName[0].toUpperCase()
	},
	{
		file: 'sponsors-q-z.json',
		start: groups[2][0][1].primaryName[0].toUpperCase(),
		end: groups[2][groups[2].length - 1][1].primaryName[0].toUpperCase()
	}
];

console.log('Alphabetical boundaries:');
boundaries.forEach((boundary, index) => {
	console.log(
		`  ${boundary.file}: ${boundary.start}-${boundary.end} (${groups[index].length} companies)`
	);
});

// Create split files
const outputDir = path.join(__dirname, '../data/json');

groups.forEach((group, index) => {
	// Convert array back to object
	const groupSponsors = {};
	group.forEach(([id, sponsor]) => {
		groupSponsors[id] = sponsor;
	});

	// Create file data with metadata
	const fileData = {
		lastUpdated: sponsorsData.lastUpdated,
		version: sponsorsData.version,
		totalSponsors: group.length,
		sourceFile: sponsorsData.sourceFile,
		splitInfo: {
			part: index + 1,
			of: 3,
			range: `${boundaries[index].start}-${boundaries[index].end}`,
			originalTotal: sponsorsData.totalSponsors
		},
		sponsors: groupSponsors
	};

	// Write to file
	const fileName = boundaries[index].file;
	const filePath = path.join(outputDir, fileName);
	fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));

	// Check file size
	const stats = fs.statSync(filePath);
	const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

	console.log(`Created ${fileName}: ${fileSizeMB}MB (${group.length} sponsors)`);

	if (stats.size > 5 * 1024 * 1024) {
		console.warn(`WARNING: ${fileName} is larger than 5MB!`);
	}
});

// Also create a lookup index for fast file determination
const lookupIndex = {
	lastUpdated: sponsorsData.lastUpdated,
	version: sponsorsData.version,
	files: boundaries.map((boundary, index) => ({
		file: boundary.file,
		range: `${boundary.start}-${boundary.end}`,
		count: groups[index].length
	}))
};

const indexPath = path.join(outputDir, 'sponsors-index.json');
fs.writeFileSync(indexPath, JSON.stringify(lookupIndex, null, 2));
console.log('Created sponsors-index.json for file lookup');

console.log('\nSplitting completed successfully!');
console.log('Next steps:');
console.log('1. Verify file sizes are under 5MB');
console.log('2. Test JSON validity of each file');
console.log('3. Update manifest.json and content.js to use split files');
