"use client";

import React, { useState, useEffect, JSX } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// API Keys - In production, these should be secured and not exposed in client-side code
const API_KEY =
  "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";
const DEEPL_API_KEY = "bc917a54-fb21-4706-9b99-87d15c3600db:fx";

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
  // Summarization & Translation
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Reading Level (1–3)
  const [readingLevel, setReadingLevel] = useState<number>(2);

  // TTS (integrated in Summarize)
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Target Language (for translation)
  const [targetLanguage, setTargetLanguage] = useState<string>("EN");

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
      const text = paragraphs.join("\n");
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
    setIsDarkMode(newMode);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: "toggleDarkMode" });
    });
    document.body.classList.toggle("dark-mode");
  };

  // Toggle High Contrast
  const toggleHighContrast = (): void => {
    const newMode = !isHighContrast;
    setIsHighContrast(newMode);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) return;
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, { action: "toggleHighContrast" });
    });
    document.body.classList.toggle("high-contrast-mode");
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
                  style={{ display: "block", margin: "0 auto", width: "100%" }}
                />
              </div>
              <button
                onClick={summarizeText}
                disabled={isSummarizing || paragraphCount === 0}
                className="w-full btn-primary"
                aria-busy={isSummarizing}
              >
                {isSummarizing ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    Summarizing...
                  </>
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
                      👄
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="text-sm"
                      aria-label="Target language"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
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
                    <button onClick={handleStopSummarySpeech} className="btn-danger" aria-label="Stop reading">
                      Stop
                    </button>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div
                className="card"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "var(--danger)" }}
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
                    className={`px-4 py-2 rounded ${isDarkMode ? "btn-primary" : "btn-secondary"}`}
                    aria-pressed={isDarkMode}
                  >
                    {isDarkMode ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">High Contrast Mode</label>
                  <button
                    onClick={toggleHighContrast}
                    className={`px-4 py-2 rounded ${isHighContrast ? "btn-primary" : "btn-secondary"}`}
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
                Simplif.ai is an AI-powered accessibility tool that helps make web content more accessible through:
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
    <div className="p-4 w-96">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Simplif.ai</h1>
        <p className="text-sm">AI-powered accessibility tool</p>
      </header>
      <nav className="flex border-b mb-4 gap-2">
        <button
          onClick={() => setActiveTab("summarize")}
          className={`py-2 px-4 ${activeTab === "summarize" ? "border-b-2 border-primary font-medium" : "text-secondary"}`}
          aria-selected={activeTab === "summarize"}
        >
          Summarize
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`py-2 px-4 ${activeTab === "settings" ? "border-b-2 border-primary font-medium" : "text-secondary"}`}
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
