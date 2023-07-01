const path = require('path');
const { generateReview } = require('./api');

async function analyzeCode(code, fileExtension) {
  const codeLines = code.split('\n');

  // Prepare the prompt for code review and error analysis
  const prompt = `Review the following JSON, analyze the code and keep record of the line number, suggest improvements, and identify any errors. Format response so it matches the exampleOutput format. Here's the JSON with the code, exampleOutput, the file extension, and review types I'd like you to focus on: `;

  const promptFormat = {
    "code": codeLines,
    "filetype": fileExtension,
    "reviewTypes": ['portability', 'security', 'refactoring', 'optimization', 'best-practices', 'error-handling', 'readability', 'maintainability', 'test-coverage', 'architecture'],
    "exampleOutput": {
      "filetype": "js",
      "review": [
        {
          "lines": [3],
          "date": new Date(),
          "reviewType": "readability",
          "comment": "Consider adding a comment to explain the purpose of this function."
        },
        {
          "lines": [4,5,6,7,8,9],
          "date": new Date(),
          "reviewType": "best-practices",
          "comment": "Avoid using magic numbers. Consider defining this number as a constant at the top of your file."
        }
      ]
    }
  }

  // Generate the review
  const review = await generateReview(prompt + JSON.stringify(promptFormat));

  return review;
}

module.exports = {
  analyzeCode,
};
