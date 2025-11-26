import { X, Keyboard, Navigation, Maximize2, Info } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="h-6 w-6" />
              <h3 className="text-2xl font-bold">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary-600" />
                Navigation
              </h4>
              <div className="space-y-2">
                <ShortcutItem label="Zoom In" keys={['Ctrl/⌘', '+']} />
                <ShortcutItem label="Zoom Out" keys={['Ctrl/⌘', '-']} />
                <ShortcutItem label="Reset Zoom" keys={['Ctrl/⌘', '0']} />
                <ShortcutItem label="Focus Search" keys={['Ctrl/⌘', 'F']} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-primary-600" />
                Actions
              </h4>
              <div className="space-y-2">
                <ShortcutItem label="Expand All" keys={['Ctrl/⌘', 'E']} />
                <ShortcutItem label="Collapse All" keys={['Ctrl/⌘', 'C']} />
                <ShortcutItem label="Close Dialog" keys={['Esc']} />
                <ShortcutItem label="Show Shortcuts" keys={['?']} />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Pro Tip</p>
                <p className="text-xs text-blue-700 mt-1">
                  Enable Pan Mode and drag the chart around to explore large organizations.
                  Use the minimap to track your position.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShortcutItemProps {
  label: string;
  keys: string[];
}

function ShortcutItem({ label, keys }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
