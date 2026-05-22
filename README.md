# userscripts

My personal Tampermonkey scripts. Organized into folders by topic, more get added when I get annoyed enough by something to fix it.

To install any of them, click the install link in the relevant table below. Tampermonkey (or Violentmonkey) will prompt to add the script and will auto-check the raw URL for updates whenever I bump the `@version`.

## rtl-fixes

The big chat sites detect text direction per-block. Works fine, until a Hebrew paragraph happens to start with a Latin word (a brand name, a CLI flag, a URL). The whole block gets rendered LTR and the punctuation ends up on the wrong edge of the line. These scripts override that.

| Script | Description | Install |
| --- | --- | --- |
| `chatgpt-rtl-fix.user.js` | Forces RTL on ChatGPT messages that are mostly Hebrew. | [install](https://github.com/Adolanium/userscripts/raw/main/rtl-fixes/chatgpt-rtl-fix.user.js) |
| `claude-rtl-fix.user.js` | Forces RTL on Claude.ai messages that are mostly Hebrew. | [install](https://github.com/Adolanium/userscripts/raw/main/rtl-fixes/claude-rtl-fix.user.js) |
