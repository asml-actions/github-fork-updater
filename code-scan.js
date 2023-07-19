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
  createFork : octokit.repos.createFork,
  enableDependabot : octokit.rest.repos.enableVulnerabilityAlerts,
  triggerDependabotScan : octokit.rest.checks.create
}

async function octokitRequest(request){
  console.log(`Running ${request} function`)
  try {
    const response = await octokitFunctions[request]({
      owner,
      repo,
    });
    console.log(`Function ${request} finished succesfully`);
  } catch (error) {
    console.log(`Failed to run: ${error.message}`);
  }
}
async function deleteRepository() {
  try {
    const repository = await octokit.repos.get({
      owner,
      repo,
    });

    console.log(`Deleting this repository: ${owner}/${repo}`);
    console.log(
      `Repository ${owner}/${repo} already exists. Deleting before proceeding...`
    );

    await octokit.repos.delete({
      owner,
      repo,
    });

    console.log(`Successfully deleted repository ${owner}/${repo}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Repository ${owner}/${repo} is not found`);
    } else {
      console.log(
        `Deletion of repository ${owner}/${repo} failed: ${error.message}`
      );
    }
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

// async function enableDependabot() {
//   try {
//     console.log(`Enabling Dependabot for ${owner}/${repo}`);
//     const response = await octokit.rest.repos.enableVulnerabilityAlerts({
//       owner,
//       repo,
//     });
//     console.log("Dependabot enabled successfully.");
//   } catch (error) {
//     console.log(`Failed to enable Dependabot: ${error.message}`);
//   }
// }
async function triggerDependabotScan() {
  console.log("Triggering dependabot scan");
  try {
    const response = await octokit.rest.checks.create({
      owner,
      repo,
    });

    console.log("Dependabot scan triggered successfully.");
  } catch (error) {
    console.log(`Failed to trigger Dependabot scan: ${error.message}`);
  }
}
async function listAlertsForRepo(){
  console.log('Fetching dependabot alerts')
  try {
    const response = await octokit.rest.dependabot.listAlertsForRepo({
      owner,
      repo,
    });

    console.log("Dependabot alerts fetched");
    return response
  } catch (error) {
    console.log(`Failed to fetch dependabot alerts: ${error.message}`);
  }
}
async function enableCodeQLScanning() {
  try {
    // Enable CodeQL scanning
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
  await deleteRepository();
  //wait for repo to be deleted
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createFork();
  // await enableDependabot();
  await octokitRequest('enableDependabot')
  await triggerDependabotScan();
  const alerts = await listAlertsForRepo()
  console.log(`Dependabot alerts: ${alerts.data}`)
  await enableCodeQLScanning()
}

run();
