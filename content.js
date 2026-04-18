/**
 * AgentScan Content Script
 * Displays colored icons next to user mentions indicating replicant status
 * - Green: Organic
 * - Orange: Mixed
 * - Red: Automation
 */

// Cache management
const CACHE_KEY = "agentscan_user_cache";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in ms
const COMMUNITY_FLAGS_CACHE_KEY = "agentscan_community_flags";
const COMMUNITY_FLAGS_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours in ms
const COMMUNITY_FLAGS_URL = "https://raw.githubusercontent.com/MatteoGabriele/agentscan/main/data/verified-automations-list.json";

let processingInProgress = false;
const processedElements = new WeakSet();
let githubToken = null;

// Load GitHub token on init
chrome.storage.local.get(['agentscan_github_token'], (result) => {
  githubToken = result.agentscan_github_token || null;
});

class UserAnalyzer {
  constructor() {
    this.cache = {};
    this.communityFlags = new Set();
    this.initialized = false;
    this.failedUsers = new Set(); // Track users we couldn't fetch
  }

  async init() {
    if (this.initialized) return;
    await this.loadCache();
    await this.loadCommunityFlags();
    this.initialized = true;
  }

  async loadCommunityFlags() {
    return new Promise((resolve) => {
      chrome.storage.local.get([COMMUNITY_FLAGS_CACHE_KEY], (result) => {
        const cached = result[COMMUNITY_FLAGS_CACHE_KEY];
        if (cached && Date.now() - cached.timestamp < COMMUNITY_FLAGS_EXPIRY) {
          this.communityFlags = new Set(cached.usernames || []);
          resolve();
        } else {
          // Fetch from background worker to avoid CORS
          chrome.runtime.sendMessage(
            { action: "fetchCommunityFlags" },
            (response) => {
              if (response && response.success && response.usernames) {
                this.communityFlags = new Set(response.usernames);
                chrome.storage.local.set({
                  [COMMUNITY_FLAGS_CACHE_KEY]: {
                    usernames: response.usernames,
                    timestamp: Date.now()
                  }
                });
              }
              resolve();
            }
          );
        }
      });
    });
  }

  async loadCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get([CACHE_KEY], (result) => {
        this.cache = result[CACHE_KEY] || {};
        resolve();
      });
    });
  }

  async saveCache() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [CACHE_KEY]: this.cache }, resolve);
    });
  }

  isCacheValid(entry) {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_EXPIRY;
  }

  async getGitHubUserData(username) {
    // Check if we already know this user doesn't exist
    if (this.failedUsers.has(username)) {
      return null;
    }

    // Check cache first
    if (this.cache[username] && this.isCacheValid(this.cache[username])) {
      return this.cache[username].data;
    }

    try {
      const headers = { "Accept": "application/vnd.github.v3+json" };
      if (githubToken) {
        headers["Authorization"] = `token ${githubToken}`;
      }

      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers
      });

      if (!response.ok) {
        // Cache failures to avoid repeated requests
        // But log 403 as it might indicate rate limiting
        if (response.status === 403) {
          console.warn(`[AgentScan] GitHub API rate limited. Add a token via extension popup to fix this.`);
        }
        this.failedUsers.add(username);
        return null;
      }

      const data = await response.json();
      return {
        created_at: data.created_at,
        public_repos: data.public_repos,
        username: data.login
      };
    } catch (error) {
      this.failedUsers.add(username);
      return null;
    }
  }

  async analyzeUser(username) {
    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user is in community-flagged list (takes precedence)
    if (this.communityFlags.has(normalizedUsername)) {
      return {
        analysis: {
          classification: "automation",
          score: 100,
          flaggedByCommunity: true,
          profile: { age: 0, repos: 0 }
        },
        eventsCount: 0
      };
    }

    // Skip if we already know this user doesn't exist
    if (this.failedUsers.has(normalizedUsername)) {
      return null;
    }

    // Check cache first
    if (
      this.cache[normalizedUsername] &&
      this.isCacheValid(this.cache[normalizedUsername])
    ) {
      return this.cache[normalizedUsername].analysis;
    }

    try {
      // Step 1: Get GitHub user data
      const userData = await this.getGitHubUserData(normalizedUsername);
      if (!userData) return null;

      // Step 2: Use background worker to query AgentScan API (avoids CORS issues)
      const analysisData = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "analyzeUser",
            username: normalizedUsername,
            userData: userData
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response.analysis);
            } else {
              reject(new Error(response?.error || "Unknown error"));
            }
          }
        );
      });

      // Cache the result
      this.cache[normalizedUsername] = {
        data: userData,
        analysis: analysisData,
        timestamp: Date.now()
      };
      await this.saveCache();

      return analysisData;
    } catch (error) {
      return null;
    }
  }

  getIconColor(status) {
    if (!status) return "gray";
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes("organic")) return "#22c55e"; // green
    if (lowerStatus.includes("mixed")) return "#f97316"; // orange
    if (lowerStatus.includes("automation")) return "#ef4444"; // red
    return "gray";
  }

  createIcon(analysisResponse, username) {
    const container = document.createElement("span");
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.marginLeft = "4px";
    container.style.cursor = "pointer";
    container.style.verticalAlign = "middle";

    // Extract data from the nested response structure
    const analysisData = analysisResponse.analysis || {};
    const status = analysisData.classification || "unknown";
    const flags = analysisData.flags || null;
    const flaggedByCommunity = analysisData.flaggedByCommunity || false;
    
    const color = this.getIconColor(status);

    // Create SVG shield icon
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", color);
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.verticalAlign = "middle";
    svg.style.display = "flex";
    
    // Simplified tooltip: classification, score, and flags if present
    let tooltipText;
    if (flaggedByCommunity) {
      tooltipText = "Flagged by the community";
    } else if (status.toLowerCase().includes("organic")) {
      tooltipText = "Account is organic";
    } else if (status.toLowerCase().includes("mixed")) {
      tooltipText = "Account has mixed signals";
    } else if (status.toLowerCase().includes("automation")) {
      tooltipText = "Account appears automated";
    } else {
      tooltipText = `Classification: ${status}`;
    }
    
    // Create title element for tooltip
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = tooltipText;
    svg.appendChild(title);
    
    // Shield path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
    svg.appendChild(path);

    container.appendChild(svg);
    return container;
  }
}

const analyzer = new UserAnalyzer();

async function enhanceUserMentions() {
  // Prevent recursive calls
  if (processingInProgress) {
    return;
  }

  processingInProgress = true;

  try {
    await analyzer.init();

    // Target only comment/post author names
    const authorElements = document.querySelectorAll(
      ".comment-header a[data-hovercard-type='user'], " +
      ".timeline-comment-header a[data-hovercard-type='user'], " +
      ".gh-header-title a[data-hovercard-type='user']"
    );

    const processedUsers = new Set();

    for (const element of authorElements) {
      // Skip if already processed
      if (processedElements.has(element)) {
        continue;
      }

      // Extract username
      let username = null;

      if (element.hasAttribute("href")) {
        const href = element.getAttribute("href");
        const match = href.match(/^\/([a-zA-Z0-9-]+)/);
        if (match) {
          username = match[1];
        }
      }

      if (!username || processedUsers.has(username)) {
        continue;
      }

      processedUsers.add(username);
      processedElements.add(element);

      // Only analyze if it looks like a real GitHub username
      if (username.length > 1 && !username.startsWith(".")) {
        const analysis = await analyzer.analyzeUser(username);
        if (analysis) {
          const icon = analyzer.createIcon(analysis, username);
          element.parentNode.insertBefore(icon, element.nextSibling);
        }
      }
    }
  } finally {
    processingInProgress = false;
  }
}

function processCommentBodies() {
  // Find all text nodes containing @mentions
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const mentionPattern = /@([a-zA-Z0-9-]+)/g;
  const textNodes = [];
  const mentionsToAnalyze = new Map(); // username -> [textNode, index, mention]

  let node;
  while ((node = walker.nextNode())) {
    if (mentionPattern.test(node.textContent)) {
      // Skip if already processed
      if (!processedElements.has(node)) {
        textNodes.push(node);
        processedElements.add(node);
        
        // Collect all mentions in this node
        const pattern = /@([a-zA-Z0-9-]+)/g;
        let match;
        while ((match = pattern.exec(node.textContent))) {
          const username = match[1];
          if (!mentionsToAnalyze.has(username)) {
            mentionsToAnalyze.set(username, []);
          }
          mentionsToAnalyze.get(username).push({
            textNode: node,
            index: match.index,
            mention: match[0]
          });
        }
      }
    }
  }

  // Batch analyze all unique users in parallel
  if (mentionsToAnalyze.size > 0) {
    const usernames = Array.from(mentionsToAnalyze.keys());
    Promise.all(
      usernames.map(username => analyzer.analyzeUser(username))
    ).then((results) => {
      // Now process text nodes with all analysis data available
      textNodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        const pattern = /@([a-zA-Z0-9-]+)/g;
        while ((match = pattern.exec(textNode.textContent))) {
          // Add text before mention
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(textNode.textContent.slice(lastIndex, match.index))
            );
          }

          const username = match[1];
          const analysis = mentionsToAnalyze.has(username) ? 
            usernames.indexOf(username) >= 0 ? results[usernames.indexOf(username)] : null 
            : null;

          // Add @mention text
          const mentionSpan = document.createElement("span");
          mentionSpan.textContent = `@${username}`;
          mentionSpan.style.fontWeight = "500";
          fragment.appendChild(mentionSpan);

          // Add icon if analysis available
          if (analysis) {
            const icon = analyzer.createIcon(analysis, username);
            fragment.appendChild(icon);
          }

          lastIndex = pattern.lastIndex;
        }

        // Add remaining text
        if (lastIndex < textNode.textContent.length) {
          fragment.appendChild(
            document.createTextNode(textNode.textContent.slice(lastIndex))
          );
        }

        if (fragment.hasChildNodes()) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    });
  }
}

// Initialize and run
window.addEventListener("load", () => {
  enhanceUserMentions();
});

// Monitor for dynamic content loads (SPA navigation) with debounce
let debounceTimer;
const observer = new MutationObserver((mutations) => {
  // Skip if already processing or debouncing
  if (processingInProgress) {
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    enhanceUserMentions();
  }, 2000); // Increased debounce to 2 seconds to prevent thrashing
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
