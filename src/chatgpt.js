const { generateReview } = require('./api');

async function analyzeCode(code) {
  // Prepare the prompt for code review and error analysis
  const prompt = `Review the following code, suggest improvements, and identify any errors:\n\n${code}\n`;

  // Generate the review
  const review = await generateReview(prompt);

  return `Review:\n${review}`;
}

module.exports = {
  analyzeCode,
};
