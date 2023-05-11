const vscode = require('vscode');
const { analyzeCode } = require('./chatgpt');
const fs = require('fs');
const path = require('path');
const git = require('simple-git');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

async function getChangedFiles(baseBranch, featureBranch) {
  // Initialize the git instance with the correct workspace directory
  const gitInstance = git(getWorkspaceFolderPath());

  // Get the list of file paths that have changed between the baseBranch and the featureBranch
  const diffOutput = await gitInstance.diff(['--name-only', baseBranch, featureBranch]);
  console.log('Diff output:', diffOutput);

  // Split the output by newline characters to create an array of file paths
  const filePaths = diffOutput.trim().split('\n');
  console.log('File paths in getChangedFiles:', filePaths);

  return filePaths;
}

async function getFileContent(filePath) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found');
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const absoluteFilePath = path.join(workspacePath, filePath);
  return fs.readFileSync(absoluteFilePath, 'utf8');
}


function getWorkspaceFolderPath() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }
  return workspaceFolders[0].uri.fsPath;
}

async function getCurrentBranch() {
  const gitInstance = git(getWorkspaceFolderPath());
  const currentBranch = await gitInstance.branch();
  return currentBranch.current;
}

async function analyzeChangedFiles() {
  const baseBranch = await getCurrentBranch();
  const featureBranch = 'main';

  const filePaths = await getChangedFiles(baseBranch, featureBranch);
  console.log('File paths:', filePaths);

  const fileContents = await Promise.all(filePaths.map(getFileContent));
  console.log('File contents:', fileContents);

  // Batch the file contents into smaller chunks, if needed
  // Here, we are sending the content of each changed file in a separate API call for simplicity
  const reviews = await Promise.all(fileContents.map(analyzeCode));
  console.log('Reviews:', reviews);

  // Combine the results
  const combinedReview = reviews.join('\n\n');

  // Display the combined review
  vscode.window.showInformationMessage(`Code Review:\n${combinedReview}`);
}

function activate(context) {
    console.log('Command "extension.analyzeCode" has been called.');

    let disposable = vscode.commands.registerCommand('extension.analyzeCode', async function () {
        await analyzeChangedFiles();
  });

  context.subscriptions.push(disposable);
}

function deactivate() {
}

exports.deactivate = deactivate;
exports.activate = activate;
