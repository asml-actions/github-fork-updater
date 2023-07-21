const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const { countReset } = require("console");
const fs = require("fs");
const token = process.argv[2];
const repo = process.argv[3];
const originalOwner = process.argv[4];
const owner = "asml-actions-validation";
console.log(`repo name is ${repo}, original owner ${originalOwner}`);
const octokit = new Octokit({
  auth: token,
});
const octokitFunctions = {
  getRepo: octokit.repos.get,
  delRepo: octokit.repos.delete,
  createFork: octokit.repos.createFork,
  enableDependabot: octokit.rest.repos.enableVulnerabilityAlerts,
  listAlertsForRepo: octokit.rest.dependabot.listAlertsForRepo,
  listScanningResult: octokit.rest.codeScanning.listAlertsForRepo,
  listLanguages: octokit.rest.repos.listLanguages,
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

async function putRequest(request) {
  //generic function for PUT requests
  try {
    await octokit.request(`PUT /repos/{owner}/{repo}/${request}`, {
      owner,
      repo,
    });
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
}

async function getSha(ref) {
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

async function pushWorkflowFile() {
  let languages = await octokitRequest("listLanguages");
  languages = `${JSON.stringify(Object.keys(languages))}`;
  console.log(`Detected languages: ${languages}`);

  console.log(`Add Codeql workflow file`);
  let workflowFile = fs.readFileSync("codeql-analysis-check.yml", "utf8");
  workflowFile = workflowFile.replace("languageString", languages);

  console.log(`Add Codeql workflow file`);

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

async function triggerCodeqlScan(workflow_id, ref) {
  console.log(`Trigger codeql scan`);
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id,
    ref,
  });
}

async function waitForCodeqlScan() {
  console.log(`Get the dispatched run id`);
  const response = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    event: "workflow_dispatch",
  });

  const run_id = response.data.workflow_runs[0].id;

  let status = "queued";
  while (status != "completed") {
    console.log(`Wait for scan to complete - Run id : ${run_id}`);
    await wait(15000);
    const run_status = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });
    if (run_status.data.status == "completed") {
      status = run_status.data.status;
    }
  }
}

function checkForBlockingAlerts(codeScanningAlerts, dependabotAlerts) {
  let blocking = false;
  codeScanningAlerts.forEach((alert) => {
    if (
      alert.rule.security_severity_level == "critical" ||
      alert.rule.security_severity_level == "high"
    ) {
      blocking = true;
    }
  });
  dependabotAlerts.forEach((alert) => {
    if (
      alert.security_advisory.severity == "critical" ||
      alert.security_advisory.severity == "high"
    ) {
      blocking = true;
    }
  });

  return blocking;
}

async function run() {
  await octokitRequest("delRepo");
  const forkRepo = await octokitRequest("createFork");

  await wait(5000);
  await putRequest("vulnerability-alerts"); // Enable dependabot

  await wait(5000);

  // await disableExistingWorkflows()

  // Push Codeql.yml file
  await pushWorkflowFile();

  //Trigger a scan
  await wait(15000);
  await triggerCodeqlScan(`codeql-analysis-check.yml`, forkRepo.default_branch);

  //Wait for the scan to complete
  console.log(`Wait for job to start !`);
  await wait(15000);
  await waitForCodeqlScan();

  const dependabotAlerts = await octokitRequest("listAlertsForRepo");
  const codeqlScanAlerts = await octokitRequest("listScanningResult");

  if (checkForBlockingAlerts(codeqlScanAlerts, dependabotAlerts)) {
    core.setOutput("can-merge", "needs-manual-check");
  } else {
    core.setOutput("can-merge", "update-fork");
  }
}

run();
