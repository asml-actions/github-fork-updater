const { Octokit } = require("@octokit/rest");
const { exec } = require("child_process");
const fs = require("fs");

const token = process.argv[2];
const octokit = new Octokit({ auth: token });
let allData;

fs.readFile("updateResult.txt", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  allData = data.split(/\r?\n/).map((item) => {
    item = item
      .split(" ")
      .map((current) => current.substring(11, current.length - 1));
    return {
      name: item[0],
      compareUrl: item[3],
    };
  });
  console.log(`alldata in function: ${allData}`)
  
});
createPR(allData[0].compareUrl);
const createPR = async (compareUrl) => {
  const [_, owner, repository, compare] = compareUrl.match(
    /https:\/\/github.com\/([^/]+)\/([^/]+)\/compare\/([^/]+)\.\.\./
  );
  const [baseBranch, headBranch] = compare.split("..");
  const prResponse = await octokit.pulls.create({
    owner,
    repo: repository,
    title: "Test Pull Request",
    head: headBranch,
    base: baseBranch,
  });
  const pullRequest = prResponse.data;
  console.log("Pull Request created:", pullRequest.html_url);
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
