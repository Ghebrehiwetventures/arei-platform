const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const configPath = path.join(repoRoot, "deploy", "deploy-targets.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exit(1);
}

const targetKey = process.argv[2];
const target = config.targets[targetKey];

if (!target) {
  fail(`Unknown deploy target "${targetKey}".`);
}

if (path.resolve(process.cwd()) !== path.resolve(repoRoot)) {
  fail(`Run ${target.deployCommand} from repo root: ${repoRoot}`);
}

const targetDir = path.resolve(repoRoot, target.cwd);
if (!fs.existsSync(targetDir)) {
  fail(`Target folder does not exist: ${targetDir}`);
}

const vercelProjectPath = path.join(targetDir, ".vercel", "project.json");
if (!fs.existsSync(vercelProjectPath)) {
  fail(`Missing local Vercel link for ${target.key}: ${vercelProjectPath}`);
}

let linkedProject;
try {
  linkedProject = JSON.parse(fs.readFileSync(vercelProjectPath, "utf8"));
} catch (error) {
  fail(`Could not parse ${vercelProjectPath}: ${error.message}`);
}

if (linkedProject.projectName !== target.projectName) {
  fail(
    `Folder ${target.cwd} is linked to project "${linkedProject.projectName}", expected "${target.projectName}".`
  );
}

if (linkedProject.projectId !== target.projectId) {
  fail(
    `Folder ${target.cwd} has projectId "${linkedProject.projectId}", expected "${target.projectId}".`
  );
}

console.log(`[deploy] Verified ${target.cwd} -> ${target.projectName} (${target.projectId})`);
