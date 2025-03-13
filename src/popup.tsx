import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

function Popup() {
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleClick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                setError("No active tab found");
                return;
            }

            const tabId = tabs[0].id;
            if (typeof tabId !== 'number') {
                setError("No valid tab ID found");
                return;
            }

            // Inject content script dynamically before sending message
            chrome.scripting.executeScript(
                {
                    target: { tabId },
                    files: ["content.js"],
                },
                () => {
                    if (chrome.runtime.lastError) {
                        setError(chrome.runtime.lastError.message || "An unknown error occurred");
                        return;
                    }

                    // Now send message to content script
                    chrome.tabs.sendMessage(tabId, { action: "getParagraphs" }, (response) => {
                        if (chrome.runtime.lastError) {
                            setError(chrome.runtime.lastError.message || "An unknown error occurred");
                            return;
                        }
                        setParagraphs(response?.paragraphs || []);
                    });
                }
            );
        });
    };

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>
            <button onClick={grabParagraphs} className="bg-blue-500 text-white p-2 rounded mb-4">
                Grab Paragraphs
            </button>
            <button onClick={summarizeText} className="bg-green-500 text-white p-2 rounded mb-4">
                Summarize Text
            </button>
            {error && <p className="text-red-500">{error}</p>}
            <ul className="mb-4">
                {paragraphs.map((para, index) => (
                    <li key={index} className="mb-2">{para}</li>
                ))}
            </ul>
            {summary && (
                <div className="mt-4">
                    <h2 className="text-xl font-bold">Summary</h2>
                    <p>{summary}</p>
                </div>
            )}
        </div>
    );
}

// ✅ Correct way to mount React in Chrome extension
const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<Popup />);
} else {
    console.error("Root element not found!");
}