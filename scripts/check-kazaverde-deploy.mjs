import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const webDir = path.join(repoRoot, "kazaverde-web");
const rootPackagePath = path.join(repoRoot, "package.json");
const rootVercelPath = path.join(repoRoot, "vercel.json");
const webPackagePath = path.join(webDir, "package.json");

function fail(message) {
  console.error(`KazaVerde deploy config error: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(rootPackagePath)) {
  fail("missing root package.json");
}

if (!fs.existsSync(rootVercelPath)) {
  fail("missing root vercel.json");
}

if (!fs.existsSync(webPackagePath)) {
  fail("missing kazaverde-web/package.json");
}

const rootPackage = readJson(rootPackagePath);
const rootVercel = readJson(rootVercelPath);
const webPackage = readJson(webPackagePath);
const webDependencies = webPackage.dependencies ?? {};
const webDevDependencies = webPackage.devDependencies ?? {};

if (rootPackage.name !== "arei-platform") {
  fail('root package name must stay "arei-platform" until the repo rename is intentionally completed');
}

if (webPackage.name !== "kazaverde-web") {
  fail('kazaverde-web/package.json must keep name set to "kazaverde-web"');
}

if (!("vite" in webDevDependencies)) {
  fail("kazaverde-web must declare Vite in devDependencies");
}

if ("next" in webDependencies || "next" in webDevDependencies) {
  fail("kazaverde-web must not declare Next.js; it is deployed as a Vite app");
}

if (rootVercel.framework !== null) {
  fail("root vercel.json must set framework to null");
}

if (rootVercel.outputDirectory !== "kazaverde-web/dist") {
  fail('root vercel.json must keep outputDirectory set to "kazaverde-web/dist"');
}

if (
  rootVercel.buildCommand !==
  "cd packages/arei-sdk && npm install && npm run build && cd ../../kazaverde-web && npm install && npm run build"
) {
  fail("root vercel.json buildCommand does not match the checked-in monorepo deploy contract");
}

if (!Array.isArray(rootVercel.rewrites) || rootVercel.rewrites.length === 0) {
  fail("root vercel.json must keep SPA rewrites configured");
}

console.log("KazaVerde deploy config looks correct.");
