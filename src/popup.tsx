"use client";

import React, { useState, useEffect, JSX, useRef } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// API Keys - In production, these should be secured and not exposed in client-side code
const API_KEY =
  "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";
const DEEPL_API_KEY =
  "bc917a54-fb21-4706-9b99-87d15c3600db:fx";
const OCR_API_KEY = "K84385468488957";

// Supported Languages
const languages = [
  { code: "EN", name: "English" },
  { code: "FR", name: "French" },
  { code: "ES", name: "Spanish" },
  { code: "JA", name: "Japanese" },
  { code: "ZH", name: "Chinese" },
  { code: "DE", name: "German" },
  { code: "IT", name: "Italian" },
];

// Reading levels
const readingLevels = [
  {
    level: 1,
    name: "Elementary",
    description: "Simple vocabulary for young readers",
  },
  {
    level: 2,
    name: "General",
    description: "Everyday language for most readers",
  },
  {
    level: 3,
    name: "Academic",
    description: "Advanced vocabulary for scholarly content",
  },
];

type ActiveTab = "summarize" | "settings";

function Popup(): JSX.Element {
  // Summarization, Translation & OCR
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);

  // Reading Level (1–3)
  const [readingLevel, setReadingLevel] = useState<number>(2);

  // OCR Toggle (Include Images)
  const [includeImages, setIncludeImages] = useState<boolean>(true);

  // TTS (integrated in Summarize)
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Target Language (for translation)
  const [targetLanguage, setTargetLanguage] = useState<string>("EN");
  // Create a ref for the select element so we can trigger its click when the arrow is clicked
  const selectRef = useRef<HTMLSelectElement>(null);

  // Paragraph count
  const [paragraphCount, setParagraphCount] = useState<number>(0);

  // Dark/Contrast modes
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);

  // Two tabs: Summarize & Settings
  const [activeTab, setActiveTab] = useState<ActiveTab>("summarize");

  useEffect(() => {
    // Fetch paragraphs on load
    fetchParagraphs()
      .then((paragraphs) => {
        if (paragraphs) setParagraphCount(paragraphs.length);
      })
      .catch((err) => {
        console.error("Error fetching paragraphs:", err);
      });
  }, []);

  // Load TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0) {
        setSelectedVoice(voices[0].name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Fetch paragraphs from the current page
  const fetchParagraphs = async (): Promise<string[] | null> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
          reject("No valid tab found");
          return;
        }
        const tabId = tabs[0].id ?? -1;
        if (tabId === -1) return;
        chrome.tabs.sendMessage(
          tabId,
          { action: "getParagraphs" },
          (response: { paragraphs?: string[] }) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message || "An unknown error occurred");
              return;
            }
            resolve(response?.paragraphs || []);
          }
        );
      });
    });
  };

  // Fetch image URLs from the active tab
  const fetchImages = async (): Promise<string[] | null> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
          reject("No active tab found");
          return;
        }
        const tabId = tabs[0].id;
        if (typeof tabId !== "number") {
          reject("No valid tab ID found");
          return;
        }
        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: () => {
              // Find all images that might be relevant (inside article content)
              const images = Array.from(
                document.querySelectorAll(
                  "article img, main img, .content img, .post img, img"
                )
              ) as HTMLImageElement[];
              // Filter out small icons, avatars, etc.
              const relevantImages = images.filter((img) => {
                const rect = img.getBoundingClientRect();
                return rect.width > 200 && rect.height > 100;
              });
              return relevantImages.map((img) => img.src);
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message || "An unknown error occurred");
              return;
            }
            if (!results || results.length === 0) {
              resolve([]);
              return;
            }
            resolve(results[0]?.result || []);
          }
        );
      });
    });
  };

  // Process images with OCR
  const processImagesWithOCR = async (imageUrls: string[]): Promise<string> => {
    if (!imageUrls || imageUrls.length === 0) return "";
    let ocrText = "";
    setIsProcessingImages(true);
    try {
      // Process up to 3 images maximum
      const imagesToProcess = imageUrls.slice(0, 3);
      for (const imageUrl of imagesToProcess) {
        const formData = new FormData();
        formData.append("apikey", OCR_API_KEY);
        formData.append("url", imageUrl);
        formData.append("language", "eng");
        formData.append("isOverlayRequired", "false");
        const response = await axios.post(
          "https://api.ocr.space/parse/image",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        if (
          response.data &&
          response.data.ParsedResults &&
          response.data.ParsedResults.length > 0
        ) {
          const extractedText = response.data.ParsedResults[0].ParsedText;
          if (extractedText && extractedText.trim().length > 0) {
            ocrText += extractedText + "\n\n";
          }
        }
      }
      return ocrText;
    } catch (error) {
      console.error("OCR processing failed:", error);
      return "";
    } finally {
      setIsProcessingImages(false);
    }
  };

  // Summarize text function
  const summarizeText = async (): Promise<void> => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setError(null);
    setSummary(null);
    try {
      const paragraphs = await fetchParagraphs();
      if (!paragraphs || paragraphs.length === 0) {
        setError("No paragraphs found to summarize");
        setIsSummarizing(false);
        return;
      }
      let text = paragraphs.join("\n");

      // If OCR is enabled, process images from the page.
      if (includeImages) {
        const imageUrls = await fetchImages();
        if (imageUrls && imageUrls.length > 0) {
          const ocrText = await processImagesWithOCR(imageUrls);
          if (ocrText) {
            text += "\n\nText from images:\n" + ocrText;
          }
        }
      }

      const prompts = [
        `Summarize for a 4th-grade reading level: ${text}`,
        `Summarize in simple terms: ${text}`,
        `Summarize for an academic audience: ${text}`,
      ];
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompts[readingLevel - 1] }],
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      setSummary(response.data.choices[0].message.content);
    } catch (err) {
      setError("Failed to summarize text. Please check your internet connection and try again.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Translate text function
  const translateText = async (): Promise<void> => {
    if (!summary || isTranslating) return;
    setIsTranslating(true);
    setError(null);
    try {
      const response = await axios.post(
        "https://api-free.deepl.com/v2/translate",
        { text: [summary], target_lang: targetLanguage },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      setSummary(response.data.translations[0].text);
    } catch (err) {
      setError("Failed to translate text. Please check your internet connection and try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Read the summary aloud
  const handleSpeakSummary = (): void => {
    if (!summary || summary.trim().length === 0) {
      setError("No summary available to read aloud.");
      return;
    }
    setIsSpeaking(true);
    setIsPaused(false);
    const voiceToUse = selectedVoice || "en-US";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      const tabId = tabs[0].id ?? -1;
      if (tabId === -1) return;
      chrome.tabs.sendMessage(tabId, {
        action: "speakText",
        text: summary,
        voice: voiceToUse,
        rate: speechRate,
        pitch: speechPitch,
      });
    });
  };

  // Stop reading
  const handleStopSummarySpeech = (): void => {
    setIsSpeaking(false);
    setIsPaused(false);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: "stopSpeech" });
    });
  };

  // Pause/Resume reading
  const handlePauseResumeSummarySpeech = (): void => {
    if (!isSpeaking) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: isPaused ? "resumeSpeech" : "pauseSpeech" });
      setIsPaused(!isPaused);
    });
  };

  // Toggle Dark Mode
  const toggleDarkMode = (): void => {
    const newMode = !isDarkMode;
    if (newMode && isHighContrast) {
      setIsHighContrast(false);
      document.body.classList.remove("high-contrast-mode");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "disableHighContrast" });
        }
      });
    }
    setIsDarkMode(newMode);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: newMode ? "enableDarkMode" : "disableDarkMode",
        });
      }
    });
    if (newMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  };

  // Toggle High Contrast
  const toggleHighContrast = (): void => {
    const newMode = !isHighContrast;
    if (newMode && isDarkMode) {
      setIsDarkMode(false);
      document.body.classList.remove("dark-mode");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "disableDarkMode" });
        }
      });
    }
    setIsHighContrast(newMode);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: newMode ? "enableHighContrast" : "disableHighContrast",
        });
      }
    });
    if (newMode) {
      document.body.classList.add("high-contrast-mode");
    } else {
      document.body.classList.remove("high-contrast-mode");
    }
  };

  // Render content based on active tab
  const renderTabContent = (): JSX.Element | null => {
    switch (activeTab) {
      case "summarize":
        return (
          <div className="flex flex-col gap-4">
            {/* Summarize Section */}
            <div className="card">
              <h2 className="text-lg font-bold mb-2">Reading Level</h2>
              <div className="mb-4">
                <div className="flex flex-col mb-2">
                  <span className="text-sm font-bold">
                    {readingLevels[readingLevel - 1].name}
                  </span>
                  <span className="text-xs text-gray-600">
                    {readingLevels[readingLevel - 1].description}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  value={readingLevel}
                  onChange={(e) => setReadingLevel(Number(e.target.value))}
                  className="w-full"
                  aria-label="Reading level"
                  style={{ display: "block", width: "93%" }}
                />
              </div>
              {/* OCR Checkbox */}
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="includeImages" className="text-sm text-gray-700">
                  Include text from images (OCR)
                </label>
              </div>
              <button
                onClick={summarizeText}
                disabled={isSummarizing || paragraphCount === 0 || isProcessingImages}
                className="w-full btn-primary"
                aria-busy={isSummarizing}
              >
                {isSummarizing ? (
                  isProcessingImages ? (
                    <>
                      <span className="spinner" aria-hidden="true"></span>
                      Processing images...
                    </>
                  ) : (
                    <>
                      <span className="spinner" aria-hidden="true"></span>
                      Summarizing...
                    </>
                  )
                ) : paragraphCount === 0 ? (
                  "No content to summarize"
                ) : (
                  `Summarize (${paragraphCount} paragraphs)`
                )}
              </button>
            </div>
            {/* Summary Section with integrated TTS */}
            {summary && (
              <div className="card">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold m-0">Summary</h2>
                    <button
                      onClick={handleSpeakSummary}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: "1.25rem",
                        cursor: "pointer",
                        color: "#6366f1",
                      }}
                      title="Read Aloud Summary"
                      aria-label="Read Aloud Summary"
                    >
                      🔊
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={translateText}
                      disabled={isTranslating}
                      className="btn-secondary text-sm"
                      aria-busy={isTranslating}
                    >
                      {isTranslating ? (
                        <>
                          <span className="spinner" aria-hidden="true"></span>
                          Translating...
                        </>
                      ) : (
                        "Translate"
                      )}
                    </button>
                    {/* Custom dropdown container */}
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <select
                        ref={selectRef}
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="text-sm"
                        aria-label="Target language"
                        style={{
                          paddingRight: "1.5rem",
                          appearance: "none", // hide native arrow
                        }}
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <span
                        title="Select Language"
                        onClick={() => {
                          if (selectRef.current) {
                            selectRef.current.focus();
                            selectRef.current.click();
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 cursor-pointer"
                        style={{
                          transform: "translateY(-50%)",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm">{summary}</p>
                {isSpeaking && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handlePauseResumeSummarySpeech}
                      className="btn-warning"
                      aria-label={isPaused ? "Resume reading" : "Pause reading"}
                    >
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button
                      onClick={handleStopSummarySpeech}
                      className="btn-danger"
                      aria-label="Stop reading"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div
                className="card"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderColor: "var(--danger)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              </div>
            )}
          </div>
        );
      case "settings":
        return (
          <div className="flex flex-col gap-4">
            <div className="card">
              <h2 className="text-lg font-bold mb-4">Accessibility Settings</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dark Mode</label>
                  <button
                    onClick={toggleDarkMode}
                    className={`px-4 py-2 rounded ${
                      isDarkMode ? "btn-primary" : "btn-secondary"
                    }`}
                    aria-pressed={isDarkMode}
                  >
                    {isDarkMode ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">High Contrast Mode</label>
                  <button
                    onClick={toggleHighContrast}
                    className={`px-4 py-2 rounded ${
                      isHighContrast ? "btn-primary" : "btn-secondary"
                    }`}
                    aria-pressed={isHighContrast}
                  >
                    {isHighContrast ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
            <div className="card">
              <h2 className="text-lg font-bold mb-2">About Simplif.ai</h2>
              <p className="text-sm mb-2">
                Simplif.ai is an AI-powered accessibility tool that helps make web content more
                accessible through:
              </p>
              <ul className="text-sm list-disc pl-5 mb-2">
                <li>Text summarization at different reading levels</li>
                <li>Translation to multiple languages</li>
                <li>Text-to-speech functionality</li>
                <li>Accessibility modes (Dark & High Contrast)</li>
              </ul>
              <p className="text-sm">Version 1.0</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "350px",
        height: "500px",
        overflowY: "auto",
        overflowX: "hidden",
        marginLeft: "auto",
        marginRight: "auto",
        padding: "0 1rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Simplif.ai</h1>
        <p className="text-sm">AI-powered accessibility tool</p>
      </header>
      <nav className="flex border-b mb-4 gap-2">
        <button
          onClick={() => setActiveTab("summarize")}
          style={{
            flex: 1,
            padding: "0.5rem 0",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            backgroundColor: activeTab === "summarize" ? "#6366f1" : "#6b7280",
            color: "#fff",
            fontWeight: 500,
          }}
          aria-selected={activeTab === "summarize"}
        >
          Summarize
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          style={{
            flex: 1,
            padding: "0.5rem 0",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            backgroundColor: activeTab === "settings" ? "#6366f1" : "#6b7280",
            color: "#fff",
            fontWeight: 500,
          }}
          aria-selected={activeTab === "settings"}
        >
          Settings
        </button>
      </nav>
      <main>{renderTabContent()}</main>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}
