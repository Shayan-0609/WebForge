document.addEventListener("DOMContentLoaded", () => {
  // Elements Selection
  const editorInput = document.getElementById("editorInput");
  const highlighting = document.getElementById("highlighting").querySelector("code");
  const highlightingPre = document.getElementById("highlighting");
  const outputWindow = document.getElementById("outputWindow");

  // Buttons
  const runBtn = document.getElementById("runBtn");
  const saveBtn = document.getElementById("saveBtn");
  const saveBtnPanel = document.getElementById("saveBtnPanel");
  const loadBtnPanel = document.getElementById("loadBtnPanel");
  const resetBtn = document.getElementById("resetBtn");
  const resetBtnPanel = document.getElementById("resetBtnPanel");
  const hardResetBtn = document.getElementById("hardResetBtnPanel");
  const formatBtn = document.getElementById("formatBtn");

  // Settings Elements
  const wordWrapToggle = document.getElementById("wordWrapToggle");
  const lineNumberToggle = document.getElementById("lineNumberToggle");
  const autoRunToggle = document.getElementById("autoRunToggle");
  const fontSizeRange = document.getElementById("fontSizeRange");
  const fontSizeDisplay = document.getElementById("fontSizeDisplay");
  const themeButtons = document.querySelectorAll("[data-theme]");
  const fontButtons = document.querySelectorAll("[data-font]");

  // --- Default Code ---
  const defaultTemplate = `<!--
   ==================================
   ------- Keyboard Shortcuts -------
   ==================================
     1.  Run: Ctrl + R
     2.  Save: Ctrl + S
     3.  Format: Alt + Shift + F
     4.  Reset: Ctrl + Shift + R
     5.  Load: Ctrl + Shift + L
     6.  Save As: Ctrl + Shift + A
     7.  Reset All: Ctrl + Alt + R
     8.  Font Size +: Ctrl + +
     9.  Font Size -: Ctrl + -
   ==================================
-->`;

  // --- Enable Tooltips ---
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

  // --- CORE FUNCTIONS ---

  // Update Output (Iframe)
  const updateOutput = () => {
    const code = editorInput.value.trim();
    let documentContent;

    if (/^\s*<!DOCTYPE html>/i.test(code) || /<html[\s>]/i.test(code)) {
      documentContent = code;
    } else {
      documentContent = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Document</title>
          <style>
            *,
            *::before,
            *::after {
              box-sizing: border-box;
            }
            html,
            body {
              height: 100%;
              width: 100%;
              -webkit-text-size-adjust: 100%;
              -webkit-tap-highlight-color: rgba(0,0,0,0);
            }
            body {
              min-height: 100vh;
              font-family: system-ui, -apple-system, "Segoe UI", Arial, "Helvetica Neue", Roboto, "Liberation Sans", "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Symbol", "Segoe UI Emoji", "Noto Color Emoji";
              font-size: 1rem;
              font-weight: 400;
              color: #1f2328;
              background-color: #fff;
              line-height: 1.5;
              text-align: left;
            }
          </style>
        </head>
        <body>${code}</body>
      </html>`;
    }

    outputWindow.srcdoc = documentContent;
  };

  // Sync Scrolling
  editorInput.addEventListener("scroll", () => {
    highlightingPre.scrollTop = editorInput.scrollTop;
    highlightingPre.scrollLeft = editorInput.scrollLeft;
  });

  // Update Prism Highlighting
  const updateHighlighting = () => {
    let code = editorInput.value;
    if (code[code.length - 1] === "\n") code += " ";
    highlighting.textContent = code;

    // Prism highlight call
    Prism.highlightElement(highlighting);

    // Fix: Force Prism to redraw line numbers
    if (highlightingPre.classList.contains("line-numbers")) {
      const env = {
        element: highlighting,
        grammar: Prism.languages.markup,
        language: "markup",
        code: code
      };
      Prism.hooks.run("complete", env);
    }
  };

  // --- TAB KEY & AUTO INDENT LOGIC ---

  editorInput.addEventListener("keydown", (e) => {
    // 1. Tab Key Support (2 Spaces)
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editorInput.selectionStart;
      const end = editorInput.selectionEnd;

      editorInput.value = editorInput.value.substring(0, start) + "  " + editorInput.value.substring(end);

      editorInput.selectionStart = editorInput.selectionEnd = start + 2;

      debouncedHighlight();
      if (autoRunToggle.checked) debouncedUpdateOutput();
    }

    // 2. Auto Indent (Enter Key)
    if (e.key === "Enter") {
      e.preventDefault();

      const start = editorInput.selectionStart;
      const text = editorInput.value;

      // Current line indentation check
      const lastNewLine = text.lastIndexOf("\n", start - 1);
      const currentLine = text.substring(lastNewLine + 1, start);
      const whitespace = currentLine.match(/^\s*/)[0];

      const insertText = "\n" + whitespace;
      editorInput.value = text.substring(0, start) + insertText + text.substring(start);

      editorInput.selectionStart = editorInput.selectionEnd = start + insertText.length;

      editorInput.scrollLeft = 0;
      highlightingPre.scrollLeft = 0;

      debouncedHighlight();
      if (autoRunToggle.checked) debouncedUpdateOutput();
    }
  });

  const syncCursorScroll = (e) => {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
    if (e.type === "keyup" && !keys.includes(e.key)) return;

    const start = editorInput.selectionStart;
    const text = editorInput.value;
    const lastNewLine = text.lastIndexOf("\n", start - 1);

    const cursorCol = start - lastNewLine - 1;

    if (cursorCol < 15 && editorInput.scrollLeft > 50) {

      const fontSize = parseInt(window.getComputedStyle(editorInput).fontSize) || 14;
      const charWidth = fontSize * 0.6;

      const targetScroll = Math.max(0, (cursorCol * charWidth) - 30);
      editorInput.scrollLeft = targetScroll;
      highlightingPre.scrollLeft = targetScroll;
    }
  };

  editorInput.addEventListener("keyup", syncCursorScroll);
  editorInput.addEventListener("click", syncCursorScroll);

  // --- AUTORUN DEBOUNCE ---
  const debounce = (fn, delay = 400) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  // Debounced version of output update
  const debouncedUpdateOutput = debounce(updateOutput, 500);

  const debouncedHighlight = debounce(updateHighlighting, 120);

  // Input Event
  editorInput.addEventListener("input", () => {
    debouncedHighlight();
    if (autoRunToggle.checked) debouncedUpdateOutput();
  });

  // --- SETTINGS LOGIC (AUTO-SAVE) ---

  const saveSettings = () => {
    const settings = {
      wordWrap: wordWrapToggle.checked,
      lineNumbers: lineNumberToggle.checked,
      autoRun: autoRunToggle.checked,
      fontSize: fontSizeRange.value,
      theme: document.querySelector("[data-theme].active").dataset.theme,
      font: document.querySelector("[data-font].active").dataset.font
    };
    localStorage.setItem("editorSettings", JSON.stringify(settings));
  };

  const loadSettings = () => {
    let saved = null;
  
    try {
      const raw = localStorage.getItem("editorSettings");
      if (raw) {
        saved = JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Invalid editorSettings in localStorage. Resetting...");
      localStorage.removeItem("editorSettings");
    }
  
    if (!saved) {
      applyFontSize(14);
      return;
    }
  
    wordWrapToggle.checked = saved.wordWrap;
    lineNumberToggle.checked = saved.lineNumbers;
    autoRunToggle.checked = saved.autoRun;
    fontSizeRange.value = saved.fontSize;
  
    applyWordWrap(saved.wordWrap);
    applyLineNumbers(saved.lineNumbers);
    applyFontSize(saved.fontSize);
    applyTheme(saved.theme);
    applyFont(saved.font);
  };

  // Apply Functions
  const applyWordWrap = (enabled) => {
    const wrapper = document.querySelector(".editor-wrapper");
    enabled ? wrapper.classList.add("wrap-enabled") : wrapper.classList.remove("wrap-enabled");
  };

  const applyLineNumbers = (enabled) => {
    if (enabled) {
      highlightingPre.classList.add("line-numbers");
      document.documentElement.style.setProperty("--line-no-width", "4rem"); // Space for numbers
    } else {
      highlightingPre.classList.remove("line-numbers");
      document.documentElement.style.setProperty("--line-no-width", "0px");
    }
    updateHighlighting(); // Re-render to trigger Prism plugin
  };

  const applyFontSize = (size) => {
    editorInput.style.fontSize = `${size}px`;
    highlightingPre.style.fontSize = `${size}px`;
    fontSizeDisplay.textContent = `${size}px`;
  };

  const applyTheme = (themeName) => {
    const lightLink = document.getElementById("prism-light");
    const darkLink = document.getElementById("prism-dark");

    if (themeName === "dark") {
      lightLink.disabled = true;
      darkLink.disabled = false;
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else {
      lightLink.disabled = false;
      darkLink.disabled = true;
      document.documentElement.setAttribute("data-bs-theme", "light");
    }

    themeButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.theme === themeName);
    });
  };

  const applyFont = (fontFamily) => {
    const fonts = {

      fira: "'Fira Code', monospace",
      jetbrains: "'JetBrains Mono', monospace",
      roboto: "'Roboto Mono', monospace",

      vscode: "'Cascadia Code','Fira Code','JetBrains Mono',monospace",

      jbide: "'JetBrains Mono','Fira Code','IBM Plex Mono',monospace",

      pro: `
      'JetBrains Mono',
      'Fira Code',
      'IBM Plex Mono',
      'Source Code Pro',
      'Cascadia Code',
      'Victor Mono',
      'Roboto Mono',
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      'Liberation Mono',
      'Courier New',
      monospace
    `,

      mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    };

    document.documentElement.style.setProperty("--editor-font", fonts[fontFamily]);

    fontButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.font === fontFamily);
    });
  };

  // --- EVENT LISTENERS FOR SETTINGS ---

  wordWrapToggle.addEventListener("change", () => { applyWordWrap(wordWrapToggle.checked); saveSettings(); });
  lineNumberToggle.addEventListener("change", () => { applyLineNumbers(lineNumberToggle.checked); saveSettings(); });
  autoRunToggle.addEventListener("change", saveSettings);
  fontSizeRange.addEventListener("input", () => { applyFontSize(fontSizeRange.value); saveSettings(); });

  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => { applyTheme(btn.dataset.theme); saveSettings(); });
  });

  fontButtons.forEach(btn => {
    btn.addEventListener("click", () => { applyFont(btn.dataset.font); saveSettings(); });
  });

  // --- TOOLBAR BUTTONS LOGIC ---

  // Run
  runBtn.addEventListener("click", updateOutput);

  // Save (To LocalStorage)
  const saveCodeToLocal = () => {
    localStorage.setItem("savedCode", editorInput.value);
    alert("Code saved to browser storage!");
  };
  saveBtn.addEventListener("click", saveCodeToLocal);

  // Format Code

  formatBtn.addEventListener("click", () => {
    const textarea = editorInput;
    const code = textarea.value;

    // save cursor
    const beforeCursor = code.slice(0, textarea.selectionStart);
    const line = beforeCursor.split("\n").length - 1;
    const col = beforeCursor.length - beforeCursor.lastIndexOf("\n") - 1;

    // ✅ save scroll position
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const tryFormat = (parser) => {
      try {
        return prettier.format(code, {
          parser: parser,
          plugins: prettierPlugins,
          tabWidth: 2
        });
      } catch {
        return null;
      }
    };

    let formatted =
      tryFormat("html") ||
      tryFormat("css") ||
      tryFormat("babel");

    if (!formatted) {
      alert("Formatter failed");
      return;
    }

    textarea.value = formatted;
    updateHighlighting();

    requestAnimationFrame(() => {
      textarea.focus();

      // restore cursor
      const lines = formatted.split("\n");

      let pos = 0;
      for (let i = 0; i < Math.min(line, lines.length); i++) {
        pos += lines[i].length + 1;
      }
      pos += Math.min(col, (lines[line] || "").length);

      textarea.setSelectionRange(pos, pos);

      // ✅ restore scroll
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    });
  });

  // keyboard shortcuts (format / run / save)

  document.addEventListener("keydown", (e) => {
    // Run: Ctrl + R
    if (e.ctrlKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      runBtn.click();
    }

    // Save: Ctrl + S
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveBtn.click();
    }

    // Load: Ctrl + Shift + L
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      loadBtnPanel.click();
    }

    // Save As: Ctrl + Shift + A
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      saveBtnPanel.click();
    }

    // Reset: Ctrl + Shift + R
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      resetBtn.click();
    }

    // Reset All: Ctrl + Alt + R
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      hardResetBtn.click();
    }

    // Format: Alt + Shift + F
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      formatBtn.click();
    }

    // Zoom In / Out using Ctrl + + / Ctrl + -
    if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
      e.preventDefault();

      let size = parseInt(fontSizeRange.value, 10);
      if (size < 24) size++;

      fontSizeRange.value = size;
      applyFontSize(size);
      saveSettings();
    }

    if (e.ctrlKey && e.key === "-") {
      e.preventDefault();

      let size = parseInt(fontSizeRange.value, 10);
      if (size > 8) size--;

      fontSizeRange.value = size;
      applyFontSize(size);
      saveSettings();
    }
  });

  // Load (From LocalStorage)
  loadBtnPanel.addEventListener("click", () => {
    const saved = localStorage.getItem("savedCode");
    if (saved !== null) {
      editorInput.value = saved;
      updateHighlighting();
      updateOutput();
    } else {
      alert("No saved code found.");
    }
  });

  // Save As (Download File) - FIXED VERSION
  saveBtnPanel.addEventListener("click", () => {
    const codeContent = editorInput.value;

    const blob = new Blob([codeContent], { type: "text/html" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    
    const filename = prompt("File name:", "index.html") || "index.html";
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  });

  // Reset Logic
  const resetEditor = () => {
    editorInput.value = defaultTemplate;
    updateHighlighting();
    updateOutput();
  };
  resetBtn.addEventListener("click", resetEditor);
  resetBtnPanel.addEventListener("click", resetEditor);

  hardResetBtn.addEventListener("click", () => {
    if (confirm("Are you sure? This will delete saved code and reset settings.")) {
      // Targeted cleaning
      const keysToRemove = ["editorSettings", "savedCode"];
      keysToRemove.forEach(k => localStorage.removeItem(k));

      location.reload();
    }
  });

  // --- INITIALIZATION ---
  loadSettings();

  const savedSettings = localStorage.getItem("editorSettings");
  if (!savedSettings) {
    applyTheme("dark"); // Default dark theme
    applyFont("pro");
  }

  const savedCode = localStorage.getItem("savedCode");

  if (savedCode) {
    editorInput.value = savedCode;
  } else {
    editorInput.value = defaultTemplate;
  }

  updateHighlighting();
  updateOutput();
});