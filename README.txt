Tabby · ChatGPT → PDF — Install & Use
======================================

INSTALL (Chrome / Edge)
1. Unzip chatgpt-to-pdf-extension.zip to a permanent folder.
2. Open chrome://extensions
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and select the "extension" folder (the one containing manifest.json).
5. Reload ChatGPT.
To update: replace the folder contents, click the reload icon on the extension card, then reload ChatGPT.

USE
1. Open a ChatGPT conversation. A "PDF" button appears at the top right.
2. Click it. The tool scrolls through the whole chat to load every message, then shows a preview.
3. Click "Save as PDF". A new tab opens with just the conversation and the print dialog
   (it closes itself afterwards). In the print dialog:
   - Destination: Save as PDF
   - More settings → check "Background graphics" (keeps code block and message bubble colors)
   - Margins: any setting works (the export adds its own 12 mm page margins)
   - Headers and footers: optional
4. Save. The file name defaults to the chat title. Press Esc or "Close" to exit the preview.

HOW WIDE CONTENT IS HANDLED
- Code blocks: long lines wrap. Long code blocks with their own scrollbar are read line by line
  before export, so the whole block is included (with syntax colors).
- Display math: slightly too wide → scaled down a little; much too wide → broken into lines at
  =, +, − outside parentheses; unbreakable blocks (matrices) → scaled to page width.
- Tables: text wraps inside cells; still too wide → scaled down; extreme cases → break inside words.
- Images: scaled to page width.

INK-SAVING CODE BLOCKS (on by default; checkbox in the preview bar)
- Code blocks become white with dark text, for printing.
- Syntax-highlight colors keep their hue (purple stays purple, green stays green), just darkened
  so they are readable on white. Nothing outside code blocks changes.

KNOWN LIMITS
- Needs Chrome/Edge 111 or newer.
- If ChatGPT changes its page structure and the tool stops finding messages, the selectors need updating.
- Content in the ChatGPT Canvas side panel is not part of the chat and is not exported.
- Dark mode is temporarily switched to light during export and restored when you close the preview.
