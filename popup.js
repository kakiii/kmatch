document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('linkedin.com')) {
    document.getElementById('summary').textContent = 'Please visit LinkedIn to use this extension.';
    return;
  }

  // Helper function to remove duplicated text
  function removeDuplicateText(text) {
    if (!text) return '';
    
    // First clean the text
    let cleanText = text.trim()
                       .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
                       .replace(/\([^)]*\)/g, '')   // Remove content in parentheses
                       .replace(/·.*$/, '')         // Remove everything after ·
                       .replace(/,.*$/, '')         // Remove everything after comma
                       .replace(/EN/g, '')          // Remove 'EN' from the text
                       .replace(/with verification/g, '')  // Remove 'with verification'
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

  chrome.tabs.sendMessage(tab.id, { action: "getJobsInfo" }, response => {
    if (chrome.runtime.lastError) {
      document.getElementById('summary').textContent = 'Unable to check companies. Please refresh the page.';
      return;
    }

    if (response && response.jobs) {
      const sponsorJobs = response.jobs.filter(job => job.isSponsor);
      
      document.getElementById('summary').textContent = 
        `Found ${sponsorJobs.length} out of ${response.jobs.length} companies with visa sponsorship`;

      const companyListElement = document.getElementById('company-list');
      response.jobs.forEach((job, index) => {
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
        
        const jobElement = document.createElement('div');
        jobElement.className = `job-item ${job.isSponsor ? 'sponsor' : 'not-sponsor'}`;
        
        jobElement.innerHTML = `
  <div class="job-header">
    <div class="company-info">
      <strong>${cleanCompanyName}</strong>
      ${job.isEnglish ? '<span class="en-badge">EN</span>' : ''}
    </div>
  </div>
  <div class="job-title">
    ${roleType}
  </div>
  <div class="post-info">
    ${job.postTime ? `<span class="post-time">${job.postTime}</span>` : ''}
    ${job.applicants ? `<span class="applicants">${job.applicants}</span>` : ''}
  </div>
`;
        
        jobElement.addEventListener('click', () => {
          // Get the job URL from the job object
          const jobUrl = job.url; // Make sure this is being passed from content.js
          
          console.log('Clicking job:', {
            title: roleType,
            url: jobUrl
          });

          // Send message to content script
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "scrollToJob",
              url: jobUrl,
              title: roleType
            }, () => {
              window.close();
            });
          });
        });
        
        companyListElement.appendChild(jobElement);
      });
    }
  });
});