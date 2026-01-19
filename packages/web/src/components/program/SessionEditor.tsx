import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ProgramSession } from '@pomodoro/protocol';

interface SessionEditorProps {
  sessions: ProgramSession[];
  onChange: (sessions: ProgramSession[]) => void;
}

export function SessionEditor({ sessions, onChange }: SessionEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addSession = () => {
    const lastSession = sessions[sessions.length - 1];
    const newSession: ProgramSession = {
      workMinutes: lastSession?.workMinutes || 25,
      breakMinutes: lastSession?.breakMinutes || 5,
      label: `セッション ${sessions.length + 1}`,
    };
    onChange([...sessions, newSession]);
  };

  const updateSession = (index: number, updates: Partial<ProgramSession>) => {
    const newSessions = sessions.map((session, i) =>
      i === index ? { ...session, ...updates } : session
    );
    onChange(newSessions);
  };

  const removeSession = (index: number) => {
    if (sessions.length <= 1) return;
    onChange(sessions.filter((_, i) => i !== index));
  };

  const moveSession = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sessions.length || fromIndex === toIndex) return;
    const newSessions = [...sessions];
    const [removed] = newSessions.splice(fromIndex, 1);
    newSessions.splice(toIndex, 0, removed);
    onChange(newSessions);
  };

  // ドラッグ＆ドロップハンドラ
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // ドラッグ中の見た目を設定
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      moveSession(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {/* セッションリスト */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sessions.map((session, index) => (
          <div
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
              dragOverIndex === index ? 'ring-2 ring-offset-1' : ''
            }`}
            style={{
              backgroundColor: draggedIndex === index
                ? 'var(--background-primary)'
                : 'var(--background-secondary)',
              borderColor: dragOverIndex === index
                ? 'var(--work-primary)'
                : 'var(--border-subtle)',
              cursor: 'grab',
            }}
          >
            {/* ドラッグハンドル */}
            <div
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <GripVertical size={16} />
            </div>

            {/* セッション番号 */}
            <span
              className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium flex-shrink-0"
              style={{
                backgroundColor: 'var(--work-primary)',
                color: 'white',
                opacity: 0.8,
              }}
            >
              {index + 1}
            </span>

            {/* ラベル入力 */}
            <input
              type="text"
              value={session.label || ''}
              onChange={(e) => updateSession(index, { label: e.target.value })}
              placeholder="ラベル"
              className="flex-1 px-2 py-1 rounded border text-sm min-w-0"
              style={{
                backgroundColor: 'var(--background-primary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {/* 作業時間 */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="120"
                value={session.workMinutes}
                onChange={(e) => updateSession(index, { workMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-12 px-1 py-1 rounded border text-sm text-center"
                style={{
                  backgroundColor: 'var(--background-primary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--work-primary)',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>作</span>
            </div>

            {/* 休憩時間 */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="60"
                value={session.breakMinutes}
                onChange={(e) => updateSession(index, { breakMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-12 px-1 py-1 rounded border text-sm text-center"
                style={{
                  backgroundColor: 'var(--background-primary)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--short-break-primary)',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>休</span>
            </div>

            {/* 削除ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSession(index);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={sessions.length <= 1}
              className="p-1 rounded transition-colors hover:bg-red-500/20 disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="セッションを削除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* セッション追加ボタン */}
      <button
        onClick={addSession}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed transition-colors hover:border-solid"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <Plus size={16} />
        <span className="text-sm">セッションを追加</span>
      </button>

      {/* ヒント */}
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        ドラッグで並べ替え / 作業0分で休憩から開始
      </p>
    </div>
  );
}
