const vscode = require('vscode');
const path = require('path');
const child_process = require('child_process');

const CommentsProvider = require('./providers/CommentsProvider');
const { analyzeCode } = require('./chatgpt');

let activeEditor;
let decorationType;

const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath; 

// Set commentsFilePath
const commentsFilePath = path.join(rootPath, '.vscode', 'chatgpt-comments.json');

// Create an instance of CommentsProvider
let commentsProvider = new CommentsProvider(commentsFilePath);

function addComment(comment, filePath) {
  // Fetch the comments for the active file
  const comments = commentsProvider.getCommentsForFile(filePath) || { review: '' };

  // Append the new comment
  comments.review += JSON.parse(comment);

  // Update the comments file
  commentsProvider.updateComments(filePath, comments);
}

function activate(context) {
  decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: ' ',
      backgroundColor: 'yellow'
    },
    hoverMessage: 'Has comments'
  });

  if (vscode.window.activeTextEditor) {
    activeEditor = vscode.window.activeTextEditor;
    decorate();
  }

  vscode.workspace.onDidSaveTextDocument(async (document) => {
    const code = document.getText(); // Get the content of the saved file.
    const review = await analyzeCode(code, path.extname(document.uri.fsPath)); // Analyze the code.
    addComment(review, document.uri.fsPath); // Add the review as a comment.
    decorate(); // Update the decorations.
  }, null, context.subscriptions);

  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      decorate();
    }
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document.uri.toString() === activeEditor.document.uri.toString()) {
      decorate();
    }
  }, null, context.subscriptions);
}

async function decorate() {
  if (!activeEditor) {
    return;
  }

  const doc = activeEditor.document;
  const decorations = [];

  // Fetch the comments for the active file
  const comments = commentsProvider.getCommentsForFile(doc.uri.fsPath);

  if (!comments) {
    return;  // No comments for this file
  }

  console.log('comments:', comments)
  // Split the comments into lines
  const commentLines = comments?.review?.split('\n');

  // Create a decoration for each line
  commentLines?.forEach((line, i) => {
    if (line.trim().startsWith('- [ ]')) {
      const lineLength = doc.lineAt(i).text.length;
      const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, lineLength));
      const hoverMessage = new vscode.MarkdownString(line.replace('- [ ]', '').trim());
      const decoration = { range, hoverMessage };

      decorations.push(decoration);
    }
  });

  activeEditor.setDecorations(decorationType, decorations);
}


module.exports = { activate };
