import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, QrCode, UtensilsCrossed, ListOrdered, ChefHat, Users, CalendarCheck, Mail, Globe } from 'lucide-react';

export function AdminHeader({ title, subtitle, action = null }) {
  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/tables', label: 'Tables & QR Codes', icon: QrCode },
    { to: '/admin/menu', label: 'Menu Items', icon: UtensilsCrossed },
    { to: '/admin/orders', label: 'Order History', icon: ListOrdered },
    { to: '/admin/staff', label: 'Staff', icon: Users },
    { to: '/admin/bookings', label: 'Website Bookings', icon: CalendarCheck },
    { to: '/admin/enquiries', label: 'Enquiries', icon: Mail },
    { to: '/admin/website', label: 'Website Settings', icon: Globe },
    { to: '/kitchen', label: 'Live Kitchen View', icon: ChefHat },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-6 pb-0 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/80 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
