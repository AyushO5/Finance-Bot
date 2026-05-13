import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'lucide-react';

export default function Modals({
  showGoalModal, setShowGoalModal, handleAddGoal,
  newGoalName, setNewGoalName, newGoalTarget, setNewGoalTarget, newGoalDeadline, setNewGoalDeadline,
  showUpload, setShowUpload, handleUpload, file, setFile, loading
}) {
  return (
    <>
      <AnimatePresence>
        {showGoalModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="upload-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="upload-modal"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>Add Financial Goal</h3>
                <button onClick={() => setShowGoalModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Goal Name</label>
                  <input
                    type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)}
                    placeholder="e.g. Vacation Fund" required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Target Amount (₹)</label>
                  <input
                    type="number" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
                    placeholder="e.g. 50000" required min="1"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Deadline (optional)</label>
                  <input
                    type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '0.75rem',
                    background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent))',
                    color: '#0a0a12', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontWeight: 700, marginTop: '0.5rem'
                  }}
                >
                  Create Goal
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="upload-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="upload-modal"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3>Upload Expenses</h3>
                <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <label className="upload-dropzone" style={{ display: 'block' }}>
                <input type="file" accept=".csv,.pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <div className="upload-icon"><Upload /></div>
                <p>{file ? file.name : "Click to select a CSV, PDF, or Image file"}</p>
              </label>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent))',
                  color: '#0a0a12', border: 'none', borderRadius: '8px',
                  cursor: file && !loading ? 'pointer' : 'not-allowed',
                  opacity: file && !loading ? 1 : 0.45,
                  fontWeight: 700, fontSize: '0.95rem',
                  boxShadow: file && !loading ? '0 0 16px var(--accent-glow-sec), 0 0 8px var(--accent-glow)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Analyze Data
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
