import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { MenuPage } from './pages/customer/MenuPage';
import { CartPage } from './pages/customer/CartPage';
import { OrderStatusPage } from './pages/customer/OrderStatusPage';
import { KitchenDashboard } from './pages/kitchen/KitchenDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminTables } from './pages/admin/AdminTables';
import { AdminMenu } from './pages/admin/AdminMenu';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminStaff } from './pages/admin/AdminStaff';
import { LoginPage } from './pages/auth/LoginPage';
import { StaffHome } from './pages/staff/StaffHome';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Landing & Demo */}
              <Route path="/" element={<LandingPage />} />

              {/* Public Customer Table Ordering Flow (No login required) */}
              <Route path="/order/:tableId" element={<MenuPage />} />
              <Route path="/order/:tableId/cart" element={<CartPage />} />
              <Route path="/order/:tableId/status/:orderId" element={<OrderStatusPage />} />

              {/* Staff Authentication */}
              <Route path="/login" element={<LoginPage />} />
              {/* Installed-app start page: routes staff to admin or kitchen */}
              <Route path="/staff" element={<StaffHome />} />

              {/* Kitchen Live Display (Kitchen & Admin roles) */}
              <Route
                path="/kitchen"
                element={
                  <ProtectedRoute requiredRole="kitchen">
                    <KitchenDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Panel (Admin role only) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tables"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTables />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/menu"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminMenu />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/staff"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminStaff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
