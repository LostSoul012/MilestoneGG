import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import GameFormModal from '../components/GameFormModal';
import { SidebarIcon } from '../components/GameChecklist';
import CategoryMissionEditor from '../components/CategoryMissionEditor';
import UserManager from '../components/UserManager';
import JsonUploadModal from '../components/JsonUploadModal';
import './Admin.css';

const TABS = ['Games', 'Users'];

export default function Admin() {
  const { logout } = useAuth();
  const toast = useToast();
  const toastRef = useRef(null);
  toastRef.current = toast;

  const [tab, setTab] = useState('Games');
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null); // store ID not object
  const [loading, setLoading] = useState(true);
  const [gameModal, setGameModal] = useState(null);
  const [jsonModal, setJsonModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Derive selectedGame from games array — never stale
  const selectedGame = games.find(g => g.id === selectedGameId) || null;

  const fetchGames = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('games')
      .select('*, categories(*, missions(*))')
      .order('name', { ascending: true });
    if (error) toastRef.current('Failed to load games', 'error');
    else {
      const sorted = (data || []).map(game => ({
        ...game,
        categories: [...(game.categories || [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map(cat => ({
            ...cat,
            missions: [...(cat.missions || [])].sort((a, b) => a.order_index - b.order_index)
          }))
      }));
      setGames(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  // Silently update sidebar counts without triggering loading/spinner
  const updateGameCounts = useCallback((gameId, categories) => {
    setGames(prev => prev.map(g =>
      g.id === gameId ? { ...g, categories } : g
    ));
  }, []);

  const handleDeleteGame = async (game) => {
    const { error } = await supabase.from('games').delete().eq('id', game.id);
    if (error) { toastRef.current('Failed to delete game', 'error'); return; }
    toastRef.current(`${game.name} deleted`, 'success');
    setDeleteConfirm(null);
    if (selectedGameId === game.id) setSelectedGameId(null);
    setGames(prev => prev.filter(g => g.id !== game.id));
  };

  const handleToggleVisible = async (game) => {
    const newVisible = !game.visible;
    const { error } = await supabase.from('games').update({ visible: newVisible }).eq('id', game.id);
    if (error) { toastRef.current('Failed to update', 'error'); return; }
    toastRef.current(`${game.name} ${newVisible ? 'visible' : 'hidden'}`, 'success');
    setGames(prev => prev.map(g => g.id === game.id ? { ...g, visible: newVisible } : g));
  };

  const missionCount = (game) =>
    (game.categories || []).reduce((a, c) => a + (c.missions || []).length, 0);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-logo">
          <span className="logo-milestone">MILESTONE</span>
          <span className="logo-gg">GG</span>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="admin-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={logout}>← Logout</button>
        </div>
      </header>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="admin-body">
        {tab === 'Games' && (
          <div className="admin-games-layout">
            {/* Games list */}
            <div className="admin-games-panel">
              <div className="panel-header">
                <h2 className="panel-title">Games <span className="panel-count">{games.length}</span></h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setJsonModal(true)}>⬆ Upload JSON</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setGameModal('add')}>+ Add Game</button>
                </div>
              </div>

              {loading ? (
                <div className="empty"><div className="spinner" /></div>
              ) : games.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🎮</div>
                  <h3>No games yet</h3>
                  <p>Add your first game or upload a JSON file</p>
                </div>
              ) : (
                <div className="games-list">
                  {games.map(game => (
                    <div
                      key={game.id}
                      className={`game-row ${selectedGameId === game.id ? 'active' : ''} ${!game.visible ? 'hidden-game' : ''}`}
                      onClick={() => setSelectedGameId(game.id)}
                    >
                      <SidebarIcon icon={game.icon} width={64} height={46} />
                      <div className="game-row-info">
                        <span className="game-row-name">{game.name}</span>
                        <span className="game-row-meta">
                          {(game.categories || []).length} categories <br/> {missionCount(game)} milestones
                        </span>
                      </div>
                      <div className="game-row-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className={`btn btn-ghost btn-sm btn-icon ${game.visible ? '' : 'btn-amber'}`}
                          title={game.visible ? 'Hide from users' : 'Show to users'}
                          onClick={() => handleToggleVisible(game)}
                        >{game.visible ? '👁' : '🚫'}</button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit game"
                          onClick={() => setGameModal(game)}>✎</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete game"
                          onClick={() => setDeleteConfirm(game)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Editor panel */}
            <div className="admin-editor-panel">
              {selectedGame ? (
                <CategoryMissionEditor
                  key={selectedGame.id}
                  game={selectedGame}
                  onRefresh={fetchGames}
                  onCountsChange={updateGameCounts}
                />
              ) : (
                <div className="empty" style={{ height: '100%' }}>
                  <div className="empty-icon">📋</div>
                  <h3>Select a game</h3>
                  <p>Click a game on the left to edit its categories and milestones</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'Users' && <UserManager />}
      </div>

      {gameModal && (
        <GameFormModal
          game={gameModal === 'add' ? null : gameModal}
          onClose={() => setGameModal(null)}
          onSaved={() => { setGameModal(null); fetchGames(); }}
        />
      )}

      {jsonModal && (
        <JsonUploadModal
          onClose={() => setJsonModal(false)}
          onSaved={() => { setJsonModal(false); fetchGames(); }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠ Delete Game</div>
            <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>
              Delete <strong style={{ color: 'var(--text-1)' }}>{deleteConfirm.name}</strong> and all its categories and milestones?
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>User progress for this game will also be deleted. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDeleteGame(deleteConfirm)}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
