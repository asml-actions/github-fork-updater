const { Octokit } = require("@octokit/rest");
const token = process.argv[2];
const originalOwner = process.argv[3]
const octokit = new Octokit({
  auth: token,
});
const forkOwner = "asml-actions-validation";
const RepoName = process.argv[3];

console.log(`Using this repository: ${forkOwner}/${RepoName}`);

async function deleteRepository() {
  try {
    const repository = await octokit.repos.get({
      owner: forkOwner,
      repo: RepoName,
    });

    console.log(
      `Repository ${forkOwner}/${RepoName} already exists. Deleting before proceeding...`
    );

    await octokit.repos.delete({
      owner: forkOwner,
      repo: RepoName,
    });

    console.log(`Successfully deleted repository ${forkOwner}/${RepoName}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Repository ${forkOwner}/${RepoName} is not found`);
    } else {
      console.log(
        `Deletion of repository ${forkOwner}/${RepoName} failed: ${error.message}`
      );
    }
  }
}
deleteRepository();

async function createFork() {
  try {
    const response = await octokit.repos.createFork({
      owner: forkOwner,
      repo: RepoName,
      organization: originalOwner,
    });

    const forkedRepo = response.data;
    console.log(`Fork created successfully: ${forkedRepo.html_url}`);
  } catch (error) {
    console.log(`Failed to create fork: ${error.message}`);
  }
}

createFork();
