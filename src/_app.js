import { useState } from "react";

export default function Home() {
  const [paragraphs, setParagraphs] = useState([]);
  const [error, setError] = useState("");

  const handleClick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        setError("No active tab found");
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const paragraphs = Array.from(document.getElementsByTagName("p"));
          return paragraphs
            .filter(p => p.textContent.trim().length > 100)
            .map(p => p.textContent.trim());
        }
      }, (injectionResults) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message);
          return;
        }
        const [result] = injectionResults;
        setParagraphs(result.result);
      });
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Simplif.ai</h1>
      <button
        onClick={handleClick}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Grab Long Paragraphs
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
