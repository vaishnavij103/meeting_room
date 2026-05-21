import { Badge } from './ui';
import { useTheme } from '../ThemeContext';

export default function BookingCard({ booking, roomName, userName, onCancel, onReschedule, onCheckIn, onCheckOut }) {
  const { theme } = useTheme();
  const { title, status, start_time, end_time, notes, actual_check_in, actual_check_out } = booking;
  const date = start_time?.slice(0, 10) || '';
  const sTime = start_time?.slice(11, 16) || '';
  const eTime = end_time?.slice(11, 16) || '';

  let duration = '';
  try {
    const mins = (new Date(end_time) - new Date(start_time)) / 60000;
    duration = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? mins % 60 + 'm' : ''}` : `${mins}m`;
  } catch { }

  const accent = status === 'confirmed' ? '#10b981' : '#f43f5e';

  return (
    <div className={`flex items-center gap-4 ${theme === 'dark'
      ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45] hover:border-[#2d3f6b]'
      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
    } border rounded-2xl p-4 mb-2 transition-all hover:translate-x-1 group`}>
      {/* Accent bar */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: accent }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} truncate`}>{title || 'Booking'}</div>
          <Badge status={status} />
        </div>
        <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
          <span className="flex items-center gap-1">🏢 {roomName}</span>
          <span className="flex items-center gap-1">👤 {userName}</span>
          <span className="flex items-center gap-1">📅 {date}</span>
          <span className="flex items-center gap-1">🕐 {sTime} – {eTime}</span>
          {duration && <span className="flex items-center gap-1">⏱️ {duration}</span>}
        </div>
        {notes && (
          <div className={`text-xs ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'} mt-1.5 italic truncate`}>"{notes}"</div>
        )}
      </div>

      {/* Actions */}
      {status === 'confirmed' && (onCancel || onReschedule) && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onCheckIn && !actual_check_in && (
            <button onClick={() => onCheckIn(booking)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              } border transition-all`}>
              ⏱️ Check In
            </button>
          )}
          {onCheckOut && actual_check_in && !actual_check_out && (
            <button onClick={() => onCheckOut(booking)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                ? 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10'
                : 'border-yellow-300 text-yellow-700 hover:bg-yellow-100'
              } border transition-all`}>
              🚪 Check Out
            </button>
          )}
          {onReschedule && (
            <button onClick={() => onReschedule(booking)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${theme === 'dark'
                ? 'border-[#1e2a45] text-slate-400 hover:border-indigo-500 hover:text-indigo-300'
                : 'border-gray-300 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
              }`}>
              🔄 Reschedule
            </button>
          )}
          {onCancel && (
            <button onClick={() => onCancel(booking)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark'
                ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                : 'border-rose-300 text-rose-700 hover:bg-rose-100'
              } border transition-all`}>
              ✖ Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
