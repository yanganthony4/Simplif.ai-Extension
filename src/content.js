// Store the original state to restore when needed
let originalBodyClasses = ""

// Initialize accessibility state
document.addEventListener("DOMContentLoaded", () => {
  originalBodyClasses = document.body.className

  // Check if we should apply dark mode or high contrast from storage
  chrome.storage.sync.get(["darkMode", "highContrast"], (result) => {
    if (result.darkMode) {
      document.body.classList.add("dark-mode")
    }
    if (result.highContrast) {
      document.body.classList.add("high-contrast-mode")
    }
  })
})

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get paragraphs from the page
  if (request.action === "getParagraphs") {
    const paragraphs = Array.from(document.getElementsByTagName("p"))
      .map((p) => p.innerText.trim())
      .filter((text) => text.length > 0)

    // If no paragraphs found, try to get text from other elements
    if (paragraphs.length === 0) {
      const articleContent = document.querySelector("article")
      if (articleContent) {
        paragraphs.push(articleContent.innerText.trim())
      } else {
        // Try to get main content
        const mainContent = document.querySelector("main")
        if (mainContent) {
          paragraphs.push(mainContent.innerText.trim())
        } else {
          // Fallback to body content
          paragraphs.push(document.body.innerText.trim())
        }
      }
    }

    sendResponse({ paragraphs })
  }

  // Text-to-speech functionality
  if (request.action === "speakText") {
    // Cancel any ongoing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(request.text)
    utterance.lang = request.lang || "en-US" // Default to English
    utterance.rate = request.rate || 1.0 // Normal speed
    utterance.pitch = request.pitch || 1.0 // Normal pitch

    // Add accessibility announcement
    const announcement = new SpeechSynthesisUtterance("Starting text-to-speech")
    announcement.volume = 0.3
    speechSynthesis.speak(announcement)

    // Start speaking after a short delay
    setTimeout(() => {
      speechSynthesis.speak(utterance)
    }, 500)

    sendResponse({ status: "speaking" })
  }

  // Pause speech
  if (request.action === "pauseSpeech") {
    speechSynthesis.pause()
    sendResponse({ status: "paused" })
  }

  // Resume speech
  if (request.action === "resumeSpeech") {
    speechSynthesis.resume()
    sendResponse({ status: "resumed" })
  }

  // Stop speech
  if (request.action === "stopSpeech") {
    speechSynthesis.cancel()
    sendResponse({ status: "stopped" })
  }

  // Toggle dark mode
  if (request.action === "toggleDarkMode") {
    const isDarkMode = document.body.classList.toggle("dark-mode")

    // Store preference
    chrome.storage.sync.set({ darkMode: isDarkMode })

    // Remove high contrast if it's active
    if (isDarkMode && document.body.classList.contains("high-contrast-mode")) {
      document.body.classList.remove("high-contrast-mode")
      chrome.storage.sync.set({ highContrast: false })
    }

    sendResponse({ status: "darkModeToggled", active: isDarkMode })
  }

  // Toggle high contrast mode
  if (request.action === "toggleHighContrast") {
    const isHighContrast = document.body.classList.toggle("high-contrast-mode")

    // Store preference
    chrome.storage.sync.set({ highContrast: isHighContrast })

    // Remove dark mode if it's active
    if (isHighContrast && document.body.classList.contains("dark-mode")) {
      document.body.classList.remove("dark-mode")
      chrome.storage.sync.set({ darkMode: false })
    }

    sendResponse({ status: "highContrastToggled", active: isHighContrast })
  }

  // Return true to indicate we'll respond asynchronously
  return true
})

