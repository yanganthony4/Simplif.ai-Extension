import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

//api key
const API_KEY = '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'

function Popup() {
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    const [readingLevel, setReadingLevel] = useState<number>(2); // Default to General

    const grabParagraphs = () => {
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
                    files: ["src/content.js"],
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
                        console.log("Fetched Paragraphs:", response?.paragraphs); // Log the fetched paragraphs in console
                        setParagraphs(response?.paragraphs || []);
                        setSummary(null); //clear the summary when new paragraph is fetched
                    });
                }
            );
        });
    };
    const summarizeText = async () => {
        if (isSummarizing) return; // prevent multiple clicks
        setIsSummarizing(true);// disable during api call

        const text = paragraphs.join("\n");
        if (!text) {
            setError("No paragraphs to summarize");
            setIsSummarizing(false); // re-enable the button
            return;
        }

        const prompts = [
            "Summarize the following text for a 4th-grade reading level, while still maintaining the integrity and nuance: ${text}", // Grade 4
            "Summarize the following text in simple terms, while still maintaining the integrity and nuance: ${text}", // General/Easy
            "Summarize the following text for an academic audience, while still maintaining the integrity and nuance: ${text}", // Academic/Masters
        ];

        const prompt = prompts[readingLevel - 1].replace("${text}", text); // Replace ${text} with the actual text

        try {
            const response = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                },
                {
                    headers: {
                        "Authorization": `Bearer ${API_KEY}`, 
                        "Content-Type": "application/json",
                    },
                }
            );
            setSummary(response.data.choices[0].message.content);//setting the summary
            
            setParagraphs([]);//clear the grabbed paragraphs
            
            console.log("Summary State Updated:", response.data.choices[0].message.content);//log to verify text update
            console.log("Summary:", response.data.choices[0].message.content);//log summarized content
        
        } catch (error) {
            setError("Failed to summarize text");
        } finally {
            setIsSummarizing(false); // re-enable the button
        }
        
    };

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>
            <button onClick={grabParagraphs} 
            className="bg-blue-500 text-white p-2 rounded mb-4"
            >
                Grab Paragraphs
            </button>
            <div className="mb-4">
                <label htmlFor="readingLevel" className="block text-sm font-medium text-gray-700">
                    Reading Level
                </label>
                <input
                    type="range"
                    id="readingLevel"
                    name="readingLevel"
                    min="1"
                    max="3"
                    value={readingLevel}
                    onChange={(e) => setReadingLevel(Number(e.target.value))}
                    className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Grade 4</span>
                    <span>General/Easy</span>
                    <span>Academic</span>
                </div>
            </div>
            <button onClick={summarizeText} 
            className="bg-green-500 text-white p-2 rounded mb-4"
            disabled={isSummarizing} //disable buttonn while summariign
            >
            {isSummarizing ? "Summarizing..." : "Summarize Text"// state to of button
            }
            </button> 
            {error && <p className="text-red-500">{error}</p>}
            {paragraphs.length > 0 && ( // Display original paragraphs if they exist
                <ul className="mb-4">
                    {paragraphs.map((para, index) => (
                        <li key={index} className="mb-2">{para}</li>
                    ))}
                </ul>
            )}
            {summary && ( // display the summary if it exists
                <div className="mt-4">
                    <h2 className="text-xl font-bold">Summary</h2>
                    <p>{summary}</p>
                </div>
            )}
        </div>
    );
}
//uploading to google extensions
const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(<Popup />);
} else {
    console.error("Root element not found!");
}