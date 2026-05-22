// ==UserScript==
// @name         ChatGPT Hebrew RTL Fix
// @namespace    https://chatgpt.com/
// @version      1.0.0
// @description  Forces RTL on ChatGPT messages that are mostly Hebrew.
// @author       Adolanium
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Hebrew chars (block + presentation forms).
  const HEBREW_RE = /[֐-׿יִ-ﭏ]/g;
  // Latin chars (basic + Latin-1 + extended).
  const LATIN_RE = /[A-Za-zÀ-ɏ]/g;

  const FIXED_ATTR = 'data-rtl-fix';
  const MSG_SELECTOR = '[data-message-author-role]';
  const BLOCK_SELECTOR = 'p, div, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, summary';

  function countMatches(re, s) {
    re.lastIndex = 0;
    let n = 0;
    while (re.exec(s) !== null) n++;
    return n;
  }

  function isHebrewBlock(text) {
    if (!text) return false;
    const hebrew = countMatches(HEBREW_RE, text);
    if (hebrew === 0) return false;
    const latin = countMatches(LATIN_RE, text);
    return hebrew > latin;
  }

  function fixMessage(msg) {
    const text = msg.innerText || '';
    if (!isHebrewBlock(text)) return;
    if (getComputedStyle(msg).direction !== 'ltr') {
      msg.setAttribute(FIXED_ATTR, 'skip');
      return;
    }
    msg.setAttribute('dir', 'rtl');
    msg.setAttribute(FIXED_ATTR, '1');
    // Child blocks may carry their own dir="auto", so force RTL when the block text is mostly Hebrew.
    msg.querySelectorAll(BLOCK_SELECTOR).forEach((b) => {
      const btxt = b.innerText || '';
      if (!isHebrewBlock(btxt)) return;
      if (getComputedStyle(b).direction === 'ltr') {
        b.setAttribute('dir', 'rtl');
      }
    });
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(MSG_SELECTOR).forEach((msg) => {
      // Re-check streaming messages. Only skip if already marked and still RTL.
      if (msg.getAttribute(FIXED_ATTR) === '1') {
        if (getComputedStyle(msg).direction === 'rtl') return;
      }
      fixMessage(msg);
    });
  }

  // Coalesce mutations into one rAF, since ChatGPT streams tokens char-by-char.
  let pending = false;
  function schedule(root) {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      scan(root);
    });
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
        schedule(document);
        return;
      }
      if (m.type === 'characterData') {
        schedule(document);
        return;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // SPA navigation between chats. URL changes without a full reload.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      schedule(document);
    }
  }, 500);

  scan(document);
})();
