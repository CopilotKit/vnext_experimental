import { build, context } from "esbuild";
import { cp, mkdir, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const isWatch = process.argv.includes("--watch");
const isProd = process.env.NODE_ENV === "production";

const entryPoints = {
  background: path.join(rootDir, "src/background.ts"),
  content: path.join(rootDir, "src/content.ts"),
  page: path.join(rootDir, "src/page.ts"),
  devtools: path.join(rootDir, "src/devtools.ts"),
  panel: path.join(rootDir, "src/panel.ts"),
};

const buildOptions = {
  entryPoints,
  outdir: distDir,
  bundle: true,
  sourcemap: !isProd,
  target: "chrome114",
  format: "iife",
  platform: "browser",
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
};

async function copyPublicAssets() {
  const publicDir = path.join(rootDir, "public");
  await mkdir(distDir, { recursive: true });
  await cp(publicDir, distDir, { recursive: true });

  // Chrome expects manifest.json. We keep a browser-specific name in source, then rename on copy.
  const chromeManifestSrc = path.join(distDir, "manifest.chrome.json");
  const chromeManifestDest = path.join(distDir, "manifest.json");
  try {
    await cp(chromeManifestSrc, chromeManifestDest, { recursive: false, force: true });
  } catch (error) {
    console.warn("[devtools-extension] Unable to copy manifest:", error);
  }
}

async function buildOnce() {
  await rm(distDir, { recursive: true, force: true });
  await build(buildOptions);
  await copyPublicAssets();
}

async function buildWatch() {
  const ctx = await context(buildOptions);
  await ctx.watch();
  await copyPublicAssets();
  console.log("[devtools-extension] Watching for changes...");
}

if (isWatch) {
  await buildWatch();
} else {
  await buildOnce();
}
/* eslint-env node */
/* global process, console */
