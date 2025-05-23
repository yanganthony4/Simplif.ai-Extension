if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Simplif.ai installed!")

    // Initialize default settings
    chrome.storage.sync.set(
      {
        darkMode: false,
        highContrast: false,
        openDyslexic: false, // Added this line
        readingLevel: 2,
        speechRate: 1.0,
        speechPitch: 1.0,
        selectedVoice: "en-US",
      },
      () => {
        console.log("Default settings initialized")
      },
    )
  })

  // Listen for messages from content script or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "speakText") {
      console.log("Speaking:", message.text.substring(0, 50) + "...")
      // Implement text-to-speech functionality here
      chrome.tts.speak(message.text, {
        rate: 1.0,
        pitch: 1.0,
        voiceName: "en-US",
      })
      sendResponse({ status: "success" })
    }

    // Return true to indicate we'll respond asynchronously if needed
    return true
  })

  // Add this message listener to handle OpenDyslexic font toggle for the popup UI
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getOpenDyslexicState") {
      chrome.storage.sync.get(["openDyslexic"], (result) => {
        sendResponse({ openDyslexic: result.openDyslexic || false })
      })
      return true // Required for async response
    }
  })
}

