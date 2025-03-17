chrome.runtime.onInstalled.addListener(() => {
  console.log("Simplif.ai installed!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "speakText") {
      console.log("Speaking:", message.text);
      sendResponse({ status: "success" });
  }
});
