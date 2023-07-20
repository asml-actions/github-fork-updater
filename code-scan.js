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
  delRepo: octokit.repos.delete,
  createFork: octokit.repos.createFork,
  enableDependabot: octokit.rest.repos.enableVulnerabilityAlerts,
  triggerDependabotScan: octokit.rest.checks.create,
  listAlertsForRepo: octokit.rest.dependabot.listAlertsForRepo,
};

async function octokitRequest(request) {
  console.log(`Running ${request} function`);
  try {
    // few functions require different properties
    let requestProperties = { owner, repo };
    switch (request){
        case 'createFork':
          requestProperties.owner = originalOwner
          requestProperties.organization = owner
          break;
    }
    console.log(requestProperties)
    const response = await octokitFunctions[request](requestProperties);
    console.log(`Function ${request} finished succesfully`);
    return response
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
    console.log('Workflows enabled')
    await octokit.request("PUT /repos/{owner}/{repo}/code-scanning/enable", {
      owner,
      repo,
    });

    console.log("CodeQL scanning enabled successfully.");
  } catch (error) {
    console.log(`Failed to enable CodeQL scanning: ${error.message}`);
  }
}
async function triggerDependabotScan() {
  try {
    await octokit.request('PATCH /repos/{owner}/{repo}', {
      owner,
      repo,
      dependency_graph_enabled: true,
      security_and_analysis_enabled: true
    });
    console.log('Dependabot scan triggered successfully.');
  } catch (error) {
    console.log(`Failed to trigger Dependabot scan: ${error.message}`);
  }
}
async function run() {
  await octokitRequest("delRepo");
  //wait for repo to be deleted
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await octokitRequest("createFork");
  let repoInfo = await octokitRequest("getRepo");
  // console.log(repoInfo)
  // repoInfo.data.
  await octokitRequest("enableDependabot");
  // await triggerDependabotScan()
  // await octokitRequest("triggerDependabotScan");
  const alerts = await octokitRequest("listAlertsForRepo");
  console.log(`Dependabot alerts: ${alerts}`);
  // await enableCodeQLScanning();
}

run();
