import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export function LoginPage() {
  const { login, currentUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fromPath = location.state?.from?.pathname;
  const isUnauthorized = location.state?.unauthorized;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      showToast('Signed in successfully!', 'success');

      if (fromPath) {
        navigate(fromPath, { replace: true });
      } else if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/kitchen', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast(err.message || 'Could not sign in. Please check your email and password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Already signed in (login is remembered on this device): skip the form.
  // Not when bounced here for lacking admin rights, so they can switch account.
  if (!authLoading && currentUser && !isUnauthorized && !loading) {
    return <Navigate to={fromPath || '/staff'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-950 relative overflow-hidden">
      

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Logo */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="hover:opacity-80 transition-opacity"
            aria-label="Junio 8 Café home"
          >
            <img src="/brand/junio8-monogram.webp" alt="" width="390" height="850" className="h-24 w-auto" />
          </Link>
        </div>

        <h2 className="mt-6 text-center text-4xl font-display text-slate-950">
          Staff & Kitchen Portal
        </h2>
        <p className="mt-2 text-center text-sm font-light text-slate-600">
          Enter your staff email and password to access the dashboard
        </p>

        {isUnauthorized && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            You need admin privileges to access that section.
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-paper py-8 px-6 sm:px-8 shadow-[0_30px_60px_-40px_rgba(20,20,20,0.35)] border border-slate-200 space-y-6">
          
          {/* Pure Email / Password Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-600 mb-2">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@junio8.com"
                  className="w-full pl-10 pr-4 py-3 border border-transparent bg-slate-50 text-slate-950 text-sm focus:border-amber-600 focus:bg-white focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-transparent bg-slate-50 text-slate-950 text-sm focus:border-amber-600 focus:bg-white focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-950 hover:bg-brand-600 active:scale-[0.99] text-slate-50 text-[11px] uppercase tracking-[0.25em] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-200">
            <Link
              to="/"
              className="text-xs text-slate-600 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Menu</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
