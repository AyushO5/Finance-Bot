import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Zap, Menu, LogOut, Settings } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatArea from './components/ChatArea';
import InputBar from './components/InputBar';
import Modals from './components/Modals';
import AuthPage from './components/AuthPage';
import SettingsModal from './components/SettingsModal';
import './index.css';

const API_BASE = 'http://127.0.0.1:5000';

export default function App() {
  // ── Auth State ── //
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('fin_user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('fin_token') || null);

  // Set axios default Authorization header whenever token changes
  useEffect(() => {
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else delete axios.defaults.headers.common['Authorization'];
  }, [token]);

  const handleLogin = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('fin_token');
    localStorage.removeItem('fin_user');
    setUser(null);
    setToken(null);
    setMessages([]);
    setChats([]);
    toast('Logged out successfully', { icon: '👋' });
  };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(1);
  const [goals, setGoals] = useState([]);
  const [addFundsGoal, setAddFundsGoal] = useState(null);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [fundsLoading, setFundsLoading] = useState(null);
  const [currentTab, setCurrentTab] = useState('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ── Data Fetching ── //
  const fetchMemory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/memory/`);
      const { memory, goals } = res.data;
      setGoals(goals || []);
      setChats(memory.chats || []);
      setCurrentChatId(memory.current_chat_id || 1);
      const currentChat = memory.chats?.find(c => c.id === memory.current_chat_id);
      if (currentChat) setMessages(currentChat.messages || []);
    } catch (err) {
      console.error("Failed to load memory:", err);
    }
  };

  useEffect(() => { if (user && token) fetchMemory(); }, [user, token]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in your browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast('Listening...', { icon: '🎙️', duration: 3000 });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        if (event.error === 'network') {
          toast.error('Voice input failed: Network error (often happens on Linux Chromium without Google API keys).');
        } else {
          toast.error('Voice input error: ' + event.error);
        }
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      toast('Response stopped by user', { icon: '🛑' });
      setTimeout(fetchMemory, 500); // Fetch to sync the "[Stopped]" appended text
    }
  };

  // ── Chat ── //
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', extra: {} }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, history: newMessages, profile: {} }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                if (chunk.type === 'text') {
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    updated[lastIndex] = { ...updated[lastIndex], content: updated[lastIndex].content + chunk.text };
                    return updated;
                  });
                } else if (chunk.type === 'extra') {
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    updated[lastIndex] = { ...updated[lastIndex], extra: chunk.data };
                    return updated;
                  });
                }
              } catch (e) {
                // Wait for the rest of the chunk
              }
            }
          }
        }
      }
      fetchMemory();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      console.error(err);
      toast.error('Unable to connect to the backend server.');
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = '❌ **Error**: Unable to connect to the backend server.';
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Upload ── //
  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setShowUpload(false);
    setMessages(prev => [...prev, { role: 'user', content: `Uploaded ${file.name}` }]);
    setLoading(true);
    const uploadToast = toast.loading('Analyzing document...');
    try {
      const res = await axios.post(`${API_BASE}/upload/`, formData);
      const data = res.data;
      let reply = `📊 **Expense Breakdown from ${file.name}**\n\n`;
      Object.entries(data.expenses).forEach(([k, v]) => { reply += `- ${k}: ₹${v}\n`; });
      reply += `\n🤖 **Insights:**\n${data.ai_insights}`;
      setMessages(prev => [...prev, { role: 'assistant', content: reply, expenses: data.expenses }]);
      fetchMemory();
      toast.success('File analyzed successfully!', { id: uploadToast });
    } catch (err) {
      console.error(err);
      toast.error('Upload failed.', { id: uploadToast });
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ **Upload failed.**' }]);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  // ── Chat Management ── //
  const handleNewChat = async () => {
    try { await axios.post(`${API_BASE}/api/memory/chats/new`); fetchMemory(); toast.success('New chat created'); } catch (e) { console.error(e); toast.error('Failed to create chat'); }
  };
  const handleSwitchChat = async (id) => {
    try { await axios.post(`${API_BASE}/api/memory/chats/switch`, { chat_id: id }); fetchMemory(); } catch (e) { console.error(e); toast.error('Failed to switch chat'); }
  };
  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    try { await axios.delete(`${API_BASE}/api/memory/chats/${id}`); fetchMemory(); toast.success('Chat deleted'); } catch (e) { console.error(e); toast.error('Failed to delete chat'); }
  };

  // ── Goals ── //
  const handleDeleteGoal = async (id) => {
    try { await axios.delete(`${API_BASE}/api/memory/goals/${id}`); fetchMemory(); toast.success('Goal deleted'); } catch (e) { console.error(e); toast.error('Failed to delete goal'); }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget) return;
    try {
      await axios.post(`${API_BASE}/api/memory/goals`, {
        name: newGoalName,
        target: parseFloat(newGoalTarget),
        currency: '₹',
        deadline: newGoalDeadline || null
      });
      setShowGoalModal(false);
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalDeadline('');
      fetchMemory();
      toast.success('Goal created successfully!');
    } catch (e) { console.error(e); toast.error('Failed to create goal'); }
  };

  const handleAddFunds = async (goal) => {
    const amount = parseFloat(addFundsAmount);
    if (isNaN(amount) || amount <= 0) return;
    setFundsLoading(goal.id);
    try {
      await axios.put(`${API_BASE}/api/memory/goals/${goal.id}`, { saved: goal.saved + amount });
      setAddFundsGoal(null);
      setAddFundsAmount('');
      fetchMemory();
      toast.success(`Added ₹${amount} to goal!`);
    } catch (e) { console.error(e); toast.error('Failed to add funds'); }
    finally { setFundsLoading(null); }
  };

  // ── Auth gate ── //
  if (!user || !token) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ style: { background: '#1c1c28', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <AuthPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="app-container">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1c1c28', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      />

      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          chats={chats}
          currentChatId={currentChatId}
          goals={goals}
          currentTab={currentTab}
          addFundsGoal={addFundsGoal}
          addFundsAmount={addFundsAmount}
          fundsLoading={fundsLoading}
          setAddFundsGoal={setAddFundsGoal}
          setAddFundsAmount={setAddFundsAmount}
          setCurrentTab={setCurrentTab}
          handleNewChat={handleNewChat}
          handleSwitchChat={handleSwitchChat}
          handleDeleteChat={handleDeleteChat}
          handleDeleteGoal={handleDeleteGoal}
          handleAddFunds={handleAddFunds}
          setSidebarOpen={setSidebarOpen}
          setShowGoalModal={setShowGoalModal}
        />
      </div>

      {currentTab === 'dashboard' ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <div className="chat-header">
            {!sidebarOpen && (
              <button className="action-btn" style={{ marginRight: '1rem' }} onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
            )}
            <div className="chat-title">AI Advisor Dashboard</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>👤 {user?.name}</span>
              <button className="action-btn" onClick={() => setShowSettings(true)} title="Settings">
                <Settings size={18} />
              </button>
              <button className="action-btn" onClick={handleLogout} title="Logout" style={{ color: 'var(--danger)' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <Dashboard goals={goals} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
          className={`main-chat ${messages.length === 0 ? 'chat-empty' : ''}`}
        >
          <div className="chat-header">
            {!sidebarOpen && (
              <button className="action-btn" style={{ marginRight: '1rem' }} onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
            )}
            <div className="chat-title">AI Advisor</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>👤 {user?.name}</span>
              <button className="action-btn" onClick={() => setShowSettings(true)} title="Settings">
                <Settings size={18} />
              </button>
              <button className="action-btn" onClick={handleLogout} title="Logout" style={{ color: 'var(--danger)' }}>
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <ChatArea
            messages={messages}
            loading={loading}
            setInput={setInput}
            messagesEndRef={messagesEndRef}
          />
          <InputBar
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            handleStop={handleStop}
            loading={loading}
            setShowUpload={setShowUpload}
            handleMicClick={handleMicClick}
            isRecording={isRecording}
          />
        </motion.div>
      )}

      <Modals
        showGoalModal={showGoalModal} setShowGoalModal={setShowGoalModal} handleAddGoal={handleAddGoal}
        newGoalName={newGoalName} setNewGoalName={setNewGoalName}
        newGoalTarget={newGoalTarget} setNewGoalTarget={setNewGoalTarget}
        newGoalDeadline={newGoalDeadline} setNewGoalDeadline={setNewGoalDeadline}
        showUpload={showUpload} setShowUpload={setShowUpload}
        handleUpload={handleUpload} file={file} setFile={setFile} loading={loading}
      />

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}
