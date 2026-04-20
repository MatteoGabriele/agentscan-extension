import { Octokit } from "octokit";
import { getClassificationDetails, identify, type IdentifyResult } from "@unveil/identity";

// Cache configuration
const CACHE_KEY = "agentscan_analysis_cache";
const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

interface CacheEntry {
  analysis: any;
  timestamp: number;
}

interface AnalysisCache {
  [username: string]: CacheEntry;
}

// Get cached analysis if it exists and is still valid
async function getCachedAnalysis(username: string): Promise<any | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY], (result: any) => {
      const cache: AnalysisCache = result[CACHE_KEY] || {};
      const entry = cache[username.toLowerCase()];

      if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY) {
        console.log(`[AgentScan] Cache hit for ${username}`);
        resolve(entry.analysis);
      } else {
        resolve(null);
      }
    });
  });
}

type AnalysisResponse = {
  analysis: IdentifyResult;
  details: {
    label: string;
    description: string;
  };
  list: string[];
  username: string;
};

// Store analysis result in cache
async function setCachedAnalysis(analysis: AnalysisResponse): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY], (result: any) => {
      const cache: AnalysisCache = result[CACHE_KEY] || {};
      cache[analysis.username.toLowerCase()] = {
        analysis,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ [CACHE_KEY]: cache }, () => {
        console.log(`[AgentScan] Cached analysis for ${analysis.username}`);
        resolve();
      });
    });
  });
}

// Listen for any extension installation/update to clear old cache if needed
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === "install") {
    console.log("[AgentScan] Extension installed");
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (request.action === "clearCache") {
      chrome.storage.local.remove("agentscan_user_cache", () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.action === "analyze") {
      (async () => {
        try {
          // Check cache first
          const cached = await getCachedAnalysis(request.username);
          if (cached) {
            sendResponse({ success: true, ...cached, cache: true });
            return;
          }

          // Get token from storage if available
          const tokenResult = await new Promise<{ agentscan_github_token?: string }>((resolve) => {
            chrome.storage.local.get(["agentscan_github_token"], (result) => {
              resolve(result);
            });
          });

          const token = tokenResult.agentscan_github_token;
          const octokit = new Octokit({
            auth: token,
          });

          const user = octokit.rest.users.getByUsername({ username: request.username });
          const events = octokit.rest.activity.listPublicEventsForUser({
            username: request.username,
            per_page: 100,
            page: 1,
          });
          const automationsList = octokit.rest.repos
            .getContent({
              owner: "MatteoGabriele",
              repo: "agentscan",
              path: "data/verified-automations-list.json",
            })
            .then((response) => {
              if ("content" in response.data) {
                const content = atob(response.data.content);
                return JSON.parse(content);
              }
              return [];
            })
            .catch((error) => {
              console.error("[AgentScan] Failed to fetch automations list:", error);
              return [];
            });

          const [userResponse, eventsResponse, automationsListResponse] = await Promise.all([
            user,
            events,
            automationsList,
          ]);

          const analysis = identify({
            accountName: userResponse.data.login,
            createdAt: userResponse.data.created_at,
            reposCount: userResponse.data.public_repos,
            events: eventsResponse.data,
          });

          const response: AnalysisResponse = {
            analysis,
            details: getClassificationDetails(analysis.classification),
            list: automationsListResponse?.map((user: { username: string }) => user.username),
            username: userResponse.data.login,
          };

          await setCachedAnalysis(response);
          sendResponse({ success: true, ...response, cache: false });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();

      return true; // Keep port open for async response
    }
  },
);
