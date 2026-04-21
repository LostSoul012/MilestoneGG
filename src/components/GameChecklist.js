import React, { useState, useEffect, useRef } from 'react';
import './GameChecklist.css';

function GameIcon({ icon, size = 44 }) {
  if (!icon) return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>🎮</span>;
  const src = icon.startsWith('http') ? icon : `${process.env.PUBLIC_URL}/icons/${icon}`;
  return (
    <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none'; }} />
  );
}

function SidebarIcon({ icon, size = 24 }) {
  if (!icon) return null;
  const src = icon.startsWith('http') ? icon : `${process.env.PUBLIC_URL}/icons/${icon}`;
  return (
    <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none'; }} />
  );
}

export { GameIcon, SidebarIcon };

// Persist collapse state per game in localStorage
function loadCollapsed(gameId) {
  try {
    const raw = localStorage.getItem(`mgg_collapsed_${gameId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCollapsed(gameId, state) {
  try {
    localStorage.setItem(`mgg_collapsed_${gameId}`, JSON.stringify(state));
  } catch {}
}

export default function GameChecklist({ game, progress, onToggle, onRemoveGame }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(game.id));
  const styleRef = useRef(null);
  const searchRef = useRef(null);

  // Reset filter/search when game changes, load persisted collapse state
  useEffect(() => {
    setFilter('all');
    setSearch('');
    setCollapsed(loadCollapsed(game.id));
  }, [game.id]);

  // When filter or search changes, auto-expand categories that would be invisible
  // otherwise user sees a collapsed category with no missions and no explanation
  useEffect(() => {
    if (filter === 'all' && !search) return; // no need to force anything on default view
    setCollapsed(prev => {
      const next = { ...prev };
      let changed = false;
      (game.categories || []).forEach(cat => {
        if (next[cat.id]) {
          // check if this cat has any visible missions under current filter/search
          const missions = cat.missions || [];
          const searchL = search.toLowerCase().trim();
          let visible = missions;
          if (filter === 'done') visible = visible.filter(m => progress[m.id]);
          if (filter === 'todo') visible = visible.filter(m => !progress[m.id]);
          if (searchL) visible = visible.filter(m => m.text.toLowerCase().includes(searchL));
          if (visible.length > 0) {
            // category has results but is collapsed — auto-expand it
            delete next[cat.id];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  // Inject per-game custom CSS
  useEffect(() => {
    if (styleRef.current) styleRef.current.remove();
    if (game.custom_css) {
      const el = document.createElement('style');
      el.setAttribute('data-game-css', game.id);
      el.textContent = game.custom_css;
      document.head.appendChild(el);
      styleRef.current = el;
    }
    return () => { if (styleRef.current) { styleRef.current.remove(); styleRef.current = null; } };
  }, [game.id, game.custom_css]);

  const toggleCollapse = (catId) => {
    setCollapsed(prev => {
      const next = { ...prev, [catId]: !prev[catId] };
      saveCollapsed(game.id, next);
      return next;
    });
  };

  const collapseAll = () => {
    const next = {};
    (game.categories || []).forEach(c => { next[c.id] = true; });
    setCollapsed(next);
    saveCollapsed(game.id, next);
  };

  const expandAll = () => {
    setCollapsed({});
    saveCollapsed(game.id, {});
  };

  const allCollapsed = (game.categories || []).length > 0 &&
    (game.categories || []).every(c => collapsed[c.id]);

  const allMissions = (game.categories || []).flatMap(c =>
    (c.missions || []).map(m => ({ ...m, categoryName: c.name }))
  );

  const done = allMissions.filter(m => progress[m.id]).length;
  const total = allMissions.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const searchLower = search.toLowerCase().trim();

  const getFilteredMissions = (missions) => {
    let result = missions;
    if (filter === 'done') result = result.filter(m => progress[m.id]);
    if (filter === 'todo') result = result.filter(m => !progress[m.id]);
    if (searchLower) result = result.filter(m => m.text.toLowerCase().includes(searchLower));
    return result;
  };

  // Keyboard shortcut: Ctrl+F or / focuses search
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'f')) && searchRef.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
      if (e.key === 'Escape' && search) {
        setSearch('');
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [search]);

  const totalVisible = (game.categories || []).reduce((acc, cat) => acc + getFilteredMissions(cat.missions || []).length, 0);

  return (
    <div className="gcl-container">
      {/* Header */}
      <div className="gcl-header" style={{ '--game-color': game.color || 'var(--cyan)' }}>
        <div className="gcl-header-left">
          <GameIcon icon={game.icon} size={48} />
          <div>
            <h1 className="gcl-title">{game.name}</h1>
            <div className="gcl-stats">
              <span className="badge badge-cyan">{(game.categories || []).length} Categories</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                {total} Milestones
              </span>
              {done > 0 && <span className="badge badge-green">{done} Done</span>}
            </div>
          </div>
        </div>

        <div className="gcl-header-right">
          <div className="gcl-big-progress">
            <div className="gcl-pct" style={{ color: game.color || 'var(--cyan)' }}>{pct}%</div>
            <div className="gcl-pct-label">Complete</div>
            <div className="progress-bar" style={{ width: 160, marginTop: 6 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: game.color || 'var(--cyan)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-cond)' }}>
              {done} / {total}
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmRemove(true)} style={{ marginTop: 8 }}>
            Remove Game
          </button>
        </div>
      </div>

      {/* Filter + Search + Collapse controls */}
      <div className="gcl-controls-bar">
        <div className="gcl-filter-tabs">
          {['all', 'todo', 'done'].map(f => (
            <button key={f} className={`gcl-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${total})` : f === 'todo' ? `To Do (${total - done})` : `Done (${done})`}
            </button>
          ))}
        </div>

        <div className="gcl-controls-right">
          {/* Search */}
          <div className="gcl-search-wrap">
            <span className="gcl-search-icon">⌕</span>
            <input
              ref={searchRef}
              className="gcl-search-input"
              placeholder="Search milestones... ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="gcl-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Collapse / Expand All */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={allCollapsed ? expandAll : collapseAll}
            title={allCollapsed ? 'Expand all categories' : 'Collapse all categories'}
          >
            {allCollapsed ? '▶ Expand All' : '▼ Collapse All'}
          </button>
        </div>
      </div>

      {/* Search result hint */}
      {searchLower && (
        <div className="gcl-search-hint">
          {totalVisible === 0
            ? `No milestones match "${search}"`
            : `${totalVisible} milestone${totalVisible !== 1 ? 's' : ''} matching "${search}"`}
        </div>
      )}

      {/* Categories */}
      <div className="gcl-body">
        {(game.categories || []).map(cat => {
          const filtered = getFilteredMissions(cat.missions || []);
          if (filtered.length === 0) return null;

          const catDone = (cat.missions || []).filter(m => progress[m.id]).length;
          const catTotal = (cat.missions || []).length;
          const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
          const isCollapsed = collapsed[cat.id];

          return (
            <div key={cat.id} className="gcl-category">
              <div className="gcl-cat-header gcl-cat-clickable" onClick={() => toggleCollapse(cat.id)}>
                <div className="gcl-cat-title-row">
                  <span className={`gcl-collapse-arrow ${isCollapsed ? 'collapsed' : ''}`}>▾</span>
                  <span className="gcl-cat-name">{cat.name}</span>
                  <span className="gcl-cat-count">{catDone}/{catTotal}</span>
                </div>
                <div className="gcl-cat-progress">
                  <div className="progress-bar" style={{ flex: 1, maxWidth: 120 }}>
                    <div className="progress-fill" style={{ width: `${catPct}%`, background: game.color || 'var(--cyan)' }} />
                  </div>
                  <span className="gcl-cat-pct">{catPct}%</span>
                </div>
              </div>

              {!isCollapsed && (
                <div className="gcl-missions">
                  {filtered.map(mission => {
                    const isDone = !!progress[mission.id];
                    return (
                      <div
                        key={mission.id}
                        className={`gcl-mission ${isDone ? 'done' : ''}`}
                        onClick={() => onToggle(mission.id, isDone)}
                        tabIndex={0}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle(mission.id, isDone)}
                      >
                        <div className={`gcl-check ${isDone ? 'checked' : ''}`}>{isDone && <span>✓</span>}</div>
                        <div className="gcl-mission-content">
                          <span className="gcl-mission-text">
                            {searchLower
                              ? highlightMatch(mission.text, searchLower)
                              : mission.text}
                          </span>
                          {mission.note && (
                            <span className="gcl-mission-note">{mission.note}</span>
                          )}
                        </div>
                        {isDone && <span className="gcl-done-badge">Done</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty search state */}
        {searchLower && totalVisible === 0 && (
          <div className="empty" style={{ padding: '40px 0' }}>
            <div className="empty-icon">🔍</div>
            <h3>No results</h3>
            <p>No milestones match "{search}"</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setSearch('')}>Clear search</button>
          </div>
        )}

        {pct === 100 && total > 0 && !searchLower && (
          <div className="gcl-complete-banner">
            <div style={{ fontSize: 40 }}>🏆</div>
            <div style={{ fontFamily: 'var(--font-hud)', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--amber)' }}>
              100% COMPLETE
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 14 }}>All milestones cleared for {game.name}</div>
          </div>
        )}
      </div>

      {/* Confirm remove */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Remove Game?</div>
            <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>
              Remove <strong style={{ color: 'var(--text-1)' }}>{game.name}</strong> from your list?
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Your progress is saved. You can re-add the game anytime.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmRemove(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { onRemoveGame(); setConfirmRemove(false); }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Highlight matching text in mission names
function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(251,191,36,0.3)', color: 'var(--amber)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
