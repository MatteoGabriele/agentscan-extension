document.getElementById("addBtn")?.addEventListener("click", saveToken);
document.getElementById("deleteBtn")?.addEventListener("click", clearToken);

const platform = typeof chrome === "undefined" ? browser : chrome;

// Load token on popup open
window.addEventListener("load", loadToken);

function showStatus(message: string, type: string) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    if (type !== "error") {
      setTimeout(() => {
        if (statusEl) statusEl.className = "status";
      }, 3000);
    }
  }
}

function updateButtonVisibility(hasToken: boolean): void {
  const addBtn = document.getElementById("addBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const tokenSection = document.getElementById("tokenSection");

  if (hasToken) {
    addBtn?.classList.add("hidden");
    deleteBtn?.classList.remove("hidden");
    tokenSection?.classList.add("hidden");
  } else {
    addBtn?.classList.remove("hidden");
    deleteBtn?.classList.add("hidden");
    tokenSection?.classList.remove("hidden");
  }
}

function saveToken(): void {
  const tokenInput = document.getElementById("tokenInput") as HTMLInputElement;
  const token = tokenInput?.value.trim() ?? "";

  if (!token) {
    showStatus("Please enter a token", "error");
    return;
  }

  if (!token.startsWith("ghp_")) {
    showStatus("Invalid token format (should start with ghp_)", "error");
    return;
  }

  platform.storage.local.set({ agentscan_github_token: token }, () => {
    showStatus("Token added successfully", "success");
    if (tokenInput) tokenInput.value = "";

    updateButtonVisibility(true);

    // Clear failed users cache so we retry with the token
    platform.storage.local.remove("agentscan_failed_users", () => {
      console.log("[AgentScan] Cleared failed users cache");
    });
  });
}

function clearToken(): void {
  platform.storage.local.remove("agentscan_github_token", () => {
    showStatus("Token deleted", "success");
    const tokenInput = document.getElementById("tokenInput") as HTMLInputElement;
    if (tokenInput) tokenInput.value = "";
    updateButtonVisibility(false);
  });
}

function loadToken(): void {
  platform.storage.local.get(["agentscan_github_token"], (result: any) => {
    if (result.agentscan_github_token) {
      // Show masked token
      const token = result.agentscan_github_token;
      const masked = token.substring(0, 10) + "..." + token.substring(token.length - 4);
      const tokenInput = document.getElementById("tokenInput") as HTMLInputElement;
      if (tokenInput) {
        tokenInput.placeholder = masked;
        tokenInput.value = "";
      }
      updateButtonVisibility(true);
    } else {
      updateButtonVisibility(false);
    }
  });
}
