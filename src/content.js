// Store the original state to restore when needed
let originalBodyClasses = "";

// Initialize accessibility state
document.addEventListener("DOMContentLoaded", () => {
  originalBodyClasses = document.body.className;

  // Check if we should apply dark mode or high contrast from storage
  chrome.storage.sync.get(["darkMode", "highContrast"], (result) => {
    if (result.darkMode) {
      document.body.classList.add("dark-mode");
    }
    if (result.highContrast) {
      document.body.classList.add("high-contrast-mode");
    }
  });
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get paragraphs from the page
  if (request.action === "getParagraphs") {
    const paragraphs = Array.from(document.getElementsByTagName("p"))
      .map((p) => p.innerText.trim())
      .filter((text) => text.length > 0);

    // If no paragraphs found, try to get text from other elements
    if (paragraphs.length === 0) {
      const articleContent = document.querySelector("article");
      if (articleContent) {
        paragraphs.push(articleContent.innerText.trim());
      } else {
        const mainContent = document.querySelector("main");
        if (mainContent) {
          paragraphs.push(mainContent.innerText.trim());
        } else {
          paragraphs.push(document.body.innerText.trim());
        }
      }
    }

    sendResponse({ paragraphs });
  }

  // ✅ Toggle OpenDyslexic Font
  if (request.action === "toggleOpenDyslexic") {
    if (request.enable) {
      // Inject OpenDyslexic Font from CDN if not already present
      if (!document.getElementById("openDyslexicFont")) {
        const fontLink = document.createElement("link");
        fontLink.id = "openDyslexicFont";
        fontLink.rel = "stylesheet";
        fontLink.href = "https://fonts.cdnfonts.com/css/open-dyslexic"; // ✅ Working URL
        document.head.appendChild(fontLink);
      }

      // Inject simple CSS to apply the font to all elements
      if (!document.getElementById("openDyslexicStyles")) {
        const style = document.createElement("style");
        style.id = "openDyslexicStyles";
        style.innerHTML = `
          * {
            font-family: 'Open-Dyslexic' !important;
            font-weight: normal !important;
          }
        `;
        document.head.appendChild(style);
      }

      document.body.classList.add("open-dyslexic");
    } else {
      // Remove OpenDyslexic font and styles
      document.body.classList.remove("open-dyslexic");

      const fontLink = document.getElementById("openDyslexicFont");
      if (fontLink) fontLink.remove();

      const style = document.getElementById("openDyslexicStyles");
      if (style) style.remove();

      const resetStyle = document.createElement("style");
      resetStyle.id = "resetFontStyles";
      resetStyle.innerHTML = `* { font-family: initial !important; }`;
      document.head.appendChild(resetStyle);

      setTimeout(() => {
        document.getElementById("resetFontStyles")?.remove();
      }, 100);
    }
  }

  // ✅ Text-to-Speech Functionality
  if (request.action === "speakText") {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.lang = request.lang || "en-US";
    utterance.rate = request.rate || 1.0;
    utterance.pitch = request.pitch || 1.0;

    // Add accessibility announcement
    const announcement = new SpeechSynthesisUtterance("Starting text-to-speech");
    announcement.volume = 0.3;
    speechSynthesis.speak(announcement);

    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 500);

    sendResponse({ status: "speaking" });
  }

  // ✅ Pause Speech
  if (request.action === "pauseSpeech") {
    speechSynthesis.pause();
    sendResponse({ status: "paused" });
  }

  // ✅ Resume Speech
  if (request.action === "resumeSpeech") {
    speechSynthesis.resume();
    sendResponse({ status: "resumed" });
  }

  // ✅ Stop Speech
  if (request.action === "stopSpeech") {
    speechSynthesis.cancel();
    sendResponse({ status: "stopped" });
  }

  // ✅ Toggle Dark Mode
  if (request.action === "toggleDarkMode") {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    chrome.storage.sync.set({ darkMode: isDarkMode });

    if (isDarkMode && document.body.classList.contains("high-contrast-mode")) {
      document.body.classList.remove("high-contrast-mode");
      chrome.storage.sync.set({ highContrast: false });
    }

    sendResponse({ status: "darkModeToggled", active: isDarkMode });
  }

  // ✅ Toggle High Contrast Mode
  if (request.action === "toggleHighContrast") {
    const isHighContrast = document.body.classList.toggle("high-contrast-mode");
    chrome.storage.sync.set({ highContrast: isHighContrast });

    if (isHighContrast && document.body.classList.contains("dark-mode")) {
      document.body.classList.remove("dark-mode");
      chrome.storage.sync.set({ darkMode: false });
    }

    sendResponse({ status: "highContrastToggled", active: isHighContrast });
  }

  return true; // Indicate we'll respond asynchronously
});
