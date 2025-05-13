# Simplif-AI Extension

Simplif-AI is an accessibility browser extension that improves text summarization, translation, and UI enhancements by leveraging generative AI tools.

## Features

- **ChatGPT Connection:** ChatGPT prompts for reading level selection - summarization.
- **openDyslexia:** Adjusts text for better readability - dyslexic-friendly font overlay.
- **DeepL AI:** Automatically translates summarized text.
- **Text Grabber:** Extracts text from webpages.
- **OCR.space** Extracts text from images and diagrams and then includes them in the summarized text
- **Accessibility:** Adds features for easier web navigation.

---

## Installation

### \*Option 1: Install from GitHub (Manual Installation)\*\*

Follow these steps to install the extension manually:

1. **Clone the repository:**

```sh
   git clone https://github.com/your-repo/simplif-ai-extension.git
```

2. **Navigate into the project folder:**

```sh
   cd simplif-ai-extension
```

3. **Install dependencies:**

```sh
   npm install
```

4. **Add API Keys:**
Must add your own api keys in the space specified in file /popup.js!

How to get OpenAI Api Key Docs: https://platform.openai.com/api-keys
How to get DeepL Api Key Docs: https://developers.deepl.com/docs

5. **Build the extension:**

```sh
   npm run build
```

6. **Load it into Chrome:**

- Open `chrome://extensions/`
- Enable **Developer mode**
- Click **Load unpacked** and select the folder

## **Option 2: Install from the Chrome Web Store**

(Once published)

Open the Chrome Web Store.
Search for Simplif-AI Extension.
Click "Add to Chrome".
Pin the extension to the browser toolbar for easy access.

---

## Usage

1. Click on the **Simplif-AI extension icon** in the browser toolbar.
2. Choose an option from the dropdown menu:

   - **openDyslexia:** Adjusts text for better readability.
   - **In-page Excerpts:** Highlights and extracts key text from webpages.
   - **Summarization Paragraph:** Generates summarized content.
   - **Translate Text:** Uses DeepL to translate.
   - **ChatGPT Assistant:** Helps with explanations.

3. (Optional) Click the **⚙️ Settings (Cogwheel Icon)** to enable/disable specific features.
---

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Simplif-AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Maintainers

- **Elina** - APIs - summarization & translation, OCR.space
- **Anthony** - openDyslexia, Text Grabber
- **Anjhel** - UI, Security Testing
- **Sila** - Documentation
- **Sumaiya** - Accessibility, Presentation
