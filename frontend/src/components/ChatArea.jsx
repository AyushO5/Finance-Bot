import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Zap } from 'lucide-react';
import { ComparisonChart, ExpenseChart, SentimentBadge } from './ChartRenderer';

export default function ChatArea({ messages, loading, setInput, messagesEndRef }) {
  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="welcome-container">
          <div className="welcome-logo">💰</div>
          <h2 className="welcome-title">How can I help your finances today?</h2>
          <p style={{ color: 'var(--text-muted)' }}>Ask about budgeting, saving, or investing. Or upload an expense CSV.</p>
          <div className="feature-grid">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="feature-pill" onClick={() => setInput('Compare RELIANCE vs INFY over 1 year')}>📈 Compare Stocks</motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="feature-pill" onClick={() => setInput('What is the latest news on TSLA?')}>📰 Live Sentiment</motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="feature-pill" onClick={() => setInput('I earn 80000 a month and pay 25000 rent and 8000 food. Build a budget.')}>💡 Budgeting</motion.div>
          </div>
        </div>
      ) : (
        messages.map((msg, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`message-wrapper ${msg.role}`}
          >
            <div className="avatar">
              {msg.role === 'user' ? 'U' : <Zap size={18} color="white" />}
            </div>
            <div className="message-bubble">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {msg.extra && <ComparisonChart extra={msg.extra} />}
              {msg.extra?.sentiment_data && <SentimentBadge data={msg.extra.sentiment_data} />}
              {msg.expenses && <ExpenseChart expenses={msg.expenses} />}
            </div>
          </motion.div>
        ))
      )}

      {loading && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="message-wrapper assistant"
        >
          <div className="avatar"><Zap size={18} color="white" /></div>
          <div className="message-bubble">
            <div className="typing"><span /><span /><span /></div>
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
