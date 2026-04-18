# AgentScan Extension

Automatically display colored replicant indicators next to user mentions on GitHub PRs and Issues. Quickly identify if contributors are **organic** (green), **mixed** (orange), or **automation** (red) accounts.



## Features

- **Automatic User Analysis**: Scans GitHub Pull Requests and Issues for user mentions
- **Smart Indicators**: Displays a colored dot next to each user's name:
  - 🟢 **Green**: Organic account
  - 🟠 **Orange**: Mixed activity
  - 🔴 **Red**: Automation account
- **Intelligent Caching**: Reduces API calls by caching analysis results for 24 hours
- **Real-time Processing**: Works on dynamically loaded content via GitHub's SPA navigation

## How It Works

1. **User Detection**: Identifies all user mentions in:
   - Comment text and @mentions
   - PR/Issue descriptions
   - Author names
   - GitHub profile links

2. **Data Collection**: For each user, fetches:
   - Account creation date from GitHub API
   - Repository count from GitHub API
   
3. **Analysis**: Sends collected data to [AgentScan API](https://agentscan.netlify.app/):
   ```
   GET /api/identify-replicant/{username}?created_at={date}&repos_count={count}&pages=2
   ```

4. **Display**: Shows a colored indicator next to the username with classification details on hover

## Setup

### Getting a GitHub Token (Recommended)

To avoid rate limiting, configure a GitHub Personal Access Token:

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Create a new token with **no scopes** (just click "Generate" at the bottom)
3. Copy the token (format: `ghp_xxx...`)
4. Click the AgentScan extension icon in your browser
5. Paste the token in the popup and click "Save Token"

**Why?** 
- Without token: 60 requests/hour → 403 errors after analyzing ~60 users
- With token: 5,000 requests/hour → No rate limiting for normal use
- Your token stays private in your browser (never sent anywhere except GitHub API)

### Without Token

The extension will still work but will be rate-limited after ~60 API calls per hour. Add a token to avoid this.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. (Optional) Configure your GitHub token via the popup

## Usage

Simply navigate to any GitHub Pull Request or Issue page. The extension will automatically:
- Find all user mentions
- Analyze each user's account
- Display colored indicators

Hover over any indicator to see the user's classification.

## Permissions

The extension requires:
- `https://github.com/*` - to access GitHub content
- `https://api.github.com/*` - to fetch user account data
- `https://agentscan.netlify.app/*` - to analyze account patterns
- `storage` - to cache results locally

## Caching

Analysis results are cached for 24 hours in your browser's local storage. This significantly reduces API calls and improves performance. You can clear the cache through:
- Extension popup (future feature)
- Developer tools console: `chrome.runtime.sendMessage({action: 'clearCache'})`

## Performance Notes

- The extension debounces processing for dynamic content (1 second delay)
- Caching prevents redundant API calls for the same users
- Icons render inline without affecting page layout

## Contributing

Contribute to this repository or the [AgentScan project](https://github.com/MatteoGabriele/agentscan) directly.

## Troubleshooting

### I'm getting 403 errors
You've hit GitHub's unauthenticated rate limit (60 requests/hour). **Add a GitHub token** via the extension popup to increase to 5,000 requests/hour. Simply click the AgentScan icon and paste your token.

### Icons aren't showing
- Check the browser console for errors (F12 → Console)
- Make sure you're on a PR or Issue page
- Try refreshing the page
- The user might be cached as "failed" (wait 24 hours or clear storage)

### Token troubleshooting
- Token must start with `ghp_` (GitHub Personal Access Token)
- Token needs **zero scopes** (no special permissions needed)
- Your token is stored locally and never transmitted except to github.com

## License

See LICENSE file for details
