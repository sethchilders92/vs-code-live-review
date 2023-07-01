const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');

async function generateReview(prompt) {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_TOKEN });
  const openai = new OpenAIApi(configuration);

  let retryCount = 0;

  // Define an asynchronous retry function with exponential backoff
  const retryWithDelay = async (cb, delay = 5000) => {
    retryCount++;
    return new Promise(resolve => {
      setTimeout(async () => {
        resolve(await cb());
      }, delay * retryCount);
    });
  };

  // Define the main request function
  const request = async () => {
    try {
      console.log('Making a request...');
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-16k',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        n: 1,
        stop: null,
        temperature: 0.7,
      });
      console.log('Response received.');

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      // If the error is a rate limit error, retry after a delay
      if (error.isAxiosError && error?.response?.status === 429) {
        console.log('Rate limit exceeded. Retrying...');
        return retryWithDelay(request);
      }
      console.error('Error generating review:', error);
      return `Error generating review: ${error.message}`;
    }
  };

  // Start the request
  return request();
}


module.exports = {
  generateReview,
};
