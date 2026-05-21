import { useState, useEffect, useRef } from 'react';
import { getRoomAvailability, createBooking } from '../api';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { format } from 'date-fns';

const TIME_OPTIONS = Array.from({ length: 49 }).map((_, i) => {
  const hr = Math.floor(i / 4) + 8;
  const min = (i % 4) * 15;
  const ampm = hr < 12 ? 'AM' : 'PM';
  const hr12 = hr === 12 ? 12 : hr % 12;
  const hr24 = hr.toString().padStart(2, '0');
  const minStr = min.toString().padStart(2, '0');
  return {
    value: `${hr24}:${minStr}`,
    label: `${hr12.toString().padStart(2, '0')}:${minStr} ${ampm}`
  };
});

export default function SlotPicker({ room, onBooked, onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [title, setTitle] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ibStart, setIbStart] = useState(null);
  const [ibEnd, setIbEnd] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [room.room_id]);

  useEffect(() => {
    setLoading(true);
    setSelectedSlot(null);
    setError('');
    setSuccess('');
    getRoomAvailability(room.room_id, date)
      .then(data => {
        let free = (data.slots || []).filter(s => s.is_available);
        // Filter past slots for today
        const today = format(new Date(), 'yyyy-MM-dd');
        if (date === today) {
          const now = format(new Date(), 'HH:mm');
          free = free.filter(s => s.start_time.slice(11, 16) >= now);
        }
        setSlots(free);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [room.room_id, date]);

  const handleConfirm = async () => {
    if (!selectedSlot && (!ibStart || !ibEnd)) return;
    const st = ibStart || selectedSlot?.start_time;
    const et = ibEnd || selectedSlot?.end_time;
    setBooking(true);
    setError('');
    try {
      await createBooking({
        title: title.trim() || 'Meeting',
        room_id: room.room_id,
        user_id: user.user_id,
        start_time: st,
        end_time: et,
        notes: '',
      });
      setSuccess(`Booked! ${room.name} at ${st.slice(11, 16)}`);
      setSelectedSlot(null);
      setIbStart(null);
      setIbEnd(null);
      setTitle('');
      setTimeout(() => { onBooked?.(); }, 800);
    } catch (e) {
      setError(e.status === 409 ? 'Slot just got taken. Pick another.' : (e.detail || e.message));
    } finally { setBooking(false); }
  };

  const buildDateTime = (date, time) => `${date}T${time}:00`;

  return (
    <div ref={pickerRef} className="animate-fade-up mt-4 scroll-mt-24">
      <div className={`h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent mb-5`} />

      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>
          ⚡ Pick a Time Slot — {room.name}
        </h3>
        <button onClick={onClose}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${theme === 'dark'
            ? 'border-[#1e2a45] text-slate-400 hover:border-rose-500 hover:text-rose-400'
            : 'border-gray-300 text-slate-600 hover:border-rose-500 hover:text-rose-600'
          }`}>
          ✖ Close
        </button>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className={`px-4 py-2.5 rounded-xl ${theme === 'dark'
            ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
            : 'bg-white border-gray-300 text-slate-900 focus:border-indigo-500'
          } border text-sm outline-none transition-all`} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <datalist id="time-options-slot">
          {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </datalist>

        {/* START TIME */}
        <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-4`}>
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
            Start Time
          </div>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${theme === 'dark' 
            ? 'bg-[#070c1a] border-[#1e2a45]'
            : 'bg-white border-gray-300'
          } border mb-3`}>
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>🕒</span>
            <input
              type="time"
              list="time-options-slot"
              required
              value={ibStart ? ibStart.slice(11, 16) : ""}
              onChange={e =>
                setIbStart(e.target.value ? buildDateTime(date, e.target.value) : null)
              }
              className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
            />
          </div>
        </div>

        {/* END TIME */}
        <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-4`}>
          <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mb-2`}>
            End Time
          </div>

          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${theme === 'dark' 
            ? 'bg-[#070c1a] border-[#1e2a45]'
            : 'bg-white border-gray-300'
          } border mb-3`}>
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>🕒</span>
            <input
              type="time"
              list="time-options-slot"
              required
              value={ibEnd ? ibEnd.slice(11, 16) : ""}
              onChange={e =>
                setIbEnd(e.target.value ? buildDateTime(date, e.target.value) : null)
              }
              className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
            />
          </div>
        </div>

      </div>

      {error && (
        <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
          ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
          : 'bg-rose-100 border-rose-300 text-rose-700'
        } border text-sm`}>❌ {error}</div>
      )}
      {success && (
        <div className={`mb-3 px-4 py-2 rounded-xl ${theme === 'dark'
          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
          : 'bg-emerald-100 border-emerald-300 text-emerald-700'
        } border text-sm`}>✅ {success}</div>
      )}

      {/* Confirm form */}
      {ibStart && ibEnd && (
        <div className="animate-fade-in">
          <div className={`px-4 py-3 rounded-xl ${theme === 'dark'
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-emerald-100 border-emerald-300'
          } border mb-4`}>
            <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
              📅 {room.name} · {date} · {ibStart.slice(11, 16)} – {ibEnd.slice(11, 16)}
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Meeting Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sprint Planning"
                className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500'
                  : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                } border text-sm outline-none transition-all`} />
            </div>
            <button onClick={handleConfirm} disabled={booking}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 whitespace-nowrap">
              {booking ? '⏳...' : '✅ Confirm Booking'}
            </button>
            <button onClick={() => setSelectedSlot(null)}
              className={`px-4 py-2.5 rounded-xl border text-sm transition-all ${theme === 'dark'
                ? 'border-[#1e2a45] text-slate-400 hover:border-rose-500 hover:text-rose-400'
                : 'border-gray-300 text-slate-600 hover:border-rose-500 hover:text-rose-600'
              }`}>
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
