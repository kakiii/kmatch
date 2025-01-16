# KMatch - Dutch Sponsor Job Finder

A [Chrome extension](https://chromewebstore.google.com/detail/kmatch-dutch-sponsor-job/jlchmhdkonkhmllpdcjomhboiednalmf) that helps you quickly identify recognized sponsors for highly skilled migrant visas while browsing LinkedIn and Indeed jobs in the Netherlands.

## Features

- 🔍 Automatically scans LinkedIn and Indeed job listings
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

1. Visit LinkedIn and Indeed's job section
2. Browse job listings as normal
3. Look for highlighted jobs with:
   - "KM" badge: Company is a recognized sponsor
   - "EN" badge: Job posting is in English
4. Click on any job in the extension popup to view details

## Privacy Policy

### Data Collection and Usage

#### What We Collect
- **Job Listings**: We scan visible job postings on LinkedIn and Indeed pages you visit
- **Company Names**: We process company names to check against our sponsor database
- **Job Titles**: We analyze job titles for language detection
- **URLs**: We store LinkedIn and Indeed job posting URLs temporarily for functionality

#### What We Don't Collect
- Personal information
- Login credentials
- Browser history
- Any data outside of LinkedIn and Indeed
- Communication data
- Payment information

### Data Storage

- All processing happens locally on your device
- No data is sent to external servers
- Sponsor list is stored locally and updated via Chrome Web Store updates
- Temporary data is cleared when you close LinkedIn and Indeed

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

We welcome contributions to make KMatch better! Here's how you can help:

### Feature Improvements
Found a bug or have a feature idea? Check out `content.js` and submit a PR or open an issue.

### UI Enhancements
Want to improve the popup interface? Take a look at `popup.js` and show us your ideas.

### Dataset Accuracy
Notice missing sponsors or incorrect data? Help us maintain `sponsor.json` by submitting updates.

To contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Found it helpful?
- Please share with fellow job seekers 🔗
- Leave a [review](https://chromewebstore.google.com/detail/kmatch-dutch-sponsor-job/jlchmhdkonkhmllpdcjomhboiednalmf)!🌟🌟🌟🌟🌟
- [Buy me a coffee](https://buymeacoffee.com/ash.develope?new=1) for future development ☕️

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Data source: IND's public register of recognized sponsors. You can find the complete list at [https://ind.nl/en/public-register-recognised-sponsors](https://ind.nl/en/public-register-recognised-sponsors/public-register-regular-labour-and-highly-skilled-migrants)
- Built with Chrome Extensions Manifest V3
- Uses LinkedIn and Indeed's public job listings interface
