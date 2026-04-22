import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';

const EXAMPLE = `{
  "name": "Fallout 4",
  "icon": "https://your-project.supabase.co/storage/v1/object/public/game-icons/fallout4.png",
  "description": "Post-apocalyptic RPG set in Boston",
  "categories": [
    {
      "name": "Main Story",
      "missions": [
        { "text": "War Never Changes" },
        { "text": "Out of Time" },
        { "text": "Find Shaun", "note": "Track down your son" }
      ]
    },
    {
      "name": "Brotherhood of Steel",
      "missions": [
        { "text": "Fire Support" },
        { "text": "Call to Arms" },
        { "text": "Shadow of Steel" }
      ]
    }
  ]
}`;

export default function JsonUploadModal({ onClose, onSaved }) {
  const toast = useToast();
  const toastRef = useRef(null);
  toastRef.current = toast;
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleParse = () => {
    setError('');
    try {
      const data = JSON.parse(jsonText);
      if (!data.name) { setError('Missing "name" field'); return; }
      if (!Array.isArray(data.categories)) { setError('Missing "categories" array'); return; }
      for (const cat of data.categories) {
        if (!cat.name) { setError('Each category needs a "name"'); return; }
        if (!Array.isArray(cat.missions)) { setError(`Category "${cat.name}" needs a "missions" array`); return; }
        for (const m of cat.missions) {
          if (typeof m !== 'object' || !m.text) {
            setError(`All missions must be objects with a "text" field.\nBad value: ${JSON.stringify(m)}\nIn category: "${cat.name}"`);
            return;
          }
        }
      }
      setPreview(data);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);

    const { data: gameData, error: gameErr } = await supabase
      .from('games')
      .insert({
        name: preview.name,
        icon: preview.icon || '',
        description: preview.description || '',
        color: preview.color || '#38bdf8',
        custom_css: '',
      })
      .select()
      .single();

    if (gameErr) { toastRef.current('Failed to create game', 'error'); setSaving(false); return; }

    for (let ci = 0; ci < preview.categories.length; ci++) {
      const cat = preview.categories[ci];
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .insert({ game_id: gameData.id, name: cat.name, order_index: ci })
        .select()
        .single();

      if (catErr) { toastRef.current(`Failed to create category: ${cat.name}`, 'error'); continue; }

      const missions = cat.missions.map((m, mi) => ({
        category_id: catData.id,
        text: m.text,
        note: m.note || '',
        order_index: mi,
      }));

      if (missions.length > 0) {
        const { error: misErr } = await supabase.from('missions').insert(missions);
        if (misErr) toastRef.current(`Failed to add some missions in ${cat.name}`, 'error');
      }
    }

    setSaving(false);
    toastRef.current(`${preview.name} imported!`, 'success');
    onSaved();
  };

  const totalMissions = preview?.categories?.reduce((a, c) => a + c.missions.length, 0) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">⬆ Upload Game JSON</div>

        {!preview ? (
          <>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Paste a JSON file to bulk-import a game. Missions must be objects with a <code style={{ color: 'var(--cyan)' }}>"text"</code> field. Optional <code style={{ color: 'var(--amber)' }}>"note"</code> field adds a hint for users.
            </p>

            <div className="modal-field">
              <label className="modal-label">JSON Data</label>
              <textarea
                className="input"
                style={{ minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
                placeholder={EXAMPLE}
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-dim)', padding: '8px 12px', borderRadius: 6, marginBottom: 12, border: '1px solid rgba(248,113,113,0.2)', whiteSpace: 'pre-wrap' }}>
                ✕ {error}
              </div>
            )}

            <details style={{ marginBottom: 16 }}>
              <summary style={{ color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-cond)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                View example format
              </summary>
              <pre style={{ marginTop: 10, background: 'var(--bg-root)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontSize: 12, color: 'var(--text-2)', overflow: 'auto', maxHeight: 280 }}>
                {EXAMPLE}
              </pre>
            </details>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleParse} disabled={!jsonText.trim()}>
                Preview Import
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{preview.name}</div>
                  {preview.description && <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{preview.description}</div>}
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                    {preview.categories.length} categories · {totalMissions} milestones
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {preview.categories.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', padding: '3px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <span>{cat.name}</span>
                    <span style={{ color: 'var(--text-3)' }}>{cat.missions.length} milestones</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>← Back</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Importing...' : `Import ${preview.name}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
