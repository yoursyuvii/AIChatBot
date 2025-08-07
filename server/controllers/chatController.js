// In server/controllers/chatController.js
const Chat = require('../models/Chat');
const AIService = require('../services/aiService'); // Make sure this path is correct

class ChatController {
  static async createChat(req, res) {
    try {
      const { title } = req.body;

      const chat = new Chat({
        userId: req.user.id,
        title: title || 'New Chat',
        messages: []
      });

      await chat.save();
      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUserChats(req, res) {
    try {
      const chats = await Chat.find({ 
        userId: req.user.id, 
        isActive: true 
      })
      .select('title createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .limit(50);

      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getChat(req, res) {
    try {
      const chat = await Chat.findOne({
        _id: req.params.chatId,
        userId: req.user.id
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async sendMessage(req, res) {
    const { chatId } = req.params;
    const io = req.app.get('io');

    try {
      const { message } = req.body;

      const chat = await Chat.findOne({
        _id: chatId,
        userId: req.user.id
      });

      if (!chat) {
        io.to(`user_${req.user.id}`).emit('chat_error', { chatId, message: 'Chat not found.' });
        return res.status(200).json({ error: 'Chat not found but acknowledged.' });
      }

      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
        tokenCount: AIService.estimateTokens(message)
      };
      chat.messages.push(userMessage);
      await chat.save(); 
      
      res.status(200).json({ message: "Message received, processing..." });

      io.to(`user_${req.user.id}`).emit('ai_typing_start', { chatId });

      const contextMessages = AIService.trimContextWindow(
        chat.messages.map(msg => ({ role: msg.role, content: msg.content })),
      );

      let fullResponse = "";
      const stream = await AIService.generateStreamResponse(contextMessages, chat.model);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        io.to(`user_${req.user.id}`).emit('ai_stream_chunk', { chatId, chunk: content });
      }

      io.to(`user_${req.user.id}`).emit('ai_typing_stop', { chatId });

      if (fullResponse) {
        const assistantMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          tokenCount: AIService.estimateTokens(fullResponse)
        };
        chat.messages.push(assistantMessage);
        await chat.save();
        
        // --- YE LINE MAINE ADD KI HAI ---
        io.to(`user_${req.user.id}`).emit('newMessage', assistantMessage);
      }

    } catch (error) {
      console.error("Error in sendMessage:", error);
      io.to(`user_${req.user.id}`).emit('ai_typing_stop', { chatId });
      io.to(`user_${req.user.id}`).emit('chat_error', { chatId, message: 'Failed to get AI response.' });
    }
  }

  static async deleteChat(req, res) {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: req.params.chatId, userId: req.user.id },
        { isActive: false },
        { new: true }
      );

      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateChatTitle(req, res) {
    try {
      const { title } = req.body;
      const chat = await Chat.findOneAndUpdate(
        { _id: req.params.chatId, userId: req.user.id },
        { title },
        { new: true }
      );

      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ChatController;