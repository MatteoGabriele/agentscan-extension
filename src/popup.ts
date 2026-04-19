document.getElementById("saveBtn").addEventListener("click", saveToken);
document.getElementById("clearBtn").addEventListener("click", clearToken);

// Load token on popup open
window.addEventListener("load", loadToken);

function showStatus(message: string, type: string) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  if (type !== "error") {
    setTimeout(() => {
      statusEl.className = "status";
    }, 3000);
  }
}

function saveToken(): void {
  const token = document.getElementById("tokenInput").value.trim();

  if (!token) {
    showStatus("Please enter a token", "error");
    return;
  }

  if (!token.startsWith("ghp_")) {
    showStatus("Invalid token format (should start with ghp_)", "error");
    return;
  }

  chrome.storage.local.set({ agentscan_github_token: token }, () => {
    showStatus("✓ Token saved successfully", "success");
    document.getElementById("tokenInput").value = "";

    // Clear failed users cache so we retry with the token
    chrome.storage.local.remove("agentscan_failed_users", () => {
      console.log("[AgentScan] Cleared failed users cache");
    });
  });
}

function clearToken(): void {
  chrome.storage.local.remove("agentscan_github_token", () => {
    showStatus("✓ Token cleared", "success");
    document.getElementById("tokenInput").value = "";
  });
}

function loadToken(): void {
  chrome.storage.local.get(["agentscan_github_token"], (result) => {
    if (result.agentscan_github_token) {
      // Show masked token
      const token = result.agentscan_github_token;
      const masked = token.substring(0, 10) + "..." + token.substring(token.length - 4);
      document.getElementById("tokenInput").placeholder = masked;
      document.getElementById("tokenInput").value = "";
      showStatus("✓ Token configured", "info");
    }
  });
}
