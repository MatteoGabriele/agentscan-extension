const username = window.location.pathname.split("/")[1];

if (username && username.length > 0 && !username.startsWith(".")) {
  const element = document.querySelector(".p-nickname");
  if (element && element.textContent.trim()) {
    // Check if there are pronouns inside the nickname element
    const pronounsElement = element.querySelector('span[itemprop="pronouns"]');
    const hasPronoun = pronounsElement !== null;

    // Store pronouns computed styles before cloning
    let pronounsComputedStyle = null;
    if (hasPronoun) {
      pronounsComputedStyle = window.getComputedStyle(pronounsElement);
    }

    // Get only the nickname text (without pronouns)
    const nickname = hasPronoun
      ? element.textContent.replace(pronounsElement.textContent, "").trim()
      : element.textContent.trim();

    // Get computed styles from the original element
    const computedStyle = window.getComputedStyle(element);

    // Create a wrapper to hold both link and pronouns
    const wrapper = document.createElement("span");
    // Copy ALL layout styles to prevent shifting
    wrapper.style.display = computedStyle.display;
    wrapper.style.margin = computedStyle.margin;
    wrapper.style.padding = computedStyle.padding;
    wrapper.style.border = computedStyle.border;
    wrapper.style.width = computedStyle.width;
    wrapper.style.height = computedStyle.height;
    wrapper.style.lineHeight = computedStyle.lineHeight;
    wrapper.style.verticalAlign = computedStyle.verticalAlign;
    wrapper.style.whiteSpace = computedStyle.whiteSpace;
    wrapper.style.wordBreak = computedStyle.wordBreak;
    wrapper.style.textAlign = computedStyle.textAlign;
    wrapper.style.fontSize = computedStyle.fontSize;
    wrapper.style.fontFamily = computedStyle.fontFamily;
    wrapper.style.fontWeight = computedStyle.fontWeight;
    wrapper.style.color = computedStyle.color;
    wrapper.style.letterSpacing = computedStyle.letterSpacing;

    // Convert the nickname into a link
    const link = document.createElement("a");
    link.href = `https://agentscan.netlify.app/user/${username}`;
    link.target = "_blank";
    link.textContent = nickname;
    link.title = "View on AgentScan";

    // Copy all relevant styles to prevent layout shift
    link.style.display = "inline";
    link.style.color = computedStyle.color;
    link.style.fontSize = computedStyle.fontSize;
    link.style.fontWeight = computedStyle.fontWeight;
    link.style.fontFamily = computedStyle.fontFamily;
    link.style.lineHeight = computedStyle.lineHeight;
    link.style.letterSpacing = computedStyle.letterSpacing;
    link.style.textDecoration = "underline";
    link.style.cursor = "pointer";
    link.style.verticalAlign = computedStyle.verticalAlign;
    link.style.whiteSpace = computedStyle.whiteSpace;
    link.style.wordBreak = computedStyle.wordBreak;

    wrapper.appendChild(link);

    // If there are pronouns, add them back to the wrapper with original styles
    if (hasPronoun) {
      const pronounText = document.createTextNode(" ");
      wrapper.appendChild(pronounText);
      const pronounsClone = pronounsElement.cloneNode(true);

      // Reapply the original computed styles to the cloned pronouns
      pronounsClone.style.display = pronounsComputedStyle.display;
      pronounsClone.style.fontSize = pronounsComputedStyle.fontSize;
      pronounsClone.style.fontWeight = pronounsComputedStyle.fontWeight;
      pronounsClone.style.color = pronounsComputedStyle.color;
      pronounsClone.style.lineHeight = pronounsComputedStyle.lineHeight;
      pronounsClone.style.margin = pronounsComputedStyle.margin;
      pronounsClone.style.padding = pronounsComputedStyle.padding;

      wrapper.appendChild(pronounsClone);
    }

    // Replace the original element with the wrapper
    element.parentNode.replaceChild(wrapper, element);
  }
}
