import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function UserManager() {
  const toast = useToast();
  const toastRef = useRef(null);
  toastRef.current = toast;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingNote, setEditingNote] = useState(null); // { id, note }

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toastRef.current('Failed to load users', 'error');
    else setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleGenerate = async () => {
    setGenerating(true);
    let code, attempts = 0;
    while (attempts < 20) {
      code = generateCode();
      const { data } = await supabase.from('users').select('id').eq('code', code).single();
      if (!data) break;
      attempts++;
    }
    const { data, error } = await supabase.from('users').insert({ code, note: '' }).select().single();
    setGenerating(false);
    if (error) { toast('Failed to create code', 'error'); return; }
    setNewCode(code);
    // Instant local update — no refetch needed
    setUsers(prev => [data, ...prev]);
  };

  const handleDelete = async (user) => {
    const { error } = await supabase.from('users').delete().eq('id', user.id);
    if (error) { toast('Failed to delete user', 'error'); return; }
    // Instant local removal
    setUsers(prev => prev.filter(u => u.id !== user.id));
    setDeleteConfirm(null);
    if (newCode === user.code) setNewCode(null);
    toast('User deleted', 'success');
  };

  const handleSaveNote = async (userId, note) => {
    const { error } = await supabase.from('users').update({ note }).eq('id', userId);
    if (error) { toast('Failed to save note', 'error'); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, note } : u));
    setEditingNote(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast('Code copied!', 'success');
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-hud)', fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-1)' }}>
            User Codes <span style={{ color: 'var(--text-3)', fontSize: 13 }}>({users.length})</span>
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>Generate codes and share them. Add notes to remember who each belongs to.</p>
        </div>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : '+ Generate Code'}
        </button>
      </div>

      {/* New code flash */}
      {newCode && (
        <div style={{
          background: 'var(--green-dim)',
          border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: 11, color: 'var(--green)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              New Code Generated
            </div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 32, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.2em' }}>
              {newCode}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 'auto' }}>
            <button className="btn btn-success btn-sm" onClick={() => copyToClipboard(newCode)}>Copy Code</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setNewCode(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👤</div>
          <h3>No users yet</h3>
          <p>Generate a code and share it with someone</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map(user => (
            <div key={user.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}>
              {/* Code row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--cyan)', minWidth: 76 }}>
                  {user.code}
                </span>
                <span style={{ color: 'var(--text-4)', fontSize: 12, flex: 1, fontFamily: 'var(--font-cond)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => copyToClipboard(user.code)} title="Copy code">⎘</button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteConfirm(user)} title="Delete user">✕</button>
                </div>
              </div>

              {/* Note row */}
              <div style={{ padding: '0 16px 12px', borderTop: '1px solid var(--border)' }}>
                {editingNote?.id === user.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 10 }}>
                    <input
                      className="input"
                      style={{ fontSize: 13, padding: '6px 10px' }}
                      value={editingNote.note}
                      placeholder="Add a note... (e.g. John, my friend)"
                      onChange={e => setEditingNote({ ...editingNote, note: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveNote(user.id, editingNote.note);
                        if (e.key === 'Escape') setEditingNote(null);
                      }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveNote(user.id, editingNote.note)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingNote(null)}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNote({ id: user.id, note: user.note || '' })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      marginTop: 8, padding: '4px 0',
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-cond)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                      Note
                    </span>
                    <span style={{ fontSize: 13, color: user.note ? 'var(--text-2)' : 'var(--text-4)', fontStyle: user.note ? 'normal' : 'italic' }}>
                      {user.note || 'Click to add note...'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>✎</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠ Delete User</div>
            <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>
              Delete code <strong style={{ color: 'var(--cyan)', letterSpacing: '0.15em' }}>{deleteConfirm.code}</strong>
              {deleteConfirm.note && <span style={{ color: 'var(--text-3)' }}> ({deleteConfirm.note})</span>}?
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Their game selections and all progress will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
