const username = window.location.pathname.split("/")[1];

if (username && username.length > 0 && !username.startsWith(".")) {
  const element = document.querySelector(".p-nickname");
  if (element && element.textContent.trim()) {
    const pronounsElement = element.querySelector('span[itemprop="pronouns"]');
    const hasPronoun = pronounsElement !== null;

    let pronounsComputedStyle = null;
    if (hasPronoun) {
      pronounsComputedStyle = window.getComputedStyle(pronounsElement);
    }

    const nickname = hasPronoun
      ? element.textContent.replace(pronounsElement.textContent, "").trim()
      : element.textContent.trim();

    const computedStyle = window.getComputedStyle(element);

    const wrapper = document.createElement("span");
    wrapper.style.cssText = document.defaultView.getComputedStyle(
      'span[itemprop="pronouns"]',
    ).cssText;

    // wrapper.style.display = computedStyle.display;
    // wrapper.style.margin = computedStyle.margin;
    // wrapper.style.padding = computedStyle.padding;
    // wrapper.style.border = computedStyle.border;
    // wrapper.style.width = computedStyle.width;
    // wrapper.style.height = computedStyle.height;
    // wrapper.style.lineHeight = computedStyle.lineHeight;
    // wrapper.style.verticalAlign = computedStyle.verticalAlign;
    // wrapper.style.whiteSpace = computedStyle.whiteSpace;
    // wrapper.style.wordBreak = computedStyle.wordBreak;
    // wrapper.style.textAlign = computedStyle.textAlign;
    // wrapper.style.fontSize = computedStyle.fontSize;
    // wrapper.style.fontFamily = computedStyle.fontFamily;
    // wrapper.style.fontWeight = computedStyle.fontWeight;
    // wrapper.style.color = computedStyle.color;
    // wrapper.style.letterSpacing = computedStyle.letterSpacing;

    const link = document.createElement("a");

    link.href = `https://agentscan.netlify.app/user/${username}`;
    link.target = "_blank";
    link.textContent = nickname;
    link.title = "View on AgentScan";

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

    if (hasPronoun) {
      const pronounText = document.createTextNode(" ");
      wrapper.appendChild(pronounText);
      const pronounsClone = pronounsElement.cloneNode(true);

      pronounsClone.style.display = pronounsComputedStyle.display;
      pronounsClone.style.fontSize = pronounsComputedStyle.fontSize;
      pronounsClone.style.fontWeight = pronounsComputedStyle.fontWeight;
      pronounsClone.style.color = pronounsComputedStyle.color;
      pronounsClone.style.lineHeight = pronounsComputedStyle.lineHeight;
      pronounsClone.style.margin = pronounsComputedStyle.margin;
      pronounsClone.style.padding = pronounsComputedStyle.padding;

      wrapper.appendChild(pronounsClone);
    }

    element.parentNode.replaceChild(wrapper, element);
  }
}
