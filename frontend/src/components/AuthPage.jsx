import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:5000';

export default function AuthPage({ onLogin }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'signup'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const inputStyle = {
    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (mode === 'signup' && !name)) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload  = mode === 'login' ? { email, password } : { name, email, password };
      const res = await axios.post(`${API_BASE}${endpoint}`, payload);
      const { token, user } = res.data;
      localStorage.setItem('fin_token', token);
      localStorage.setItem('fin_user', JSON.stringify(user));
      toast.success(mode === 'login' ? `Welcome back, ${user.name}!` : `Account created! Welcome, ${user.name}!`);
      onLogin(user, token);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(0,243,255,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(176,38,255,0.07) 0%, transparent 60%)',
    }}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: '420px', margin: '1rem',
          background: 'rgba(28,28,40,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '2.5rem',
          boxShadow: '0 0 60px rgba(0,243,255,0.08), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px var(--accent-glow)',
          }}>
            <Zap size={28} color="#0a0a12" fill="#0a0a12" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FinanceBot AI
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', marginBottom: '1.75rem' }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontWeight: mode === m ? 700 : 400, fontSize: '0.9rem',
              background: mode === m ? 'linear-gradient(135deg, var(--accent-secondary), var(--accent))' : 'transparent',
              color: mode === m ? '#0a0a12' : 'var(--text-muted)',
              transition: 'all 0.2s',
              boxShadow: mode === m ? '0 0 12px var(--accent-glow)' : 'none',
            }}>
              {m === 'login' ? '🔑 Sign In' : '✨ Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input style={inputStyle} type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input style={{ ...inputStyle, paddingRight: '3rem' }} type={showPass ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '0.9rem',
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--accent-secondary), var(--accent))',
              color: loading ? 'var(--text-muted)' : '#0a0a12',
              border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '1rem', marginTop: '0.5rem',
              boxShadow: loading ? 'none' : '0 0 20px var(--accent-glow)',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : mode === 'login' ? (
              <><LogIn size={18} /> Sign In</>
            ) : (
              <><UserPlus size={18} /> Create Account</>
            )}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
