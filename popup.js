document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('linkedin.com')) {
    document.getElementById('summary').textContent = 'Please visit LinkedIn to use this extension.';
    return;
  }

  // Send message to content script to get jobs info
  chrome.tabs.sendMessage(tab.id, { action: "getJobsInfo" }, response => {
    if (chrome.runtime.lastError) {
      document.getElementById('summary').textContent = 'Unable to check companies. Please refresh the page.';
      return;
    }

    if (response && response.jobs) {
      const sponsorJobs = response.jobs.filter(job => job.isSponsor);
      
      // Update summary
      document.getElementById('summary').textContent = 
        `Found ${sponsorJobs.length} out of ${response.jobs.length} companies with visa sponsorship`;

      // Update company list
      const companyListElement = document.getElementById('company-list');
      response.jobs.forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.className = `job-item ${job.isSponsor ? 'sponsor' : 'not-sponsor'}`;
        jobElement.innerHTML = `
          <div class="company-name">${job.companyName}</div>
          <div class="job-title">${job.jobTitle}</div>
        `;
        
        // Add click handler to scroll to job
        jobElement.addEventListener('click', () => {
          // Send message to content script to scroll to the job
          chrome.tabs.sendMessage(tab.id, {
            action: "scrollToJob",
            jobData: job
          });
          // Optionally close the popup
          window.close();
        });
        
        companyListElement.appendChild(jobElement);
      });
    }
  });
}); 