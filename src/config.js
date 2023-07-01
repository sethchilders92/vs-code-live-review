// Import necessary modules
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Default configuration object
const defaultConfig = {
  language: 'javascript',
  analyzeErrors: true,
  offerSuggestions: true,
  reviewDepth: 'medium',
};

// getConfig function retrieves the extension configuration
async function getConfig() {
  // Get the workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }

  // Determine the path to the configuration file
  const configFile = path.join(workspaceFolders[0].uri.fsPath, 'chatgptconfig.json');

  // If the configuration file doesn't exist, create it with the default configuration
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
  }

  // Read the content of the configuration file
  const content = await fs.promises.readFile(configFile, 'utf-8');
  
  // Parse and return the configuration object
  return JSON.parse(content);
}

// Export the getConfig function
module.exports = {
  getConfig,
};
