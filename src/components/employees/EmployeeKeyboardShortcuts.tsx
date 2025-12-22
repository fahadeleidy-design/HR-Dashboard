import { useEffect } from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
  category: string;
}

interface EmployeeKeyboardShortcutsProps {
  onClose: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'Ctrl + K', description: 'Quick search', category: 'Navigation' },
  { key: 'Ctrl + N', description: 'Add new employee', category: 'Actions' },
  { key: 'Ctrl + E', description: 'Export data', category: 'Actions' },
  { key: 'Ctrl + U', description: 'Bulk upload', category: 'Actions' },
  { key: 'Ctrl + F', description: 'Toggle filters', category: 'View' },
  { key: 'Ctrl + S', description: 'Save current view', category: 'View' },
  { key: 'Ctrl + V', description: 'Open saved views', category: 'View' },
  { key: 'Ctrl + A', description: 'Toggle analytics dashboard', category: 'View' },
  { key: 'Ctrl + L', description: 'View lifecycle events', category: 'View' },
  { key: 'Ctrl + 1', description: 'Switch to table view', category: 'View' },
  { key: 'Ctrl + 2', description: 'Switch to cards view', category: 'View' },
  { key: 'Escape', description: 'Close modals/panels', category: 'Navigation' },
  { key: '?', description: 'Show this help', category: 'Navigation' },
];

export function EmployeeKeyboardShortcuts({ onClose }: EmployeeKeyboardShortcutsProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Command className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-600">Quick navigation and actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs font-mono font-medium text-gray-700">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Press <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">ESC</kbd> to close this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
