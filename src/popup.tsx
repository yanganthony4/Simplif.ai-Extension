import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// API Keys - In production, these should be secured and not exposed in client-side code
const API_KEY =
  "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";
const DEEPL_API_KEY =
  "bc917a54-fb21-4706-9b99-87d15c3600db:fx";
const OCR_API_KEY = "K84385468488957";

// Languages
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
    };

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>

            {/* Reading Level */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                    Reading Level
                </label>
                <input
                    type="range"
                    min="1"
                    max="3"
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(Number(e.target.value))}
                    className="w-full"
                />
            </div>

            {/* Include Images Toggle */}
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

            {/* Summarize Button */}
            <button
                onClick={summarizeText}
                className="bg-green-500 text-white p-2 rounded mb-4 w-full"
                disabled={isSummarizing || isProcessingImages}
            >
                {isSummarizing ? (isProcessingImages ? "Processing images..." : "Summarizing...") : "Summarize"}
            </button>

            {/* Translation Dropdown */}
            <div className="mb-4">
                <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>
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
            )}
        </div>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Popup />);
}
