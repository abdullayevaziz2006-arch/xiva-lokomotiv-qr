import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Activity, Users, Clock, CheckCircle, TrendingUp, Terminal, Layers, PieChart, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user'));

    const fetchReports = async () => {
        try {
            setLoading(true);
            const [resCarousels, resCustomers] = await Promise.all([
                axios.get(`${API_URL}/reports/carousels?organizationId=${user?.organizationId}`),
                axios.get(`${API_URL}/reports/customers?organizationId=${user?.organizationId}`)
            ]);
            setReports(resCarousels.data);
            setCustomers(resCustomers.data);
        } catch (error) {
            console.error("Hisobotni yuklashda xato:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (qrId) => {
        try {
            const res = await axios.post(`${API_URL}/qrcodes/${qrId}/retry`);
            alert("Muvaffaqiyatli: Terminalga qayta yuklandi!");
        } catch (error) {
            console.error("Retry xatosi:", error);
            alert("Xatolik: Terminal bilan bog'lanishda muammo.");
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Global hisoblashlar
    const totalSales = reports.reduce((acc, curr) => acc + curr.totalIssued, 0);
    const totalRefunds = reports.reduce((acc, curr) => acc + curr.refunded, 0);
    const totalRevenue = reports.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    const topCarousel = reports.length > 0 ? reports[0] : null;

    // Excelga eksport qilish (Karusellar)
    const exportToExcelCarousels = () => {
        const worksheet = XLSX.utils.json_to_sheet(reports.map(r => ({
            "O'yingoh Nomi": r.name,
            "Tadbirkor": r.entrepreneurName,
            "Sotilgan Biletlar (Jami)": r.totalIssued,
            "Minganlar (Skanerlangan)": r.usedCount,
            "Vozvrat (Bekor qilingan)": r.refunded,
            "Sof Foyda (UZS)": r.revenue
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Karusel_Hisoboti");
        const orgName = user?.organizationName || 'SmartAccess';
        XLSX.writeFile(workbook, `${orgName}_Karusel_Stats_${new Date().toLocaleDateString()}.xlsx`);
    };

    // Excelga eksport qilish (Mijozlar)
    const exportToExcelCustomers = () => {
        const worksheet = XLSX.utils.json_to_sheet(customers.map(c => ({
            "Mijoz Ismi": c.customerName,
            "Telefon": c.customerPhone,
            "Karusellar": c.carousels.map(rel => rel.name).join(', '),
            "Holati": c.status === 1 ? "Muvaffaqiyatli" : c.status === -1 ? "Bekor qilingan" : "Kutilmoqda",
            "Sana": new Date(c.createdAt).toLocaleString()
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
        const orgName = user?.organizationName || 'SmartAccess';
        XLSX.writeFile(workbook, `${orgName}_Mijozlar_Jurnali_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div>
            <h1 className="page-title">Moliyaviy Hisobotlar.</h1>
            <div className="page-subtitle">Kafedra va Tadbirkorlar uchun Karusellar iqtisodi (Analitika).</div>

            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="stat-card" style={{ background: 'var(--primary)' }}>
                    <div className="sc-header" style={{ color: 'white' }}>Eng Ommabop O'yingoh <TrendingUp size={16} /></div>
                    <div className="sc-value" style={{ color: 'white', fontSize: '1.5rem', marginTop: '20px' }}>
                        {topCarousel ? topCarousel.name : "Noma'lum"}
                    </div>
                    <div className="sc-sub" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {topCarousel ? `${topCarousel.validNet} ta sof tashrifchi` : "Hali bilet sotilmagan"}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="sc-header">Jami Tushum (Haqiqiy foyda) <PieChart size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--success)' }}>{totalRevenue.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>UZS</span></div>
                    <div className="sc-sub">Barcha o'yingohlardan tushgan sof pul</div>
                </div>

                <div className="stat-card" style={{ border: '1px solid var(--danger)', opacity: 0.9 }}>
                    <div className="sc-header" style={{ color: 'var(--danger)' }}>Brak / Qaytarilganlar <AlertTriangle size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--danger)' }}>{totalRefunds} ta</div>
                    <div className="sc-sub">Vozvrat orqali qoplonmay qolganlar</div>
                </div>
            </div>

            <div className="admin-table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>O'yingohlar Kesimida 📊</h3>
                    <button onClick={exportToExcelCarousels} className="btn" style={{ background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Download size={16}/> Excelga yuklash
                    </button>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>O'yingoh Nomi</th>
                            <th>Mas'ul Tadbirkor</th>
                            <th style={{ textAlign: 'center' }}>Sotildi (Odam)</th>
                            <th style={{ textAlign: 'center' }}>Minganlar ✅</th>
                            <th style={{ textAlign: 'center' }}>Qolgan Navbatlar ⏳</th>
                            <th style={{ textAlign: 'center' }}>Vozvrat ❌</th>
                            <th style={{ textAlign: 'right' }}>Sof foyda (UZS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="7" style={{ textAlign: 'center' }}>Hisob-kitob qilinmoqda...</td></tr> : 
                        reports.map((r, index) => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600 }}>
                                    {index === 0 && <span style={{ color: 'gold', marginRight: '5px' }}>👑</span>}
                                    {r.name}
                                </td>
                                <td>{r.entrepreneurName}</td>
                                <td style={{ textAlign: 'center' }}>{r.totalIssued} ta</td>
                                <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>{r.usedCount} ✅</td>
                                <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: '700' }}>{r.remaining} ⏳</td>
                                <td style={{ textAlign: 'center', color: 'var(--admin-text-muted)' }}>{r.refunded} ❌</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)', fontSize: '1.1rem' }}>
                                    {r.revenue?.toLocaleString()} sum
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && !loading && <tr><td colSpan="6" style={{textAlign: 'center'}}>Bazangiz hozircha bo'sh!</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="admin-table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Mijozlar Jurnali 📋</h3>
                    <button onClick={exportToExcelCustomers} className="btn-primary" style={{ background: 'var(--admin-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={16}/> Jurnalni Excelga olish
                    </button>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>TR</th>
                            <th>Mijoz FISh & Telefon</th>
                            <th>Qaysi O'yingohlarga kirdi?</th>
                            <th>Holati</th>
                            <th>Kassir xodim</th>
                            <th style={{ textAlign: 'center' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Jurnal yuklanmoqda...</td></tr> : 
                        customers.map((c, index) => (
                            <tr key={c.id}>
                                <td>{index + 1}</td>
                                <td>
                                    <strong>{c.customerName}</strong><br/>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>{c.customerPhone}</span>
                                </td>
                                <td>
                                    {c.carousels.length > 0 ? (
                                        <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.9rem' }}>
                                            {c.carousels.map((rel, i) => (
                                                <li key={i} style={{ 
                                                    color: rel.status === -1 ? 'var(--danger)' : rel.status === 1 ? 'var(--success)' : 'inherit', 
                                                    textDecoration: rel.status === -1 ? 'line-through' : 'none',
                                                    fontWeight: rel.status === 1 ? '700' : 'normal',
                                                    opacity: rel.status === -1 ? 0.6 : 1
                                                }}>
                                                    {rel.name} 
                                                    {rel.status === -1 && ' (Vozvrat ❌)'}
                                                    {rel.status === 1 && ' (Kirildi ✅)'}
                                                    {rel.status === 0 && ' (Kutilmoqda)'}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span style={{ color: 'var(--admin-text-muted)' }}>Mavjud emas</span>
                                    )}
                                </td>
                                <td>
                                    {c.status === 1 ? (
                                        <span className="status-pill success">MUVAFFARIYATLI</span>
                                    ) : c.status === -1 ? (
                                        <span className="status-pill danger">BEKOR QILINGAN</span>
                                    ) : (
                                        <span className="status-pill warning">KUTILMOQDA</span>
                                    )}
                                </td>

                                <td>{c.cashierName}<br/><span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleRetry(c.id)}
                                        className="btn-sync"
                                        title="Terminalga qayta yuklash"
                                        style={{ 
                                            background: 'rgba(139, 92, 246, 0.1)', 
                                            border: '1px solid #8b5cf6', 
                                            color: '#8b5cf6',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            margin: '0 auto'
                                        }}
                                    >
                                        <RefreshCw size={14} /> Sync
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && !loading && <tr><td colSpan="5" style={{textAlign: 'center'}}>Mijozlar tarixi bo'sh</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;
