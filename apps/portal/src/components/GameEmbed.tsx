import { useEffect, useRef, useState, useCallback } from 'react';
import { submitScore } from '../api/client';
import type { ScorePayload } from './types';

interface GameEmbedProps {
  gameUrl: string;
  gameId: number;
  fullscreen?: boolean;
}

interface GameMessage {
  type: 'SCORE_UPDATE' | 'GAME_OVER';
  payload: ScorePayload;
}

export default function GameEmbed({ gameUrl, gameId, fullscreen = false }: GameEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'over'>('playing');
  const [lastScore, setLastScore] = useState<ScorePayload | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // In production, verify event.origin against allowed origins
      const data = event.data as GameMessage;
      if (!data.type || !data.payload) return;

      if (data.type === 'SCORE_UPDATE') {
        setLastScore(data.payload);
      }

      if (data.type === 'GAME_OVER') {
        setLastScore(data.payload);
        setGameState('over');

        // Submit score to the API
        submitScore({
          game_id: gameId,
          player_name: 'Player', // Could be replaced with a name input
          score: data.payload.score,
          kills: data.payload.kills,
          survival_time: data.payload.survivalTime,
          level_reached: data.payload.level,
        }).catch(console.error);
      }
    },
    [gameId]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  function sendCommand(type: string) {
    iframeRef.current?.contentWindow?.postMessage({ type }, '*');
  }

  // Auto-focus the iframe so keyboard events reach the game
  useEffect(() => {
    // Small delay to ensure iframe is loaded
    const timer = setTimeout(() => {
      iframeRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, [gameUrl]);

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-full'}`}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => sendCommand('PAUSE')}
            className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600"
          >
            暂停
          </button>
          <button
            onClick={() => sendCommand('RESUME')}
            className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600"
          >
            继续
          </button>
          <button
            onClick={() => sendCommand('RESTART')}
            className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600"
          >
            重新开始
          </button>
        </div>
        {lastScore && (
          <div className="text-sm text-gray-400">
            分数: <span className="text-indigo-400 font-bold">{lastScore.score.toLocaleString()}</span>
            {' | '}击杀: <span className="text-red-400">{lastScore.kills}</span>
            {' | '}等级: <span className="text-yellow-400">{lastScore.level}</span>
          </div>
        )}
      </div>

      {/* Game iframe */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={gameUrl}
          className="w-full h-full border-0"
          style={{ outline: 'none' }}
          title="Game"
          allow="autoplay"
        />

        {gameState === 'over' && lastScore && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center bg-gray-800 p-8 rounded-2xl border border-gray-700">
              <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over</h2>
              <div className="space-y-2">
                <p className="text-2xl text-indigo-400">分数: {lastScore.score.toLocaleString()}</p>
                <p className="text-gray-400">击杀: {lastScore.kills}</p>
                <p className="text-gray-400">等级: {lastScore.level}</p>
                <p className="text-gray-400">
                  存活: {Math.floor(lastScore.survivalTime / 60)}:
                  {(lastScore.survivalTime % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <button
                onClick={() => {
                  setGameState('playing');
                  sendCommand('RESTART');
                }}
                className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold"
              >
                再来一局
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
