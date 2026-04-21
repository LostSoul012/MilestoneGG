import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { SidebarIcon } from './GameChecklist';
import './CategoryMissionEditor.css';

function DragHandle() {
  return <span className="cme-drag-handle" title="Drag to reorder">⠿</span>;
}

function Spinner() {
  return <div className="cme-spinner" />;
}

export default function CategoryMissionEditor({ game, onRefresh }) {
  const toastRef = useRef(null);
  const toast = useToast();
  toastRef.current = toast;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState(null);    // catId being saved/deleted
  const [savingMission, setSavingMission] = useState(null); // missionId being saved/deleted
  const [addingCatLoading, setAddingCatLoading] = useState(false);
  const [addingMissionLoading, setAddingMissionLoading] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [addingMission, setAddingMission] = useState(null);
  const [newMissionText, setNewMissionText] = useState('');
  const [editingMission, setEditingMission] = useState(null);

  const [draggingCat, setDraggingCat] = useState(null);
  const [draggingMission, setDraggingMission] = useState(null);
  const dragOverCat = useRef(null);
  const dragOverMission = useRef(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*, missions(*)')
      .eq('game_id', game.id)
      .order('order_index', { ascending: true });
    if (error) toastRef.current('Failed to load', 'error');
    else {
      setCategories((data || []).map(c => ({
        ...c,
        missions: [...(c.missions || [])].sort((a, b) => a.order_index - b.order_index)
      })));
    }
    setLoading(false);
  }, [game.id]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── Category CRUD ────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCatLoading(true);
    const { error } = await supabase.from('categories').insert({
      game_id: game.id, name: newCatName.trim(), order_index: categories.length,
    });
    setAddingCatLoading(false);
    if (error) { toastRef.current('Failed to add category', 'error'); return; }
    toastRef.current('Category added', 'success');
    setNewCatName(''); setAddingCat(false);
    fetchCategories(); onRefresh();
  };

  const saveCategory = async () => {
    if (!editingCat?.name.trim()) return;
    setSavingCat(editingCat.id);
    const { error } = await supabase.from('categories').update({ name: editingCat.name }).eq('id', editingCat.id);
    setSavingCat(null);
    if (error) { toastRef.current('Failed to update', 'error'); return; }
    setEditingCat(null); fetchCategories(); onRefresh();
  };

  const deleteCategory = async (cat) => {
    setSavingCat(cat.id);
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    setSavingCat(null);
    if (error) { toastRef.current('Failed to delete', 'error'); return; }
    toastRef.current(`${cat.name} deleted`, 'success');
    fetchCategories(); onRefresh();
  };

  // ── Mission CRUD ─────────────────────────────────────
  const addMission = async (catId) => {
    if (!newMissionText.trim()) return;
    setAddingMissionLoading(true);
    const cat = categories.find(c => c.id === catId);
    const { error } = await supabase.from('missions').insert({
      category_id: catId, text: newMissionText.trim(),
      order_index: (cat?.missions || []).length, note: '',
    });
    setAddingMissionLoading(false);
    if (error) { toastRef.current('Failed to add milestone', 'error'); return; }
    setNewMissionText(''); setAddingMission(null);
    fetchCategories(); onRefresh();
  };

  const saveMission = async () => {
    if (!editingMission?.text.trim()) return;
    setSavingMission(editingMission.id);
    const { error } = await supabase.from('missions')
      .update({ text: editingMission.text, note: editingMission.note || '' })
      .eq('id', editingMission.id);
    setSavingMission(null);
    if (error) { toastRef.current('Failed to update', 'error'); return; }
    setEditingMission(null); fetchCategories(); onRefresh();
  };

  const deleteMission = async (mission) => {
    setSavingMission(mission.id);
    const { error } = await supabase.from('missions').delete().eq('id', mission.id);
    setSavingMission(null);
    if (error) { toastRef.current('Failed to delete', 'error'); return; }
    fetchCategories(); onRefresh();
  };

  // ── Drag: Categories ─────────────────────────────────
  const handleCatDragStart = (e, catId) => {
    setDraggingCat(catId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleCatDragOver = (e, catId) => {
    e.preventDefault();
    dragOverCat.current = catId;
  };
  const handleCatDrop = async (e, targetCatId) => {
    e.preventDefault();
    if (!draggingCat || draggingCat === targetCatId) { setDraggingCat(null); return; }
    const oldIndex = categories.findIndex(c => c.id === draggingCat);
    const newIndex = categories.findIndex(c => c.id === targetCatId);
    if (oldIndex === -1 || newIndex === -1) { setDraggingCat(null); return; }
    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setCategories(reordered);
    setDraggingCat(null);
    await Promise.all(reordered.map((cat, i) =>
      supabase.from('categories').update({ order_index: i }).eq('id', cat.id)
    ));
    onRefresh();
  };

  // ── Drag: Missions ───────────────────────────────────
  const handleMissionDragStart = (e, missionId, catId) => {
    setDraggingMission({ missionId, catId });
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const handleMissionDragOver = (e, missionId) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverMission.current = missionId;
  };
  const handleMissionDrop = async (e, targetMissionId, catId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingMission || draggingMission.missionId === targetMissionId) { setDraggingMission(null); return; }
    if (draggingMission.catId !== catId) { setDraggingMission(null); return; }
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const missions = [...cat.missions];
    const oldIdx = missions.findIndex(m => m.id === draggingMission.missionId);
    const newIdx = missions.findIndex(m => m.id === targetMissionId);
    if (oldIdx === -1 || newIdx === -1) { setDraggingMission(null); return; }
    const [moved] = missions.splice(oldIdx, 1);
    missions.splice(newIdx, 0, moved);
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, missions } : c));
    setDraggingMission(null);
    await Promise.all(missions.map((m, i) =>
      supabase.from('missions').update({ order_index: i }).eq('id', m.id)
    ));
  };

  // ── Export JSON ──────────────────────────────────────
  const handleExport = () => {
    const exportData = {
      name: game.name,
      icon: game.icon || '',
      color: game.color || '',
      description: game.description || '',
      categories: categories.map(cat => ({
        name: cat.name,
        missions: (cat.missions || []).map(m => ({
          text: m.text,
          ...(m.note ? { note: m.note } : {}),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
        <SidebarIcon icon={game.icon} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cme-game-name">{game.name}</div>
          <div className="cme-game-meta">
            {categories.length} categories · {categories.reduce((a, c) => a + (c.missions || []).length, 0)} milestones
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export as JSON">
          ⬇ Export JSON
        </button>
      </div>

      <div className="cme-body">
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`cme-category ${draggingCat === cat.id ? 'dragging' : ''}`}
            draggable
            onDragStart={e => handleCatDragStart(e, cat.id)}
            onDragOver={e => handleCatDragOver(e, cat.id)}
            onDrop={e => handleCatDrop(e, cat.id)}
            onDragEnd={() => setDraggingCat(null)}
          >
            {/* Category header */}
            <div className="cme-cat-header">
              <DragHandle />
              {editingCat?.id === cat.id ? (
                <input
                  className="input cme-inline-input"
                  value={editingCat.name}
                  onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCat(null); }}
                  autoFocus
                />
              ) : (
                <span className="cme-cat-name">{cat.name}</span>
              )}
              <span className="cme-cat-count">{(cat.missions || []).length}</span>
              <div className="cme-cat-actions">
                {savingCat === cat.id ? <Spinner /> : editingCat?.id === cat.id ? (
                  <>
                    <button className="btn btn-success btn-sm" onClick={saveCategory} disabled={savingCat === cat.id}>Save</button>
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

            {/* Missions */}
            <div className="cme-missions">
              {(cat.missions || []).map(m => (
                <div
                  key={m.id}
                  className={`cme-mission-block ${draggingMission?.missionId === m.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={e => handleMissionDragStart(e, m.id, cat.id)}
                  onDragOver={e => handleMissionDragOver(e, m.id)}
                  onDrop={e => handleMissionDrop(e, m.id, cat.id)}
                  onDragEnd={() => setDraggingMission(null)}
                >
                  <div className="cme-mission">
                    <DragHandle />
                    {editingMission?.id === m.id ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          className="input cme-inline-input"
                          value={editingMission.text}
                          onChange={e => setEditingMission({ ...editingMission, text: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingMission(null); }}
                          placeholder="Mission name..."
                          autoFocus
                        />
                        <textarea
                          className="input"
                          value={editingMission.note || ''}
                          onChange={e => setEditingMission({ ...editingMission, note: e.target.value })}
                          placeholder="Note / hint for users (optional)..."
                          style={{ fontSize: 13, minHeight: 60, resize: 'vertical', fontFamily: 'var(--font-body)' }}
                        />
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

              {/* Add mission row */}
              {addingMission === cat.id ? (
                <div className="cme-add-row">
                  <input
                    className="input cme-inline-input"
                    placeholder="New milestone..."
                    value={newMissionText}
                    onChange={e => setNewMissionText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addMission(cat.id); if (e.key === 'Escape') { setAddingMission(null); setNewMissionText(''); } }}
                    autoFocus
                    disabled={addingMissionLoading}
                  />
                  {addingMissionLoading
                    ? <Spinner />
                    : <>
                        <button className="btn btn-primary btn-sm" onClick={() => addMission(cat.id)}>Add</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAddingMission(null); setNewMissionText(''); }}>✕</button>
                      </>
                  }
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

        {/* Add category */}
        {addingCat ? (
          <div className="cme-add-cat-row">
            <input
              className="input"
              placeholder="Category name..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false); }}
              autoFocus
              disabled={addingCatLoading}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {addingCatLoading
                ? <Spinner />
                : <>
                    <button className="btn btn-primary btn-sm" onClick={addCategory}>Add Category</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(false)}>Cancel</button>
                  </>
              }
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
