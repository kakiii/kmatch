# KMatch - LinkedIn Job Sponsor Checker

A Chrome extension that helps you quickly identify recognized sponsors for highly skilled migrant visas while browsing LinkedIn jobs in the Netherlands.

## Features

- 🔍 Automatically scans LinkedIn job listings
- ✨ Highlights jobs from recognized sponsors
- 🔄 Maintains an up-to-date database
- 🏢 Shows company sponsorship status in real-time
- 📱 Easy-to-use popup interface
- 🌐 Detects English language job title

## Installation

1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. The extension will automatically activate when you visit LinkedIn

## How to Use

1. Visit LinkedIn's job section
2. Browse job listings as normal
3. Look for highlighted jobs with:
   - "KM" badge: Company is a recognized sponsor
   - "EN" badge: Job posting is in English
4. Click on any job in the extension popup to view details

## Privacy Policy

### Data Collection and Usage

#### What We Collect
- **Job Listings**: We scan visible job postings on LinkedIn pages you visit
- **Company Names**: We process company names to check against our sponsor database
- **Job Titles**: We analyze job titles for language detection
- **URLs**: We store LinkedIn job posting URLs temporarily for functionality

#### What We Don't Collect
- Personal information
- Login credentials
- Browser history
- Any data outside of LinkedIn
- Communication data
- Payment information

### Data Storage

- All processing happens locally on your device
- No data is sent to external servers
- Sponsor list is stored locally and updated via Chrome Web Store updates
- Temporary data is cleared when you close LinkedIn

### Third-Party Access

- We don't share any data with third parties
- We don't use analytics services
- We don't use advertising services
- We don't integrate with external APIs

### User Rights

You have the right to:
- Disable the extension at any time
- Clear local storage through Chrome settings

### Technical Security

- All code runs in an isolated environment
- No network requests except for sponsor list updates
- Content script isolation prevents cross-site scripting
- Regular security updates via Chrome Web Store

### Updates to Privacy Policy

- Latest version always available in this README and the Chrome Web Store listing
- Changes effective upon new version installation

### Contact

For privacy concerns or questions:
- [Open an issue](https://github.com/AshZLee/KMatch/issues) on our GitHub repository
- Email: ash.develope@gmail.com

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Data source: IND's public register of recognized sponsors. You can find the complete list at: https://ind.nl/en/public-register-recognised-sponsors
- Built with Chrome Extensions Manifest V3
- Uses LinkedIn's public job listings interface
