// Secure DOM helper functions to replace innerHTML usage

/**
 * Create welcome message using secure DOM APIs
 * @param {HTMLElement} summaryElement - The summary container element
 */
function createWelcomeMessage(summaryElement) {
	// Clear existing content
	summaryElement.textContent = '';

	const jobSites = [
		{ name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/collections/' },
		{ name: 'Indeed', url: 'https://www.indeed.com' }
	];

	// Create welcome text
	const welcomeText = document.createTextNode('Welcome to the KMatch extension.');
	summaryElement.appendChild(welcomeText);

	// Add line breaks
	summaryElement.appendChild(document.createElement('br'));
	summaryElement.appendChild(document.createElement('br'));

	// Add "To use the extension, please visit" text
	const instructionText = document.createTextNode('To use the extension, please visit ');
	summaryElement.appendChild(instructionText);

	// Create job site links
	jobSites.forEach((site, index) => {
		const link = document.createElement('a');
		link.href = site.url;
		link.target = '_blank';
		link.textContent = site.name;
		summaryElement.appendChild(link);

		if (index < jobSites.length - 1) {
			summaryElement.appendChild(document.createTextNode(' or '));
		}
	});

	// Add line breaks before sponsor list
	summaryElement.appendChild(document.createElement('br'));
	summaryElement.appendChild(document.createElement('br'));

	// Add sponsor list text and link
	const sponsorText = document.createTextNode('Complete sponsor list:');
	summaryElement.appendChild(sponsorText);
	summaryElement.appendChild(document.createElement('br'));
	summaryElement.appendChild(document.createTextNode(' '));

	const sponsorLink = document.createElement('a');
	sponsorLink.href =
		'https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants';
	sponsorLink.target = '_blank';
	sponsorLink.textContent = sponsorLink.href;
	summaryElement.appendChild(sponsorLink);
}

/**
 * Create job summary using secure DOM APIs
 * @param {number} sponsorJobsCount - Number of sponsor jobs found
 * @param {number} totalJobsCount - Total number of jobs found
 */
function createJobSummary(sponsorJobsCount, totalJobsCount) {
	const summaryElement = document.getElementById('summary');
	summaryElement.textContent = '';

	const summaryText = document.createTextNode(
		`Found ${sponsorJobsCount} out of ${totalJobsCount} jobs with visa sponsorship.`
	);
	summaryElement.appendChild(summaryText);
	summaryElement.appendChild(document.createElement('br'));

	const scrollText = document.createTextNode('Scroll down the webpage to see more.');
	summaryElement.appendChild(scrollText);
}

/**
 * Create job element using secure DOM APIs
 * @param {Object} job - Job data object
 * @param {string} roleType - Cleaned job title
 * @param {string} cleanCompanyName - Cleaned company name
 * @returns {HTMLElement} The created job element
 */
function createJobElement(job, roleType, cleanCompanyName) {
	const jobElement = document.createElement('div');
	jobElement.className = `job-item ${job.isSponsor ? 'sponsor' : 'not-sponsor'}`;
	jobElement.style.position = 'relative';

	// Create job header div
	const jobHeader = document.createElement('div');
	jobHeader.className = 'job-header';

	// Create company info div with flex layout
	const companyInfo = document.createElement('div');
	companyInfo.className = 'company-info';
	companyInfo.style.cssText =
		'display: flex; justify-content: space-between; align-items: center;';

	// Create job title div
	const jobTitle = document.createElement('div');
	jobTitle.className = 'job-title';
	jobTitle.style.cssText = `color: ${job.isSponsor ? '#000' : '#666'}; font-weight: 700; font-size: 14px;`;
	jobTitle.textContent = roleType;

	// Create badges container
	const badgesContainer = document.createElement('div');
	badgesContainer.style.cssText = 'display: flex; gap: 4px;';

	// Add KM badge if sponsor
	if (job.isSponsor) {
		const kmBadge = document.createElement('span');
		kmBadge.style.cssText =
			'background-color: #0a66c2; color: white; padding: 1px 3px; border-radius: 2px; vertical-align: top; position: relative; top: 0px; border: 1px solid #0a66c2; font-weight: bold; font-size: 9px;';
		kmBadge.textContent = 'KM';
		badgesContainer.appendChild(kmBadge);
	}

	// Add EN badge if English
	if (job.isEnglish) {
		const enBadge = document.createElement('span');
		enBadge.style.cssText =
			'background-color: white; color: #0a66c2; padding: 1px 3px; border-radius: 2px; vertical-align: top; position: relative; top: 0px; border: 1px solid #0a66c2; font-weight: bold; font-size: 9px;';
		enBadge.textContent = 'EN';
		badgesContainer.appendChild(enBadge);
	}

	// Assemble company info
	companyInfo.appendChild(jobTitle);
	companyInfo.appendChild(badgesContainer);
	jobHeader.appendChild(companyInfo);

	// Create company name div
	const companyNameDiv = document.createElement('div');
	companyNameDiv.style.cssText = `color: ${job.isSponsor ? '#000' : '#666'}; font-size: 13px; margin-top: 4px;`;
	companyNameDiv.textContent = cleanCompanyName;

	// Assemble job element
	jobElement.appendChild(jobHeader);
	jobElement.appendChild(companyNameDiv);

	return jobElement;
}

// Helper function to remove duplicated text
function removeDuplicateText(text) {
	if (!text) {
		return '';
	}

	// First clean the text
	const cleanText = text
		.trim()
		.replace(/\s+/g, ' ') // Replace multiple spaces with single space
		.replace(/\([^)]*\)/g, '') // Remove content in parentheses
		.replace(/·.*$/, '') // Remove everything after ·
		.replace(/,.*$/, '') // Remove everything after comma
		.replace(/EN/g, '') // Remove 'EN' from the text
		.replace(/KM/g, '') // Remove 'KM' from the text
		.replace(/with verification/g, '') // Remove 'with verification'
		.trim();

	// Split into words and remove duplicates
	const words = cleanText.split(' ');
	const uniqueWords = [...new Set(words)];

	// If we removed duplicates, use the unique words
	if (uniqueWords.length < words.length) {
		return uniqueWords.join(' ');
	}

	// If no word-level duplicates, check for repeated phrases
	const halfLength = Math.floor(words.length / 2);
	const firstHalf = words.slice(0, halfLength).join(' ').toLowerCase();
	const secondHalf = words.slice(halfLength).join(' ').toLowerCase();

	if (firstHalf === secondHalf) {
		return words.slice(0, halfLength).join(' ');
	}

	return cleanText;
}

// Function to perform language detection
function performLanguageDetection(text) {
	// Your language detection logic here
	// For example, return a dummy language based on the text length
	return text.length > 50 ? 'English' : 'Unknown'; // Simplified example
}

// Function to perform initial language detection on job titles
function detectLanguageFromTitles(jobs) {
	jobs.forEach(job => {
		const title = job.jobTitle; // Assuming job has a jobTitle property
		const detectedLanguage = performLanguageDetection(title); // Your language detection logic
		console.log(`Detected language for title "${title}": ${detectedLanguage}`);
	});
}

// Placeholder function to fetch job description
function fetchJobDescription(url) {
	return new Promise((resolve, _reject) => {
		// Simulate an asynchronous fetch operation
		setTimeout(() => {
			// Replace this with actual fetching logic
			const fetchedDescription = 'Sample job description for ' + url; // Simulated description
			resolve(fetchedDescription);
		}, 1000);
	});
}

// Function to handle job card click
function handleJobClick(job, descriptionCache) {
	const jobUrl = job.url; // Assuming job.url contains the job's URL

	// Check if the description is already cached
	if (descriptionCache.has(jobUrl)) {
		const cachedDescription = descriptionCache.get(jobUrl);
		const detectedLanguage = performLanguageDetection(cachedDescription); // Use the cached description
		console.log(`Detected language for cached description: ${detectedLanguage}`);
	} else {
		// Fetch the job description (this is a placeholder for your actual fetching logic)
		fetchJobDescription(jobUrl).then(description => {
			// Store the fetched description in the cache
			descriptionCache.set(jobUrl, description);
			const detectedLanguage = performLanguageDetection(description); // Use the newly fetched description
			console.log(`Detected language for newly fetched description: ${detectedLanguage}`);
		});
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	try {
		// Query tabs in a more specific way
		const tabs = await browser.tabs.query({
			active: true,
			lastFocusedWindow: true,
			currentWindow: true
		});

		// Safety check
		if (!tabs || tabs.length === 0) {
			document.getElementById('summary').textContent = 'Unable to access current tab';
			return;
		}

		const tab = tabs[0];

		// Update URL check for both LinkedIn and Indeed
		if (!tab.url || !(tab.url.includes('linkedin.com') || tab.url.includes('indeed.com'))) {
			const summaryElement = document.getElementById('summary');

			// Create welcome message using secure DOM APIs
			createWelcomeMessage(summaryElement);
			return;
		}

		// Safety check for URL
		if (!tab?.url) {
			document.getElementById('summary').textContent = 'Unable to access tab URL';
			return;
		}

		// Cache object to store job descriptions
		const descriptionCache = new Map();

		// Example job data (this would typically come from your job fetching logic)
		const jobs = [
			{ jobTitle: 'Software Engineer', url: 'https://example.com/job/12345' },
			{ jobTitle: 'Data Scientist', url: 'https://example.com/job/67890' }
		];

		// Initial language detection on page load
		detectLanguageFromTitles(jobs);

		// Simulate a job card click
		handleJobClick(jobs[0], descriptionCache); // Click on the first job

		try {
			const response = await browser.tabs.sendMessage(tab.id, { action: 'getJobsInfo' });
			if (response && response.jobs) {
				const sponsorJobs = response.jobs.filter(job => job.isSponsor);

				// Create job summary using secure DOM APIs
				createJobSummary(sponsorJobs.length, response.jobs.length);

				const companyListElement = document.getElementById('company-list');
				response.jobs.forEach((job, _index) => {
					// Clean up company name
					const cleanCompanyName = job.companyName
						.split('·')[0]
						.replace(/\([^)]*\)/g, '')
						.replace(/\s*·.*$/, '')
						.replace(/\s+Area.*$/, '')
						.replace(/,.*$/, '')
						.trim();

					// Clean up job title
					const roleType = removeDuplicateText(job.jobTitle || '');

					// Create job element using secure DOM APIs
					const jobElement = createJobElement(job, roleType, cleanCompanyName);

					jobElement.addEventListener('click', async () => {
						// Get the job URL from the job object
						const jobUrl = job.url;
						const isIndeed = jobUrl.includes('indeed.com');

						console.log('Clicking job:', {
							title: roleType,
							url: jobUrl,
							platform: isIndeed ? 'indeed' : 'linkedin'
						});

						try {
							await browser.tabs.sendMessage(tab.id, {
								action: 'scrollToJob',
								url: jobUrl,
								title: roleType,
								platform: isIndeed ? 'indeed' : 'linkedin'
							});
						} catch (error) {
							console.error('Error sending scroll message:', error);
						}
					});

					companyListElement.appendChild(jobElement);
				});
			}
		} catch (error) {
			console.error('Error getting jobs info:', error);
			document.getElementById('summary').textContent =
				'Unable to check companies. Please refresh the page.';
		}
	} catch (error) {
		console.error('Error initializing popup:', error);
		document.getElementById('summary').textContent = 'An unexpected error occurred.';
	}
});
