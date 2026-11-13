# script-inspector demo

A small, runnable demonstration of the published [`script-inspector`](https://www.npmjs.com/package/script-inspector) npm package. This repository shows how to install the package, inspect sample Node.js projects, read findings, and use JSON and strict modes.

This is a demo repository. It does not contain or replace the source code for [`script-inspector`](https://github.com/azmolwasimhussain-ops/script-inspector).

## Requirements

- Node.js 22 or newer
- npm

## Install

Clone this demo and install its exact `script-inspector@0.1.0` dependency:

```sh
git clone https://github.com/azmolwasimhussain-ops/script-inspector-demo.git
cd script-inspector-demo
npm install
```

The dependency is pinned to version `0.1.0` in `package.json` and `package-lock.json`. The demo is marked private so it cannot be accidentally published to npm.

## Run the examples

The scripts below run the real CLI from the installed npm package against the example projects in `examples/`:

```sh
npm run inspect:valid
npm run inspect:demo
npm run inspect:json
npm run inspect:strict
```

- `inspect:valid` checks a correctly configured project and reports no issues.
- `inspect:demo` checks the intentionally problematic project and prints human-readable findings.
- `inspect:json` checks the same project and prints the JSON report.
- `inspect:strict` checks a warning-only project with `--strict` enabled.

The demo runner verifies the analyzer's expected exit code and findings. The intentionally problematic and strict-mode examples correctly cause the analyzer itself to return `1`; the runner reports that expected result and exits successfully only when the output matches the example. This keeps the top-level `npm run` commands convenient while preserving the analyzer's real exit behavior.

You can also run the package CLI directly. These commands return `1` for the expected findings:

```sh
npx --no-install script-inspector examples/problem-project
npx --no-install script-inspector examples/problem-project --json
npx --no-install script-inspector examples/warning-project --strict
```

To inspect a different project, pass its directory or `package.json` path:

```sh
npx --no-install script-inspector ./path/to/project
```

## What the demo finds

The project in `examples/problem-project` contains three deliberate issues:

1. `start` references the missing file `src/missing.js`.
2. `build` runs `npm run lint`, but no `lint` script is defined.
3. `check` uses `eslint`, which is not declared in that sample manifest's dependencies.

The first two findings are errors, and the undeclared CLI is a warning. Normal mode therefore returns exit code `1` because the sample contains errors. The JSON example reports the same findings as structured data.

`examples/warning-project` contains only an undeclared `vite` CLI. Normal mode would allow that warning with exit code `0`; `--strict` turns warnings into exit code `1`. The clean example in `examples/valid-project` returns `0` with no findings.

In general, `script-inspector` uses exit code `0` when there are no errors (warnings are allowed unless strict mode is enabled), `1` for errors or strict warnings, and `2` for invalid arguments or a package configuration that cannot be read.

## Safety and limitations

`script-inspector` statically reads each example's `package.json` and checks paths. It does not run the example projects' npm scripts. The test suite includes a marker-file check to verify this non-execution behavior.

The analyzer uses a conservative parser rather than a shell interpreter. Complex shell syntax may be reported as inconclusive, and a present file does not guarantee that its script will run successfully. See the [package README](https://github.com/azmolwasimhussain-ops/script-inspector#limitations) for the supported patterns and current limitations.

## Tests

Run the demo's tests with Node.js's built-in test runner:

```sh
npm test
```

The tests verify the installed package version, clean and problematic findings, JSON output, strict mode, CommonJS API availability, and that analyzed scripts are not executed.

## Technology

- Node.js CommonJS
- `script-inspector@0.1.0`
- Node.js built-in test runner

## License

This demo is available under the MIT License. See [LICENSE](LICENSE).
