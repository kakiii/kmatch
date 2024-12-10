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

// Add this at the top with other constants
const jobLanguageCache = new Map();

function cleanCompanyName(name) {
  if (!name) return '';
  
  return name.toLowerCase()
    .replace(/b\.v\.|n\.v\.|inc\.|corp\.|corporation|ltd\.|holding|netherlands|trading|group|international/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkIfSponsor(companyName) {
  if (!companyName) return false;
  
  const cleanName = cleanCompanyName(companyName);
  const originalName = companyName.trim();

  for (const [baseName, variations] of recognizedSponsors) {
    // Check exact matches first (case insensitive)
    if (variations.some(variant => 
      variant.toLowerCase() === originalName.toLowerCase() ||
      originalName.toLowerCase().includes(variant.toLowerCase())
    )) {
      return true;
    }

    // Rest of the function stays the same, just remove console.logs
    const cleanBaseName = cleanCompanyName(baseName);
    const cleanNameWords = cleanName.split(' ');
    const baseNameWords = cleanBaseName.split(' ');
    
    const isFullMatch = baseNameWords.every(baseWord => 
      cleanNameWords.some(word => word === baseWord)
    );

    if (isFullMatch) return true;

    const matchedVariation = variations.some(variant => {
      const cleanVariant = cleanCompanyName(variant);
      const variantWords = cleanVariant.split(' ');
      return variantWords.every(variantWord => 
        cleanNameWords.some(word => word === variantWord)
      );
    });

    if (matchedVariation) return true;
  }

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
  // Process both features immediately
  processSponsors();
  processLanguages();
  
  // And again after a short delay
  setTimeout(() => {
    processSponsors();
    processLanguages();
  }, 500);
}

function processSponsors() {
  console.log('Processing sponsors...');
  const cards = document.querySelectorAll('.job-card-container, [data-job-id], .jobs-search-results__list-item');
  console.log('Found cards:', cards.length);
  
  cards.forEach(card => {
    // Updated company selectors
    const companyElement = card.querySelector([
      '.job-card-container__company-name',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__primary-description',
      '.company-name',
      '.job-card-list__company-name',
      '[data-tracking-control-name="public_jobs_company_name"]'
    ].join(', '));
    
    if (companyElement) {
      const companyName = companyElement.textContent.split('·')[0].trim();
      if (checkIfSponsor(companyName)) {
        card.style.backgroundColor = 'rgb(230 243 234)';
      }
    }
  });
}

function processLanguages() {
  const cards = document.querySelectorAll('.job-card-container, [data-job-id], .jobs-search-results__list-item');
  
  cards.forEach(card => {
    if (card.dataset.processed) return;
    card.dataset.processed = 'true';

    const titleElement = card.querySelector([
      '.job-card-container__link span',
      '.job-card-list__title',
      '.jobs-unified-top-card__job-title',
      '.job-card-list__title-link',
      '[data-tracking-control-name="public_jobs_jserp_job_link"]',
      'a[href*="/jobs/view/"] span',
      'h3.base-search-card__title'
    ].join(', '));

    if (titleElement && !titleElement.querySelector('.language-indicator')) {
      if (isEnglishText(titleElement.textContent)) {
        const badge = document.createElement('span');
        badge.className = 'language-indicator';
        badge.style.cssText = `
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background-color: #0a66c2 !important;
          color: white !important;
          font-size: 11px !important;
          font-weight: bold !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          margin-left: 6px !important;
          vertical-align: middle !important;
          line-height: normal !important;
        `;
        badge.textContent = 'EN';
        titleElement.appendChild(document.createTextNode(' '));
        titleElement.appendChild(badge);
      }
    }
  });
}

// Multiple trigger points
document.addEventListener('DOMContentLoaded', processPage);
window.addEventListener('load', processPage);
document.addEventListener('scroll', () => {
  requestAnimationFrame(processPage);
});

// Observer for dynamic content
let observerTimeout;
const observer = new MutationObserver((mutations) => {
  if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
    if (observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      processPage();
    }, 100);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
});

// Initial call
processPage();

// Process on scroll (debounced)
let scrollTimeout;
document.addEventListener('scroll', () => {
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    processLanguages();
  }, 100);
});

function isEnglishText(text) {
  const dutchWords = [
    // Common Dutch words
    'wij', 'zijn', 'zoeken', 'voor', 'een', 'met', 'het', 'van', 'naar',
    'functie', 'werkzaamheden', 'taken', 'vereisten', 'over', 'ons', 'bij',
    'ervaring', 'kennis', 'werk', 'jaar', 'binnen', 'team', 'als', 'wat',
    'bieden', 'jouw', 'onze', 'deze', 'door', 'wordt', 'bent',
    // Common Dutch job titles and related words
    'medewerker', 'aangiftemedewerker', 'administratief', 'beheerder',
    'adviseur', 'verkoper', 'consultant', 'manager', 'directeur', 'specialist',
    'ondersteuning', 'assistent', 'hoofd', 'leider', 'coordinator', 'stagiair',
    'vacature', 'gezocht', 'gevraagd'
  ];

  // Dutch word patterns and suffixes
  const dutchPatterns = [
    'medewerker',
    'beheerder',
    'adviseur',
    'aangifte',
    'administratie',
    'verkoop',
    'zorg',
    'dienst',
    'kundige'
  ];

  const text_lower = text.toLowerCase();
  
  // Check for Dutch patterns first
  if (dutchPatterns.some(pattern => text_lower.includes(pattern))) {
    return false;
  }

  const words = text_lower.split(/\s+/);
  const dutchWordCount = words.filter(word => dutchWords.includes(word)).length;
  
  // If any Dutch words are found, consider it Dutch
  return dutchWordCount === 0;
}

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