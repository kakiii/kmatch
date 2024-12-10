document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('linkedin.com')) {
      document.getElementById('summary').textContent = 'Please visit LinkedIn to use this extension.';
      return;
    }
  
    // Helper function to remove duplicated text
    function removeDuplicateText(text) {
      if (!text) return '';
      const length = text.length;
      if (length < 10) return text; // Don't process short strings
      
      for (let i = Math.floor(length / 2); i >= 5; i--) {
        const firstHalf = text.slice(0, i);
        const secondHalf = text.slice(i, i * 2);
        if (firstHalf === secondHalf) {
          return firstHalf.trim();
        }
      }
      return text.trim();
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
          // Clean up company name - take only the part before the dot
          const cleanCompanyName = job.companyName
            .split('·')[0]  // Take only the company name before the dot
            .trim();        // Remove any trailing whitespace
  
          // Clean up job title
          const roleType = removeDuplicateText(
            job.jobTitle
              .split('·')[0]              // Take first part before any dot
              .replace(/\([^)]*\)/g, '')  // Remove anything in parentheses
              .trim()
          );
  
          const jobElement = document.createElement('div');
          jobElement.className = `job-item ${job.isSponsor ? 'sponsor' : 'not-sponsor'}`;
          
          jobElement.innerHTML = `
            <div class="job-header"><strong>${index + 1}. ${cleanCompanyName}</strong></div>
            <div class="job-details">${roleType}</div>
          `;
          
          jobElement.addEventListener('click', () => {
            chrome.tabs.sendMessage(tab.id, {
              action: "scrollToJob",
              jobData: job
            });
            window.close();
          });
          
          companyListElement.appendChild(jobElement);
        });
      }
    });
  });