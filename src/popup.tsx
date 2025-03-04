import React, { useState } from "react";

export default function Popup() {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        setError("No active tab found");
        return;
      }

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

          // Once content script is injected, send message to get text
          chrome.tabs.sendMessage(tabs[0].id!, { action: "getText" }, (response) => {
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
      <button
        onClick={handleClick}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Grab Text
      </button>
      {error && <p className="text-red-500">{error}</p>}
      <ul>
        {paragraphs.map((para, index) => (
          <li key={index} className="mb-2 p-2 border rounded">
            {para}
          </li>
        ))}
      </ul>
    </div>
  );
}
npm install -D @types/chrome
