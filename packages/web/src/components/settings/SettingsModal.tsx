import { Modal } from '../ui/Modal';
import { SettingsForm } from './SettingsForm';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="設定">
      <SettingsForm />
    </Modal>
  );
}
