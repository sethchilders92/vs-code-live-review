const vscode = require('vscode');
const { analyzeCode } = require('./chatgpt');
const fs = require('fs');
const path = require('path');
const git = require('simple-git');
const { minimatch } = require('minimatch');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

async function getChangedFiles(gitInstance) {
  const diffOutput = await gitInstance.diff(['--name-only']);
  console.log('Diff output:', diffOutput);

  const untrackedFilesOutput = await gitInstance.raw(['ls-files', '--others', '--exclude-standard']);
  console.log('Untracked files output:', untrackedFilesOutput);

  let filePaths = diffOutput.trim().split('\n').concat(untrackedFilesOutput.trim().split('\n'));
  filePaths = filePaths.filter(shouldAnalyzeFile);

  console.log('File paths in getChangedFiles:', filePaths);

  return filePaths;
}

async function getAllModifiedFilesInBranch(gitInstance) {
  const diffOutput = await gitInstance.diff(['--name-only']);
  console.log('Diff output:', diffOutput);

  const untrackedFilesOutput = await gitInstance.raw(['ls-files', '--others', '--exclude-standard']);
  console.log('Untracked files output:', untrackedFilesOutput);

  let filePaths = diffOutput.trim().split('\n').concat(untrackedFilesOutput.trim().split('\n'));
  filePaths = filePaths.filter(shouldAnalyzeFile);

  console.log('File paths in getAllModifiedFilesInBranch:', filePaths);

  return filePaths;
}


function shouldAnalyzeFile(filePath) {
  const ignoredPatterns = ['*.json', '*.md', 'node_modules/*'];
  const shouldAnalyze = !ignoredPatterns.some(pattern => minimatch(filePath, pattern));
  console.log(`Should analyze ${filePath}? ${shouldAnalyze}`);
  return shouldAnalyze;
}

async function getFileContent(filePath) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found');
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);

  try {
    return fs.readFileSync(absoluteFilePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read file at ${absoluteFilePath}: ${error.message}`);
    return null;
  }
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

async function addReviewComments(filePath, review) {
  const fileContent = await getFileContent(filePath);
  if (fileContent === null) {
    return;
  }

  const commentedReview = '/* ChatGPT suggestion:\n' + review.replace(/\n/g, '\n * ') + '\n */\n';
  const newFileContent = commentedReview + fileContent;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);

  fs.writeFileSync(absoluteFilePath, newFileContent);
}

function activate(context) {
  console.log('Extension "chatgpt-code-review" is now active.');

  let disposable = vscode.commands.registerCommand('extension.analyzeCode', async function () {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (!workspaceFolders) {
          vscode.window.showErrorMessage('No workspace is open.');
          return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;

      const gitInstance = git(workspacePath);
      const currentBranch = await getCurrentBranch();
      console.log(`Current branch: ${currentBranch}`);

      const analyzeScope = vscode.workspace.getConfiguration('chatgpt-code-review').get('analyzeScope');

      let filePaths;
      if (analyzeScope === 'all-changed-files-in-current-branch') {
        filePaths = await getAllModifiedFilesInBranch(gitInstance);
      } else {
        filePaths = await getChangedFiles(gitInstance);
      }
      filePaths = filePaths.filter(shouldAnalyzeFile);
      console.log(`File paths: ${filePaths}`);

      const fileContents = await Promise.all(filePaths.map(filePath => getFileContent(path.join(workspacePath, filePath))));

      const reviews = await Promise.all(fileContents.map(analyzeCode));

      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const review = reviews[i];

        await addReviewComments(filePath, review);
      }
  });

  context.subscriptions.push(disposable);
}

function deactivate() {
  if (commentController) {
    commentController.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};
