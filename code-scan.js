const { Octokit } = require('@octokit/rest');
const token = process.argv[2];

const octokit = new Octokit({
  auth: token,
});
const forkOwner = 'asml-actions-validation';
const forkRepoName = process.argv[3];

console.log(`Using this repository: ${forkOwner}/${forkRepoName}`);

async function deleteRepository() {
  try {
    const repository = await octokit.repos.get({
      owner: forkOwner,
      repo: forkRepoName,
    });

    console.log(`Repository ${forkOwner}/${forkRepoName} already exists. Deleting before proceeding...`);

    await octokit.repos.delete({
      owner: forkOwner,
      repo: forkRepoName,
    });

    console.log(`Successfully deleted repository ${forkOwner}/${forkRepoName}`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Repository ${forkOwner}/${forkRepoName} is not found`);
    } else {
      console.log(`Deletion of repository ${forkOwner}/${forkRepoName} failed: ${error.message}`);
    }
  }
}
deleteRepository();
