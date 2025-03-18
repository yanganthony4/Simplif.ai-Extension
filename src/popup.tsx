import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// API Keys
const API_KEY = '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';
const DEEPL_API_KEY = 'bc917a54-fb21-4706-9b99-87d15c3600db:fx';
const OCR_API_KEY = 'K84385468488957'; 

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

function Popup() {
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);
    const [readingLevel, setReadingLevel] = useState<number>(2);
    const [targetLanguage, setTargetLanguage] = useState<string>("EN");
    const [includeImages, setIncludeImages] = useState<boolean>(true);
    const [isOpenDyslexic, setIsOpenDyslexic] = useState<boolean>(false);

    // Toggle OpenDyslexic Font
    const toggleOpenDyslexic = () => {
        const newState = !isOpenDyslexic;
        setIsOpenDyslexic(newState);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            const tabId = tabs[0].id;
            if (typeof tabId !== "number") return;

            chrome.tabs.sendMessage(tabId, {
                action: "toggleOpenDyslexic",
                enable: newState,
            });
        });
    };

    // Fetch paragraphs from active tab
    const fetchParagraphs = async (): Promise<string[] | null> => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) {
                    reject("No active tab found");
                    return;
                }

                const tabId = tabs[0].id;
                if (typeof tabId !== 'number') {
                    reject("No valid tab ID found");
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId },
                        files: ["src/content.js"],
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError.message || "An unknown error occurred");
                            return;
                        }

                        chrome.tabs.sendMessage(tabId, { action: "getParagraphs" }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError.message || "An unknown error occurred");
                                return;
                            }

                            resolve(response?.paragraphs || []);
                        });
                    }
                );
            });
        });
    };

    // Summarize Text
    const summarizeText = async () => {
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

            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: `Summarize this text: ${text}` }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${API_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            setSummary(response.data.choices[0].message.content);
        } catch (error) {
            setError("Failed to summarize text");
            console.error("Summarization error:", error);
        } finally {
            setIsSummarizing(false);
        }
    };

    // Translate Text
    const translateText = async () => {
        if (!summary || isTranslating) return;
        setIsTranslating(true);
        setError(null);

        try {
            const response = await axios.post(
                "https://api-free.deepl.com/v2/translate",
                {
                    text: [summary],
                    target_lang: targetLanguage,
                },
                {
                    headers: {
                        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            setSummary(response.data.translations[0].text);
        } catch (error) {
            setError("Failed to translate text");
            console.error("Translation error:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>

            {/* OpenDyslexic Font Toggle */}
            <div className="mb-4 flex items-center">
                <input
                    type="checkbox"
                    id="openDyslexic"
                    checked={isOpenDyslexic}
                    onChange={toggleOpenDyslexic}
                    className="mr-2"
                />
                <label htmlFor="openDyslexic" className="text-sm text-gray-700">
                    Enable OpenDyslexic Font
                </label>
            </div>

            {/* Reading Level Selector */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Reading Level</label>
                <input
                    type="range"
                    min="1"
                    max="3"
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(Number(e.target.value))}
                    className="w-full"
                />
            </div>

            {/* Summarize Button */}
            <button
                onClick={summarizeText}
                className="bg-green-500 text-white p-2 rounded mb-4 w-full"
                disabled={isSummarizing}
            >
                {isSummarizing ? "Summarizing..." : "Summarize"}
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

            {/* Translate Button */}
            <button
                onClick={translateText}
                className="bg-purple-500 text-white p-2 rounded w-full"
                disabled={!summary || isTranslating}
            >
                {isTranslating ? "Translating..." : "Translate"}
            </button>

            {/* Display Summary */}
            {summary && (
                <div className="mt-4">
                    <h2 className="text-xl font-bold">Result</h2>
                    <p>{summary}</p>
                </div>
            )}
        </div>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<Popup />);
}
