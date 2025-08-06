// In server/services/aiService.js
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

class AIService {
  // This function is now specifically for streaming
  static async generateStreamResponse(chatHistory, model = 'llama3-8b-8192') {
    try {
      const messages = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // The key change is adding stream: true
      const stream = await groq.chat.completions.create({
        messages,
        model,
        stream: true, 
      });

      return stream;

    } catch (error) {
      console.error('Groq API Error:', error);
      throw new Error('Failed to generate AI response stream');
    }
  }

  // These helper functions remain the same
  static estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  static trimContextWindow(messages, maxChars = 15000) {
    let totalChars = 0;
    const trimmedMessages = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageChars = message.content.length;
      if (totalChars + messageChars <= maxChars) {
        trimmedMessages.unshift(message);
        totalChars += messageChars;
      } else {
        break;
      }
    }
    return trimmedMessages;
  }
}

module.exports = AIService;
