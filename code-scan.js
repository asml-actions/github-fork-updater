const { Octokit } = require("@octokit/rest");
const { exec } = require("child_process");
const fs = require("fs");

const token = process.argv[2];

const octokit = new Octokit({
  auth: token,
});

let compareUrls = []

function getCompareUrl(input) {
  const regex = /compareUrl=(https:\/\/github\.com\/[\w-]+\/[\w-]+\/compare\/[\w-]+\.\.[\w-]+:[\w-]+)/;
  const match = input.match(regex);
  if (match && match.length > 1) {
    return match[1];
  }
  return null;
}

fs.readFile("updateResult.txt", "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  compareUrls.push(getCompareUrl(data))
});
console.log(compareUrls)
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
