import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, DollarSign, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:5000';
const CURRENCIES = ['₹', '$', '€', '£', '¥'];

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box',
  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)', color: '#fff',
  fontSize: '0.95rem', outline: 'none',
};

export default function SettingsModal({ show, onClose, user, onUserUpdate }) {
  const [name,     setName]     = useState('');
  const [currency, setCurrency] = useState('₹');
  const [income,   setIncome]   = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!show) return;
    // Fetch current profile when modal opens
    axios.get(`${API_BASE}/auth/profile`)
      .then(res => {
        setName(res.data.name || '');
        setCurrency(res.data.currency || '₹');
        setIncome(res.data.income || '');
      })
      .catch(() => {
        setName(user?.name || '');
      });
  }, [show]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_BASE}/auth/profile`, {
        name: name.trim(),
        currency,
        income: income ? parseFloat(income) : '',
      });
      // Update localStorage with new name
      const updatedUser = { ...user, name: name.trim() };
      localStorage.setItem('fin_user', JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      toast.success('Profile updated!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="upload-modal-overlay"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
            className="upload-modal"
            style={{ maxWidth: '440px', width: '100%' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>⚙️ Profile Settings</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  Your preferences are used to personalize AI advice
                </p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <User size={14} /> Display Name
                </label>
                <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>

              {/* Currency */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <DollarSign size={14} /> Preferred Currency
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {CURRENCIES.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setCurrency(c)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: currency === c ? 700 : 400, fontSize: '1rem',
                        background: currency === c ? 'linear-gradient(135deg, var(--accent-secondary), var(--accent))' : 'rgba(255,255,255,0.07)',
                        color: currency === c ? '#0a0a12' : 'var(--text-main)',
                        boxShadow: currency === c ? '0 0 10px var(--accent-glow)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Income */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  💰 Monthly Income (used by AI advisor)
                </label>
                <input
                  style={inputStyle} type="number" value={income}
                  onChange={e => setIncome(e.target.value)}
                  placeholder={`e.g. 80000`} min="0"
                />
              </div>

              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--accent-secondary), var(--accent))',
                  color: loading ? 'var(--text-muted)' : '#0a0a12',
                  border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.95rem', marginTop: '0.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 0 16px var(--accent-glow)',
                  transition: 'all 0.2s',
                }}
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
