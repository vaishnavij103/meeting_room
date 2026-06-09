import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { getStats, getRooms, getBookings, getRoomAvailability, createBooking, getAdminContacts } from '../api';
import { StatCard, PageHeader, SectionHeader, EmptyState } from '../components/ui';
import BookingCard from '../components/BookingCard';
import { format } from 'date-fns';
import { useLocation } from "../LocationContext";

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

export default function Dashboard() {
  const { location } = useLocation();
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState({});
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Instant book state
  const [ibRoom, setIbRoom] = useState('');
  const [ibDate, setIbDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [ibSlots, setIbSlots] = useState([]);
  const [ibLoading, setIbLoading] = useState(false);
  const [ibSelected, setIbSelected] = useState(null);
  const [ibTitle, setIbTitle] = useState('');
  const [ibBooking, setIbBooking] = useState(false);
  const [ibMsg, setIbMsg] = useState({ type: '', text: '' });

  const [adminContacts, setAdminContacts] = useState([]);
  const [adminContactsLoading, setAdminContactsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const [ibStart, setIbStart] = useState(null);
  const [ibEnd, setIbEnd] = useState(null)


  const reload = () => {
    setLoading(true);
    Promise.all([getStats(), getRooms(), getBookings()])
      .then(([s, r, b]) => { setStats(s); setRooms(r); setBookings(b); if (!ibRoom && r.length) setIbRoom(r[0].room_id); })
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const cityRooms = useMemo(() => {
    return rooms.filter(r => r.location === location);
  }, [rooms, location]);


  // Load slots when room/date changes
  useEffect(() => {
    if (!ibRoom) return;
    setIbLoading(true);
    setIbSelected(null);
    setIbMsg({ type: '', text: '' });
    getRoomAvailability(ibRoom, ibDate)
      .then(data => {
        let free = (data.slots || []).filter(s => s.is_available);
        const today = format(new Date(), 'yyyy-MM-dd');
        if (ibDate === today) {
          const now = format(new Date(), 'HH:mm');
          free = free.filter(s => s.start_time.slice(11, 16) >= now);
        }
        setIbSlots(free);
      })
      .catch(() => setIbSlots([]))
      .finally(() => setIbLoading(false));
  }, [ibRoom, ibDate]);

  useEffect(() => {
    setAdminContactsLoading(true);
    getAdminContacts({ location })
      .then(data => {
        setAdminContacts(data);
        setSelectedAdmin(data?.[0] || null);
      })
      .catch(() => {
        setAdminContacts([]);
        setSelectedAdmin(null);
      })
      .finally(() => setAdminContactsLoading(false));
  }, [location]);

  const handleInstantBook = async () => {
    // ✅ Guard: both start & end required
    if (!ibStart || !ibEnd) return;

    // ✅ Guard: end must be after start
    if (new Date(ibEnd) <= new Date(ibStart)) {
      setIbMsg({
        type: "error",
        text: "End time must be after start time.",
      });
      return;
    }

    setIbBooking(true);
    setIbMsg({ type: "", text: "" });

    try {
      await createBooking({
        title: ibTitle.trim() || "Meeting",
        room_id: ibRoom,
        user_id: user.user_id,
        start_time: ibStart,   // ✅ HH:MM IST → ISO
        end_time: ibEnd,       // ✅ HH:MM IST → ISO
        notes: "",
      });

      const rName =
        cityRooms.find(r => r.room_id === ibRoom)?.name || "";

      setIbMsg({
        type: "success",
        text: `Booked! ${rName} · ${ibStart.slice(11, 16)}–${ibEnd.slice(11, 16)}`,
      });

      // ✅ Reset state
      setIbStart(null);
      setIbEnd(null);
      setIbTitle("");

      reload();
    } catch (e) {
      setIbMsg({
        type: "error",
        text:
          e?.status === 409
            ? "Time slot conflict. Please try a different range."
            : (e?.detail || e?.message || "Booking failed"),
      });
    } finally {
      setIbBooking(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const nowStr = format(new Date(), 'HH:mm');

  const activeRooms = cityRooms.filter(r => r.status === 'active');
  const roomMap = Object.fromEntries(cityRooms.map(r => [r.room_id, r.name]));
  const myBookings = bookings.filter(b => b.user_id === user?.user_id).sort((a, b) => b.created_at?.localeCompare(a.created_at)).slice(0, 6);
  const upcoming = bookings
    .filter(b => b.status === 'confirmed' && b.start_time?.slice(0, 10) === todayIso && b.start_time?.slice(11, 16) >= nowStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 8);

  const APEXON_VALUES = [
    { icon: '🛡️', title: 'Integrity', desc: 'Establishing trust' },
    { icon: '🌟', title: 'Authenticity', desc: 'Being ourselves' },
    { icon: '🤝', title: 'Empathy', desc: 'Treating others well' },
    { icon: '🌍', title: 'Community', desc: 'Collaborative experience' },
    { icon: '💡', title: 'Entrepreneurial Spirit', desc: 'Continuous innovation' },
    { icon: '✨', title: 'Excellence', desc: 'Highest standards' },
  ];

  const COMPANY_NEWS = [
    { icon: '📢', text: 'All-Hands Townhall Meeting this Friday at 3:00 PM' },
    { icon: '🚀', text: 'Q3 Product Release is now live! Check out the new features.' },
    { icon: '⚠️', text: 'Scheduled System Maintenance: Saturday 2:00 AM - 4:00 AM' },
    { icon: '🎉', text: 'Welcome to the 25 new team members joining us this week!' },
    { icon: '🏆', text: 'Apexon recognized as Top Place to Work 2024!' },
  ];

  const buildDateTime = (date, time) => `${date}T${time}:00`;

  if (loading) return <div className={`text-center py-20 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Loading...</div>;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-extrabold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} tracking-tight`}>
          {greeting}, {firstName} 👋
        </h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mt-1`}>{todayStr}</p>
      </div>
      <div className="mb-6">
        {adminContactsLoading ? (
          <div className={`rounded-2xl border p-6 text-sm text-center ${theme === 'dark' ? 'border-[#1e2a45] bg-[#0b1224] text-slate-400' : 'border-gray-200 bg-white text-slate-600'}`}>
            Loading admin contacts...
          </div>
        ) : adminContacts.length === 0 ? (
          <div className={`rounded-2xl border p-6 text-sm ${theme === 'dark' ? 'border-[#1e2a45] bg-[#0b1224] text-slate-400' : 'border-gray-200 bg-white text-slate-600'}`}>
            No admin contacts are configured for {location}. Please ask your operations team to add them.
          </div>
        ) : (
          <div >

            {selectedAdmin && (
              <>
                <style>{`
                @keyframes ticker {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }

                .animate-ticker {
                  animation: ticker 40s linear infinite;
                  display: flex;
                  width: max-content;
                }

                .animate-ticker:hover {
                  animation-play-state: paused;
                }
              `}</style>

                <div className={`relative overflow-hidden rounded-xl py-2 border shadow-sm ${theme === 'dark'
                  ? 'bg-gradient-to-r from-[#0f1420] via-[#161c2e] to-[#0f1420] border-[#1e2a45]'
                  : 'bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/50 border-indigo-100'
                  }`}>

                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-pulse" />

                  <div className="animate-ticker flex items-center cursor-default text-xs">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center gap-3 px-6">

                        {/* Tag */}
                        <div className="flex items-center gap-1  border-indigo-500/20  px-2 py-0.5 text-[12px]">
                          📍 <span>Location Admin Details : </span>
                        </div>

                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
                            {selectedAdmin.name?.charAt(0)?.toUpperCase()}
                          </div>

                          <span className="whitespace-nowrap font-medium text-xs">
                            {selectedAdmin.name}
                          </span>
                        </div>

                        <span className="h-3 w-px bg-slate-400/30" />

                        {/* Email */}
                        <a href={`mailto:${selectedAdmin.email}`} className="text-indigo-500 text-xs whitespace-nowrap">
                          ✉ {selectedAdmin.email}
                        </a>

                        <span className="h-3 w-px bg-slate-400/30" />

                        {/* Phone */}
                        <a href={`tel:${selectedAdmin.phone}`} className="text-emerald-500 text-xs whitespace-nowrap">
                          📞 {selectedAdmin.phone}
                        </a>

                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Apexon Core Values Marquee */}
      <div className={`relative flex overflow-hidden mb-6 rounded-2xl py-3.5 border shadow-sm ${theme === 'dark'
        ? 'bg-gradient-to-r from-[#0f1420] via-[#161c2e] to-[#0f1420] border-[#1e2a45]'
        : 'bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/50 border-indigo-100'
        }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-pulse" />

        <style>
          {`
            @keyframes ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-ticker {
              animation: ticker 40s linear infinite;
              display: flex;
              width: max-content;
            }
            .animate-ticker:hover {
              animation-play-state: paused;
            }
            .animate-ticker-news {
              animation: ticker 50s linear infinite;
              display: flex;
              width: max-content;
            }
            .animate-ticker-news:hover {
              animation-play-state: paused;
            }
          `}
        </style>

        <div className="animate-ticker items-center cursor-default">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-8 items-center px-4">
              {APEXON_VALUES.map(val => (
                <div key={val.title} className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${theme === 'dark' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-100 border border-indigo-200'} text-sm shadow-inner flex-shrink-0`}>
                    {val.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold uppercase tracking-wider text-[0.7rem] ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      {val.title}
                    </span>
                    <span className={`text-[0.65rem] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {val.desc}
                    </span>
                  </div>
                  <div className={`mx-4 h-4 w-px ${theme === 'dark' ? 'bg-[#1e2a45]' : 'bg-indigo-200'}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Company News Marquee */}
      {/* <div className={`relative flex overflow-hidden mb-6 rounded-xl py-2.5 border shadow-sm ${theme === 'dark'
        ? 'bg-gradient-to-r from-[#161c2e] via-[#0f1420] to-[#161c2e] border-[#1e2a45]'
        : 'bg-gradient-to-r from-amber-50/50 via-white to-amber-50/50 border-amber-100'
        }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent animate-pulse" />

        <div className="animate-ticker-news items-center cursor-default">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-8 items-center px-4">
              {COMPANY_NEWS.map((news, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="text-sm flex-shrink-0">
                    {news.icon}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {news.text}
                  </span>
                  <div className={`mx-4 h-1 w-1 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-[#1e2a45]' : 'bg-amber-200'}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div> */}

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Rooms" value={stats.active_rooms || 0} icon="🏢" color="#818cf8" />
        <StatCard label="Total Bookings" value={stats.total_bookings || 0} icon="📅" color="#34d399" />
        <StatCard label="Today's Meetings" value={stats.today_bookings || 0} icon="✅" color="#fbbf24" />
        {isAdmin
          ? <StatCard label="Team Members" value={stats.total_users || 0} icon="👥" color="#67e8f9" />
          : <StatCard label="My Bookings" value={myBookings.filter(b => b.status === 'confirmed').length} icon="📋" color="#67e8f9" />
        }
      </div>



      <div className="grid grid-cols-5 gap-6">
        {/* LEFT */}
        <div className="col-span-3">
          <SectionHeader title="⚡ Instant Book" />

          <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-indigo-500/8 to-purple-500/5 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-100 to-purple-50 border-indigo-300'} border rounded-2xl p-5 mb-6`}>
            {/* Room & Date */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase mb-1.5`}>Room</label>
                <select
                  value={ibRoom}
                  onChange={e => {
                    setIbRoom(e.target.value);
                    setIbStart(null);
                    setIbEnd(null);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                    ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                    : 'bg-white border-gray-300 text-slate-900'
                    } border text-sm`}
                >
                  {activeRooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase mb-1.5`}>Date</label>
                <input
                  type="date"
                  value={ibDate}
                  onChange={e => {
                    setIbDate(e.target.value);
                    setIbStart(null);
                    setIbEnd(null);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                    ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                    : 'bg-white border-gray-300 text-slate-900'
                    } border text-sm`}
                />
              </div>
            </div>

            {/* Messages */}
            {ibMsg.text && (
              <div className={`mb-3 px-4 py-2 rounded-xl text-sm border ${ibMsg.type === 'success'
                ? theme === 'dark'
                  ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : theme === 'dark'
                  ? 'bg-rose-500/8 border-rose-500/20 text-rose-400'
                  : 'bg-rose-100 border-rose-300 text-rose-700'
                }`}>
                {ibMsg.type === 'success' ? '✅' : '❌'} {ibMsg.text}
              </div>
            )}

            {/* Slots */}
            {ibLoading ? (
              <div className={`text-center py-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} text-sm`}>Loading slots...</div>
            ) : ibSlots.length === 0 ? (
              <div className={`text-center py-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} text-sm`}>
                No available slots. Try another room or date.
              </div>
            ) : (
              <>
                <datalist id="time-options">
                  {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </datalist>
                {/* Time Picker */}
                <div className="grid grid-cols-2 gap-6 mb-4">

                  {/* START TIME */}
                  <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-300'} border rounded-2xl p-4`}>
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
                        list="time-options"
                        required
                        value={ibStart ? ibStart.slice(11, 16) : ""}
                        onChange={e =>
                          setIbStart(e.target.value ? buildDateTime(ibDate, e.target.value) : null)
                        }
                        className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
                      />
                    </div>
                  </div>

                  {/* END TIME */}
                  <div className={`${theme === 'dark' ? 'bg-[#0b1224] border-[#1e2a45]' : 'bg-gray-50 border-gray-300'} border rounded-2xl p-4`}>
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
                        list="time-options"
                        required
                        value={ibEnd ? ibEnd.slice(11, 16) : ""}
                        onChange={e =>
                          setIbEnd(e.target.value ? buildDateTime(ibDate, e.target.value) : null)
                        }
                        className={`bg-transparent w-full ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} text-sm outline-none cursor-pointer`}
                      />
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* Confirm */}
            {ibStart && ibEnd && (
              <div className="animate-fade-in">
                <div className={`px-4 py-2.5 rounded-xl ${theme === 'dark'
                  ? 'bg-emerald-500/8 border-emerald-500/20'
                  : 'bg-emerald-100 border-emerald-300'
                  } border mb-3`}>
                  <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    📅 {roomMap[ibRoom]} · {ibDate} · {ibStart.slice(11, 16)} – {ibEnd.slice(11, 16)}
                  </span>
                </div>

                <div className="flex gap-3 items-end">
                  <input
                    type="text"
                    value={ibTitle}
                    onChange={e => setIbTitle(e.target.value)}
                    placeholder="Meeting title (optional)"
                    className={`flex-1 px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100'
                      : 'bg-white border-gray-300 text-slate-900'
                      } border text-sm`}
                  />

                  <button
                    onClick={handleInstantBook}
                    disabled={ibBooking}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm disabled:opacity-50"
                  >
                    {ibBooking ? '⏳...' : '✅ Confirm'}
                  </button>

                  <button
                    onClick={() => {
                      setIbStart(null);
                      setIbEnd(null);
                    }}
                    className={`px-3 py-2.5 rounded-xl border text-sm ${theme === 'dark'
                      ? 'border-[#1e2a45] text-slate-400'
                      : 'border-gray-300 text-slate-600'
                      }`}
                  >
                    ✖
                  </button>
                </div>
              </div>
            )}
          </div>

          <SectionHeader title="📋 My Recent Bookings" />
          {myBookings.length === 0
            ? <EmptyState icon="📭" text="No bookings yet. Use Instant Book above!" />
            : myBookings.map(b => (
              <BookingCard
                key={b.booking_id}
                booking={b}
                roomName={roomMap[b.room_id] || ''}
                userName={user?.name || ''}
              />
            ))
          }
        </div>

        {/* RIGHT */}
        <div className="col-span-2">
          <SectionHeader title="🕐 Upcoming Today" />
          {upcoming.length === 0
            ? <EmptyState icon="🎉" text="No more meetings today!" />
            : upcoming.map(b => (
              <div key={b.booking_id} className={`p-3 rounded-xl mb-2 border ${theme === 'dark' ? 'bg-[#0f1420] border-[#1e2a45]' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{b.title}</div>
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                  🏢 {roomMap[b.room_id]} · {b.start_time.slice(11, 16)}–{b.end_time.slice(11, 16)}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
