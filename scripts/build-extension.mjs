#!/usr/bin/env node
/**
 * Build the loadable Chrome extension archive.
 *
 * The ZIP writer and the committed `public/downloads/` copy live in
 * `package-extension.mjs`; this entry point exists so the documented command
 * (`npm run extension:build`) and the website's canonical asset path
 * (`/lamptik-chrome-extension.zip`) are both true. The packaging step writes
 * the second copy itself, so importing it here is the whole build.
 */
import "./package-extension.mjs";
