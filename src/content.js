chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getParagraphs") {
      const paragraphs = Array.from(document.getElementsByTagName("p"))
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0);
      sendResponse({ paragraphs });
  }
});
