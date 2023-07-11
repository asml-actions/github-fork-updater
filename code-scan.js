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

const cloneAndPush = async (parentUrl) => {
  try {
    console.log(parentUrl);
    exec(`git clone ${parentUrl}`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error cloning repository: ${error}`);
        return;
      }
      const repoName = parentUrl.split("/").at(-1);
      console.log(`Cloned repository from ${parentUrl}.`);

      const repoCreationResponse = await octokit.rest.repos.createInOrg({
        org: 'asml-actions-validation',
        name: repoName,
        private: false,
      });

      const { clone_url } = repoCreationResponse.data;

      exec(`cd ${repoName} && git remote set-url origin ${clone_url} && git push -u origin master`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error pushing repository: ${error}`);
          return;
        }
        console.log(`Pushed repository to ${clone_url}.`);
      });
    });
  } catch (err) {
    console.error('Error:', err);
  }
};

cloneAndPush(`https://github.com/asml-actions/actions-marketplace`)

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
