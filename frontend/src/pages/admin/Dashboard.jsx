import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, Clock, CheckCircle, TrendingUp, Terminal, Layers } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSold: 0,
        totalRefund: 0,
        activeNow: 0,
        terminalsTotal: 0,
        terminalsActive: 0,
        successRate: 100
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get(`${API_URL}/reports/dashboard`);
                setStats(res.data);
            } catch(e) {
                console.error("Dashboard yuklanmadi", e);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
        
        // Jonli effekt uchun har 30 sekunda yangilab turish mukin:
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h1 className="page-title">Tizim holati.</h1>
            <div className="page-subtitle">
                <span>Istirohat bog'i biletlari dardi va statistikasi (Jonli efir).</span>
                <span style={{color: 'var(--success)', fontWeight: 'bold'}}>● LIVE</span>
            </div>

            <div className="stats-grid top-row">
                <div className="stat-card" style={{ background: 'var(--sidebar-bg)' }}>
                    <div className="sc-header" style={{ color: 'white' }}>
                        Bugungi Vaziyat
                    </div>
                    <div>
                        <div style={{ color: 'white', fontSize: '1.2rem', marginBottom: '8px' }}>Chiptalar ko'rsatkichi</div>
                        <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--success)' }}>● Sotildi: {loading ? '...' : stats.totalSold}</span>
                            <span style={{ color: '#00ccff' }}>● Refund: {loading ? '...' : stats.totalRefund}</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="sc-header">Hozir ichkarida <Activity size={16} /></div>
                    <div className="sc-value" style={{color: 'var(--primary)'}}>{loading ? '...' : stats.activeNow}</div>
                    <div className="sc-sub">Bugungi kirib kelganlar (sof)</div>
                </div>

                <div className="stat-card">
                    <div className="sc-header">Bekor Qilinganlar <Users size={16} /></div>
                    <div className="sc-value" style={{color: 'var(--danger)'}}>{loading ? '...' : stats.totalRefund}</div>
                    <div className="sc-sub">Kassir tomonidan qaytarildi</div>
                </div>

                <div className="stat-card">
                    <div className="sc-header">Faol Apparatlar <CheckCircle size={16} /></div>
                    <div className="sc-value" style={{color: 'var(--success)'}}>
                        {stats.terminalsTotal > 0 ? Math.round((stats.terminalsActive / stats.terminalsTotal) * 100) : 0}%
                    </div>
                    <div className="sc-sub">{stats.terminalsActive}/{stats.terminalsTotal} ta o'yingoh faol ishlamoqda</div>
                </div>
            </div>

            {/* Graphs (Mocked with CSS for visual representation as requested) */}
            <div style={{ display: 'flex', gap: '20px' }}>
                <div className="stat-card" style={{ flex: 2 }}>
                     <div className="sc-header" style={{ marginBottom: '20px' }}>Oylik Hisobot Grapikasi <TrendingUp size={16} /></div>
                     
                     <div style={{ position: 'relative', height: '200px', borderBottom: '2px solid rgba(0,0,0,0.05)', borderLeft: '2px solid rgba(0,0,0,0.05)' }}>
                         {/* Fake CSS curve logic, just drawing some shapes for demo since we don't have chart.js yet */}
                         <svg width="100%" height="200" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
                            <path d="M0,150 Q100,50 200,100 T400,120 T600,60 T800,180" fill="none" stroke="var(--primary)" strokeWidth="4" />
                            <circle cx="200" cy="100" r="4" fill="var(--primary)" />
                            <circle cx="400" cy="120" r="4" fill="var(--primary)" />
                            <circle cx="600" cy="60" r="4" fill="var(--primary)" />
                         </svg>
                     </div>
                </div>
                
                <div className="stat-card" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <div className="sc-header" style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>O'TISH FOIZI</div>
                    
                    {/* Circle diagram CSS hack */}
                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: `conic-gradient(var(--sidebar-bg) ${stats.successRate}%, #eee 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--sidebar-bg)' }}>{loading ? '...' : stats.successRate}%</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)' }}>MUVAFFAQIYAT</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
