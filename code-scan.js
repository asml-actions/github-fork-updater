const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");
const fs = require("fs");
const [token, repo, originalOwner, owner] = process.argv.slice(2);

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

async function octokitRequest(request, extraArgs = {}) {
  console.log(`Running ${request} function`);
  try {
    const requestProperties = { owner, repo, ...extraArgs };
    const response = await octokitFunctions[request](requestProperties);
    console.log(`Function ${request} finished succesfully`);
    return response.data;
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
}

async function putRequest(request, extraProps) {
  //generic function for PUT requests
  try {
    await octokit.request(`PUT /repos/{owner}/{repo}/${request}`, {
      owner,
      repo,
      ...extraProps,
    });
  } catch (error) {
    console.log(`Failed to run ${request}: ${error.message}`);
  }
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
    await putRequest("contents/.github/workflows/codeql-analysis-check.yml", {
      path: ".github/workflows/check-and-validate-codeql.yml",
      message: "Inject codeql workflow",
      content: Buffer.from(workflowFile).toString("base64"),
    });
    console.log("Workflow file created successfully");
  } catch (error) {
    console.error("Error creating workflow file:", error);
  }
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
  const forkRepo = await octokitRequest("createFork", {
    owner: originalOwner,
    organization: owner,
  });

  await wait(5000);
  await putRequest("vulnerability-alerts", {}); // Enable dependabot

  await wait(5000);

  // await disableExistingWorkflows()

  // Push Codeql.yml file
  await pushWorkflowFile();

  //Trigger a scan
  await wait(15000);
  const codeqlStatus = await octokitRequest("triggerCodeqlScan", {
    workflow_id: `codeql-analysis-check.yml`,
    ref: forkRepo.parent.default_branch,
  });
  if (codeqlStatus == 204) {
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
  } else {
    core.setOutput("can-merge", "needs-manual-check");
  }
}

run();
