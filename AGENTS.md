# Automatic Web & GitHub Deployment Rule

## Mandatory Instruction
Every time any code, HTML, CSS, or JavaScript updates or fixes are made in this repository:
1. **Update `version.json`**:
   Bump the `buildTime` (Unix timestamp in milliseconds), `version`, and `timestamp` (current date & time: `YYYY-MM-DD HH:mm:ss`).
2. **Commit and Push to GitHub**:
   Run `git add -A` and `git commit -m "Auto-update: <brief description>"` and push to `origin main` (`git push origin main`).
3. **Never Wait for User Prompt**:
   Do not ask the user whether to push or wait for them to say "update web". Always push automatically after completing any feature or bug fix.
4. **Google Apps Script Sync (if clasp is configured)**:
   Run `clasp push -f` whenever `Code.js` or Google Apps Script files are updated.
