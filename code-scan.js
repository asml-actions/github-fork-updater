const { Octokit } = require("octokit");
const { exec } = require("child_process");
const fs = require("fs");
const token = process.argv[2];
let parentUrls

fs.readFile("updateResult.txt", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`data:${data}`)
  console.log(typeof data)
  const regex = /https:\/\/github\.com\/[^\s]+/g;
  parentUrls = data.match(regex);
  
});

const octokit = new Octokit({
  auth: token,
});
const cloneAndScan = (parentUrl) => {
  exec(`git clone ${parentUrl}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error cloning repository: ${error}`);
      return;
    }

    console.log(`Cloned repository from ${parentUrl}`);

    exec("dependabot scan", { cwd: "repository" }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running Dependabot scan: ${error}`);
        return;
      }

      console.log(`Dependabot scan completed`);

      exec("rm -rf repository", (error, stdout, stderr) => {
        if (error) {
          console.error(`Error removing cloned repository: ${error}`);
          return;
        }

        console.log(`Cloned repository removed`);
      });
    });
  });
};
parentUrls.forEach(element => {
    cloneAndScan(element)
});
// const owner = "asml-actions";
// const repo = "github-fork-updater";
// const issueNumber = 184;

// octokit.rest.issues
//   .createComment({
//     owner,
//     repo,
//     issue_number: issueNumber,
//     body: comment,
//   })
//   .then((response) => {
//     console.log("Comment created successfully:", response.data.html_url);
//   })
//   .catch((error) => {
//     console.error("Error creating comment:", error);
//   });
