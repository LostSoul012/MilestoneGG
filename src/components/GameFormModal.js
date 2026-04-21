import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';

const COLORS = ['#38bdf8','#4ade80','#fb923c','#f472b6','#facc15','#a78bfa','#34d399','#f87171','#60a5fa','#e879f9','#fbbf24','#2dd4bf'];
const TABS = ['Details', 'Custom CSS'];

const CSS_HINT = `/* Examples — scope styles to this game */

.gcl-title { color: #4ade80; }

.gcl-header {
  background: linear-gradient(135deg, #0a1a0a, #0d2010);
}

.gcl-mission.done {
  background: rgba(0,255,0,0.05);
}

.gcl-cat-name {
  color: #ff6b35;
  letter-spacing: 0.2em;
}`;

export default function GameFormModal({ game, onClose, onSaved }) {
  const toast = useToast();
  const [tab, setTab] = useState('Details');
  const [name, setName] = useState(game?.name || '');
  const [description, setDescription] = useState(game?.description || '');
  const [icon, setIcon] = useState(game?.icon || '');
  const [color, setColor] = useState(game?.color || '#38bdf8');
  const [customCss, setCustomCss] = useState(game?.custom_css || '');
  const [loading, setLoading] = useState(false);

  const iconSrc = icon
    ? icon.startsWith('http') ? icon : `${process.env.PUBLIC_URL}/icons/${icon}`
    : null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const payload = { name: name.trim(), description: description.trim(), icon: icon.trim(), color, custom_css: customCss };
    let error;
    if (game) {
      ({ error } = await supabase.from('games').update(payload).eq('id', game.id));
    } else {
      ({ error } = await supabase.from('games').insert(payload));
    }
    setLoading(false);
    if (error) { toast('Failed to save game', 'error'); return; }
    toast(game ? 'Game updated' : 'Game created', 'success');
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{game ? '✎ Edit Game' : '+ New Game'}</div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--cyan)' : 'transparent'}`,
              color: tab === t ? 'var(--cyan)' : 'var(--text-3)',
              fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '8px 16px', cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
            }}>{t}</button>
          ))}
        </div>

        {tab === 'Details' && (
          <>
            <div className="modal-field">
              <label className="modal-label">Game Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Elden Ring, Fallout 4..." autoFocus />
            </div>

            <div className="modal-field">
              <label className="modal-label">Description <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(shown in Browse)</span></label>
              <textarea
                className="input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description to help users decide whether to add this game..."
                style={{ minHeight: 72, resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5 }}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">Icon Image</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {iconSrc
                    ? <img src={iconSrc} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                    : <span style={{ color: 'var(--text-4)', fontSize: 10, fontFamily: 'var(--font-cond)', textAlign: 'center', padding: 4 }}>No icon</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <input className="input" value={icon} onChange={e => setIcon(e.target.value)}
                    placeholder="fallout4.png or https://example.com/icon.png" />
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 6, lineHeight: 1.5 }}>
                    Upload PNG to <code style={{ color: 'var(--cyan)' }}>/public/icons/</code> in your repo then type filename. Or paste any image URL.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Accent Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" title={c}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', background: c,
                      border: `2px solid ${color === c ? 'white' : 'transparent'}`,
                      cursor: 'pointer', transform: color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.12s', outline: 'none', flexShrink: 0,
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'Custom CSS' && (
          <div className="modal-field">
            <label className="modal-label">Custom CSS</label>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
              Injected only when this game is active. Use any class names from the app.
            </p>
            <textarea
              className="input"
              value={customCss}
              onChange={e => setCustomCss(e.target.value)}
              placeholder={CSS_HINT}
              style={{ minHeight: 260, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const s = e.target.selectionStart;
                  const newVal = customCss.substring(0, s) + '  ' + customCss.substring(e.target.selectionEnd);
                  setCustomCss(newVal);
                  setTimeout(() => e.target.setSelectionRange(s + 2, s + 2), 0);
                }
              }}
            />
            {customCss && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: 'var(--red)' }}
                onClick={() => setCustomCss('')}>Clear CSS</button>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? 'Saving...' : game ? 'Save Changes' : 'Create Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
