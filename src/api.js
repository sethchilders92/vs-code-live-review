const { Configuration, OpenAIApi } = require('openai');

async function generateReview(prompt) {
  try {
      const configuration = new Configuration({ apiKey: process.env.OPENAI_API_TOKEN });
      const openai = new OpenAIApi(configuration);

      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        n: 1,
        stop: null,
        temperature: 0.7,
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating review:', error);
      return `Error generating review: ${error.message}`;
    }
}


module.exports = {
  generateReview,
};
