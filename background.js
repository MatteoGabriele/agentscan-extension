/**
 * AgentScan Background Service Worker
 * Handles storage and makes cross-origin API requests
 */

// Listen for any extension installation/update to clear old cache if needed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[AgentScan] Extension installed");
  } else if (details.reason === "update") {
    console.log("[AgentScan] Extension updated");
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearCache") {
    chrome.storage.local.remove("agentscan_user_cache", () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === "analyzeUser") {
    // Make the AgentScan API call from the background worker
    analyzeUserViaAPI(request.username, request.userData)
      .then((analysis) => {
        sendResponse({ success: true, analysis });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === "fetchCommunityFlags") {
    // Fetch the community-flagged accounts list
    fetchCommunityFlags()
      .then((usernames) => {
        sendResponse({ success: true, usernames });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

async function analyzeUserViaAPI(username, userData) {
  const params = new URLSearchParams({
    created_at: userData.created_at,
    repos_count: userData.public_repos,
    pages: "2"
  });

  const response = await fetch(
    `https://agentscan.netlify.app/api/identify-replicant/${username}?${params}`
  );

  if (!response.ok) {
    throw new Error(`AgentScan API error: ${response.status}`);
  }

  return await response.json();
}

async function fetchCommunityFlags() {
  const response = await fetch(
    "https://raw.githubusercontent.com/MatteoGabriele/agentscan/main/data/verified-automations-list.json"
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch community flags: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle both array and object formats
  let usernames = [];
  if (Array.isArray(data)) {
    usernames = data.map(item => (typeof item === "string" ? item : item.username).toLowerCase());
  } else if (typeof data === "object") {
    usernames = Object.keys(data).map(key => key.toLowerCase());
  }
  
  return usernames;
}
