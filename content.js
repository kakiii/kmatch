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

    // Check cleaned name matches
    const cleanBaseName = cleanCompanyName(baseName);
    if (cleanName === cleanBaseName || cleanName.includes(cleanBaseName) || cleanBaseName.includes(cleanName)) {
      console.log(`Clean match found: "${cleanName}" matches base name "${baseName}"`);
      return true;
    }

    // Check variations with cleaned names
    const matchedVariation = variations.some(variant => {
      const cleanVariant = cleanCompanyName(variant);
      return cleanName === cleanVariant || 
             cleanName.includes(cleanVariant) || 
             cleanVariant.includes(cleanName);
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

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);

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
        const companyName = companyElement.textContent.trim();
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

// Initial check with delay
setTimeout(processPage, 1000);

// Monitor for dynamic content changes
const observer = new MutationObserver((mutations) => {
  const hasRelevantChanges = mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => 
      node.nodeType === 1 && (
        node.matches?.('.jobs-company__name') ||
        node.matches?.('.job-card-container__company-name') ||
        node.matches?.('.org-top-card-summary__title') ||
        node.querySelector?.('.jobs-company__name') ||
        node.querySelector?.('.job-card-container__company-name') ||
        node.querySelector?.('.org-top-card-summary__title')
      )
    );
  });

  if (hasRelevantChanges) {
    console.log('Detected relevant changes, reprocessing...');
    processPage();
  }
});

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