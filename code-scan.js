const { Octokit } = require("@octokit/rest");
const token = process.argv[2];
const originalOwner = process.argv[3]
const octokit = new Octokit({
  auth: token,
});
const forkOwner = "asml-actions-validation";
const repoName = process.argv[3];


async function deleteRepository() {
  console.log(`Deleting this repository: ${forkOwner}/${repoName}`);

  try {
    const repository = await octokit.repos.get({
      owner: forkOwner,
      repo: repoName,
    });

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
// deleteRepository();

async function createFork() {
  console.log(`forking ${originalOwner}/${repoName} to ${forkOwner}`)
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

createFork();
