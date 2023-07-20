const { Octokit } = require("@octokit/rest");
const token = process.argv[2];
const repo = process.argv[3];
const originalOwner = process.argv[4];
const owner = "asml-actions-validation";

const octokit = new Octokit({
  auth: token,
});
const octokitFunctions = {
  getRepo: octokit.repos.get,
  delteRepo: octokit.repos.delete,
  createFork: octokit.repos.createFork,
  enableDependabot: octokit.rest.repos.enableVulnerabilityAlerts,
  triggerDependabotScan: octokit.rest.checks.create,
  listAlertsForRepo: octokit.rest.dependabot.listAlertsForRepo,
};

async function octokitRequest(request) {
  console.log(`Running ${request} function`);
  try {
    if (request == "triggerDependabotScan") {
      const response = await octokitFunctions[request]({
        owner,
        repo,
        name: "Dependabot Scan",
      });
    } else {
      const response = await octokitFunctions[request]({
        owner,
        repo,
      });
    }
    console.log(`Function ${request} finished succesfully`);
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
}

async function createFork() {
  console.log(`Forking ${originalOwner}/${repo} to ${owner}`);
  try {
    const response = await octokit.repos.createFork({
      owner: originalOwner,
      repo,
      organization: owner,
    });

    const forkedRepo = response.data;
    console.log(`Fork created successfully: ${forkedRepo.html_url}`);
  } catch (error) {
    console.log(`Failed to create fork: ${error.message}`);
  }
}

async function enableCodeQLScanning() {
  try {
    await octokit.request("PUT /repos/{owner}/{repo}/actions/workflows", {
      owner,
      repo,
    });

    await octokit.request("PUT /repos/{owner}/{repo}/code-scanning/enable", {
      owner,
      repo,
    });

    console.log("CodeQL scanning enabled successfully.");
  } catch (error) {
    console.log(`Failed to enable CodeQL scanning: ${error.message}`);
  }
}

async function run() {
  await octokitRequest("getRepo");
  await octokitRequest("delRepo");
  //wait for repo to be deleted
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createFork();
  await octokitRequest("enableDependabot");
  await octokitRequest("triggerDependabotScan");
  const alerts = await octokitRequest("listAlertsForRepo");
  console.log(`Dependabot alerts: ${alerts}`)
  await enableCodeQLScanning();
}

run();
