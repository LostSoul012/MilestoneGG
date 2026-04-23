import React, { useState, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import ShapeGrid from '../components/ShapeGrid';
import './Login.css';

export default function Login() {
  const { loginAsUser, loginAsAdmin } = useAuth();
  const toast = useToast();

  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3];

  const handleDigit = (i, val) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!upper) {
      const next = [...code];
      next[i] = '';
      setCode(next);
      return;
    }
    const next = [...code];
    next[i] = upper[upper.length - 1];
    setCode(next);
    if (i < 3) refs[i + 1].current?.focus();
    // Auto-submit when last digit entered
    if (i === 3) handleSubmit([...next.slice(0, 3), upper[upper.length - 1]]);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === 'Enter') handleSubmit();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setCode(pasted.split(''));
      refs[3].current?.focus();
      handleSubmit(pasted.split(''));
    }
  };

  const handleSubmit = async (codeArr = code) => {
    const full = codeArr.join('');
    if (full.length < 4) return;
    setLoading(true);
    const result = await loginAsUser(full);
    if (!result.success) {
      toast(result.message, 'error');
      setCode(['', '', '', '']);
      refs[0].current?.focus();
    }
    setLoading(false);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const ok = loginAsAdmin(adminSecret);
    if (!ok) {
      toast('Invalid admin secret', 'error');
      setAdminSecret('');
    }
  };

  return (
    <div className="login-bg">
      <div className="login-shapegrid-wrap">
        <ShapeGrid
          direction="diagonal"
          speed={0.4}
          squareSize={44}
          borderColor="rgba(56,189,248,0.12)"
          hoverFillColor="rgba(56,189,248,0.08)"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>
      <div className="login-glow" />

      <div className="login-box">
        <div className="login-logo">
          <span className="logo-milestone">MILESTONE</span>
          <span className="logo-gg">GG</span>
        </div>
        <p className="login-tagline">Track every milestone. Every game.</p>

        <div className="login-divider"><span>ACCESS</span></div>

        {!adminMode ? (
          <>
            <p className="login-hint">Enter your 4-character access code</p>
            <div className="code-inputs" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={refs[i]}
                  className="code-input"
                  value={digit}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  maxLength={1}
                  autoFocus={i === 0}
                  disabled={loading}
                  spellCheck={false}
                />
              ))}
            </div>

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                <div className="spinner" />
              </div>
            )}

            <button
              className="btn btn-primary login-btn"
              onClick={() => handleSubmit()}
              disabled={loading || code.join('').length < 4}
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>

            <button
              className="btn btn-ghost login-admin-toggle"
              onClick={() => setAdminMode(true)}
            >
              Admin Access
            </button>
          </>
        ) : (
          <form onSubmit={handleAdminLogin} className="admin-login-form">
            <p className="login-hint">Enter admin secret</p>
            <input
              className="input"
              type="password"
              placeholder="Admin secret..."
              value={adminSecret}
              onChange={e => setAdminSecret(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAdminMode(false)}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!adminSecret}>
                Enter Admin
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="login-footer">
        MilestoneGG — Personal Game Progression Tracker
      </div>
    </div>
  );
}
