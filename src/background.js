if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Simplif.ai installed!");

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
        console.log("Default settings initialized");
      },
    );
  });
}
