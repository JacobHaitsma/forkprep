#!/usr/bin/env node
const { program } = require("commander");
const { spawn } = require("child_process");
const { exit } = require("process");
const fs = require("fs");

require("dotenv").config();

async function clone(repoName, gitSshStr, fork, cloneDir) {
  const forkSshStr = `${gitSshStr}:${fork}/${repoName}.git`;
  const clonePath = `${cloneDir}/${repoName}`;
  console.info(`📦 Cloning ${forkSshStr}...`);

  const shell = spawn(`git`, ["clone", forkSshStr, clonePath], {
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    shell.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

async function addUpstream(repoName, gitSshStr, org, cloneDir) {
  const forkPath = `${cloneDir}/${repoName}`;
  const upstreamSshStr = `${gitSshStr}:${org}/${repoName}.git`;
  console.info(`🌎 Adding upstream ${upstreamSshStr}...`);

  const shell = spawn(`git`, ["remote", "add", "upstream", upstreamSshStr], {
    cwd: forkPath,
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    shell.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

function addToVsCodeProjectManager(repoName, repoPath, projectManagerPath) {
  console.log(`📁 Adding ${repoName} to Project Manager...`);

  const projectManagerConfig = JSON.parse(
    fs.readFileSync(projectManagerPath, "utf8")
  );

  if (
    projectManagerConfig.find((p) => p.name === repoName) ||
    projectManagerConfig.find((p) => p.rootPath === repoPath)
  ) {
    console.warn(`📁 ${repoName} already exists in Project Manager`);
    return;
  }

  projectManagerConfig.push({
    name: repoName,
    rootPath: repoPath,
  });

  fs.writeFileSync(
    projectManagerPath,
    JSON.stringify(projectManagerConfig, null, 2)
  );
}

async function init() {
  program
    .requiredOption(
      "-r, --repo <name>",
      "The name of the forked repository (required)"
    )
    .requiredOption(
      "-g, --gitSshStr <uri>",
      "Git SSH String",
      process.env.DEFAULT_GIT_SSH_STR
    )
    .requiredOption("-o, --org <name>", "Organization", process.env.DEFAULT_ORG)
    .requiredOption("-f, --fork <name>", "Fork", process.env.DEFAULT_FORK)
    .requiredOption("-p, --path <path>", "Path to clone to", process.env.HOME)
    .requiredOption(
      "-pm, --projectManagerPath <path>",
      "Path to VS Code Project Manager config (https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager)",
      process.env.DEFAULT_PROJECT_MANAGER_CONFIG_PATH
    )
    .option("-sc, --skipClone", "Skip cloning the repository")
    .option("-su, --skipUpstream", "Skip adding upstream to list of remotes")
    .option("-so, --skipOpen", "Skip opening new repo in VS Code")
    .option(
      "-spm, --skipProjectManager",
      "Skip adding an entry to Project Manager"
    )
    .parse();

  const {
    repo,
    gitSshStr,
    org,
    fork,
    path,
    projectManagerPath,
    skipClone = false,
    skipUpstream = false,
    skipProjectManager = false,
    skipOpen = false,
  } = program.opts();

  if (skipClone && skipUpstream && skipProjectManager) {
    console.error("🤔 Nothing to do. Exiting...");
    exit(1);
  }

  if (!skipClone) {
    await clone(repo, gitSshStr, fork, path);
  }

  if (!skipUpstream) {
    await addUpstream(repo, gitSshStr, org, path);
  }

  if (!skipProjectManager) {
    addToVsCodeProjectManager(repo, `${path}/${repo}`, projectManagerPath);
  }

  console.log(`🎉 Done! ${repo} is ready to go!`);

  if (!skipOpen) {
    console.log("💿 Opening in VS Code...");
    spawn(
      `code`,
      ["-n", `${path}/${repo}`],
      process.platform === "win32" ? { shell: true } : {}
    );
  }

  exit(0);
}

init();
