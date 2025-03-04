chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getText") {
      const paragraphs = Array.from(document.getElementsByTagName("p"));
      const longParagraphs = paragraphs
        .filter(p => p.textContent.trim().length > 100)
        .map(p => p.textContent.trim());
  
      sendResponse({ paragraphs: longParagraphs });
    }
  });
  