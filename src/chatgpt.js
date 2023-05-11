const { generateReview } = require('./api');

async function analyzeCode(code, config) {
  // Prepare the prompt for code review
  const codeReviewPrompt = `Conduct a code review on the following ${config.language} code and suggest improvements:\n\n${code}\n`;

  // Generate code review response
  const codeReviewResponse = await generateReview(codeReviewPrompt);

  // Prepare the prompt for error analysis
  const errorAnalysisPrompt = `Analyze the following ${config.language} code for errors and explain any issues:\n\n${code}\n`;

  // Generate error analysis response
  const errorAnalysisResponse = await generateReview(errorAnalysisPrompt);

  // Return the combined response
  return `Code Review:\n${codeReviewResponse}\n\nError Analysis:\n${errorAnalysisResponse}`;
}

module.exports = {
  analyzeCode,
};
