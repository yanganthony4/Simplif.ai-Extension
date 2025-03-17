chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getParagraphs") {
      const paragraphs = Array.from(document.getElementsByTagName("p"))
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0);
      sendResponse({ paragraphs });
  }

  if (request.action === "speakText") {
      const utterance = new SpeechSynthesisUtterance(request.text);
      utterance.lang = request.lang || "en-US"; // Default to English
      utterance.rate = request.rate || 1.0; // Normal speed
      utterance.pitch = request.pitch || 1.0; // Normal pitch
      speechSynthesis.speak(utterance);
      sendResponse({ status: "speaking" });
  }

  if (request.action === "pauseSpeech") {
    speechSynthesis.pause();
    sendResponse({ status: "paused" });
}

if (request.action === "resumeSpeech") {
    speechSynthesis.resume();
    sendResponse({ status: "resumed" });
}
  if (request.action === "stopSpeech") {
    speechSynthesis.cancel();
    sendResponse({ status: "stopped" });
}
if (request.action === "toggleDarkMode") {
  document.body.classList.toggle("dark-mode");
  sendResponse({ status: "darkModeToggled" });
}

if (request.action === "toggleHighContrast") {
  document.body.classList.toggle("high-contrast-mode");
  sendResponse({ status: "highContrastToggled" });
}
});


