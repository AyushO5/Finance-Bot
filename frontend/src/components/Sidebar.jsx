import React from 'react';
import { BarChart3, X, Plus, MessageSquare, Target, Trash2, Download } from 'lucide-react';
import GoalCard from './GoalCard';

const API_BASE = 'http://127.0.0.1:5000';

/**
 * Fix #11: Sidebar extracted from App.jsx monolith.
 * Fix #15: Export button per chat.
 */
export default function Sidebar({
  chats, currentChatId, goals, currentTab,
  addFundsGoal, addFundsAmount, fundsLoading,
  setAddFundsGoal, setAddFundsAmount, setCurrentTab,
  handleNewChat, handleSwitchChat, handleDeleteChat,
  handleDeleteGoal, handleAddFunds,
  setSidebarOpen, setShowGoalModal,
}) {

  // Fix #15: Download chat export
  const handleExport = (chat, fmt) => {
    const url = `${API_BASE}/api/memory/chats/${chat.id}/export?format=${fmt}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title || 'chat'}.${fmt}`;
    a.click();
  };

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-icon"><BarChart3 size={28} /></div>
          <h1>Finance AI</h1>
        </div>
        <button className="action-btn" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      </div>

      {/* New Chat + Recent Chats */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setCurrentTab('chat')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
              background: currentTab === 'chat' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: currentTab === 'chat' ? '#0a0a12' : 'var(--text-muted)',
              border: 'none', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Chat
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer',
              background: currentTab === 'dashboard' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: currentTab === 'dashboard' ? '#0a0a12' : 'var(--text-muted)',
              border: 'none', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Dashboard
          </button>
        </div>

        <button
          onClick={handleNewChat}
          style={{
            width: '100%', padding: '0.75rem',
            background: 'rgba(0, 243, 255, 0.08)',
            color: 'var(--accent)',
            border: '1px solid rgba(0, 243, 255, 0.35)',
            borderRadius: '8px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem',
            fontWeight: 600, transition: 'all 0.2s', backdropFilter: 'blur(4px)'
          }}
        >
          <Plus size={16} /> New Chat
        </button>

        {currentTab === 'chat' && (
          <>
            <div className="goals-header">Recent Chats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => handleSwitchChat(chat.id)}
              style={{
                padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: chat.id === currentChatId ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                border: `1px solid ${chat.id === currentChatId ? 'var(--accent)' : 'transparent'}`,
                color: chat.id === currentChatId ? '#fff' : 'var(--text-muted)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                <MessageSquare size={14} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {chat.title}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {/* Fix #15: Export button per chat */}
                <button
                  onClick={e => { e.stopPropagation(); handleExport(chat, 'txt'); }}
                  title="Export as TXT"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <Download size={12} />
                </button>
                {chats.length > 1 && (
                  <button
                    onClick={e => handleDeleteChat(chat.id, e)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </div>

      {/* Goals Section */}
      <div className="goals-section">
        <div className="goals-header">
          <Target size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Goals Tracking
        </div>

        {goals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            addFundsGoal={addFundsGoal}
            addFundsAmount={addFundsAmount}
            fundsLoading={fundsLoading}
            setAddFundsGoal={setAddFundsGoal}
            setAddFundsAmount={setAddFundsAmount}
            handleAddFunds={handleAddFunds}
            handleDeleteGoal={handleDeleteGoal}
          />
        ))}

        <button
          onClick={() => setShowGoalModal(true)}
          style={{
            width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
            border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-main)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', marginTop: '1rem'
          }}
        >
          <Plus size={16} /> Add Goal
        </button>
      </div>
    </div>
  );
}
