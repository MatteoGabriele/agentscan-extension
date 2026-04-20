import type { IdentityClassification } from "@unveil/identity";

// Add CSS for pulsing shield animation
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse-shield {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  .agentscan-icon-pending svg {
    animation: pulse-shield 1.5s ease-in-out infinite;
  }
`;
document.head.appendChild(style);

function analyzeComments() {
  const selectors = [
    ".timeline-comment-group a[data-hovercard-type='user']",
    ".react-issue-body a[data-hovercard-type='user']",
    ".react-issue-comment a[data-hovercard-type='user']",
  ];
  const authorLinks = document.querySelectorAll(selectors.join(", ")) as NodeListOf<HTMLElement>;

  for (const el of authorLinks) {
    if (el.hasAttribute("data-agentscan-analyzed")) {
      continue;
    }

    el.setAttribute("data-agentscan-analyzed", "true");

    const username = el.textContent.toLowerCase().trim();

    if (!username) {
      continue;
    }

    // Skip analysis for known bots (typically user-installed)
    if (el.parentElement?.querySelector("span.Label")?.textContent.toLowerCase().trim() === "bot") {
      continue;
    }

    // Create a temporary pending shield
    const pendingLink = document.createElement("a");
    pendingLink.style.display = "inline-flex";
    pendingLink.style.alignItems = "center";
    pendingLink.style.justifyContent = "center";
    pendingLink.style.marginLeft = "4px";
    pendingLink.style.marginTop = "-2px";
    pendingLink.style.cursor = "pointer";
    pendingLink.style.verticalAlign = "middle";
    pendingLink.style.textDecoration = "none";
    pendingLink.className = "agentscan-icon-pending";

    const pendingSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pendingSvg.setAttribute("width", "14");
    pendingSvg.setAttribute("height", "14");
    pendingSvg.setAttribute("viewBox", "0 0 24 24");
    pendingSvg.setAttribute("fill", "none");
    pendingSvg.setAttribute("stroke", "#9ca3af");
    pendingSvg.setAttribute("stroke-width", "2");
    pendingSvg.setAttribute("stroke-linecap", "round");
    pendingSvg.setAttribute("stroke-linejoin", "round");

    const pendingPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pendingPath.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
    pendingSvg.appendChild(pendingPath);

    const pendingTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    pendingTitle.textContent = "Analyzing...";
    pendingSvg.appendChild(pendingTitle);

    pendingLink.appendChild(pendingSvg);
    el.parentElement?.appendChild(pendingLink);

    chrome.runtime.sendMessage(
      {
        action: "analyze",
        username,
      },
      (response) => {
        const isFlaggedByCommunity: boolean = response.list.some(
          (item: string) => username === item,
        );

        const link = document.createElement("a");
        link.href = `https://agentscan.netlify.app/user/${username}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.display = "inline-flex";
        link.style.alignItems = "center";
        link.style.justifyContent = "center";
        link.style.marginLeft = "4px";
        link.style.marginTop = "-2px";
        link.style.cursor = "pointer";
        link.style.verticalAlign = "middle";
        link.style.textDecoration = "none";
        link.className = "agentscan-icon";

        const color = getClassificationColor(
          isFlaggedByCommunity ? "automation" : response.analysis.classification,
        );

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "14");
        svg.setAttribute("height", "14");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", color);
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
        svg.appendChild(path);

        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = isFlaggedByCommunity
          ? "Flagged by the community"
          : response.details.label;
        svg.appendChild(title);

        link.appendChild(svg);

        // Replace pending shield with final result
        pendingLink.replaceWith(link);
      },
    );
  }
}

window.addEventListener("load", analyzeComments);

let debounceTimer: NodeJS.Timeout | null = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    analyzeComments();
  }, 30);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

function getClassificationColor(classification: IdentityClassification): string {
  if (classification === "organic") {
    return "#22c55e";
  } else if (classification === "mixed") {
    return "#f97316";
  } else if (classification === "automation") {
    return "#ef4444";
  } else {
    return "gray";
  }
}
