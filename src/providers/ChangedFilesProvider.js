const vscode = require('vscode');
const path = require('path');
const git = require('simple-git');
const { shouldAnalyzeFile } = require('../utils');

class ChangedFilesProvider {
    constructor(comments) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.comments = comments;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    resolveTreeItem(item, element, token) {
        console.log('resolveTreeItem - item: ', item);
    
        // Check if `item.resourceUri` is defined
        if(item.resourceUri) {
            // Add a command to this item that opens a text document with the comments
            const commentsUri = vscode.Uri.parse(`chatgpt-comments:${item.resourceUri.path}`);
            item.command = {
                command: 'vscode.open', 
                title: 'Open Comments',
                arguments: [commentsUri]
            };
        } else {
            console.error('Resource URI not found for item:', item);
        }
    
        return item;
    }    

    getChildren(element) {
        console.log('getChildren - element: ', element);
    
        if (this.comments && typeof this.comments === 'object') {
          const filePaths = Object.keys(this.comments);
          return filePaths.map((filePath) => ({
            label: path.basename(filePath),
            description: filePath,
            filePath,
            resourceUri: vscode.Uri.file(filePath), // Add this line
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'extension.openFile',
              title: 'Open File',
              arguments: [filePath],
            },
          }));
        } else {
          return []; // If `this.comments` is not an object, return an empty array
        }
    }
    
      
      

    async getChangedFiles() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }
    
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const gitInstance = git(workspacePath);
    
            const diffOutput = await gitInstance.diff(['--name-only']);
            const untrackedFilesOutput = await gitInstance.raw(['ls-files', '--others', '--exclude-standard']);
    
            let filePaths = diffOutput.trim().split('\n').concat(untrackedFilesOutput.trim().split('\n'));
            filePaths = filePaths.filter(shouldAnalyzeFile);
    
            // Return the file paths as an array of TreeItems
            return filePaths.map(filePath => {
                const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);
                const treeItem = new vscode.TreeItem(filePath);
                treeItem.resourceUri = vscode.Uri.file(absoluteFilePath);

                console.log('Created TreeItem: ', treeItem);

                return treeItem;
            });
        } catch (error) {
            console.error('Failed to get changed files:', error);
            vscode.window.showErrorMessage('Failed to get changed files. Please check the console for more details.');
            return [];
        }
    }    
}

module.exports = ChangedFilesProvider;
