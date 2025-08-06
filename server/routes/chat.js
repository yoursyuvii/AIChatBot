// In server/routes/chat.js
const express = require('express');
const ChatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// This applies the `authenticate` middleware to all routes defined below
router.use(authenticate); 

router.post('/', ChatController.createChat);
router.get('/', ChatController.getUserChats);
router.get('/:chatId', ChatController.getChat);
router.post('/:chatId/message', ChatController.sendMessage);
router.delete('/:chatId', ChatController.deleteChat);
router.put('/:chatId/title', ChatController.updateChatTitle);

module.exports = router;