import { useState, useCallback } from 'react';
import { PROGRAM_PRESETS, type ProgramPreset } from '../components/program/presets';

const STORAGE_KEY = 'pomodoro-custom-presets';

// ユーザー作成プリセット（idに'custom-'プレフィックス）
export interface CustomPreset extends ProgramPreset {
  isCustom: true;
  updatedAt: string;
}

// 全プリセット（組み込み + カスタム）
export type AllPreset = (ProgramPreset & { isCustom?: false }) | CustomPreset;

function loadCustomPresets(): CustomPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load custom presets:', e);
  }
  return [];
}

function saveCustomPresets(presets: CustomPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save custom presets:', e);
  }
}

export function useProgramPresets() {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => loadCustomPresets());

  // 全プリセット（組み込み + カスタム）
  const allPresets: AllPreset[] = [
    ...PROGRAM_PRESETS.map(p => ({ ...p, isCustom: false as const })),
    ...customPresets,
  ];

  // カスタムプリセットを作成
  const createPreset = useCallback((preset: Omit<ProgramPreset, 'id'>): CustomPreset => {
    const newPreset: CustomPreset = {
      ...preset,
      id: `custom-${Date.now()}`,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    setCustomPresets(prev => {
      const updated = [...prev, newPreset];
      saveCustomPresets(updated);
      return updated;
    });

    return newPreset;
  }, []);

  // カスタムプリセットを更新
  const updatePreset = useCallback((id: string, updates: Partial<Omit<ProgramPreset, 'id'>>): void => {
    if (!id.startsWith('custom-')) {
      console.warn('Cannot update built-in presets');
      return;
    }

    setCustomPresets(prev => {
      const updated = prev.map(p =>
        p.id === id
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      );
      saveCustomPresets(updated);
      return updated;
    });
  }, []);

  // カスタムプリセットを削除
  const deletePreset = useCallback((id: string): void => {
    if (!id.startsWith('custom-')) {
      console.warn('Cannot delete built-in presets');
      return;
    }

    setCustomPresets(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveCustomPresets(updated);
      return updated;
    });
  }, []);

  // プリセットを複製してカスタムとして保存
  const duplicatePreset = useCallback((preset: ProgramPreset): CustomPreset => {
    return createPreset({
      name: `${preset.name} (コピー)`,
      description: preset.description,
      icon: preset.icon,
      sessions: [...preset.sessions],
      repeat: preset.repeat,
    });
  }, [createPreset]);

  // プリセットが編集可能か
  const isEditable = useCallback((id: string): boolean => {
    return id.startsWith('custom-');
  }, []);

  return {
    allPresets,
    customPresets,
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    isEditable,
  };
}
