console.log('Content script loaded');

// Update the recognizedSponsors map with Oracle and ensure proper variations
const recognizedSponsors = new Map([
  ['asml', ['ASML', 'ASML Holding N.V.', 'ASML Netherlands B.V.', 'ASML Trading B.V.']],
  ['adyen', ['Adyen N.V.']],
  ['booking', ['Booking.com B.V.']],
  ['ing', ['ING Bank N.V.']],
  ['philips', ['Philips Electronics Nederland B.V.', 'Philips', 'Philips Medical Systems Nederland B.V.']],
  ['shell', ['Shell International B.V.', 'Shell Nederland B.V.']],
  ['unilever', ['Unilever Nederland B.V.']],
  ['ahold', ['Ahold Delhaize', 'Ahold Delhaize GSO B.V.']],
  ['albert heijn', ['Albert Heijn B.V.']],
  ['abn amro', ['ABN AMRO Bank N.V.']],
  ['kpmg', ['KPMG N.V.', 'KPMG Advisory N.V.']],
  ['pwc', ['PricewaterhouseCoopers', 'PwC Advisory N.V.']],
  ['deloitte', ['Deloitte Consulting B.V.', 'Deloitte']],
  ['microsoft', ['Microsoft Corporation', 'Microsoft B.V.']],
  ['google', ['Google Netherlands B.V.', 'Google']],
  ['amazon', ['Amazon Development Center', 'Amazon Netherlands B.V.']],
  ['uber', ['Uber Netherlands B.V.', 'Uber B.V.']],
  ['netflix', ['Netflix International B.V.']],
  ['meta', ['Meta', 'Facebook Netherlands B.V.']],
  ['apple', ['Apple Benelux B.V.']],
  ['intel', ['Intel Corporation']],
  ['nvidia', ['Nvidia B.V.']],
  ['cisco', ['Cisco Systems International B.V.']],
  ['ibm', ['IBM Nederland B.V.']],
  ['capgemini', ['Capgemini Nederland B.V.']],
  ['accenture', ['Accenture B.V.']],
  ['tcs', ['Tata Consultancy Services Netherlands B.V.']],
  ['infosys', ['Infosys Limited']],
  ['tomtom', ['TomTom International B.V.']],
  ['heineken', ['Heineken International B.V.']],
  ['klm', ['KLM Royal Dutch Airlines']],
  ['oracle', ['Oracle Nederland B.V.', 'Oracle Corporation', 'Oracle', 'Oracle Netherlands']]
]);

function cleanCompanyName(name) {
  if (!name) return '';
  
  const cleaned = name.toLowerCase()
    .replace(/b\.v\.|n\.v\.|inc\.|corp\.|corporation|ltd\.|holding|netherlands|trading|group|international/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log(`Cleaning company name: "${name}" -> "${cleaned}"`);
  return cleaned;
}

function checkIfSponsor(companyName) {
  if (!companyName) return false;
  
  const cleanName = cleanCompanyName(companyName);
  const originalName = companyName.trim();

  // Debug log
  console.log(`Checking company: "${originalName}" (cleaned: "${cleanName}")`);

  for (const [baseName, variations] of recognizedSponsors) {
    // Check exact matches first (case insensitive)
    if (variations.some(variant => 
      variant.toLowerCase() === originalName.toLowerCase() ||
      originalName.toLowerCase().includes(variant.toLowerCase())
    )) {
      console.log(`Match found: "${originalName}" matches a variation of "${baseName}"`);
      return true;
    }

    // Check cleaned name matches - but only if it's a whole word match
    const cleanBaseName = cleanCompanyName(baseName);
    const cleanNameWords = cleanName.split(' ');
    const baseNameWords = cleanBaseName.split(' ');
    
    // Only consider it a match if all base name words are found as complete words
    const isFullMatch = baseNameWords.every(baseWord => 
      cleanNameWords.some(word => word === baseWord)
    );

    if (isFullMatch) {
      console.log(`Clean match found: "${cleanName}" matches base name "${baseName}"`);
      return true;
    }

    // Check variations with cleaned names - using whole word matching
    const matchedVariation = variations.some(variant => {
      const cleanVariant = cleanCompanyName(variant);
      const variantWords = cleanVariant.split(' ');
      return variantWords.every(variantWord => 
        cleanNameWords.some(word => word === variantWord)
      );
    });

    if (matchedVariation) {
      console.log(`Variation match found for "${cleanName}" under "${baseName}"`);
      return true;
    }
  }

  console.log(`No match found for: "${originalName}"`);
  return false;
}

function addSponsorshipBadge(element, isSponsor) {
  if (element.querySelector('.sponsor-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'sponsor-badge';
  badge.style.cssText = `
    display: inline-block;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  `;
  
  if (isSponsor) {
    badge.style.backgroundColor = '#e6f3ea';
    badge.style.color = '#0a7227';
    badge.textContent = '✓ Recognized Sponsor';
  } else {
    badge.style.backgroundColor = '#fce8e8';
    badge.style.color = '#b91c1c';
    badge.textContent = '✗ Not a Recognized Sponsor';
  }
  
  element.appendChild(badge);
}

function processPage() {
  console.log('Processing page');

  const companySelectors = [
    '.org-top-card-summary__title',
    '.jobs-company__name',
    '.job-card-container__company-name',
    '.company-name-text',
    '.job-card-container__primary-description',
  ];

  companySelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`Found ${elements.length} elements for selector: ${selector}`);
    
    elements.forEach(element => {
      const companyName = element.textContent.trim();
      console.log('Found company:', companyName);
      const isSponsor = checkIfSponsor(companyName);
      addSponsorshipBadge(element, isSponsor);
    });
  });
}

// Update the getAllJobsOnPage function to focus on jobIds
function getAllJobsOnPage() {
  const jobs = [];
  
  const jobCards = document.querySelectorAll([
    '.job-card-container',
    '.jobs-search-results__list-item',
    '[data-job-id]',
    '.jobs-search-result-item'
  ].join(', '));
  
  console.log('Found job cards:', jobCards.length);

  jobCards.forEach(card => {
    const jobId = card.getAttribute('data-job-id') || 
                 card.getAttribute('data-occludable-job-id');
    
    const jobLink = card.querySelector('a[href*="/jobs/view/"]');
    const urlJobId = jobLink?.href.match(/\/view\/(\d+)/)?.[1];
    
    const finalJobId = jobId || urlJobId;

    const companyElement = card.querySelector([
      '.job-card-container__company-name',
      '.job-card-container__primary-description',
      '.company-name',
      '[data-tracking-control-name="public_jobs_company_name"]'
    ].join(', '));
    
    const titleElement = card.querySelector([
      '.job-card-container__link',
      '.job-card-list__title',
      '.jobs-unified-top-card__job-title',
      '[data-tracking-control-name="public_jobs_jserp_job_link"]'
    ].join(', '));

    // Add employment type selector
    const employmentTypeElement = card.querySelector([
      '.job-card-container__metadata-wrapper',
      '.job-card-container__metadata-item',
      '.job-search-card__metadata-wrapper span',
      '[data-tracking-control-name="public_jobs_jserp_job_type"]'
    ].join(', '));

    if (companyElement && titleElement && finalJobId) {
      const fullCompanyName = companyElement.textContent.trim();
      const companyName = fullCompanyName.split('·')[0].trim();
      const jobTitle = titleElement.textContent.trim();
      const employmentType = employmentTypeElement ? employmentTypeElement.textContent.trim() : '';
      
      jobs.push({
        companyName: fullCompanyName,
        cleanCompanyName: companyName,
        jobTitle,
        employmentType,
        jobId: finalJobId,
        jobUrl: jobLink?.href || `https://www.linkedin.com/jobs/view/${finalJobId}/`,
        isSponsor: checkIfSponsor(companyName)
      });
      
      console.log('Added job:', {
        company: companyName,
        id: finalJobId,
        title: jobTitle,
        type: employmentType
      });
    }
  });

  return jobs;
}

// Update the message listener for scrollToJob
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrollToJob") {
    const { jobData } = request;
    console.log('Requested job data:', jobData);

    // Extract jobId from the URL if it's provided
    let targetJobId = jobData.jobId;
    if (!targetJobId && jobData.url) {
      targetJobId = jobData.url.match(/\/view\/(\d+)/)?.[1];
    }

    if (targetJobId) {
      console.log('Target job ID:', targetJobId);

      // Update the URL with the new job ID
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('currentJobId', targetJobId);
      
      // Use replaceState to update URL without navigation
      window.history.replaceState({}, '', currentUrl.toString());

      // Find the job card using the ID
      const selectors = [
        `[data-job-id="${targetJobId}"]`,
        `[data-occludable-job-id="${targetJobId}"]`,
        `a[href*="/jobs/view/${targetJobId}"]`
      ];

      let jobElement = null;
      for (const selector of selectors) {
        jobElement = document.querySelector(selector);
        if (jobElement) {
          if (!jobElement.tagName.toLowerCase() === 'a') {
            jobElement = jobElement.closest('.job-card-container') || jobElement;
          }
          break;
        }
      }

      if (jobElement) {
        console.log('Found job element:', jobElement);

        // Scroll the element into view
        jobElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the element
        const highlightElement = jobElement.closest('.job-card-container') || jobElement;
        highlightElement.style.backgroundColor = '#f0f7ff';
        highlightElement.style.transition = 'background-color 0.5s';

        // Find and click the job link
        const clickableElement = jobElement.tagName.toLowerCase() === 'a' ? 
                               jobElement : 
                               jobElement.querySelector('a[href*="/jobs/view/"]');

        if (clickableElement) {
          console.log('Clicking element:', clickableElement);
          clickableElement.click();
        }

        // Remove highlight after delay
        setTimeout(() => {
          highlightElement.style.backgroundColor = '';
        }, 2000);
      } else {
        console.log('Job element not found');
      }
    } else {
      console.log('No job ID found');
    }

    return true;
  }

  if (request.action === "getJobsInfo") {
    const jobs = [];
    
    // Expanded list of selectors for job cards
    const jobCardSelectors = [
      '.job-card-container',
      '.jobs-search-results__list-item',
      '.jobs-job-board-list__item',
      '.job-card-list__entity-lockup',
      '.jobs-search-results-grid__card-item'
    ];
    
    // Try each selector
    let jobCards = [];
    jobCardSelectors.forEach(selector => {
      const cards = document.querySelectorAll(selector);
      console.log(`Selector ${selector} found ${cards.length} cards`);
      if (cards.length > 0) {
        jobCards = cards;
      }
    });

    console.log('Total job cards found:', jobCards.length);

    jobCards.forEach(card => {
      // Expanded list of selectors for company names
      const companySelectors = [
        '.job-card-container__company-name',
        '.job-card-container__primary-description',
        '.company-name',
        '.job-card-list__company-name',
        '.artdeco-entity-lockup__subtitle',
        '.job-card-container__company-link'
      ];

      // Expanded list of selectors for job titles
      const titleSelectors = [
        '.job-card-container__link',
        '.job-card-list__title',
        '.jobs-unified-top-card__job-title',
        '.artdeco-entity-lockup__title',
        '.job-card-list__entity-lockup a'
      ];

      let companyElement = null;
      let titleElement = null;

      // Try each company selector
      for (const selector of companySelectors) {
        companyElement = card.querySelector(selector);
        if (companyElement) {
          console.log(`Found company with selector: ${selector}`);
          break;
        }
      }

      // Try each title selector
      for (const selector of titleSelectors) {
        titleElement = card.querySelector(selector);
        if (titleElement) {
          console.log(`Found title with selector: ${selector}`);
          break;
        }
      }

      if (companyElement && titleElement) {
        const fullCompanyName = companyElement.textContent.trim();
        const companyName = fullCompanyName.split('·')[0].trim();
        const jobTitle = titleElement.textContent.trim();
        const url = titleElement.href || window.location.href;
        
        console.log('Found job:', { 
          companyName, 
          jobTitle,
          cleanedName: cleanCompanyName(companyName),
          isSponsor: checkIfSponsor(companyName)
        });
        
        jobs.push({
          companyName,
          jobTitle,
          isSponsor: checkIfSponsor(companyName),
          url
        });
      } else {
        console.log('Missing elements:', {
          hasCompany: !!companyElement,
          hasTitle: !!titleElement
        });
      }
    });

    console.log('Sending response with jobs:', jobs.length);
    sendResponse({ jobs });
    return true;
  }

  if (request.action === "getCompanyInfo") {
    const selectors = [
      '.org-top-card-summary__title',
      '.jobs-company__name',
      '.job-card-container__company-name',
      '.company-name-text',
      '.job-card-container__primary-description'
    ];
    
    let companyName = null;
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        companyName = element.textContent.trim();
        break;
      }
    }

    if (companyName) {
      sendResponse({
        companyName,
        isSponsor: checkIfSponsor(companyName)
      });
    } else {
      sendResponse({ error: 'Company name not found' });
    }
    return true;
  }
});

// First, inject our CSS but with specific classes
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .visa-sponsor-background {
      background-color: rgb(230 243 234) !important;
      transition: background-color 0.5s !important;
    }
  `;
  document.head.appendChild(style);
}

async function styleJobCardsWithSponsorship() {
  // Target both the container and the list item
  const jobCards = document.querySelectorAll('[data-job-id]');
  console.log('Found job cards:', jobCards.length);
  
  for (const card of jobCards) {
    // Get company name from multiple possible selectors
    const companyElement = card.querySelector([
      '.job-card-container__company-name',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__primary-description',
      '.company-name',
      '[data-tracking-control-name="public_jobs_company_name"]'
    ].join(', '));

    if (!companyElement) continue;

    const fullCompanyName = companyElement.textContent;
    const companyName = fullCompanyName.split('·')[0].trim();
    
    console.log('Checking company:', companyName);
    
    const isSponsor = await checkIfSponsor(companyName);
    console.log('Is sponsor:', isSponsor, 'for', companyName);

    if (isSponsor) {
      // Apply to all possible elements that need the background
      const elementsToStyle = [
        card,
        card.closest('.job-card-container'),
        card.closest('.jobs-search-results__list-item'),
        card.querySelector('.job-card-list__entity-lockup'),
        card.querySelector('.artdeco-entity-lockup')
      ].filter(Boolean);

      elementsToStyle.forEach(element => {
        element.classList.add('visa-sponsor-background');
        console.log('Added style to element for', companyName);
      });
    }
  }
}

// Inject styles immediately
injectStyles();

// Initial styling
styleJobCardsWithSponsorship();

// Observer setup
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      styleJobCardsWithSponsorship();
      break;
    }
  }
});

// Start observing with a more specific target
const jobListContainer = document.querySelector('.jobs-search-results__list');
if (jobListContainer) {
  observer.observe(jobListContainer, {
    childList: true,
    subtree: true
  });
}

// Also observe body for dynamic loading
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// URL change detection
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed, reprocessing...');
    setTimeout(processPage, 1000);
  }
}).observe(document.body, { subtree: true, childList: true });

// Add sponsors.json to manifest.json 