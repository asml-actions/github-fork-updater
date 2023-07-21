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

async function wait(milliseconds) {
  return new Promise((_resolve) => {
    if (typeof milliseconds !== "number") {
      throw new Error("milliseconds not a number");
    }
    setTimeout(() => _resolve("done!"), milliseconds);
  });
}

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
    return response.data;
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

async function getSha(ref){
  response = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${ref}`,
  });
  return response.data;
}

async function deleteExistingWorkflows(sha){
  console.log(`Delete existing workflows`)
  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path: ".github/workflows/codeql-analysis.yml",
    message: "🤖 Delete existing workflows",
    sha,
  });

}

async function pushWorkflowFile() { /*Works with postman but here it returns : 
Error creating workflow file: RequestError [HttpError]: Unable to read Git 
repository contents. We've notified our support staff. If this error persists, 
or if you have any questions, please contact us. 
Temporary error?
  */
  console.log(`Add Codeql workflow file`)
  const workflowFile = fs.readFileSync('codeql-analysis-check.yml', "utf8");
  try {
    const response = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/.github/workflows/codeql-analysis-check.yml",
      {
        owner,
        repo,
        path: ".github/workflows/codeql-analysis-check.yml",
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
  const forkRepo = await octokitRequest("createFork");
  console.log(`New Repo ID: ${forkRepo.id}, Repo Name: ${forkRepo.name} Default branch: ${forkRepo.default_branch}`)

  await wait(5000);

  await putRequest('vulnerability-alerts') // Enable dependabot

  //Delete existing workflow files
  const sha = (await getSha(forkRepo.default_branch)).object.sha

  console.log(`sha for the workflow files to be deleted : ${sha}`)

  deleteExistingWorkflows(sha)
  await wait(5000);

  // Push Codeql.yml file
  pushWorkflowFile()

  const alerts = await octokitRequest("listAlertsForRepo");
  console.log(`Dependabot alerts: ${(alerts)}`);

  
}

run();
