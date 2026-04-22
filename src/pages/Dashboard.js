import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import GameChecklist, { SidebarIcon } from '../components/GameChecklist';
import './Dashboard.css';

export default function Dashboard() {
  const { session, logout } = useAuth();
  const toast = useToast();
  const toastRef = useRef(null);
  toastRef.current = toast;

  const [allGames, setAllGames] = useState([]);
  const [myGameIds, setMyGameIds] = useState(new Set());
  const [progress, setProgress] = useState({});
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('my');
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [gamesRes, myGamesRes, progressRes] = await Promise.all([
      supabase.from('games').select('*, categories(*, missions(*))').eq('visible', true).order('created_at'),
      supabase.from('user_games').select('game_id').eq('user_id', session.userId),
      supabase.from('progress').select('mission_id, done').eq('user_id', session.userId),
    ]);
    if (gamesRes.error) toastRef.current('Failed to load games', 'error');
    else {
      // Sort categories and missions by order_index — Supabase nested selects
      // don't support ordering on related tables so we sort client-side
      const sorted = (gamesRes.data || []).map(game => ({
        ...game,
        categories: [...(game.categories || [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map(cat => ({
            ...cat,
            missions: [...(cat.missions || [])].sort((a, b) => a.order_index - b.order_index)
          }))
      }));
      setAllGames(sorted);
    }
    if (myGamesRes.data) setMyGameIds(new Set(myGamesRes.data.map(r => r.game_id)));
    if (progressRes.data) {
      const map = {};
      progressRes.data.forEach(r => { map[r.mission_id] = r.done; });
      setProgress(map);
    }
    setLoading(false);
  }, [session.userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-select first game
  useEffect(() => {
    if (!selectedGameId && myGameIds.size > 0) {
      const first = allGames.find(g => myGameIds.has(g.id));
      if (first) setSelectedGameId(first.id);
    }
  }, [myGameIds, allGames, selectedGameId]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    const handler = (e) => {
      if (sidebarOpen && e.target.classList.contains('dash-overlay')) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [sidebarOpen]);

  const selectGame = (gameId) => {
    setSelectedGameId(gameId);
    setSidebarOpen(false); // auto-close on mobile after selecting
  };

  const addGame = async (gameId) => {
    const { error } = await supabase.from('user_games').insert({ user_id: session.userId, game_id: gameId });
    if (error) { toastRef.current('Failed to add game', 'error'); return; }
    setMyGameIds(prev => new Set([...prev, gameId]));
    setSelectedGameId(gameId);
    setView('my');
    setSidebarOpen(false);
    toastRef.current('Game added!', 'success');
  };

  const removeGame = async (gameId) => {
    const { error } = await supabase.from('user_games').delete().eq('user_id', session.userId).eq('game_id', gameId);
    if (error) { toastRef.current('Failed to remove game', 'error'); return; }
    const next = new Set(myGameIds);
    next.delete(gameId);
    setMyGameIds(next);
    if (selectedGameId === gameId) {
      const remaining = allGames.find(g => next.has(g.id));
      setSelectedGameId(remaining?.id || null);
    }
    toastRef.current('Game removed', 'success');
  };

  const toggleMission = async (missionId, currentDone) => {
    const newDone = !currentDone;
    setProgress(prev => ({ ...prev, [missionId]: newDone }));
    const { error } = await supabase.from('progress').upsert({
      user_id: session.userId,
      mission_id: missionId,
      done: newDone,
      completed_at: newDone ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,mission_id' });
    if (error) {
      setProgress(prev => ({ ...prev, [missionId]: currentDone }));
      toastRef.current('Failed to save progress', 'error');
    }
  };

  const myGames = allGames.filter(g => myGameIds.has(g.id));
  const browseGames = allGames.filter(g => !myGameIds.has(g.id));
  const selectedGame = allGames.find(g => g.id === selectedGameId);

  const getGameProgress = (game) => {
    const missions = (game.categories || []).flatMap(c => c.missions || []);
    if (!missions.length) return { done: 0, total: 0, pct: 0 };
    const done = missions.filter(m => progress[m.id]).length;
    return { done, total: missions.length, pct: Math.round((done / missions.length) * 100) };
  };

  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
      <span className="page-loader-text">Loading...</span>
    </div>
  );

  const sidebar = (
    <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="dash-logo">
        <span className="logo-milestone">MILESTONE</span>
        <span className="logo-gg">GG</span>
        <button className="dash-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
      </div>

      <div className="dash-sidebar-tabs">
        <button className={`dash-stab ${view === 'my' ? 'active' : ''}`} onClick={() => setView('my')}>
          My Games <span className="dash-stab-count">{myGames.length}</span>
        </button>
        <button className={`dash-stab ${view === 'browse' ? 'active' : ''}`} onClick={() => setView('browse')}>
          Browse <span className="dash-stab-count">{browseGames.length}</span>
        </button>
      </div>

      <div className="dash-game-list">
        {view === 'my' && (
          <>
            {myGames.length === 0 ? (
              <div style={{ padding: '20px 12px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                No games yet.<br />Browse to add some.
              </div>
            ) : (
              myGames.map(game => {
                const { pct, done, total } = getGameProgress(game);
                const progressColor = pct >= 75 ? 'var(--green)' : pct >= 40 ? 'var(--cyan)' : 'var(--amber)';
                return (
                  <button
                    key={game.id}
                    className={`dash-game-btn ${selectedGameId === game.id ? 'active' : ''}`}
                    onClick={() => selectGame(game.id)}
                  >
                    <SidebarIcon icon={game.icon} size={48} />
                    <div className="dash-game-info">
                      <span className="dash-game-name">{game.name}</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor, boxShadow: `0 0 8px ${progressColor}55` }} />
                      </div>
                      <span className="dash-game-pct">{done}/{total} · {pct}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}

        {view === 'browse' && (
          <>
            {browseGames.length === 0 ? (
              <div style={{ padding: '20px 12px', color: 'var(--text-4)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
                You've added all available games!
              </div>
            ) : (
              <div className="dash-browse-grid">
                {browseGames.map(game => (
                  <div key={game.id} className="dash-browse-card">
                    <div className="dash-browse-card-icon">
                      <SidebarIcon icon={game.icon} size={64} />
                    </div>
                    <span className="dash-browse-card-name">{game.name}</span>
                    <span className="dash-browse-count">
                      {(game.categories || []).reduce((a, c) => a + (c.missions || []).length, 0)} milestones
                    </span>
                    <button className="dash-browse-card-add" onClick={() => addGame(game.id)}>+ Add</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="dash-sidebar-footer">
        <span style={{ fontFamily: 'var(--font-cond)', fontSize: 13, color: 'var(--text-3)', letterSpacing: '0.12em' }}>
          CODE: {session.code}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 13 }} onClick={logout}>Logout</button>
      </div>
    </aside>
  );

  return (
    <div className="dashboard">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="dash-overlay" />}

      {sidebar}

      <div className="dash-body">
        {/* Mobile top bar */}
        <div className="dash-mobile-bar">
          <button className="dash-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div className="dash-mobile-logo">
            <span className="logo-milestone">MILESTONE</span>
            <span className="logo-gg">GG</span>
          </div>
          {selectedGame && (
            <div className="dash-mobile-game-name">
              <SidebarIcon icon={selectedGame.icon} size={18} />
              <span>{selectedGame.name}</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="dash-main">
          {selectedGame && myGameIds.has(selectedGame.id) ? (
            <GameChecklist
              game={selectedGame}
              progress={progress}
              onToggle={toggleMission}
              onRemoveGame={() => removeGame(selectedGame.id)}
            />
          ) : (
            <div className="empty" style={{ height: '100%' }}>
              <div className="empty-icon">🎮</div>
              <h3>{myGames.length === 0 ? 'No games added yet' : 'Select a game'}</h3>
              <p>{myGames.length === 0 ? 'Browse to add your first game' : 'Pick a game from your list'}</p>
              {myGames.length === 0 ? (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setView('browse'); setSidebarOpen(true); }}>
                  Browse Games
                </button>
              ) : (
                <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setSidebarOpen(true)}>
                  Open Game List
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
