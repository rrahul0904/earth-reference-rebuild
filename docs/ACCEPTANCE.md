# Acceptance gate

The project is considered ready for production only after:

- static smoke checks pass;
- Chromium initializes WebGL2 without the fallback;
- sampled globe pixels prove non-blank rendered output;
- desktop timeline, display mode, deep-time navigation and record dialog work;
- mobile Explore, story sheet, display mode and timeline navigation work;
- browser tests finish with zero page errors;
- Vercel serves every bundled geological asset successfully.

The GitHub Actions workflow uploads desktop and mobile browser evidence for each acceptance run.
