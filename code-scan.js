const { Octokit } = require("octokit");
const token = process.argv[2];

console.log(process.argv[3])
const octokit = new Octokit({
  auth: token,
});

const owner = "asml-actions";
const repo = "github-fork-updater";
const issueNumber = 184;

const comment = "test comment.";

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
