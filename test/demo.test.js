const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { access, mkdtemp, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { after, test } = require("node:test");

const packageRoot = path.resolve(__dirname, "..");
const packageEntry = require.resolve("script-inspector");
const cliPath = path.join(path.resolve(path.dirname(packageEntry), ".."), "bin", "script-inspector.js");
const temporaryDirectories = [];

function runCli(projectPath, ...args) {
  return spawnSync(process.execPath, [cliPath, projectPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8"
  });
}

async function createProject(packageJson) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "script-inspector-demo-"));
  temporaryDirectories.push(directory);
  await writeFile(path.join(directory, "package.json"), JSON.stringify(packageJson, null, 2));
  return directory;
}

after(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
});

test("uses the published script-inspector 0.1.0 package", () => {
  const installedPackagePath = path.resolve(path.dirname(packageEntry), "..", "package.json");
  const installedPackage = JSON.parse(readFileSync(installedPackagePath, "utf8"));
  assert.equal(installedPackage.version, "0.1.0");
  const installedPackageRoot = path.join(packageRoot, "node_modules", "script-inspector");
  assert.equal(path.relative(installedPackageRoot, packageEntry).startsWith(".."), false);
  assert.equal(typeof require("script-inspector").inspectProject, "function");
});

test("reports a valid example without findings", () => {
  const project = path.join(packageRoot, "examples", "valid-project");
  const result = runCli(project);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No issues found\./);
});

test("reports intentional errors in the problem example", () => {
  const project = path.join(packageRoot, "examples", "problem-project");
  const result = runCli(project);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /node-entry-not-found/);
  assert.match(result.stdout, /npm-script-not-found/);
  assert.match(result.stdout, /cli-dependency-not-declared/);
});

test("prints JSON findings and strict mode fails on a warning", () => {
  const problemProject = path.join(packageRoot, "examples", "problem-project");
  const jsonResult = runCli(problemProject, "--json");
  const report = JSON.parse(jsonResult.stdout);
  const warningProject = path.join(packageRoot, "examples", "warning-project");
  const strictResult = runCli(warningProject, "--strict");

  assert.equal(jsonResult.status, 1);
  assert.ok(report.findings.some((finding) => finding.code === "node-entry-not-found"));
  assert.equal(strictResult.status, 1);
  assert.match(strictResult.stdout, /cli-dependency-not-declared/);
});

test("never executes scripts from the inspected project", async () => {
  const project = await mkdtemp(path.join(os.tmpdir(), "script-inspector-demo-safe-"));
  temporaryDirectories.push(project);
  const marker = path.join(project, "executed.marker");
  const command = `node -e "require('node:fs').writeFileSync('${marker}', 'yes')"`;
  await writeFile(path.join(project, "package.json"), JSON.stringify({ scripts: { malicious: command } }));
  const result = runCli(project);
  const markerExists = await access(marker).then(() => true, () => false);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(markerExists, false);
});
