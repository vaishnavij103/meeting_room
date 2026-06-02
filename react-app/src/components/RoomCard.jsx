import { Badge, Pill, amenityIcon } from './ui';
import { useTheme } from '../ThemeContext';

export default function RoomCard({ room, selected, onSelect, actions, canBook = true }) {
  const { theme } = useTheme();
  const { name, capacity, floor, status, amenities = [] } = room;
  const capPct = Math.min((capacity / 50) * 100, 100);

  return (
    <div className={`relative ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e]'
      : 'bg-gradient-to-br from-gray-50 to-gray-100'
      } rounded-2xl p-5 transition-all duration-300 overflow-hidden border ${selected
        ? theme === 'dark'
          ? 'border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.2)]'
          : 'border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.15)]'
        : theme === 'dark'
          ? 'border-[#1e2a45] hover:border-[#2d3f6b] hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
          : 'border-gray-200 hover:border-gray-300 hover:-translate-y-1 hover:shadow-lg'
      }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className={`text-base font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} truncate`}>{name}</div>
          <div className={`flex items-center gap-3 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mt-1`}>
            <span className="flex items-center gap-1">👥 {capacity} seats</span>
            <span className="flex items-center gap-1">🏢 Floor {floor}</span>
          </div>
        </div>
        {status && <Badge status={status} />}
      </div>

      {/* Amenities */}
      <div className="flex flex-wrap gap-1 mb-3">
        {amenities.slice(0, 4).map(a => (
          <Pill key={a}>{amenityIcon(a)} {a}</Pill>
        ))}
        {amenities.length > 4 && <Pill>+{amenities.length - 4} more</Pill>}
      </div>

      {/* Capacity bar */}
      <div className="mt-auto">
        <div className={`flex justify-between text-[0.68rem] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'} mb-1`}>
          <span>Capacity</span>
          <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>{capacity} people</span>
        </div>
        <div className={`h-1 ${theme === 'dark' ? 'bg-[#1e2a45]' : 'bg-gray-300'} rounded-full overflow-hidden`}>
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${capPct}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      {(onSelect || actions) && (
        <div className="flex gap-2 mt-4">
          {onSelect && (
            <button
              onClick={() => canBook && onSelect(room)}
              disabled={!canBook}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${selected
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                  : !canBook
                    ? 'bg-gray-100 text-slate-400 border border-gray-200 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'border border-[#1e2a45] text-slate-400 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-500/5'
                      : 'border border-gray-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
            >
              {selected ? '✅ Selected' : canBook ? '📅 Book' : '🔒 Restricted'}
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
