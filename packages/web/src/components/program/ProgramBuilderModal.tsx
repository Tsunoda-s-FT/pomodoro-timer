import { useState } from 'react';
import { Play, Repeat, Copy, Pencil, Trash2, Save, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ProgramTimeline } from './ProgramTimeline';
import { SessionEditor } from './SessionEditor';
import { calculateTotalMinutes, formatDuration, type ProgramPreset } from './presets';
import { useProgramPresets, type AllPreset } from '../../hooks/useProgramPresets';
import type { ProgramSession } from '@pomodoro/protocol';

type TabType = 'presets' | 'custom';
type EditMode = 'none' | 'create' | 'edit';

interface ProgramBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartProgram: (program: {
    name: string;
    description?: string;
    sessions: ProgramSession[];
    repeat: boolean;
  }) => void;
}

const ICONS = ['🌱', '⚡', '🚀', '☀️', '🎯', '💪', '🧘', '📚', '🔥', '✨'];

export function ProgramBuilderModal({
  isOpen,
  onClose,
  onStartProgram,
}: ProgramBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [selectedPreset, setSelectedPreset] = useState<AllPreset | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // プリセット管理フック
  const {
    allPresets,
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    isEditable,
  } = useProgramPresets();

  // カスタム/編集用の状態
  const [customName, setCustomName] = useState('マイプログラム');
  const [customDescription, setCustomDescription] = useState('');
  const [customIcon, setCustomIcon] = useState('🌱');
  const [customSessions, setCustomSessions] = useState<ProgramSession[]>([
    { workMinutes: 0, breakMinutes: 15, label: 'ウォームアップ' },
    { workMinutes: 5, breakMinutes: 5, label: '始動' },
    { workMinutes: 25, breakMinutes: 5, label: 'フロー' },
  ]);
  const [customRepeat, setCustomRepeat] = useState(true);

  const handleClose = () => {
    setEditMode('none');
    setEditingPresetId(null);
    setSelectedPreset(null);
    onClose();
  };

  const resetCustomForm = () => {
    setCustomName('マイプログラム');
    setCustomDescription('');
    setCustomIcon('🌱');
    setCustomSessions([
      { workMinutes: 0, breakMinutes: 15, label: 'ウォームアップ' },
      { workMinutes: 5, breakMinutes: 5, label: '始動' },
      { workMinutes: 25, breakMinutes: 5, label: 'フロー' },
    ]);
    setCustomRepeat(true);
  };

  const handleStartPreset = (preset: ProgramPreset) => {
    onStartProgram({
      name: preset.name,
      description: preset.description,
      sessions: preset.sessions,
      repeat: preset.repeat,
    });
    handleClose();
  };

  const handleStartCustom = () => {
    if (customSessions.length === 0) return;
    onStartProgram({
      name: customName || 'カスタムプログラム',
      description: customDescription,
      sessions: customSessions,
      repeat: customRepeat,
    });
    handleClose();
  };

  const handleSaveAsPreset = () => {
    if (customSessions.length === 0) return;
    createPreset({
      name: customName || 'カスタムプログラム',
      description: customDescription,
      icon: customIcon,
      sessions: customSessions,
      repeat: customRepeat,
    });
    resetCustomForm();
    setActiveTab('presets');
  };

  const handleEditPreset = (preset: AllPreset) => {
    if (!isEditable(preset.id)) return;
    setEditMode('edit');
    setEditingPresetId(preset.id);
    setCustomName(preset.name);
    setCustomDescription(preset.description || '');
    setCustomIcon(preset.icon);
    setCustomSessions([...preset.sessions]);
    setCustomRepeat(preset.repeat);
    setActiveTab('custom');
  };

  const handleUpdatePreset = () => {
    if (!editingPresetId || customSessions.length === 0) return;
    updatePreset(editingPresetId, {
      name: customName,
      description: customDescription,
      icon: customIcon,
      sessions: customSessions,
      repeat: customRepeat,
    });
    setEditMode('none');
    setEditingPresetId(null);
    resetCustomForm();
    setActiveTab('presets');
  };

  const handleDeletePreset = (preset: AllPreset) => {
    if (!isEditable(preset.id)) return;
    if (confirm(`「${preset.name}」を削除しますか？`)) {
      deletePreset(preset.id);
      if (selectedPreset?.id === preset.id) {
        setSelectedPreset(null);
      }
    }
  };

  const handleDuplicatePreset = (preset: AllPreset) => {
    duplicatePreset(preset);
  };

  const handleCancelEdit = () => {
    setEditMode('none');
    setEditingPresetId(null);
    resetCustomForm();
    setActiveTab('presets');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="プログラム作成">
      {/* タブ切り替え */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--background-secondary)' }}>
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'presets' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'presets' ? 'var(--background-primary)' : 'transparent',
            color: activeTab === 'presets' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          プリセット
        </button>
        <button
          onClick={() => {
            setActiveTab('custom');
            if (editMode === 'none') {
              resetCustomForm();
            }
          }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'custom' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'custom' ? 'var(--background-primary)' : 'transparent',
            color: activeTab === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {editMode === 'edit' ? '編集中' : 'カスタム'}
        </button>
      </div>

      {/* プリセットタブ */}
      {activeTab === 'presets' && (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {allPresets.map((preset) => (
            <div
              key={preset.id}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedPreset?.id === preset.id ? 'ring-2' : ''
              }`}
              style={{
                backgroundColor: 'var(--background-secondary)',
                borderColor: selectedPreset?.id === preset.id ? 'var(--work-primary)' : 'var(--border-subtle)',
              }}
              onClick={() => setSelectedPreset(preset)}
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{preset.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {preset.name}
                      </h3>
                      {preset.isCustom && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--work-primary)',
                            color: 'white',
                            opacity: 0.8,
                          }}
                        >
                          カスタム
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {preset.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {preset.repeat && <Repeat size={12} />}
                  <span>{formatDuration(calculateTotalMinutes(preset.sessions))}</span>
                </div>
              </div>

              {/* タイムライン */}
              <ProgramTimeline sessions={preset.sessions} />

              {/* アクションボタン（選択時のみ表示） */}
              {selectedPreset?.id === preset.id && (
                <div className="mt-3 space-y-2">
                  {/* 開始ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartPreset(preset);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--work-primary)',
                      color: 'white',
                    }}
                  >
                    <Play size={16} />
                    このプログラムを開始
                  </button>

                  {/* 編集・複製・削除ボタン */}
                  <div className="flex gap-2">
                    {isEditable(preset.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPreset(preset);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          backgroundColor: 'var(--background-primary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Pencil size={14} />
                        編集
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePreset(preset);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--background-primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Copy size={14} />
                      複製
                    </button>
                    {isEditable(preset.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePreset(preset);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors hover:bg-red-500/20"
                        style={{
                          backgroundColor: 'var(--background-primary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Trash2 size={14} />
                        削除
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* カスタム/編集タブ */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {/* 編集モードヘッダー */}
          {editMode === 'edit' && (
            <div
              className="flex items-center justify-between p-2 rounded-lg"
              style={{ backgroundColor: 'var(--work-primary)', opacity: 0.9 }}
            >
              <span className="text-sm text-white font-medium">プリセットを編集中</span>
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}

          {/* アイコン選択 */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              アイコン
            </label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setCustomIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl transition-all ${
                    customIcon === icon ? 'ring-2 scale-110' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* プログラム名 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              プログラム名
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--background-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              説明（任意）
            </label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="このプログラムの説明..."
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--background-secondary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* セッションエディタ */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              セッション
            </label>
            <SessionEditor sessions={customSessions} onChange={setCustomSessions} />
          </div>

          {/* タイムラインプレビュー */}
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              プレビュー
            </label>
            <ProgramTimeline sessions={customSessions} />
          </div>

          {/* リピート設定 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={customRepeat}
              onChange={(e) => setCustomRepeat(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              プログラム完了後に繰り返す
            </span>
            <Repeat size={14} style={{ color: 'var(--text-tertiary)' }} />
          </label>

          {/* アクションボタン */}
          <div className="space-y-2">
            {editMode === 'edit' ? (
              // 編集モード: 更新ボタン
              <button
                onClick={handleUpdatePreset}
                disabled={customSessions.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--work-primary)',
                  color: 'white',
                }}
              >
                <Save size={18} />
                プリセットを更新
              </button>
            ) : (
              // 新規作成モード: 開始 & 保存ボタン
              <>
                <button
                  onClick={handleStartCustom}
                  disabled={customSessions.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--work-primary)',
                    color: 'white',
                  }}
                >
                  <Play size={18} />
                  プログラムを開始
                </button>
                <button
                  onClick={handleSaveAsPreset}
                  disabled={customSessions.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Save size={16} />
                  プリセットとして保存
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
