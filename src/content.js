chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getParagraphs") {
      const paragraphs = Array.from(document.getElementsByTagName("p"))
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0);
      sendResponse({ paragraphs });
  }

  if (request.action === "toggleOpenDyslexic") {
    if (request.enable) {
        
        if (!document.getElementById("openDyslexicFont")) {
            const fontLink = document.createElement("link");
            fontLink.id = "openDyslexicFont";
            fontLink.rel = "stylesheet";
            fontLink.href = "https://fonts.cdnfonts.com/css/open-dyslexic";
            document.head.appendChild(fontLink);
        }

        
        if (!document.getElementById("openDyslexicStyles")) {
            const style = document.createElement("style");
            style.id = "openDyslexicStyles";
            style.innerHTML = `
                /* Tüm fontları sıfırla ve OpenDyslexic uygula */
                * {
                    font-family: 'Open-Dyslexic' !important;
                    font-weight: normal !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.classList.add("open-dyslexic");

    } else {
        
        document.body.classList.remove("open-dyslexic");

       
        const fontLink = document.getElementById("openDyslexicFont");
        if (fontLink) fontLink.remove();

        
        const style = document.getElementById("openDyslexicStyles");
        if (style) style.remove();

        
        const resetStyle = document.createElement("style");
        resetStyle.id = "resetFontStyles";
        resetStyle.innerHTML = `
            * {
                font-family: initial !important;
            }
        `;
        document.head.appendChild(resetStyle);

        
        setTimeout(() => {
            document.getElementById("resetFontStyles")?.remove();
        }, 100);
    }
}
});
