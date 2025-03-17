import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

// API Keys
const API_KEY = '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';
const DEEPL_API_KEY = 'bc917a54-fb21-4706-9b99-87d15c3600db:fx';

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

const voices = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "fr-FR", name: "French" },
    { code: "es-ES", name: "Spanish" },
];

function Popup() {
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [readingLevel, setReadingLevel] = useState<number>(2);
    const [targetLanguage, setTargetLanguage] = useState<string>("EN");
    const [speechRate, setSpeechRate] = useState(1.0);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [selectedVoice, setSelectedVoice] = useState("en-US");
    const [isPaused, setIsPaused] = useState(false); // Track pause state
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isHighContrast, setIsHighContrast] = useState(false);

    const fetchParagraphs = async (): Promise<string[] | null> => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0 || !tabs[0].id) {
                    reject("No valid tab found");
                    return;
                }
                const tabId = tabs[0].id ?? -1;
                if (tabId === -1) return;
                chrome.tabs.sendMessage(tabId, { action: "getParagraphs" }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError.message || "An unknown error occurred");
                        return;
                    }
                    resolve(response?.paragraphs || []);
                });
            });
        });
    };

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
            const text = paragraphs.join("\n");
            const prompts = [
                `Summarize for a 4th-grade reading level: ${text}`,
                `Summarize in simple terms: ${text}`,
                `Summarize for an academic audience: ${text}`,
            ];
            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                { model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompts[readingLevel - 1] }] },
                { headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" } }
            );
            setSummary(response.data.choices[0].message.content);
        } catch (error) {
            setError("Failed to summarize text");
        } finally {
            setIsSummarizing(false);
        }
    };

    const translateText = async () => {
        if (!summary || isTranslating) return;
        setIsTranslating(true);
        setError(null);
        try {
            const response = await axios.post(
                "https://api-free.deepl.com/v2/translate",
                { text: [summary], target_lang: targetLanguage },
                { headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, "Content-Type": "application/json" } }
            );
            setSummary(response.data.translations[0].text);
        } catch (error) {
            setError("Failed to translate text");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSpeakText = async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) return;
            const tabId = tabs[0].id ?? -1;
            if (tabId === -1) return;
            chrome.tabs.sendMessage(tabId, { action: "getParagraphs" }, (response) => {
                if (response && response.paragraphs.length > 0) {
                    chrome.tabs.sendMessage(tabId, {
                        action: "speakText",
                        text: response.paragraphs.join(" "),
                        lang: selectedVoice,
                        rate: speechRate,
                        pitch: speechPitch,
                    });
                }
            });
        });
    };

    const handleStopSpeech = async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) return;
    
            const tabId = tabs[0].id;
    
            chrome.tabs.sendMessage(tabId, { action: "stopSpeech" });
        });

    };

    const handlePauseResumeSpeech = async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) return;
    
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: isPaused ? "resumeSpeech" : "pauseSpeech" });
            setIsPaused(!isPaused);
        });
    };

    const toggleDarkMode = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "toggleDarkMode" });
        });
    };
    
    const toggleHighContrast = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "toggleHighContrast" });
        });
    };
    

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>
            <label>Reading Level</label>
            <input type="range" min="1" max="3" value={readingLevel} onChange={(e) => setReadingLevel(Number(e.target.value))} />
            <button onClick={summarizeText} disabled={isSummarizing}>{isSummarizing ? "Summarizing..." : "Summarize"}</button>
            <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
            <button onClick={translateText} disabled={!summary || isTranslating}>{isTranslating ? "Translating..." : "Translate"}</button>
            <button onClick={handleSpeakText}>Read Aloud</button>
            <button onClick={handlePauseResumeSpeech} className="bg-yellow-500 text-white p-2 rounded w-full">
            {isPaused ? "Resume" : "Pause"} Read Aloud</button>
            <button onClick={handleStopSpeech} className="bg-red-500 text-white border border-black p-2 rounded w-full">
            Stop Read Aloud</button>
            <button onClick={toggleDarkMode} className="bg-gray-800 text-white p-2 rounded w-full">
            Toggle Dark Mode</button>
            <button onClick={toggleHighContrast} className="bg-black text-yellow-500 p-2 rounded w-full">
            Toggle High-Contrast Mode</button>
        </div>
    );
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<Popup />);
}
