import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';

const TABS = ['Details', 'Theme'];

const THEME_FIELDS = [
  { key: 'header_bg',     label: 'Header Background',   type: 'text',  placeholder: 'linear-gradient(135deg, #080c14, #0c1a1a)', css: '.gcl-header { background: VALUE; }' },
  { key: 'title_color',   label: 'Game Title Color',     type: 'color', placeholder: '#e2eaf5', css: '.gcl-title { color: VALUE; }' },
  { key: 'title_font',    label: 'Title Font Family',    type: 'font',  placeholder: 'Rajdhani', css: '.gcl-title { font-family: VALUE, sans-serif; }' },
  { key: 'body_font',     label: 'Body Font Family',     type: 'font',  placeholder: 'Barlow', css: '.gcl-container { font-family: VALUE, sans-serif; }' },
  { key: 'cat_color',     label: 'Category Name Color',  type: 'color', placeholder: '#38bdf8', css: '.gcl-cat-name { color: VALUE; }' },
  { key: 'mission_color', label: 'Mission Text Color',   type: 'color', placeholder: '#e2eaf5', css: '.gcl-mission-text { color: VALUE; }' },
  { key: 'done_bg',       label: 'Done Row Background',  type: 'text',  placeholder: 'rgba(74,222,128,0.08)', css: '.gcl-mission.done { background: VALUE; }' },
  { key: 'done_color',    label: 'Done Text Color',      type: 'color', placeholder: '#6b7280', css: '.gcl-mission.done .gcl-mission-text { color: VALUE; }' },
  { key: 'check_color',   label: 'Checkmark Color',      type: 'color', placeholder: '#4ade80', css: '.gcl-check.checked { background: VALUE; border-color: VALUE; }' },
  { key: 'body_bg',       label: 'Body Background',      type: 'color', placeholder: '#0c1220', css: '.gcl-body { background: VALUE; }' },
  { key: 'accent_color',  label: 'Progress Bar / Accent',type: 'color', placeholder: '#38bdf8', css: '.gcl-pct { color: VALUE; text-shadow: 0 0 20px VALUE; }' },
  { key: 'note_color',    label: 'Mission Note Color',   type: 'color', placeholder: '#6b7280', css: '.gcl-mission-note { color: VALUE; }' },
  { key: 'border_color',  label: 'Category Divider Color',type:'color', placeholder: 'rgba(255,255,255,0.06)', css: '.gcl-cat-header { border-bottom-color: VALUE; }' },
];

function cssToFields(css) {
  const fields = {};
  if (!css) return fields;
  THEME_FIELDS.forEach(f => {
    try {
      const escaped = f.css.replace(/[.*+?^${}()|[\]\\]/g, m =>
        m === '(' || m === ')' ? m : '\\' + m
      ).replace('VALUE', '([^;}"]+)');
      const match = css.match(new RegExp(escaped));
      if (match) fields[f.key] = match[1].trim();
    } catch {}
  });
  return fields;
}

function fieldsToCss(fields, rawCss) {
  let css = (rawCss || '').replace(/\/\* THEME_START \*\/[\s\S]*?\/\* THEME_END \*\//g, '').trim();
  const generated = THEME_FIELDS
    .filter(f => fields[f.key]?.trim())
    .map(f => f.css.split('VALUE').join(fields[f.key].trim()))
    .join('\n');
  if (!generated) return css;
  return `/* THEME_START */\n${generated}\n/* THEME_END */\n${css}`.trim();
}

export default function GameFormModal({ game, onClose, onSaved }) {
  const toast = useToast();
  const toastRef = useRef(null);
  toastRef.current = toast;
  const [tab, setTab] = useState('Details');
  const [name, setName] = useState(game?.name || '');
  const [icon, setIcon] = useState(game?.icon || '');
  const [iconUploading, setIconUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [googleFont, setGoogleFont] = useState('');
  const [rawCss, setRawCss] = useState(() =>
    (game?.custom_css || '').replace(/\/\* THEME_START \*\/[\s\S]*?\/\* THEME_END \*\//g, '').trim()
  );
  const [themeFields, setThemeFields] = useState(() => cssToFields(game?.custom_css || ''));

  const iconSrc = icon
    ? icon.startsWith('http') ? icon : `${process.env.PUBLIC_URL}/icons/${icon}`
    : null;

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastRef.current('Please select an image file', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toastRef.current('Image must be under 2 MB', 'error');
      return;
    }
    setIconUploading(true);
    // Use a sanitized filename: timestamp + original name
    const safeName = `${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase()}`;
    const { data, error } = await supabase.storage
      .from('game-icons')
      .upload(safeName, file, { upsert: false, contentType: file.type });
    if (error) {
      toastRef.current('Upload failed: ' + error.message, 'error');
      setIconUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('game-icons').getPublicUrl(data.path);
    setIcon(urlData.publicUrl);
    setIconUploading(false);
    toastRef.current('Icon uploaded!', 'success');
  };

  const setField = (key, val) => setThemeFields(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const builtCss = fieldsToCss(themeFields, rawCss);
    const payload = {
      name: name.trim(),
      icon: icon.trim(),
      color: themeFields['accent_color'] || '#38bdf8',
      custom_css: builtCss,
    };
    let error;
    if (game) {
      ({ error } = await supabase.from('games').update(payload).eq('id', game.id));
    } else {
      ({ error } = await supabase.from('games').insert(payload));
    }
    setLoading(false);
    if (error) { toastRef.current('Failed to save game: ' + error.message, 'error'); return; }
    toastRef.current(game ? 'Game updated' : 'Game created', 'success');
    onSaved();
  };

  const tabStyle = (t) => ({
    background: 'none', border: 'none',
    borderBottom: `2px solid ${tab === t ? 'var(--cyan)' : 'transparent'}`,
    color: tab === t ? 'var(--cyan)' : 'var(--text-3)',
    fontFamily: 'var(--font-cond)', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '8px 16px', cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{game ? '✎ Edit Game' : '+ New Game'}</div>

        <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t}</button>)}
        </div>

        {tab === 'Details' && (
          <>
            <div className="modal-field">
              <label className="modal-label">Game Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Elden Ring, Fallout 4..." autoFocus />
            </div>

            <div className="modal-field">
              <label className="modal-label">Icon Image</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Preview */}
                <div style={{
                  width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {iconSrc
                    ? <img src={iconSrc} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    : <span style={{ color: 'var(--text-4)', fontSize: 10, fontFamily: 'var(--font-cond)', textAlign: 'center', padding: 4 }}>
                        No icon
                      </span>
                  }
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Upload button */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleIconUpload}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={iconUploading}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {iconUploading ? 'Uploading…' : '⬆ Upload Image'}
                    </button>
                    {icon && (
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Clear icon"
                        onClick={() => setIcon('')}
                        style={{ color: 'var(--red)' }}
                      >✕</button>
                    )}
                  </div>

                  {/* URL fallback */}
                  <input
                    className="input"
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    placeholder="Or paste an image URL directly…"
                    style={{ fontSize: 12 }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5, margin: 0 }}>
                    PNG/JPG/WebP · max 2 MB · 256×256 recommended.<br />
                    Get icons at <a href="https://steamgriddb.com" target="_blank" rel="noreferrer"
                      style={{ color: 'var(--cyan)' }}>steamgriddb.com</a> → Icons tab.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'Theme' && (
          <>
            {/* Google Fonts info */}
            <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)', marginBottom: 16 }}>
              <label className="modal-label" style={{ marginBottom: 6 }}>Google Fonts — Yes, supported</label>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
                Go to <strong style={{ color: 'var(--cyan)' }}>fonts.google.com</strong>, pick a font, copy the exact name (e.g. <code style={{ color: 'var(--amber)' }}>Orbitron</code> or <code style={{ color: 'var(--amber)' }}>Press Start 2P</code>) and paste it into a font field below. The app loads it automatically.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={googleFont} onChange={e => setGoogleFont(e.target.value)}
                  placeholder="e.g. Orbitron, VT323, Press Start 2P..." style={{ fontSize: 13 }} />
                <button className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}
                  onClick={() => window.open(`https://fonts.google.com/specimen/${googleFont.replace(/ /g, '+')}`, '_blank')}>
                  Preview ↗
                </button>
              </div>
            </div>

            {/* Theme fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {THEME_FIELDS.map(f => (
                <div key={f.key} className="modal-field" style={{ marginBottom: 0 }}>
                  <label className="modal-label">{f.label}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {f.type === 'color' && (
                      <input type="color"
                        value={themeFields[f.key] || f.placeholder}
                        onChange={e => setField(f.key, e.target.value)}
                        style={{ width: 36, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-hover)', cursor: 'pointer', flexShrink: 0 }}
                      />
                    )}
                    <input className="input"
                      value={themeFields[f.key] || ''}
                      onChange={e => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      style={{ fontSize: 13 }}
                    />
                    {themeFields[f.key] && (
                      <button className="btn btn-ghost btn-sm btn-icon" title="Clear"
                        onClick={() => setField(f.key, '')}
                        style={{ flexShrink: 0, color: 'var(--text-3)' }}>✕</button>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3, fontFamily: 'monospace' }}>
                    {f.css.replace('VALUE', themeFields[f.key] || f.placeholder)}
                  </p>
                </div>
              ))}
            </div>

            {/* Raw CSS */}
            <div className="modal-field" style={{ marginTop: 20 }}>
              <label className="modal-label">
                Additional Custom CSS <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(advanced)</span>
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, lineHeight: 1.5 }}>
                Added on top of the theme fields above. Tab key inserts spaces.
              </p>
              <textarea className="input" value={rawCss} onChange={e => setRawCss(e.target.value)}
                placeholder={`/* anything extra */\n.gcl-complete-banner { border-color: gold; }`}
                style={{ minHeight: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
                onKeyDown={e => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = e.target.selectionStart;
                    const nv = rawCss.substring(0, s) + '  ' + rawCss.substring(e.target.selectionEnd);
                    setRawCss(nv);
                    setTimeout(() => e.target.setSelectionRange(s + 2, s + 2), 0);
                  }
                }}
              />
              {rawCss && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, color: 'var(--red)' }}
                  onClick={() => setRawCss('')}>Clear</button>
              )}
            </div>
          </>
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
