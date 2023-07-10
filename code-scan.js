const { Octokit } = require("octokit");
const { exec } = require("child_process");
const fs = require("fs");
const token = process.argv[2];

fs.readFile("updateResult.txt", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const parentUrls = data.match(/https:\/\/github\.com\/[^\s]+/g);
  if (parentUrls) {
    parentUrls.forEach((element) => {
      if (element != "https://github.com/…") {
        cloneAndScan(element);
      }
    });
  }
});

const octokit = new Octokit({
  auth: token,
});
const cloneAndScan = (parentUrl) => {
  console.log(parentUrl);
  exec(`git clone ${parentUrl}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error cloning repository: ${error}`);
      return;
    }

    console.log(
      `Cloned repository from ${parentUrl}. Repo name: ${parentUrl
        .split("/")
        .at(-1)}`
    );

    exec(
      "dependabot scan",
      { cwd: `cd ${parentUrl.split("/").at(-1)};repository` },
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error running Dependabot scan on ${parentUrl}: ${error}`
          );
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
      }
    );
  });
};

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
