// In client/src/components/Chat/ChatInterface.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import toast from 'react-hot-toast';

const ChatItem = ({ chat, isActive, onClick, onDelete }) => {
  return (
    <motion.li
      layout
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 10 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onClick}
      className="relative group flex items-center justify-between p-3 rounded-lg cursor-pointer"
    >
      {isActive && (
        <motion.div
          layoutId="activeChatIndicator"
          className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg"
        />
      )}
      <div className="relative flex items-center gap-3 truncate">
        <MessageSquare className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
        <span className={`truncate text-sm font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{chat.title}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="relative p-1 rounded-md text-gray-400 transition-all opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.li>
  );
};

const ChatInterface = () => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const currentChatRef = useRef(null);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const selectChat = useCallback(async (chat) => {
    if (!chat) return;
    setCurrentChat(chat);
    setMessages([]);
    try {
      const res = await api.get(`/chat/${chat._id}`);
      setMessages(res.data.messages);
    } catch (err) {
      toast.error("Failed to load chat messages.");
    }
  }, []);

  const createNewChat = useCallback(async () => {
    try {
      const res = await api.post('/chat', { title: 'New Conversation' });
      const newChat = res.data;
      setChats(prev => [newChat, ...prev]);
      selectChat(newChat);
    } catch (err) {
      toast.error("Failed to create new chat.");
    }
  }, [selectChat]);

  const fetchChats = useCallback(async () => {
    try {
      const res = await api.get('/chat');
      setChats(res.data);
      if (res.data.length > 0) {
        selectChat(res.data[0]);
      } else {
        createNewChat();
      }
    } catch (err) {
      toast.error("Failed to load chats.");
    } finally {
      setLoading(false);
    }
  }, [selectChat, createNewChat]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketService.connect(token);
    fetchChats();

    const handleTypingStart = ({ chatId }) => {
      if (chatId === currentChatRef.current?._id) {
        setIsAiTyping(true);
        setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);
      }
    };

    const handleStreamChunk = ({ chatId, chunk }) => {
      if (chatId === currentChatRef.current?._id) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessageIndex = newMessages.length - 1;
          
          if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'assistant') {
            // FIX: Create a new object for the last message to force a re-render
            newMessages[lastMessageIndex] = {
              ...newMessages[lastMessageIndex],
              content: newMessages[lastMessageIndex].content + chunk,
            };
          }
          return newMessages;
        });
      }
    };

    const handleTypingStop = ({ chatId }) => {
      if (chatId === currentChatRef.current?._id) {
        setIsAiTyping(false);
      }
    };

    socketService.on('ai_typing_start', handleTypingStart);
    socketService.on('ai_stream_chunk', handleStreamChunk);
    socketService.on('ai_typing_stop', handleTypingStop);

    return () => {
      socketService.off('ai_typing_start', handleTypingStart);
      socketService.off('ai_stream_chunk', handleStreamChunk);
      socketService.off('ai_typing_stop', handleTypingStop);
      socketService.disconnect();
    };
  }, [fetchChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  const sendMessage = async (messageContent) => {
    if (!currentChat || isAiTyping) return;
    const userMessage = { role: 'user', content: messageContent, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    try {
      await api.post(`/chat/${currentChat._id}/message`, { message: messageContent });
    } catch (err) {
      toast.error("Failed to send message.");
      setMessages(prev => prev.slice(0, -1));
    }
  };
  
  const deleteChat = async (chatId) => {
    const previousChats = chats;
    const updatedChats = chats.filter(chat => chat._id !== chatId);
    setChats(updatedChats);

    try {
      if (currentChat?._id === chatId) {
        if (updatedChats.length > 0) {
          selectChat(updatedChats[0]);
        } else {
          createNewChat();
        }
      }
      await api.delete(`/chat/${chatId}`);
      toast.success("Chat deleted!");
    } catch (err) {
      setChats(previousChats);
      toast.error("Failed to delete chat.");
    }
  };

  if (loading) return <div className="pt-20 text-center">Loading...</div>;

  return (
    <div className="flex h-screen pt-16 bg-gray-50 dark:bg-gray-900/50">
      <motion.aside layout className="w-80 bg-white dark:bg-gray-800 p-4 flex flex-col border-r border-gray-200 dark:border-gray-700">
        <button onClick={createNewChat} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white p-3 rounded-lg mb-4 hover:bg-primary-700 transition-colors shadow-sm">
          <Plus className="h-5 w-5" />
          New Chat
        </button>
        <ul className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-1">
          <AnimatePresence>
            {chats.map(chat => (
              <ChatItem
                key={chat._id}
                chat={chat}
                isActive={currentChat?._id === chat._id}
                onClick={() => selectChat(chat)}
                onDelete={() => deleteChat(chat._id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      </motion.aside>

      <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
        {currentChat && (
          <header className="bg-white dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 z-10">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{currentChat.title}</h2>
          </header>
        )}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={currentChat?._id}
          className="flex-1 p-6 overflow-y-auto space-y-6"
        >
          {messages.map((msg, index) => (
            <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} isUser={msg.role === 'user'} />
          ))}
          <div ref={messagesEndRef} />
        </motion.div>
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <MessageInput onSendMessage={sendMessage} disabled={isAiTyping} />
        </div>
      </main>
    </div>
  );
};

export default ChatInterface;
