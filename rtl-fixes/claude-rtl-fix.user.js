// ==UserScript==
// @name         Claude.ai Hebrew RTL Fix
// @namespace    https://claude.ai/
// @version      1.0.0
// @description  Forces RTL on Claude.ai messages that are mostly Hebrew.
// @author       Adolanium
// @match        https://claude.ai/*
// @match        https://*.claude.ai/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const HEBREW_RE = /[֐-׿יִ-ﭏ]/;
    // Min ratio of Hebrew chars to alphabetic chars before a block is flagged as Hebrew.
    const HEBREW_RATIO_THRESHOLD = 0.30;

    const SKIP_TAGS = new Set([
        'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
        'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SVG', 'PATH'
    ]);

    const TARGET_SELECTOR = [
        'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'td', 'th', 'dd', 'dt',
        '[data-testid="user-message"]',
        '.font-claude-message',
        '.font-user-message'
    ].join(',');

    const css = `
        [data-rtl-fix="1"] {
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: plaintext;
        }

        [data-rtl-fix="1"] ul,
        [data-rtl-fix="1"] ol {
            direction: rtl !important;
            text-align: right !important;
            padding-right: 1.5em;
            padding-left: 0;
        }

        /* inline code stays LTR inside a Hebrew block */
        [data-rtl-fix="1"] code,
        [data-rtl-fix="1"] kbd,
        [data-rtl-fix="1"] samp {
            direction: ltr;
            unicode-bidi: embed;
        }

        [data-rtl-fix="1"] pre,
        [data-rtl-fix="1"] pre * {
            direction: ltr !important;
            text-align: left !important;
            unicode-bidi: isolate;
        }

        [data-rtl-fix="1"] table {
            direction: rtl;
        }

        [data-testid="user-message"][data-rtl-fix="1"] {
            text-align: right !important;
        }

        /* plaintext picks direction from the first strong char, which fixes punctuation landing on the wrong edge */
        .prose [data-rtl-fix="1"],
        .prose-message [data-rtl-fix="1"] {
            unicode-bidi: plaintext;
        }
    `;

    function injectStyle() {
        const style = document.createElement('style');
        style.id = 'claude-rtl-fix-style';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function isHebrewBlock(text) {
        if (!text) return false;
        let hebrew = 0;
        let alpha = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (HEBREW_RE.test(ch)) {
                hebrew++;
                alpha++;
            } else if (/[A-Za-zÀ-ɏ]/.test(ch)) {
                alpha++;
            }
        }
        if (alpha === 0) return false;
        return (hebrew / alpha) >= HEBREW_RATIO_THRESHOLD;
    }

    function applyToElement(el) {
        if (!el || el.nodeType !== 1) return;
        if (SKIP_TAGS.has(el.tagName)) return;
        if (el.dataset.rtlFix === '1') return;

        const text = el.innerText || el.textContent || '';
        if (text.length < 2) return;

        if (isHebrewBlock(text)) {
            el.dataset.rtlFix = '1';
        }
    }

    function scan(root) {
        if (!root || !root.querySelectorAll) return;
        if (root.nodeType === 1 && root.matches && root.matches(TARGET_SELECTOR)) {
            applyToElement(root);
        }
        const nodes = root.querySelectorAll(TARGET_SELECTOR);
        for (let i = 0; i < nodes.length; i++) {
            applyToElement(nodes[i]);
        }
    }

    let scheduled = false;
    const pendingRoots = new Set();

    function flush() {
        scheduled = false;
        for (const r of pendingRoots) scan(r);
        pendingRoots.clear();
    }

    function schedule(root) {
        pendingRoots.add(root);
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(flush);
        }
    }

    function startObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach((n) => {
                        if (n.nodeType === 1) schedule(n);
                    });
                } else if (m.type === 'characterData') {
                    // Streaming text mutated. The block may have just crossed the Hebrew threshold.
                    const parent = m.target.parentElement;
                    if (parent) {
                        if (parent.dataset.rtlFix !== '1') {
                            applyToElement(parent);
                            let p = parent.parentElement;
                            let hops = 0;
                            while (p && hops < 4) {
                                if (p.matches && p.matches(TARGET_SELECTOR)) {
                                    applyToElement(p);
                                    break;
                                }
                                p = p.parentElement;
                                hops++;
                            }
                        }
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function init() {
        injectStyle();
        scan(document.body);
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
