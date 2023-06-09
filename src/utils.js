const { minimatch } = require("minimatch");
const fs = require('fs');
const vscode = require('vscode');
const path = require('path');
const git = require('simple-git');

function shouldAnalyzeFile(filePath) {
    const ignoredPatterns = ['*.svg', '*.json', '*.md', 'node_modules/*'];
    const shouldAnalyze = !ignoredPatterns.some(pattern => minimatch(filePath, pattern));
    console.log(`Should analyze ${filePath}? ${shouldAnalyze}`);
    return shouldAnalyze;
}

function getGitRepoRoot() {
    let currentDir = getWorkspaceFolderPath(); // Get the current directory of the file
    let repoRoot = null;
  
    // Traverse the directory structure upwards until a .git directory is found
    console.log('CurrentDir: ', currentDir)
    while (currentDir !== path.dirname(currentDir)) {
        const currentGitDir = path.join(currentDir, '.git');
        console.log(`currentDir: ${currentDir}, .git directory: ${currentGitDir}`);
        
        if (fs.existsSync(currentGitDir)) {
            repoRoot = currentDir;
            break;
        }
        currentDir = path.dirname(currentDir);
    }
    
    if (repoRoot === null) {
        throw new Error('No git repository found in the workspace');
    }

    console.log(`Git repo root: ${repoRoot}`);
    return repoRoot;
}

async function getCurrentBranch() {
    const gitInstance = git(getWorkspaceFolderPath());
    const currentBranch = await gitInstance.branch();
    return currentBranch.current;
}

function getWorkspaceFolderPath() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return null;
    }
    const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
    console.log(`Workspace folder path: ${workspaceFolderPath}`);
    return workspaceFolderPath;
}
  
async function getFileContent(filePath) {
    console.log('getFileContent', filePath)
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read file at ${filePath}: ${error.message}`);
      return null;
    }
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

async function getChangedFiles(gitInstance, gitRepoRoot) {
    if (gitRepoRoot === null) {
        throw new Error('Git repository root is not defined');
    }

    // Use simple-git's status() function to get the list of changed files
    const statusSummary = await gitInstance.status();
    const changedFiles = [...statusSummary.files, ...statusSummary.staged].map(file => file.path);
  
    // Filter out untracked files
    const untrackedFiles = statusSummary.not_added.map(file => file.path);
  
    // Combine the lists
    const allChangedFiles = [...changedFiles, ...untrackedFiles];
  
    // Only include files that should be analyzed
    console.log('gitInstance.cwd: ', gitInstance.cwd)
    const filePaths = allChangedFiles
      .filter(filePath => filePath && shouldAnalyzeFile(filePath))
      .map(filePath => {
        console.log(`gitRepoRoot: ${gitRepoRoot}, filePath: ${filePath}`);
        const resolvedPath = path.resolve(gitRepoRoot, filePath);
        console.log(`Resolved path: ${resolvedPath}`);
        return resolvedPath;
      });
  
    console.log('File paths in getChangedFiles:', filePaths);
  
    return filePaths;
}

module.exports = {
    shouldAnalyzeFile,
    getGitRepoRoot,
    getCurrentBranch,
    getWorkspaceFolderPath,
    getFileContent,
    getAllModifiedFilesInBranch,
    getChangedFiles
}
