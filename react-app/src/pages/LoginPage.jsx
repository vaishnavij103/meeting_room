import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { login, register, resetPassword as resetPasswordApi } from '../api';
import logo from "../assets/Apexon_id6ht3QYLO_0.png";
import { Visibility, VisibilityOff } from '@mui/icons-material';

const DEPARTMENTS = ['', 'Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Legal', 'Support', 'Other'];

export default function LoginPage() {
  const { user, loginUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetConfirmPwd, setResetConfirmPwd] = useState('');

  if (user) { navigate('/', { replace: true }); return null; }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      loginUser(u);
      navigate('/');
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password.' : (err.detail || err.message));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!regName.trim()) { setError('Full name is required.'); return; }
    if (!regEmail.trim() || !regEmail.includes('@')) { setError('Valid email is required.'); return; }
    if (!regPassword || regPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
    setLoading(true);
    try {
      const u = await register({ name: regName.trim(), email: regEmail.trim(), password: regPassword, department: regDept });
      loginUser(u);
      navigate('/');
    } catch (err) {
      setError(err.status === 409 ? 'Email already registered. Please login.' : (err.detail || err.message));
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!resetEmail.trim() || !resetEmail.includes('@')) { setError('Valid email is required.'); return; }
    if (!resetPwd || resetPwd.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (resetPwd !== resetConfirmPwd) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPasswordApi(resetEmail.trim(), resetPwd);
      setSuccessMessage('Password reset successfully. Please sign in.');
      setForgotMode(false);
      setResetEmail('');
      setResetPwd('');
      setResetConfirmPwd('');
    } catch (err) {
      setError(err.status === 404 ? 'No account found for that email.' : (err.detail || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#080b14]' : 'bg-gray-50'}`}>
      <style>
        {`
          @keyframes subtle-ping {
            0% { transform: scale(1); opacity: 0.3; }
            100% { transform: scale(1.15); opacity: 0; }
          }
          .animate-subtle-ping {
            animation: subtle-ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
        `}
      </style>
      {/* LEFT PANE - Branding / Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 items-center justify-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-white blur-3xl mix-blend-overlay"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-indigo-300 blur-3xl mix-blend-overlay"></div>
          <div className="absolute top-[40%] left-[60%] w-72 h-72 rounded-full bg-purple-400 blur-3xl mix-blend-overlay"></div>
        </div>
        <div className="relative z-10 text-center px-12 text-white animate-fade-up">
          <div className="relative inline-flex items-center justify-center mb-8 group">
            <div className="absolute inset-0 rounded-[2rem] bg-white animate-subtle-ping pointer-events-none"></div>
            <div className="relative inline-flex items-center justify-center px-8 py-5 rounded-[2rem] bg-white/95 backdrop-blur-md shadow-2xl transition-transform group-hover:scale-105 duration-500 border border-white/20">
              <img
                src={logo}
                alt="Apexon Logo"
                className="w-full max-w-[200px] h-auto object-contain"
              />
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-5 tracking-tight">RoomBook</h1>
          <p className="text-lg text-indigo-100 max-w-md mx-auto leading-relaxed">
            The intelligent workspace management solution. Book meeting rooms, coordinate with your team, and optimize your office space effortlessly.
          </p>
        </div>
      </div>

      {/* RIGHT PANE - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md animate-fade-up delay-100">

          {/* Mobile-only Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-5 group">
              <div className={`absolute inset-0 rounded-2xl ${theme === 'dark' ? 'bg-indigo-400' : 'bg-indigo-500'} animate-subtle-ping pointer-events-none`}></div>
              <div className="relative inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white shadow-xl shadow-indigo-500/10 border border-gray-100 transition-transform group-hover:scale-105 duration-300">
                <img
                  src={logo}
                  alt="Apexon Logo"
                  className="w-full max-w-[150px] h-auto object-contain"
                />
              </div>
            </div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
              RoomBook
            </h1>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Meeting Room Booking System</p>
          </div>

          <div className={`${theme === 'dark'
            ? 'bg-[#0f1420] border-[#1e2a45] shadow-[0_0_40px_rgba(0,0,0,0.3)]'
            : 'bg-white border-gray-100 shadow-2xl shadow-indigo-500/5'
            } border rounded-3xl p-8`}>

            <h2 className={`text-xl font-bold mb-6 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {forgotMode ? 'Reset your password' : (tab === 'login' ? 'Welcome back' : 'Create an account')}
            </h2>

            {forgotMode ? (
              <div className="flex items-center justify-between mb-8">
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter the email for your account and choose a new password.
                </p>
                <button type="button" onClick={() => { setForgotMode(false); setError(''); setSuccessMessage(''); }}
                  className="text-sm text-indigo-500 hover:text-indigo-600 font-semibold focus:outline-none">
                  ← Back to login
                </button>
              </div>
            ) : (
              <div className={`flex gap-1 mb-8 ${theme === 'dark' ? 'bg-[#080b14]' : 'bg-gray-50'} rounded-xl p-1.5 border ${theme === 'dark' ? 'border-[#1e2a45]' : 'border-gray-100'}`}>
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(''); setSuccessMessage(''); setForgotMode(false); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === t
                      ? theme === 'dark' ? 'bg-[#1e2a45] text-indigo-300 shadow-sm' : 'bg-white text-indigo-600 shadow-sm border border-gray-200/50'
                      : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    {t === 'login' ? '🔑 Login' : '📝 Register'}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className={`mb-5 px-4 py-3 rounded-xl ${theme === 'dark'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-700'
                } border text-sm`}>
                ❌ {error}
              </div>
            )}

            {successMessage && (
              <div className={`mb-5 px-4 py-3 rounded-xl ${theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                } border text-sm`}>
                ✅ {successMessage}
              </div>
            )}

            {forgotMode && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Email</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@apexon.com"
                    className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                      } border text-sm focus:ring-1 outline-none transition-all`} />
                </div>
                <div className="relative">
                  <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>New Password</label>
                  <input type={showRegPassword ? 'text' : 'password'} value={resetPwd} onChange={e => setResetPwd(e.target.value)}
                    placeholder="Min 4 characters"
                    className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                      } border text-sm focus:ring-1 outline-none transition-all`} />
                  <button type="button" onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3 top-[30px] flex items-center text-slate-500 hover:text-slate-700 focus:outline-none" title={showRegPassword ? 'Hide password' : 'Show password'}>
                    {showRegPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                  </button>
                </div>
                <div className="relative">
                  <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Confirm Password</label>
                  <input type={showRegPassword ? 'text' : 'password'} value={resetConfirmPwd} onChange={e => setResetConfirmPwd(e.target.value)}
                    placeholder="Repeat your new password"
                    className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                      } border text-sm focus:ring-1 outline-none transition-all`} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:transform-none">
                  {loading ? '⏳ Resetting password...' : '🔐 Reset Password'}
                </button>
              </form>
            )}
            {!forgotMode && tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@apexon.com"
                    className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                      } border text-sm focus:ring-1 outline-none transition-all`} />
                </div>
                <div className="relative">
                  <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Password</label>
                  <input type={showLoginPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                      ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                      } border text-sm focus:ring-1 outline-none transition-all`} />
                  <button type="button" onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-[38px] flex items-center text-slate-500 hover:text-slate-700 focus:outline-none" title={showLoginPassword ? 'Hide password' : 'Show password'}>
                    {showLoginPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span></span>
                  <button type="button" onClick={() => { setForgotMode(true); setError(''); setSuccessMessage(''); }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 focus:outline-none">
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:transform-none">
                  {loading ? '⏳ Signing in...' : '🔑 Sign In'}
                </button>
              </form>
            )}
            {!forgotMode && tab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Full Name</label>
                    <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                      placeholder="Alex Johnson"
                      className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                        ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                        } border text-sm focus:ring-1 outline-none transition-all`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Email</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                      placeholder="you@apexon.com"
                      className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                        ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                        } border text-sm focus:ring-1 outline-none transition-all`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Password</label>
                    <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                        ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20'
                        : 'bg-gray-50 border-gray-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                        } border text-sm focus:ring-1 outline-none transition-all`} />
                    <button type="button" onClick={() => setShowRegPassword((prev) => !prev)}
                      className="absolute right-3 top-[38px] flex items-center text-slate-500 hover:text-slate-700 focus:outline-none" title={showRegPassword ? 'Hide password' : 'Show password'}>
                      {showRegPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </button>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-wider mb-1.5`}>Department</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl ${theme === 'dark'
                        ? 'bg-[#080b14] border-[#1e2a45] text-slate-100 focus:border-indigo-500'
                        : 'bg-gray-50 border-gray-200 text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                        } border text-sm outline-none transition-all`}>
                      <option value="">Select...</option>
                      {DEPARTMENTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:transform-none">
                  {loading ? '⏳ Creating account...' : '📝 Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
