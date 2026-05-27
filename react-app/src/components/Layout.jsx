import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { healthCheck } from '../api';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, CalendarDays, Building2, Users, Bell, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Navbar } from "./Navbar";
import logo from "../assets/Apexon_id6ht3QYLO_0.png";

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', sub: 'Overview & stats', adminOnly: false },
  { to: '/bookings', icon: CalendarDays, label: 'Bookings', sub: 'Book rooms', adminOnly: false },
  { to: '/notifications', icon: Bell, label: 'Notifications', sub: 'Alerts & updates', adminOnly: false },
  { to: '/rooms', icon: Building2, label: 'Rooms', sub: 'Manage spaces', adminOnly: true },
  { to: '/users', icon: Users, label: 'Users', sub: 'Team members', adminOnly: true },
];

export default function Layout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [apiOk, setApiOk] = useState(true);
  const [location, setLocation] = useState("Pune");
  const [isCollapsed, setIsCollapsed] = useState(false);


  useEffect(() => {
    healthCheck().then(d => setApiOk(d?.status === 'ok'));
    const t = setInterval(() => healthCheck().then(d => setApiOk(d?.status === 'ok')), 30000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === "dark" ? "bg-[#080b14]" : "bg-gray-50"}`}>

      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${theme === "dark" ? "border-[#1e2a45] bg-gradient-to-b from-[#0a0f1e] to-[#080b14]" : "border-gray-200 bg-white"}`}>
        {/* Logo */}
        <div className={`px-5 pt-6 pb-4 border-b flex items-start ${isCollapsed ? 'justify-center' : 'justify-between'} ${theme === "dark" ? "border-[#1e2a45]" : "border-gray-200"}`}>
          {!isCollapsed && (
            <div className="overflow-hidden flex-1">
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Apexon Logo"
                  className="w-full max-w-[140px] h-auto object-contain opacity-90"
                />
              </div>
              <div className="leading-tight">
                <h1 className={`text-base mt-4 font-semibold ${theme === "dark" ? "text-slate-500" : "text-slate-700"}`}>
                  RoomBook
                </h1>
                <p className={`text-[0.65rem] tracking-[0.2em] ${theme === "dark" ? "text-slate-500" : "text-slate-600"} uppercase whitespace-nowrap`}>
                  Meeting Room Manager
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${theme === "dark" ? "border-[#1e2a45] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10" : "border-gray-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"}`}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <div className="px-3 mt-2">
          {!isCollapsed && (
            <div className={`text-[0.65rem] uppercase tracking-widest ${theme === "dark" ? "text-slate-600" : "text-slate-500"} font-semibold px-3 py-2`}>
              Navigation
            </div>
          )}
          {isCollapsed && <div className="h-6" />}
          <nav className="space-y-0.5">
            {NAV.filter(n => !n.adminOnly || isAdmin).map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                title={isCollapsed ? n.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                    ? theme === "dark"
                      ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-gradient-to-r from-indigo-100 to-purple-50 text-indigo-600 border border-indigo-300'
                    : theme === "dark"
                      ? 'text-slate-500 hover:bg-indigo-500/5 hover:text-indigo-300 border border-transparent'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <n.icon size={18} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden">
                        <div className="leading-tight truncate">{n.label}</div>
                        <div className="text-[0.6rem] opacity-50 font-normal truncate">{n.sub}</div>
                      </div>
                    )}
                    {isActive && !isCollapsed && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-1" />

        {/* Health */}
        <div className="px-3 mb-2">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2 rounded-xl text-xs font-medium ${apiOk
            ? theme === "dark" ? 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
            : theme === "dark" ? 'bg-rose-500/8 border border-rose-500/20 text-rose-400' : 'bg-rose-100 border border-rose-300 text-rose-700'
            }`} title={isCollapsed ? (apiOk ? 'API Connected' : 'API Unreachable') : undefined}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apiOk ? 'bg-emerald-400 animate-blink' : 'bg-rose-400'}`} />
            {!isCollapsed && <span>{apiOk ? 'API Connected' : 'API Unreachable'}</span>}
          </div>
        </div>

        {/* Logout */}
        {/* <div className="px-3 mb-4">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-3 py-2.5 rounded-xl text-sm transition-all border ${theme === "dark" 
              ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 border-transparent hover:border-rose-500/20" 
              : "text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200"}`}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div> */}

        {!isCollapsed && (
          <div className={`px-5 pb-4 text-[0.65rem] truncate ${theme === "dark" ? "text-slate-700" : "text-slate-500"}`}>
            v4.0 · Apexon Room Booking
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Navbar
          selectedLocation={location}
          onLocationChange={setLocation}
        />
        <div className="max-w-[1400px] mx-auto px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
