const { Octokit } = require("@octokit/rest");
const token = process.argv[2];
const repoName = process.argv[3];
const originalOwner = process.argv[4];
const owner = "asml-actions-validation";

const octokit = new Octokit({
  auth: token,
});

async function deleteRepository() {
  try {
    const repository = await octokit.repos.get({
      owner,
      repo: repoName,
    });

    console.log(`Deleting this repository: ${owner}/${repoName}`);
    console.log(
      `Repository ${owner}/${repoName} already exists. Deleting before proceeding...`
    );

    await octokit.repos.delete({
      owner,
      repo: repoName,
    });

    console.log(`Successfully deleted repository ${owner}/${repoName}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Repository ${owner}/${repoName} is not found`);
    } else {
      console.log(
        `Deletion of repository ${owner}/${repoName} failed: ${error.message}`
      );
    }
  }
}

async function createFork() {
  console.log(`Forking ${originalOwner}/${repoName} to ${owner}`);
  try {
    const response = await octokit.repos.createFork({
      owner: originalOwner,
      repo: repoName,
      organization: owner,
    });

    const forkedRepo = response.data;
    console.log(`Fork created successfully: ${forkedRepo.html_url}`);
  } catch (error) {
    console.log(`Failed to create fork: ${error.message}`);
  }
}

async function enableDependabot() {
  try {
    console.log(`Enabling Dependabot for ${owner}/${repoName}`);
    const response = await octokit.rest.repos.enableVulnerabilityAlerts({
      owner,
      repo: repoName,
    });
    console.log("Dependabot enabled successfully.");
  } catch (error) {
    console.log(`Failed to enable Dependabot: ${error.message}`);
  }
}
async function triggerDependabotScan() {
  console.log("Triggering dependabot scan");
  try {
    const response = await octokit.rest.checks.create({
      owner,
      repo: repo,
    });

    console.log("Dependabot scan triggered successfully.");
  } catch (error) {
    console.log(`Failed to trigger Dependabot scan: ${error.message}`);
  }
}

async function run() {
  await deleteRepository();
  //wait for repo to be deleted
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await createFork();
  await enableDependabot();
  await triggerDependabotScan();
}

run();
