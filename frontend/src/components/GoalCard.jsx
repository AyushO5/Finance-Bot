import React from 'react';
import { X, Plus } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000';

/**
 * Fix #12: Shows loading spinner during fund updates.
 * Fix #13: Displays deadline and days remaining.
 */
export default function GoalCard({ goal, addFundsGoal, addFundsAmount, setAddFundsGoal, setAddFundsAmount, handleAddFunds, handleDeleteGoal, fundsLoading }) {
  const pct = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
  const isComplete = pct >= 100;
  const isAdding = addFundsGoal === goal.id;

  // Fix #13: Calculate days remaining until deadline
  const daysRemaining = (() => {
    if (!goal.deadline) return null;
    const diff = new Date(goal.deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  })();

  return (
    <div className="goal-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="goal-title">{goal.name}</div>
        <button
          onClick={() => handleDeleteGoal(goal.id)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Fix #13: Deadline badge */}
      {goal.deadline && !isComplete && (
        <div style={{
          fontSize: '0.72rem', color: daysRemaining < 0 ? 'var(--danger)' : daysRemaining <= 7 ? '#fcee0a' : 'var(--text-muted)',
          marginBottom: '0.35rem'
        }}>
          {daysRemaining < 0
            ? `⚠️ Overdue by ${Math.abs(daysRemaining)} days`
            : `🗓️ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
        </div>
      )}

      <div className="goal-progress-bg">
        <div
          className="goal-progress-fill"
          style={{
            width: `${pct}%`,
            background: isComplete ? 'linear-gradient(90deg, #00ff66, #00c853)' : undefined
          }}
        />
      </div>

      {isComplete ? (
        <div style={{
          marginTop: '0.5rem', textAlign: 'center', padding: '0.4rem 0.6rem',
          borderRadius: '6px', background: 'rgba(0,255,102,0.12)',
          border: '1px solid rgba(0,255,102,0.35)', color: '#00ff66',
          fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}>
          🎉 Goal Completed!
        </div>
      ) : (
        <>
          <div className="goal-stats">
            <span
              onClick={() => { setAddFundsGoal(isAdding ? null : goal.id); setAddFundsAmount(''); }}
              style={{ cursor: 'pointer', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Add Funds"
            >
              {/* Fix #12: Spinner when loading */}
              {fundsLoading === goal.id
                ? <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Saving…</span>
                : <><Plus size={12} /> {goal.currency}{goal.saved.toLocaleString()}</>
              }
            </span>
            <span>{goal.currency}{goal.target.toLocaleString()}</span>
          </div>

          {isAdding && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem' }}>
              <input
                type="number"
                min="1"
                autoFocus
                value={addFundsAmount}
                onChange={e => setAddFundsAmount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddFunds(goal);
                  if (e.key === 'Escape') { setAddFundsGoal(null); setAddFundsAmount(''); }
                }}
                placeholder="Amount"
                style={{
                  flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px',
                  border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)',
                  color: '#fff', outline: 'none', fontSize: '0.8rem'
                }}
              />
              <button
                onClick={() => handleAddFunds(goal)}
                disabled={fundsLoading === goal.id}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '6px',
                  background: 'var(--accent)', border: 'none',
                  color: '#0a0a12', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  opacity: fundsLoading === goal.id ? 0.5 : 1
                }}
              >
                Add
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
