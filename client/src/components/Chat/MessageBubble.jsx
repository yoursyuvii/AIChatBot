// In client/src/components/Chat/MessageBubble.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { formatTime } from '../../utils/formatTime';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageBubble = ({ message, isUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bubbleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
  };

  const avatarVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      className={`flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
    >
      {!isUser && (
        <motion.div variants={avatarVariants} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
      )}

      <div className={`max-w-2xl flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <motion.div
          variants={bubbleVariants}
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <ReactMarkdown
              className="prose dark:prose-invert prose-p:my-0 prose-ul:my-2 prose-ol:my-2 max-w-none"
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeText = String(children).replace(/\n$/, '');
                  return !inline && match ? (
                    <div className="relative my-2 bg-[#2d2d2d] rounded-lg">
                      <button 
                        onClick={() => handleCopy(codeText)} 
                        className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-gray-300 hover:text-white"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <SyntaxHighlighter
                        style={atomDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {codeText}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-red-500" {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </motion.div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
          {formatTime(message.timestamp)}
        </p>
      </div>

      {isUser && (
        <motion.div variants={avatarVariants} className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default MessageBubble;
