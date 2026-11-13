#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const scenarios = {
  issues: {
    project: "problem-project",
    expectedExitCode: 1,
    expectedFindings: [
      "node-entry-not-found",
      "npm-script-not-found",
      "cli-dependency-not-declared"
    ]
  },
  json: {
    project: "problem-project",
    args: ["--json"],
    expectedExitCode: 1,
    expectedFindings: [
      "node-entry-not-found",
      "npm-script-not-found",
      "cli-dependency-not-declared"
    ]
  },
  strict: {
    project: "warning-project",
    args: ["--strict"],
    expectedExitCode: 1,
    expectedFindings: ["cli-dependency-not-declared"]
  },
  valid: {
    project: "valid-project",
    expectedExitCode: 0,
    expectedFindings: []
  }
};

function main() {
  const scenarioName = process.argv[2] || "issues";
  const scenario = scenarios[scenarioName];

  if (!scenario) {
    console.error(`Unknown demo scenario: ${scenarioName}`);
    console.error(`Choose one of: ${Object.keys(scenarios).join(", ")}`);
    process.exitCode = 2;
    return;
  }

  const packageEntry = require.resolve("script-inspector");
  const packageRoot = path.resolve(path.dirname(packageEntry), "..");
  const cliPath = path.join(packageRoot, "bin", "script-inspector.js");
  const projectPath = path.join(__dirname, "..", "examples", scenario.project);
  const args = [cliPath, projectPath, ...(scenario.args || [])];
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });

  if (result.error) {
    console.error(`Could not start script-inspector: ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  if (scenario.args?.includes("--json") && result.stdout) {
    try {
      const report = JSON.parse(result.stdout);
      console.log(JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(`The analyzer did not return valid JSON: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  } else if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) process.stderr.write(result.stderr);

  const actualFindings = scenario.args?.includes("--json")
    ? JSON.parse(result.stdout).findings.map((finding) => finding.code)
    : scenario.expectedFindings.filter((code) => result.stdout.includes(code));
  const missingFindings = scenario.expectedFindings.filter((code) => !actualFindings.includes(code));

  if (result.status !== scenario.expectedExitCode || missingFindings.length > 0) {
    console.error(
      `Demo verification failed: expected exit ${scenario.expectedExitCode}, received ${result.status}.`
    );
    if (missingFindings.length > 0) {
      console.error(`Expected findings were not present: ${missingFindings.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Demo verified: analyzer exit code ${result.status} is expected.`);
}

main();
