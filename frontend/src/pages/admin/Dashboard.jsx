import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, CheckCircle, TrendingUp, ArrowUpRight, ArrowDownRight, Smartphone, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSold: 0,
        totalRefund: 0,
        activeNow: 0,
        terminalsTotal: 0,
        terminalsActive: 0,
        totalRevenue: 0,
        successRate: 100,
        totalRides: 0,
        usedRides: 0,
        remainingRides: 0,
        trialEndsAt: null,
        remainingDays: 0
    });
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get(`${API_URL}/reports/dashboard?organizationId=${user?.organizationId}`);
                setStats({
                    ...res.data,
                    trialEndsAt: user.trialEndsAt,
                    remainingDays: user.remainingDays
                });
            } catch(e) {
                console.error("Dashboard yuklanmadi", e);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
        
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fade-in outfit">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h1 className="page-title">Hush kelibsiz! 👋</h1>
                    <p className="page-subtitle" style={{ margin: 0, color: 'var(--admin-text-muted)' }}>SmartAccess — Tizim holati va jonli statistikalar.</p>
                </div>
                <div style={{ 
                    background: 'var(--card-bg)', 
                    padding: '10px 20px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 800,
                    color: 'var(--success)',
                    border: '1px solid var(--admin-border)'
                }}>
                    <span className="pulse" style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '50%' }}></span> LIVE TIZIM
                </div>
            </div>

            {/* SaaS TRIAL INFO */}
            <div style={{ 
                background: 'rgba(99, 102, 241, 0.05)', 
                border: '1px dashed var(--primary)', 
                borderRadius: '20px', 
                padding: '20px 32px', 
                marginBottom: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--admin-text-main)' }}>Demo Hisob Holati</div>
                        <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>Muddat: {stats.trialEndsAt ? new Date(stats.trialEndsAt).toLocaleDateString() : 'Aniqlanmagan'} gacha aktiv.</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Qolgan vaqt</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: stats.remainingDays <= 3 ? 'var(--danger)' : 'var(--primary)' }}>
                        {stats.remainingDays} kun
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
                    <div className="sc-header" style={{ color: 'rgba(255,255,255,0.8)' }}>Bugungi Sotuvlar</div>
                    <div className="sc-value" style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {loading ? '...' : stats.totalSold}
                        <ArrowUpRight size={32} style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: '10px' }}>
                        Barcha biletlar ko'rsatkichi
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="sc-header">Hozir Ichkarida <Activity size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--primary)' }}>{loading ? '...' : stats.activeNow}</div>
                    <div className="sc-sub">Bugungi faol mehmonlar</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <div className="sc-header">Bekor bo'lganlar <Users size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--danger)' }}>{loading ? '...' : stats.totalRefund}</div>
                    <div className="sc-sub">Qaytarilgan chiptalar</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="sc-header">Jami Tushum <TrendingUp size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--success)', fontSize: '1.8rem' }}>
                        {loading ? '...' : stats.totalRevenue?.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>sum</span>
                    </div>
                    <div className="sc-sub">Haqiqiy kirim miqdori</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="sc-header">Jami Bilet (Odam)</div>
                    <div className="sc-value" style={{ color: '#8b5cf6' }}>{loading ? '...' : stats.totalRides}</div>
                    <div className="sc-sub">Sotilgan jami o'rinlar</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="sc-header">Ishlatilgan (Scan)</div>
                    <div className="sc-value" style={{ color: '#f59e0b' }}>{loading ? '...' : stats.usedRides}</div>
                    <div className="sc-sub">Kirgan mehmonlar jami</div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="sc-header">Qolgan Navbatlar</div>
                    <div className="sc-value" style={{ color: '#10b981' }}>{loading ? '...' : stats.remainingRides}</div>
                    <div className="sc-sub">Hali ishlatilmagan biletlar</div>
                </div>

                <div className="stat-card">
                    <div className="sc-header">Faol Qurilmalar <Smartphone size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--admin-text-main)' }}>
                        {stats.terminalsActive}/{stats.terminalsTotal}
                    </div>
                    <div className="sc-sub">Terminallar holati</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div className="sc-header">Yillik O'sish Grafikasi <TrendingUp size={16} /></div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>+12% O'sish</div>
                    </div>
                    <div style={{ position: 'relative', height: '240px' }}>
                         <svg width="100%" height="240" preserveAspectRatio="none">
                            <path d="M0,200 Q100,50 200,120 T400,100 T600,60 T800,180" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
                            <circle cx="200" cy="120" r="6" fill="var(--primary)" />
                            <circle cx="400" cy="100" r="6" fill="var(--primary)" />
                            <circle cx="600" cy="60" r="6" fill="var(--primary)" />
                         </svg>
                    </div>
                </div>
                
                <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="sc-header" style={{ alignSelf: 'flex-start', marginBottom: '32px' }}>MUVAFFAQIYAT DARAJASI</div>
                    
                    <div style={{ 
                        width: '180px', 
                        height: '180px', 
                        borderRadius: '50%', 
                        background: `conic-gradient(var(--primary) ${stats.successRate}%, var(--bg-sub) 0)`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ 
                            width: '140px', 
                            height: '140px', 
                            borderRadius: '50%', 
                            background: 'var(--card-bg)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow)'
                        }}>
                            <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--primary)' }}>{loading ? '...' : stats.successRate}%</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--admin-text-muted)' }}>Muvaffaqiyat</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
