const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class CommentsProvider {
    constructor() {
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        this.commentsFilePath = this.getCommentsFilePath(); // call the getCommentsFilePath() method and set it to this.commentsFilePath
        this.comments = this.loadComments();
        console.log('Comments loaded on initialization: ', this.comments);
    }

    refresh(uri = this._uri) {
        this._uri = uri;
        this._onDidChange.fire(this._uri);
    }    

    provideTextDocumentContent(uri) {
        this._uri = uri; // Update this._uri here
        const filePath = uri.fsPath;
        console.log('Getting comments for: ', filePath);
        if (this.comments[filePath]) {
            return this.comments[filePath].review;
        } else {
            return 'No ChatGPT comments available for this file.';
        }
    }
    

    getCommentsFilePath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspacePath = workspaceFolders[0].uri.fsPath;
        const commentsFilePath = path.join(workspacePath, '.vscode', 'chatgpt-comments.json');
        console.log('Comments file path: ', commentsFilePath);
        return commentsFilePath;
    }

    loadComments() {
        if (fs.existsSync(this.commentsFilePath)) {
            const rawContent = fs.readFileSync(this.commentsFilePath, 'utf8');
            return JSON.parse(rawContent);
        } else {
            return {};
        }
    }

    updateComments(filePath, review) {
        this.comments[filePath] = { review };
        console.log('Updated comments for: ', filePath);
        this.saveComments();
    }

    deleteComments(filePath) {
        delete this.comments[filePath];
        console.log('Deleted comments for: ', filePath);
        this.saveComments();
    }

    saveComments() {
        const commentsDir = path.dirname(this.commentsFilePath);
        console.log('commentsDir: ', commentsDir)
        try {
            if (!fs.existsSync(commentsDir)) {
                fs.mkdirSync(commentsDir, { recursive: true });
            }
            const commentsContent = JSON.stringify(this.comments, null, 2);
            fs.writeFileSync(this.commentsFilePath, commentsContent);
            console.log('Comments saved to file: ', this.commentsFilePath);
        } catch (error) {
            console.error(`Failed to save comments: ${error.message}`);
            vscode.window.showErrorMessage(`ChatGPT Code Review: Failed to save comments: ${error.message}`);
        }
    }
}

module.exports = CommentsProvider;
