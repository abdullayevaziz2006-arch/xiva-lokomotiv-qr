import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Users, 
  Key, 
  LogOut, 
  RotateCcw, 
  PieChart, 
  Menu, 
  X,
  ShieldCheck,
  Smartphone,
  UserCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import '../../adminStyle.css';

const AdminLayout = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { fullName: 'Admin', role: 'admin' };

    const menuItems = [
        { path: '/admin', name: "Dashbord", icon: <LayoutDashboard size={20} /> },
        { path: '/admin/carousels', name: "O'yingohlar", icon: <Target size={20} /> },
        { path: '/admin/staff', name: "Ishchi Davomati", icon: <Users size={20} /> },
        { path: '/admin/cashiers', name: "Kassirlar", icon: <UserCircle size={20} /> },
        { path: '/admin/reports', name: "Hisobotlar", icon: <PieChart size={20} /> },
        { path: '/admin/terminals', name: "Terminallar", icon: <Smartphone size={20} /> }
    ];

    const todayDate = new Date().toLocaleDateString('uz-UZ', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="admin-layout outfit">
            {/* Mobile Overlay */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="icon">
                        <ShieldCheck size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="sidebar-logo-text outfit" style={{ textTransform: 'uppercase' }}>
                            {user.organizationName || 'SmartAccess'}
                        </div>
                        <div className="sidebar-logo-sub">Cloud Control Platform</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <NavLink 
                            key={item.path} 
                            to={item.path} 
                            end={item.path === '/admin' || item.path === '/'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={closeSidebar}
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="avatar outfit">{user.fullName.charAt(0).toUpperCase()}</div>
                    <div className="sidebar-footer-info">
                        <strong style={{ fontSize: '0.9rem', color: 'var(--admin-text-main)' }}>{user.fullName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'capitalize' }}>{user.role}</span>
                    </div>
                </div>
            </aside>
            
            {/* Main Wrapper */}
            <main className="admin-main">
                {/* 3 KUNLIK OGOHLANTIRISH BANNERI */}
                {user.remainingDays <= 3 && !user.trialExpired && (
                    <div style={{
                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        zIndex: 1500,
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                    }}>
                        <AlertTriangle size={18} />
                        DIQQAT: Demo muddatingiz {user.remainingDays} kundan keyin tugaydi! Tizimni saqlab qolish uchun to'lov qiling.
                    </div>
                )}

                {/* FULL LOCKDOWN OVERLAY */}
                {user.trialExpired && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'var(--bg-main)', opacity: 0.98, backdropFilter: 'blur(10px)',
                        zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--admin-text-main)'
                    }}>
                        <div className="fade-in" style={{ maxWidth: '500px', padding: '40px' }}>
                            <div style={{ background: 'var(--danger)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Lock size={40} color="white" />
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px' }}>Demo muddati tugadi</h1>
                            <p style={{ fontSize: '1.1rem', color: 'var(--admin-text-muted)', marginBottom: '40px' }}>
                                Sizning 15 kunlik demo hisobingiz {new Date(user.trialEndsAt).toLocaleDateString()} kuni yakunlangan. 
                                Tizimdan foydalanishni davom ettirish uchun SmartAccess qo'llab-quvvatlash xizmati bilan bog'laning.
                            </p>
                            <button className="btn-primary" style={{ background: 'var(--primary)', padding: '18px 40px', fontSize: '1.2rem' }}>TO'LOVNI AMALGA OSHIRISH</button>
                        </div>
                    </div>
                )}

                {/* Top Header */}
                <header className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button 
                            className="mobile-menu-btn"
                            style={{ display: 'none', background: 'var(--bg-sub)', border: 'none', padding: '8px', borderRadius: '10px', color: 'var(--text-main)' }}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="header-date outfit" style={{ color: 'var(--admin-text-muted)' }}>{todayDate}</div>
                    </div>
                    
                    <div className="header-actions">
                        <ThemeToggle />
                        <button className="icon-btn" style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '12px', border: '1px solid var(--admin-border)', color: 'var(--admin-text-main)' }} onClick={() => window.location.reload()}>
                            <RotateCcw size={18} />
                        </button>
                        <button className="btn-logout outfit" onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}>
                            <LogOut size={18} />
                            <span>Chiqish</span>
                        </button>
                    </div>
                </header>

                {/* Scrolled Content */}
                <div className="admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
