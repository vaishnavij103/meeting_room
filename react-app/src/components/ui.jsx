/* Shared UI primitives */
import { useTheme } from '../ThemeContext';

const AMENITY_ICONS = {
  projector: '📽️', whiteboard: '📋', 'video conferencing': '📹',
  'tv screen': '📺', phone: '📞', 'standing desk': '🪑',
  'natural light': '☀️', 'air conditioning': '❄️',
};

export function amenityIcon(name) {
  return AMENITY_ICONS[name.toLowerCase()] || '✦';
}

export function Badge({ status }) {
  const { theme } = useTheme();
  const styles = {
    confirmed: theme === 'dark' 
      ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
      : 'bg-emerald-100 text-emerald-700 border-emerald-300',
    cancelled: theme === 'dark'
      ? 'bg-rose-500/12 text-rose-400 border-rose-500/25'
      : 'bg-rose-100 text-rose-700 border-rose-300',
    active: theme === 'dark'
      ? 'bg-indigo-500/12 text-indigo-400 border-indigo-500/25'
      : 'bg-indigo-100 text-indigo-700 border-indigo-300',
    inactive: theme === 'dark'
      ? 'bg-slate-500/12 text-slate-400 border-slate-500/25'
      : 'bg-slate-100 text-slate-700 border-slate-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wider border ${styles[status] || styles.active}`}>
      ● {status}
    </span>
  );
}

export function StatCard({ label, value, icon, color = '#6366f1' }) {
  const { theme } = useTheme();
  return (
    <div className={`group relative ${theme === 'dark' 
      ? 'bg-gradient-to-br from-[#0f1420] to-[#161c2e] border-[#1e2a45] hover:border-[#2d3f6b] hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
      : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:border-indigo-300 hover:shadow-lg'
    } border rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1`}>
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-8 blur-xl" style={{ background: color }} />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 border" style={{ background: `${color}15`, borderColor: `${color}30` }}>
        {icon}
      </div>
      <div className={`text-3xl font-extrabold ${theme === 'dark' ? 'bg-gradient-to-r from-slate-100 to-indigo-300' : 'bg-gradient-to-r from-slate-900 to-indigo-700'} bg-clip-text text-transparent tracking-tight`}>
        {value}
      </div>
      <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-widest font-medium mt-1`}>{label}</div>
    </div>
  );
}

export function Pill({ children }) {
  const { theme } = useTheme();
  return (
    <span className={`inline-flex items-center gap-1 ${theme === 'dark' 
      ? 'bg-indigo-500/8 border-indigo-500/20 text-indigo-300' 
      : 'bg-indigo-100 border-indigo-300 text-indigo-700'} border rounded-full px-2 py-0.5 text-[0.68rem] font-medium`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, text }) {
  const { theme } = useTheme();
  return (
    <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
      <div className="text-4xl mb-3 opacity-50">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle }) {
  const { theme } = useTheme();
  return (
    <div className="mb-6">
      <h1 className={`text-2xl font-extrabold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} tracking-tight`}>{title}</h1>
      {subtitle && <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} mt-1`}>{subtitle}</p>}
    </div>
  );
}

export function SectionHeader({ title }) {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center justify-between mb-5 pb-3 ${theme === 'dark' ? 'border-[#1e2a45]' : 'border-gray-200'} border-b`}>
      <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>{title}</h2>
    </div>
  );
}

export function Input({ label, ...props }) {
  const { theme } = useTheme();
  return (
    <div>
      {label && <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>{label}</label>}
      <input {...props}
        className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark' 
          ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20' 
          : 'bg-white border-gray-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-100'} border text-sm focus:ring-1 outline-none transition-all ${props.className || ''}`} />
    </div>
  );
}

export function Select({ label, options, ...props }) {
  const { theme } = useTheme();
  return (
    <div>
      {label && <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>{label}</label>}
      <select {...props}
        className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
          ? 'bg-[#0a0f1e] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
          : 'bg-white border-gray-300 text-slate-900 focus:border-indigo-500'} border text-sm outline-none transition-all`}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o || 'Select...'}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 ';
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25',
    secondary: 'bg-transparent border border-[#1e2a45] text-slate-400 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-500/5',
    danger: 'bg-transparent border border-rose-500/20 text-rose-400 hover:bg-rose-500/10',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 hover:-translate-y-0.5',
  };
  return <button className={`${base}${variants[variant]} ${className}`} {...props}>{children}</button>;
}
