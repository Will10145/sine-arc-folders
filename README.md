# Arc → Zen (Sine mod prototype)

A **Sine/userChromeJS** mod that adds a polished, custom HTML browser-chrome preview to Arc shared folder links and imports them as pinned or ordinary tabs. No Cloudflare, extension, account, or backend.

## Installation

1. Back up your Zen profile first.
2. Ensure Sine is installed and JS from unofficial sources is allowed.
3. Copy this folder into your Zen profile's `chrome/sine-mods/arc-zen-sine/` directory. Sine's local mod registration varies by release: use its local-mod manager or register this directory according to your installed Sine version. Alternatively publish these files in a GitHub repository and install that repository from Sine's custom mod UI.
4. Restart Zen; the floating **Import Arc folder** button should appear.
5. Open any `https://arc.net/folder/<uuid>` link and click the button. Review links and choose **Import as pinned tabs**.

## Important limitations

- This is a **prototype, not browser-tested**. Sine's manifest script-discovery conventions and Zen internals change between versions; the `theme.json` script entry may require adjustment for your version.
- The UI is **custom HTML in Zen's browser chrome**, visually overlaying the Arc page. It does not modify Arc's own DOM, which is isolated from privileged userChrome scripts.
- Imported pinned tabs use `gBrowser.pinTab`, not Zen's workspace-specific pinned folder implementation. Folder hierarchy is shown by indentation but is **not** recreated as native Zen folders.
- The import is limited to 100 tabs for safety. Duplicate tabs are not detected. Clicking import twice adds duplicates.
- A private Arc folder or Arc site markup change may cause parsing to fail. Arc data is fetched without credentials.
- No URLs are sent to any third-party backend; the browser fetches the Arc page directly.

## Files

- `theme.json` — Sine mod metadata
- `arc-zen.uc.js` — Arc parser and Zen browser chrome UI / tab import
- `userChrome.css` — dark glassy styling
