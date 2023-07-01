const vscode = require('vscode');
const path = require('path');
const git = require('simple-git');
const ChangedFilesProvider = require('./providers/ChangedFilesProvider');
const CommentsProvider = require('./providers/CommentsProvider');
const SummaryProvider = require('./providers/SummaryProvider');
const { analyzeCode } = require('./chatgpt');
const decorators = require('./decorators');

const {
  shouldAnalyzeFile,
  getGitRepoRoot,
  getFileContent,
  getAllModifiedFilesInBranch,
  getChangedFiles
} = require('./utils');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath; 

const filePath = path.join(rootPath, '.vscode', 'chatgpt-comments.json');

// Create this outside the activate function so it's accessible elsewhere
const commentsProvider = new CommentsProvider(filePath);

async function addReviewComments(filePath, review) {
  console.log('addReviewComments', filePath)

  // Update this to write to the comments JSON file instead of the source code file
  commentsProvider.updateComments(filePath, review);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Extension "chatgpt-code-review" is now active.');
  decorators.activate(context);

  // Create and register the TreeDataProviders
  const changedFilesProvider = new ChangedFilesProvider(commentsProvider.comments);

  vscode.window.registerTreeDataProvider('changedFiles', changedFilesProvider);
  vscode.window.registerTreeDataProvider('comments', commentsProvider);
  
  // Listen for the 'changed' event and refresh the view
  commentsProvider.on('changed', () => {
    changedFilesProvider.refresh();
  });

  const summaryProvider = new SummaryProvider();
  vscode.window.registerTreeDataProvider('summary', summaryProvider);

  // Register the 'chatgpt-code-review.openComments' command
  const openCommentsCommand = vscode.commands.registerCommand('chatgpt-code-review.openComments', async (uri) => {
      vscode.window.showTextDocument(uri);
  });

  // Register the 'chatgpt-comments' scheme
  const commentsProviderRegistration = vscode.workspace.registerTextDocumentContentProvider('chatgpt-comments', commentsProvider);


  let disposable = vscode.commands.registerCommand('extension.analyzeCode', async function () {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace is open.');
        return;
    }

    
    try {
      gitRepoRoot = getGitRepoRoot();
    } catch (error) {
      vscode.window.showErrorMessage(error.message);
      return;
    }
    console.log(`Git Repo Root in activate: ${gitRepoRoot}`);

    const gitInstance = git(gitRepoRoot);
    console.log(`Current instance: ${Object.keys(gitInstance)}`, Object.values(gitInstance));
    const analyzeScope = vscode.workspace.getConfiguration('chatgpt-code-review').get('analyzeScope');

    let filePaths;
    if (analyzeScope === 'all-changed-files-in-current-branch') {
      filePaths = await getAllModifiedFilesInBranch(gitInstance);
      console.log('filePaths 1', filePaths)
    } else {
      filePaths = await getChangedFiles(gitInstance, gitRepoRoot);
      console.log('filePaths 2', filePaths)

    }
    filePaths = filePaths.filter(shouldAnalyzeFile);

    console.log(`File paths: ${filePaths}`);

    const fileContents = await Promise.all(filePaths.map(filePath => {
      console.log('fileContents: ', filePath)
      return getFileContent(filePath)
    }));

    // add a delay between each review request
    const reviews = [];
    for (let fileContent of fileContents) {
      reviews.push(await analyzeCode(fileContent));
      await new Promise(resolve => setTimeout(resolve, 100)); // delay of 100ms
    }

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const review = reviews[i];
      console.log('disposable', filePath)

      await addReviewComments(filePath, review);
      
      // After performing the analysis and updating the JSON file with the reviews,
      // refresh the ChatGPTCommentsProvider and ChangedFilesProvider to reflect the new state.
      const uri = vscode.Uri.file('/path/to/your/file');
      commentsProvider.refresh(uri);
    }


    changedFilesProvider.refresh();

    // Set the isAnalyzing context value to true
    vscode.commands.executeCommand('setContext', 'chatgpt-code-review:isAnalyzing', true);
  });

  // Add the new command and registration to the extension's subscriptions so they are properly disposed of when the extension is deactivated
  context.subscriptions.push(vscode.commands.registerCommand('extension.openFile', (filePath) => {
    vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then((doc) => {
        vscode.window.showTextDocument(doc);
    });
  }));
}

function deactivate() {
}

module.exports = {
  activate,
  deactivate
};
