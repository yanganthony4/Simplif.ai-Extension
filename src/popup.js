"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
// API Keys - These should be secured and not exposed in client-side code
const API_KEY = "<YOUR API KEY HERE>";
const DEEPL_API_KEY = "<YOUR API KEY HERE>";
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
// Reading level descriptions
const readingLevels = [
    { level: 1, name: "Elementary", description: "Simple vocabulary for young readers" },
    { level: 2, name: "General", description: "Everyday language for most readers" },
    { level: 3, name: "Academic", description: "Advanced vocabulary for scholarly content" },
];
// If you're using @types/chrome, remove any `declare const chrome: any;` lines
// and ensure you have installed: npm install --save-dev @types/chrome
function Popup() {
    // State variables
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [readingLevel, setReadingLevel] = useState(2);
    const [targetLanguage, setTargetLanguage] = useState("EN");
    const [speechRate, setSpeechRate] = useState(1.0);
    const [speechPitch, setSpeechPitch] = useState(1.0);
    const [selectedVoice, setSelectedVoice] = useState("en-US");
    const [isPaused, setIsPaused] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeTab, setActiveTab] = useState("summarize");
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isHighContrast, setIsHighContrast] = useState(false);
    const [paragraphCount, setParagraphCount] = useState(0);
    useEffect(() => {
        fetchParagraphs()
            .then((paragraphs) => {
            if (paragraphs) {
                setParagraphCount(paragraphs.length);
            }
        })
            .catch((err) => {
            console.error("Error fetching paragraphs:", err);
        });
    }, []);
    // Fetch paragraphs from current page
    const fetchParagraphs = async () => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0 || !tabs[0].id) {
                    reject("No valid tab found");
                    return;
                }
                const tabId = tabs[0].id ?? -1;
                if (tabId === -1) {
                    reject("No valid tab ID");
                    return;
                }
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
    // Summarize text function
    const summarizeText = async () => {
        if (isSummarizing)
            return;
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
            const response = await axios.post("https://api.openai.com/v1/chat/completions", {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompts[readingLevel - 1] }],
            }, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            setSummary(response.data.choices[0].message.content);
        }
        catch (err) {
            setError("Failed to summarize text. Please check your internet connection and try again.");
        }
        finally {
            setIsSummarizing(false);
        }
    };
    // Translate text function
    const translateText = async () => {
        if (!summary || isTranslating)
            return;
        setIsTranslating(true);
        setError(null);
        try {
            const response = await axios.post("https://api-free.deepl.com/v2/translate", { text: [summary], target_lang: targetLanguage }, {
                headers: {
                    Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                    "Content-Type": "application/json",
                },
            });
            setSummary(response.data.translations[0].text);
        }
        catch (err) {
            setError("Failed to translate text. Please check your internet connection and try again.");
        }
        finally {
            setIsTranslating(false);
        }
    };
    // Text-to-speech functions
    const handleSpeakText = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id)
                return;
            const tabId = tabs[0].id ?? -1;
            if (tabId === -1)
                return;
            chrome.tabs.sendMessage(tabId, { action: "getParagraphs" }, (response) => {
                if (response && response.paragraphs && response.paragraphs.length > 0) {
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
    const handleStopSpeech = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id)
                return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "stopSpeech" });
        });
    };
    const handlePauseResumeSpeech = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id)
                return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: isPaused ? "resumeSpeech" : "pauseSpeech" });
            setIsPaused(!isPaused);
        });
    };
    // Accessibility mode toggles
    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id)
                return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "toggleDarkMode" });
        });
        // Also apply to popup body
        document.body.classList.toggle("dark-mode");
    };
    const toggleHighContrast = () => {
        const newMode = !isHighContrast;
        setIsHighContrast(newMode);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id)
                return;
            const tabId = tabs[0].id;
            chrome.tabs.sendMessage(tabId, { action: "toggleHighContrast" });
        });
        // Also apply to popup body
        document.body.classList.toggle("high-contrast-mode");
    };
    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case "summarize":
                return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-bold mb-2", children: "Reading Level" }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex justify-between mb-2", children: [_jsx("span", { className: "text-sm", children: readingLevels[readingLevel - 1].name }), _jsx("span", { className: "text-sm", children: readingLevels[readingLevel - 1].description })] }), _jsx("input", { type: "range", min: 1, max: 3, value: readingLevel, onChange: (e) => setReadingLevel(Number(e.target.value)), className: "w-full", "aria-label": "Reading level" })] }), _jsx("button", { onClick: summarizeText, disabled: isSummarizing || paragraphCount === 0, className: "w-full btn-primary", "aria-busy": isSummarizing, children: isSummarizing ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner", "aria-hidden": "true" }), "Summarizing..."] })) : paragraphCount === 0 ? ("No content to summarize") : (`Summarize (${paragraphCount} paragraphs)`) })] }), summary && (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("h2", { className: "text-lg font-bold", children: "Summary" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { value: targetLanguage, onChange: (e) => setTargetLanguage(e.target.value), className: "text-sm", "aria-label": "Target language", children: languages.map((lang) => (_jsx("option", { value: lang.code, children: lang.name }, lang.code))) }), _jsx("button", { onClick: translateText, disabled: isTranslating, className: "btn-secondary text-sm", "aria-busy": isTranslating, children: isTranslating ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner", "aria-hidden": "true" }), "Translating..."] })) : ("Translate") })] })] }), _jsx("p", { className: "text-sm", children: summary })] })), error && (_jsx("div", { className: "card", style: { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "var(--danger)" }, children: _jsx("p", { className: "text-sm", style: { color: "var(--danger)" }, children: error }) }))] }));
            case "speech":
                return (_jsx("div", { className: "flex flex-col gap-4", children: _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-bold mb-2", children: "Text-to-Speech" }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-sm mb-2 block", children: "Voice" }), _jsx("select", { value: selectedVoice, onChange: (e) => setSelectedVoice(e.target.value), className: "w-full mb-4", "aria-label": "Voice selection", children: voices.map((voice) => (_jsx("option", { value: voice.code, children: voice.name }, voice.code))) }), _jsx("button", { onClick: () => setShowAdvancedOptions(!showAdvancedOptions), className: "text-sm mb-2 w-full btn-secondary", "aria-expanded": showAdvancedOptions, children: showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options" }), showAdvancedOptions && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "flex justify-between mb-2", children: _jsxs("label", { className: "text-sm", children: ["Speech Rate: ", speechRate.toFixed(1), "x"] }) }), _jsx("input", { type: "range", min: 0.5, max: 2, step: 0.1, value: speechRate, onChange: (e) => setSpeechRate(Number(e.target.value)), className: "w-full", "aria-label": "Speech rate" })] }), _jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "flex justify-between mb-2", children: _jsxs("label", { className: "text-sm", children: ["Pitch: ", speechPitch.toFixed(1)] }) }), _jsx("input", { type: "range", min: 0.5, max: 2, step: 0.1, value: speechPitch, onChange: (e) => setSpeechPitch(Number(e.target.value)), className: "w-full", "aria-label": "Speech pitch" })] })] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleSpeakText, disabled: isSpeaking && !isPaused, className: "w-full btn-primary", "aria-label": "Start reading aloud", children: "Read Aloud" }), isSpeaking && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handlePauseResumeSpeech, className: "w-full btn-warning", "aria-label": isPaused ? "Resume reading" : "Pause reading", children: isPaused ? "Resume" : "Pause" }), _jsx("button", { onClick: handleStopSpeech, className: "w-full btn-danger", "aria-label": "Stop reading", children: "Stop" })] }))] })] }) }));
            case "settings":
                return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-bold mb-4", children: "Accessibility Settings" }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-sm font-medium", children: "Dark Mode" }), _jsx("button", { onClick: toggleDarkMode, className: `px-4 py-2 rounded ${isDarkMode ? "btn-primary" : "btn-secondary"}`, "aria-pressed": isDarkMode, children: isDarkMode ? "Enabled" : "Disabled" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-sm font-medium", children: "High Contrast Mode" }), _jsx("button", { onClick: toggleHighContrast, className: `px-4 py-2 rounded ${isHighContrast ? "btn-primary" : "btn-secondary"}`, "aria-pressed": isHighContrast, children: isHighContrast ? "Enabled" : "Disabled" })] })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { className: "text-lg font-bold mb-2", children: "About Simplif.ai" }), _jsx("p", { className: "text-sm mb-2", children: "Simplif.ai is an AI-powered accessibility tool that helps make web content more accessible through:" }), _jsxs("ul", { className: "text-sm list-disc pl-5 mb-2", children: [_jsx("li", { children: "Text summarization at different reading levels" }), _jsx("li", { children: "Translation to multiple languages" }), _jsx("li", { children: "Text-to-speech functionality" }), _jsx("li", { children: "Accessibility modes (Dark & High Contrast)" })] }), _jsx("p", { className: "text-sm", children: "Version 1.0" })] })] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "p-4 w-96", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Simplif.ai" }), _jsx("p", { className: "text-sm", children: "AI-powered accessibility tool" })] }), _jsxs("nav", { className: "flex border-b mb-4 gap-2", children: [_jsx("button", { onClick: () => setActiveTab("summarize"), className: `py-2 px-4 ${activeTab === "summarize" ? "border-b-2 border-primary font-medium" : "text-secondary"}`, "aria-selected": activeTab === "summarize", children: "Summarize" }), _jsx("button", { onClick: () => setActiveTab("speech"), className: `py-2 px-4 ${activeTab === "speech" ? "border-b-2 border-primary font-medium" : "text-secondary"}`, "aria-selected": activeTab === "speech", children: "Read Aloud" }), _jsx("button", { onClick: () => setActiveTab("settings"), className: `py-2 px-4 ${activeTab === "settings" ? "border-b-2 border-primary font-medium" : "text-secondary"}`, "aria-selected": activeTab === "settings", children: "Settings" })] }), _jsx("main", { children: renderTabContent() })] }));
}
// Initialize the app
const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(_jsx(Popup, {}));
}