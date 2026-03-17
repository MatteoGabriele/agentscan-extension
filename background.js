chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.match(/https:\/\/github\.com\/[^/]+$/)
  ) {
    chrome.scripting
      .executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      })
      .catch((err) => {
        console.error("[AgentScan] Error injecting script:", err);
      });
  }
});
