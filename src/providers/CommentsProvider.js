const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class CommentsProvider extends EventEmitter {
  constructor(commentsFilePath) {
    super();  // Call EventEmitter's constructor
    this.commentsFilePath = commentsFilePath;

    try {
        // Check if the file exists
        if (!fs.existsSync(commentsFilePath)) {
            // If it doesn't exist, create it
            fs.writeFileSync(commentsFilePath, JSON.stringify({}), 'utf8');
            console.log('File created successfully');
        }
        const commentsFileContent = fs.readFileSync(this.commentsFilePath, 'utf-8');
        this.comments = JSON.parse(commentsFileContent);
    } catch (error) {
        console.error('Error reading comments file:', error);
        // Default to an empty object if the file can't be read
        this.comments = {};
      }
  }

  getCommentsForFile(filePath) {
    console.log('getCommentsForFile filePath:', filePath)
    // Check if the comments file exists before attempting to read from it
    if (!fs.existsSync(this.commentsFilePath)) {
        // If the file doesn't exist, return an empty object.
        return {};
    }
    // If the file does exist, proceed as normal.
    const comments = JSON.parse(fs.readFileSync(this.commentsFilePath));
    return comments[filePath] || {};
  }

  updateComments(filePath, newComments) {
    try {
      let comments = {};
      // Check if the comments file exists before attempting to read from it.
      if (fs.existsSync(this.commentsFilePath)) {
        comments = JSON.parse(fs.readFileSync(this.commentsFilePath));
      }
      
      if (JSON.parse(newComments).review) {
        comments[filePath] = newComments;
        fs.writeFileSync(this.commentsFilePath, JSON.stringify(comments, null, 2));
      }
    } catch (error) {
      console.log(filePath, error);
    }
  }

  refresh() {
    this.emit('changed');
  }
}

module.exports = CommentsProvider;
