const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "deploy", "deploy-targets.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const targetKey = process.argv[2];
const target = config.targets[targetKey];

if (!target) {
  console.error(`[deploy] Unknown deploy target "${targetKey}".`);
  process.exit(1);
}

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const actualProjectId = process.env.VERCEL_PROJECT_ID;

if (!actualProjectId) {
  console.error("[deploy] Missing VERCEL_PROJECT_ID in build environment; refusing to continue.");
  process.exit(1);
}

if (actualProjectId !== target.projectId) {
  console.error(
    `[deploy] Refusing build for target "${target.key}". Expected project ${target.projectName} (${target.projectId}) but got ${actualProjectId}.`
  );
  process.exit(1);
}

console.log(
  `[deploy] Verified Vercel build target ${target.projectName} (${target.projectId}).`
);
