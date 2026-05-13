import React from 'react';
import { Upload, Mic, Square, Send } from 'lucide-react';

export default function InputBar({ 
  input, setInput, handleSend, handleStop, loading, 
  setShowUpload, handleMicClick, isRecording 
}) {
  return (
    <div className="input-container">
      <form className="input-box" onSubmit={handleSend}>
        <button type="button" className="action-btn" onClick={() => setShowUpload(true)} title="Upload CSV">
          <Upload size={20} />
        </button>
        <button type="button" className={`action-btn ${isRecording ? 'recording' : ''}`} onClick={handleMicClick} title="Voice Input" disabled={loading}>
          <Mic size={20} color={isRecording ? 'var(--danger)' : 'currentColor'} />
        </button>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message your financial advisor..."
          disabled={loading}
        />
        {loading ? (
          <button type="button" className="action-btn send-btn" onClick={handleStop} title="Stop Response">
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="action-btn send-btn" disabled={!input.trim()}>
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
