const { Octokit } = require("@octokit/rest");
const token = process.argv[2];
const repoName = process.argv[3];
const originalOwner = process.argv[4];
const forkOwner = "asml-actions-validation";

const octokit = new Octokit({
  auth: token,
});

async function deleteRepository() {
  try {
    const repository = await octokit.repos.get({
      owner: forkOwner,
      repo: repoName,
    });

    console.log(`Deleting this repository: ${forkOwner}/${repoName}`);
    console.log(
      `Repository ${forkOwner}/${repoName} already exists. Deleting before proceeding...`
    );

    await octokit.repos.delete({
      owner: forkOwner,
      repo: repoName,
    });

    console.log(`Successfully deleted repository ${forkOwner}/${repoName}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Repository ${forkOwner}/${repoName} is not found`);
    } else {
      console.log(
        `Deletion of repository ${forkOwner}/${repoName} failed: ${error.message}`
      );
    }
  }
}

async function createFork() {
  console.log(`Forking ${originalOwner}/${repoName} to ${forkOwner}`);
  try {
    const response = await octokit.repos.createFork({
      owner: originalOwner,
      repo: repoName,
      organization: forkOwner,
    });

    const forkedRepo = response.data;
    console.log(`Fork created successfully: ${forkedRepo.html_url}`);
  } catch (error) {
    console.log(`Failed to create fork: ${error.message}`);
  }
}

async function enableDependabot() {
  try {
    console.log(`Enabling Dependabot for ${forkOwner}/${repoName}`);
    const response = await octokit.request("PATCH /repos/{owner}/{repo}", {
      owner: forkOwner,
      repo: repoName,
      dependency_graph_enabled: true,
      dependabot_alerts_enabled: true,
      topics: ["dependabot", "security"],
    });

    console.log("Dependabot enabled successfully.");
  } catch (error) {
    console.log(`Failed to enable Dependabot: ${error.message}`);
  }
}

async function run() {
  await deleteRepository();
  await createFork();
  // wait for the repo to be registered
  await new Promise(resolve => setTimeout(resolve, 5000));

  await enableDependabot();
}

run();
