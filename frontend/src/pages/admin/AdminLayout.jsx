import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, Users, Key, LogOut, RotateCcw, PieChart, Menu, X } from 'lucide-react';
import '../../adminStyle.css';

const AdminLayout = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { fullName: 'Admin', role: 'admin' };

    const menuItems = [
        { path: '/admin', name: "Dashbord", icon: <LayoutDashboard size={20} /> },
        { path: '/chipta', name: "Chipta Sotish", icon: <div style={{ fontSize: '20px' }}>🎫</div> },
        { path: '/admin/carousels', name: "O'yingohlar", icon: <Target size={20} /> },
        { path: '/admin/cashiers', name: "Kassirlar", icon: <Users size={20} /> },
        { path: '/admin/reports', name: "Hisobot", icon: <PieChart size={20} /> },
        { path: '/admin/terminals', name: "Terminallar", icon: <Key size={20} /> }
    ];

    const todayDate = new Date().toLocaleDateString('uz-UZ', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="admin-layout">
            {/* Mobile Overlay */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="icon">
                        <Key size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="sidebar-logo-text">XIVA LOKOMOTIV</div>
                        <div className="sidebar-logo-sub">Bog'i nazorat tarmog'i</div>
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
                    <div className="avatar">{user.fullName.charAt(0).toUpperCase()}</div>
                    <div className="sidebar-footer-info">
                        <strong style={{ fontSize: '0.85rem' }}>{user.fullName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)', textTransform: 'capitalize' }}>{user.role}</span>
                    </div>
                </div>
            </aside>

            {/* Main Wrapper */}
            <main className="admin-main">
                {/* Top Header */}
                <header className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Hamburger tugmasi — faqat mobilda ko'rinadi */}
                        <button 
                            className="mobile-menu-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Menyu"
                        >
                            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="header-date">{todayDate}</div>
                    </div>
                    
                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => window.location.reload()}><RotateCcw size={20} /></button>
                        <button className="btn-logout" onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}>
                            <LogOut size={18} />
                            <span style={{ display: 'inline' }}>Chiqish</span>
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
