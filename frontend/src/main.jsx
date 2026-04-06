import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import KassirPanel from './KassirPanel'

// Admin Layout va Pages
import Login from './pages/auth/Login'
import ProtectedRoute from './pages/auth/ProtectedRoute'

import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Terminals from './pages/admin/Terminals'
import Carousels from './pages/admin/Carousels'
import Cashiers from './pages/admin/Cashiers'
import Reports from './pages/admin/Reports'

// Yo'naltirish yordamchisi: Rolga qarab kerakli sahifaga yuboradi
const RootRedirect = () => {
  const userString = localStorage.getItem('user');
  if (!userString) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(userString);
  if (user.role === 'admin' || user.role === 'tadbirkor') {
    return <Navigate to="/admin" replace />;
  }
  return <KassirPanel />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Avtorizatsiya Oynasi */}
        <Route path="/login" element={<Login />} />

        {/* Asosiy Yo'naltirish (Rolga qarab) */}
        <Route element={<ProtectedRoute allowedRoles={['kassir', 'admin', 'tadbirkor']} />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/chipta" element={<KassirPanel />} />
        </Route>
        
        {/* Admin Router (Faqat Admin va Tadbirkor kira oladi) */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'tadbirkor']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="carousels" element={<Carousels />} />
            <Route path="cashiers" element={<Cashiers />} />
            <Route path="reports" element={<Reports />} />
            
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
