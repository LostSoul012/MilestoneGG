import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { SidebarIcon } from './GameChecklist';

import './CategoryMissionEditor.css';

function Spinner() {
  return <div className="cme-spinner" />;
}

export default function CategoryMissionEditor({ game, onRefresh, onCountsChange }) {
  const toastRef = useRef(null);
  const toast = useToast();
  toastRef.current = toast;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState(null);
  const [savingMission, setSavingMission] = useState(null);
  const [addingCatLoading, setAddingCatLoading] = useState(false);
  const [addingMissionLoading, setAddingMissionLoading] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [addingMission, setAddingMission] = useState(null);
  const [newMissionText, setNewMissionText] = useState('');
  const [editingMission, setEditingMission] = useState(null);

  // drag state — only track IDs and drop target for visual feedback
  const [dragCatId, setDragCatId] = useState(null);
  const [dropCatId, setDropCatId] = useState(null);
  const [dragMissionId, setDragMissionId] = useState(null);
  const [dropMissionId, setDropMissionId] = useState(null);
  const dragMissionCatId = useRef(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories').select('*, missions(*)')
      .eq('game_id', game.id).order('order_index', { ascending: true });
    if (error) toastRef.current('Failed to load: ' + (error?.message || error), 'error');
    else setCategories((data || []).map(c => ({
      ...c,
      missions: [...(c.missions || [])].sort((a, b) => a.order_index - b.order_index)
    })));
    setLoading(false);
  }, [game.id]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Category CRUD ─────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCatLoading(true);
    const { data, error } = await supabase.from('categories').insert({
      game_id: game.id, name: newCatName.trim(), order_index: categories.length,
    }).select().single();
    setAddingCatLoading(false);
    if (error) { toastRef.current('Failed to add category: ' + (error?.message || error), 'error'); return; }
    toastRef.current('Category added', 'success');
    setNewCatName(''); setAddingCat(false);
    setCategories(prev => {
      const next = [...prev, { ...data, missions: [] }];
      onCountsChange?.(game.id, next);
      return next;
    });
  };

  const saveCategory = async () => {
    if (!editingCat?.name.trim()) return;
    setSavingCat(editingCat.id);
    const { error } = await supabase.from('categories').update({ name: editingCat.name.trim() }).eq('id', editingCat.id);
    setSavingCat(null);
    if (error) { toastRef.current('Failed to update category: ' + (error?.message || error), 'error'); return; }
    setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, name: editingCat.name.trim() } : c));
    setEditingCat(null);
  };

  const deleteCategory = async (cat) => {
    setSavingCat(cat.id);
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    setSavingCat(null);
    if (error) { toastRef.current('Failed to delete: ' + (error?.message || error), 'error'); return; }
    toastRef.current(`${cat.name} deleted`, 'success');
    setCategories(prev => {
      const next = prev.filter(c => c.id !== cat.id);
      onCountsChange?.(game.id, next);
      return next;
    });
  };

  // ── Mission CRUD ──────────────────────────────────
  const addMission = async (catId) => {
    if (!newMissionText.trim()) return;
    setAddingMissionLoading(true);
    const cat = categories.find(c => c.id === catId);
    const { data, error } = await supabase.from('missions').insert({
      category_id: catId, text: newMissionText.trim(),
      order_index: (cat?.missions || []).length, note: '',
    }).select().single();
    setAddingMissionLoading(false);
    if (error) { toastRef.current('Failed to add milestone: ' + (error?.message || error), 'error'); return; }
    setNewMissionText(''); setAddingMission(null);
    setCategories(prev => {
      const next = prev.map(c => c.id === catId ? { ...c, missions: [...(c.missions || []), data] } : c);
      onCountsChange?.(game.id, next);
      return next;
    });
  };

  const saveMission = async () => {
    if (!editingMission?.text.trim()) return;
    setSavingMission(editingMission.id);
    const updated = { text: editingMission.text.trim(), note: editingMission.note != null ? editingMission.note : '' };
    const { error } = await supabase.from('missions').update(updated).eq('id', editingMission.id);
    setSavingMission(null);
    if (error) { toastRef.current('Failed to update milestone: ' + (error?.message || error), 'error'); return; }
    setCategories(prev => prev.map(c => ({
      ...c,
      missions: (c.missions || []).map(m => m.id === editingMission.id ? { ...m, ...updated } : m)
    })));
    setEditingMission(null);
  };

  const deleteMission = async (mission) => {
    setSavingMission(mission.id);
    const { error } = await supabase.from('missions').delete().eq('id', mission.id);
    setSavingMission(null);
    if (error) { toastRef.current('Failed to delete: ' + (error?.message || error), 'error'); return; }
    setCategories(prev => {
      const next = prev.map(c => ({
        ...c,
        missions: (c.missions || []).filter(m => m.id !== mission.id)
      }));
      onCountsChange?.(game.id, next);
      return next;
    });
  };

  // ── Category drag — only handle initiates drag ────
  const onCatHandleDragStart = (e, catId) => {
    setDragCatId(catId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'category');
  };

  const onCatDragOver = (e, catId) => {
    e.preventDefault();
    if (dragCatId && dragCatId !== catId) setDropCatId(catId);
  };

  const onCatDragLeave = () => setDropCatId(null);

  const onCatDrop = async (e, targetId) => {
    e.preventDefault();
    setDropCatId(null);
    if (!dragCatId || dragCatId === targetId) { setDragCatId(null); return; }
    const oldIdx = categories.findIndex(c => c.id === dragCatId);
    const newIdx = categories.findIndex(c => c.id === targetId);
    if (oldIdx === -1 || newIdx === -1) { setDragCatId(null); return; }
    const reordered = [...categories];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    setCategories(reordered);
    setDragCatId(null);
    await Promise.all(reordered.map((c, i) =>
      supabase.from('categories').update({ order_index: i }).eq('id', c.id)
    ));
  };

  const onCatDragEnd = () => { setDragCatId(null); setDropCatId(null); };

  // ── Mission drag — only handle initiates drag ─────
  const onMissionHandleDragStart = (e, missionId, catId) => {
    setDragMissionId(missionId);
    dragMissionCatId.current = catId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'mission');
    e.stopPropagation();
  };

  const onMissionDragOver = (e, missionId, catId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragMissionId && dragMissionId !== missionId && dragMissionCatId.current === catId) {
      setDropMissionId(missionId);
    }
  };

  const onMissionDragLeave = () => setDropMissionId(null);

  const onMissionDrop = async (e, targetId, catId) => {
    e.preventDefault();
    e.stopPropagation();
    setDropMissionId(null);
    if (!dragMissionId || dragMissionId === targetId || dragMissionCatId.current !== catId) {
      setDragMissionId(null); return;
    }
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const missions = [...cat.missions];
    const oldIdx = missions.findIndex(m => m.id === dragMissionId);
    const newIdx = missions.findIndex(m => m.id === targetId);
    if (oldIdx === -1 || newIdx === -1) { setDragMissionId(null); return; }
    const [moved] = missions.splice(oldIdx, 1);
    missions.splice(newIdx, 0, moved);
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, missions } : c));
    setDragMissionId(null);
    await Promise.all(missions.map((m, i) =>
      supabase.from('missions').update({ order_index: i }).eq('id', m.id)
    ));
  };

  const onMissionDragEnd = () => { setDragMissionId(null); setDropMissionId(null); };

  // ── Export JSON ───────────────────────────────────
  const handleExport = () => {
    const data = {
      name: game.name,
      icon: game.icon || '',
      description: game.description || '',
      categories: categories.map(cat => ({
        name: cat.name,
        missions: (cat.missions || []).map(m => ({
          text: m.text,
          ...(m.note ? { note: m.note } : {}),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastRef.current('Exported!', 'success');
  };

  if (loading) return <div className="empty"><div className="spinner" /></div>;

  return (
    <div className="cme-container">
      <div className="cme-header">
        <SidebarIcon icon={game.icon} width={64} height={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cme-game-name">{game.name}</div>
          <div className="cme-game-meta">
            {categories.length} categories · {categories.reduce((a, c) => a + (c.missions || []).length, 0)} milestones
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export JSON</button>
      </div>

      <div className="cme-body">
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`cme-category
              ${dragCatId === cat.id ? ' cme-dragging' : ''}
              ${dropCatId === cat.id ? ' cme-drop-target' : ''}`}
            onDragOver={e => onCatDragOver(e, cat.id)}
            onDragLeave={onCatDragLeave}
            onDrop={e => onCatDrop(e, cat.id)}
            onDragEnd={onCatDragEnd}
          >
            <div className="cme-cat-header">
              {/* Drag handle — ONLY this is draggable */}
              <span
                className="cme-drag-handle"
                draggable
                onDragStart={e => onCatHandleDragStart(e, cat.id)}
                title="Drag to reorder category"
              >⠿</span>

              {editingCat?.id === cat.id ? (
                <input className="input cme-inline-input" value={editingCat.name}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCat(null); }}
                  autoFocus />
              ) : (
                <span className="cme-cat-name">{cat.name}</span>
              )}
              <span className="cme-cat-count">{(cat.missions || []).length}</span>
              <div className="cme-cat-actions">
                {savingCat === cat.id ? <Spinner /> : editingCat?.id === cat.id ? (
                  <>
                    <button className="btn btn-success btn-sm" onClick={saveCategory}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat({ id: cat.id, name: cat.name })}>✎</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(cat)}>✕</button>
                  </>
                )}
              </div>
            </div>

            <div className="cme-missions">
              {(cat.missions || []).map(m => (
                <div
                  key={m.id}
                  className={`cme-mission-block
                    ${dragMissionId === m.id ? ' cme-dragging' : ''}
                    ${dropMissionId === m.id ? ' cme-drop-target' : ''}`}
                  onDragOver={e => onMissionDragOver(e, m.id, cat.id)}
                  onDragLeave={onMissionDragLeave}
                  onDrop={e => onMissionDrop(e, m.id, cat.id)}
                  onDragEnd={onMissionDragEnd}
                >
                  <div className="cme-mission">
                    {/* Drag handle — ONLY this is draggable */}
                    <span
                      className="cme-drag-handle"
                      draggable
                      onDragStart={e => onMissionHandleDragStart(e, m.id, cat.id)}
                      title="Drag to reorder milestone"
                    >⠿</span>

                    {editingMission?.id === m.id ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input className="input cme-inline-input" value={editingMission.text}
                          onChange={e => setEditingMission({ ...editingMission, text: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingMission(null); }}
                          placeholder="Mission name..." autoFocus />
                        <textarea className="input" value={editingMission.note || ''}
                          onChange={e => setEditingMission({ ...editingMission, note: e.target.value })}
                          placeholder="Note / hint for users (optional)..."
                          style={{ fontSize: 13, minHeight: 60, resize: 'vertical', fontFamily: 'var(--font-body)' }} />
                      </div>
                    ) : (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="cme-mission-text">{m.text}</span>
                        {m.note && <span className="cme-mission-note-preview">{m.note}</span>}
                      </div>
                    )}

                    <div className="cme-mission-actions">
                      {savingMission === m.id ? <Spinner /> : editingMission?.id === m.id ? (
                        <>
                          <button className="btn btn-success btn-sm" onClick={saveMission}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingMission(null)}>✕</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setEditingMission({ id: m.id, text: m.text, note: m.note || '' })}>✎</button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteMission(m)}>✕</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {addingMission === cat.id ? (
                <div className="cme-add-row">
                  <input className="input cme-inline-input" placeholder="New milestone..."
                    value={newMissionText} onChange={e => setNewMissionText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addMission(cat.id); if (e.key === 'Escape') { setAddingMission(null); setNewMissionText(''); } }}
                    autoFocus disabled={addingMissionLoading} />
                  {addingMissionLoading ? <Spinner /> : (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => addMission(cat.id)}>Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingMission(null); setNewMissionText(''); }}>✕</button>
                    </>
                  )}
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm cme-add-milestone-btn"
                  onClick={() => { setAddingMission(cat.id); setNewMissionText(''); }}>
                  + Add Milestone
                </button>
              )}
            </div>
          </div>
        ))}

        {addingCat ? (
          <div className="cme-add-cat-row">
            <input className="input" placeholder="Category name..." value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false); }}
              autoFocus disabled={addingCatLoading} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {addingCatLoading ? <Spinner /> : (
                <>
                  <button className="btn btn-primary btn-sm" onClick={addCategory}>Add Category</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(false)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost cme-add-cat-btn" onClick={() => setAddingCat(true)}>
            + Add Category
          </button>
        )}
      </div>
    </div>
  );
}
