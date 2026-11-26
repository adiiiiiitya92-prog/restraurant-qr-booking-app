import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ChefHat,
  ShieldCheck,
  LogOut,
  Sparkles,
  QrCode,
  Layers,
  Flame,
  Download,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { BRAND } from '../../config/brand';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function Navbar({ tableId = null, tableNumber = null }) {
  const { currentUser, userRole, logout, isFirebaseConfigured } = useAuth();
  const { totalItems } = useCart();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { canInstall, promptInstall } = useInstallPrompt();

  const restaurantName = BRAND.shortName;
  const isCustomerFlow = location.pathname.startsWith('/order');
  const isAdminFlow = location.pathname.startsWith('/admin');
  const isKitchenFlow = location.pathname.startsWith('/kitchen');
  const isLoginPage = location.pathname === '/login';
  const isStaffArea = isAdminFlow || isKitchenFlow;

  return (
    <header className="sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src="/brand/junio8-monogram.webp"
                  alt=""
                  className="h-9 w-auto"
                  width="41"
                  height="90"
                />
              </div>
              <div>
                <span className="text-xl font-display text-slate-950 dark:text-slate-50 block leading-none">
                  {restaurantName}
                </span>
                <span className="text-[9px] font-normal text-amber-600 dark:text-amber-300 tracking-[0.35em] uppercase">
                  {BRAND.tagline}
                </span>
              </div>
            </Link>

            {/* Table Number Badge if on customer page */}
            {tableNumber && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                Table #{tableNumber}
              </div>
            )}
          </div>

          {/* Navigation Links & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Install as an app (staff only; guests just scan and order) */}
            {canInstall && !isCustomerFlow && (currentUser || isLoginPage) && (
              <button
                onClick={async () => {
                  const outcome = await promptInstall();
                  if (outcome === 'accepted') showToast('Junio 8 installed. Open it from your home screen.', 'success');
                }}
                title="Install Junio 8 as an app on this device"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-950 hover:bg-slate-950 hover:text-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}
            
            {/* Customer Cart Button (shown on /order/:tableId) */}
            {isCustomerFlow && tableId && (
              <button
                onClick={() => navigate(`/order/${tableId}/cart`)}
                className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02]"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-extrabold bg-white text-brand-600 rounded-full shadow-sm">
                    {totalItems}
                  </span>
                )}
              </button>
            )}

            {/* Staff Area Controls (Only shown inside /admin or /kitchen when logged in) */}
            {currentUser && isStaffArea && (
              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <Link
                    to="/admin"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isAdminFlow
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                {(userRole === 'kitchen' || userRole === 'admin') && (
                  <Link
                    to="/kitchen"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isKitchenFlow
                        ? 'bg-amber-600 text-white'
                        : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100'
                    }`}
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Kitchen Live</span>
                  </Link>
                )}

                <button
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  title="Logout"
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Already signed in but outside the staff area: go back to it */}
            {currentUser && !isStaffArea && !isCustomerFlow && !isLoginPage && (
              <Link
                to="/staff"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-brand-600 rounded-lg border border-slate-200 hover:border-brand-500 transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Staff Login Link when signed out, outside staff area and not on login page */}
            {!currentUser && !isStaffArea && !isCustomerFlow && !isLoginPage && (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
