import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function Popup() {
    const [paragraphs, setParagraphs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleClick = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length === 0) {
              setError("No active tab found");
              return;
          }
  
          // Inject content script dynamically before sending message
          chrome.scripting.executeScript(
              {
                  target: { tabId: tabs[0].id },
                  files: ["content.js"],
              },
              () => {
                  if (chrome.runtime.lastError) {
                      setError(chrome.runtime.lastError.message);
                      return;
                  }
  
                  // Now send message to content script
                  chrome.tabs.sendMessage(tabs[0].id!, { action: "getParagraphs" }, (response) => {
                      if (chrome.runtime.lastError) {
                          setError(chrome.runtime.lastError.message);
                          return;
                      }
                      setParagraphs(response.paragraphs || []);
                  });
              }
          );
      });
  };  

    return (
        <div className="p-4 w-96">
            <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>
            <button onClick={handleClick}>
                Grab Paragraphs
            </button>
            {error && <p>{error}</p>}
            <ul>
                {paragraphs.map((para, index) => (
                    <li key={index}>{para}</li>
                ))}
            </ul>
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
