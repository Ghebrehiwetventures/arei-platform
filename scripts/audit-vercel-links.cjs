const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const configPath = path.join(repoRoot, "deploy", "deploy-targets.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const expectedByPath = new Map(
  Object.values(config.targets).map((target) => [path.normalize(target.cwd), target])
);

const ignoreDirs = new Set([".git", "node_modules", "dist", "artifacts"]);
const projectFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoreDirs.has(entry.name)) continue;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".vercel") {
        const projectPath = path.join(absolutePath, "project.json");
        if (fs.existsSync(projectPath)) projectFiles.push(projectPath);
        continue;
      }
      walk(absolutePath);
    }
  }
}

walk(repoRoot);

const rows = projectFiles.map((projectPath) => {
  const folder = path.relative(repoRoot, path.dirname(path.dirname(projectPath))) || ".";
  const json = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  const expected = expectedByPath.get(path.normalize(folder));
  return {
    folder,
    projectName: json.projectName,
    projectId: json.projectId,
    status: expected
      ? json.projectName === expected.projectName && json.projectId === expected.projectId
        ? "canonical"
        : "mismatch"
      : "unexpected",
    expectedProjectName: expected ? expected.projectName : null,
    expectedProjectId: expected ? expected.projectId : null,
  };
});

const duplicates = new Map();
for (const row of rows) {
  const arr = duplicates.get(row.projectId) ?? [];
  arr.push(row.folder);
  duplicates.set(row.projectId, arr);
}

console.log("Local Vercel linkage audit");
console.log("");
for (const row of rows.sort((a, b) => a.folder.localeCompare(b.folder))) {
  console.log(
    `- ${row.folder}: ${row.projectName} (${row.projectId}) [${row.status}]`
  );
  if (row.status !== "canonical" && row.expectedProjectName) {
    console.log(
      `  expected ${row.expectedProjectName} (${row.expectedProjectId})`
    );
  }
}

console.log("");
console.log("Duplicate projectId usage");
for (const [projectId, folders] of duplicates.entries()) {
  if (folders.length > 1) {
    console.log(`- ${projectId}: ${folders.join(", ")}`);
  }
}
