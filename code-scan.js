const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const token = process.argv[2];
const repo = process.argv[3];
const originalOwner = process.argv[4];
const owner = "asml-actions-validation";

const octokit = new Octokit({
  auth: token,
});
const octokitFunctions = {
  getRepo: octokit.repos.get,
  delRepo: octokit.repos.delete,
  createFork: octokit.repos.createFork,
  enableDependabot: octokit.rest.repos.enableVulnerabilityAlerts,
  listAlertsForRepo: octokit.rest.dependabot.listAlertsForRepo,
};

async function octokitRequest(request) {
  console.log(`Running ${request} function`);
  try {
    // few functions require different properties
    let requestProperties = { owner, repo };
    switch (request) {
      case "createFork":
        requestProperties.owner = originalOwner;
        requestProperties.organization = owner;
        break;
    }
    const response = await octokitFunctions[request](requestProperties);
    console.log(`Function ${request} finished succesfully`);
    return response;
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
}

async function putRequest(request) { //generic function for PUT requests
  try {
    await octokit.request(`PUT /repos/{owner}/{repo}/${request}`, { owner, repo });
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
}

async function enableCodeQLScanning() {
  try {
    await octokit.request("PUT /repos/{owner}/{repo}/actions/workflows", {
      owner,
      repo,
    });
    console.log("Workflows enabled");
    await octokit.request("PUT /repos/{owner}/{repo}/code-scanning/enable", {
      owner,
      repo,
    });

    console.log("CodeQL scanning enabled successfully.");
  } catch (error) {
    console.log(`Failed to enable CodeQL scanning: ${error.message}`);
  }
}

async function pushWorkflowFile() {
  const workflowFile = fs.readFileSync('codeql-analysis.yml', "utf8");
  try {
    const response = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/.github/workflows/example.yml",
      {
        owner,
        repo,
        path: ".github/workflows/example.yml",
        message: "Create example workflow",
        content: Buffer.from(workflowFile).toString("base64"),
      }
    );

    console.log("Workflow file created successfully");
  } catch (error) {
    console.error("Error creating workflow file:", error);
  }
}


async function run() {
  await octokitRequest("delRepo");
  await octokitRequest("createFork");

  await putRequest('vulnerability-alerts') // Enable dependabot
  await triggerDependabotScan(); // Possibly redundant? 

  const alerts = await octokitRequest("listAlertsForRepo");
  console.log(`Dependabot alerts: ${alerts}`);
  // await enableCodeQLScanning();
  pushWorkflowFile()
}

run();
