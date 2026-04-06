import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Activity, Users, Clock, CheckCircle, TrendingUp, Terminal, Layers, PieChart, AlertTriangle, Download } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const [resCarousels, resCustomers] = await Promise.all([
                axios.get(`${API_URL}/reports/carousels`),
                axios.get(`${API_URL}/reports/customers`)
            ]);
            setReports(resCarousels.data);
            setCustomers(resCustomers.data);
        } catch (error) {
            console.error("Hisobotni yuklashda xato:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    // Global hisoblashlar
    const totalSales = reports.reduce((acc, curr) => acc + curr.totalIssued, 0);
    const totalRefunds = reports.reduce((acc, curr) => acc + curr.refunded, 0);
    const topCarousel = reports.length > 0 ? reports[0] : null;

    // Excelga eksport qilish (Karusellar)
    const exportToExcelCarousels = () => {
        const worksheet = XLSX.utils.json_to_sheet(reports.map(r => ({
            "O'yingoh Nomi": r.name,
            "Tadbirkor": r.entrepreneurName,
            "Sotilgan Biletlar (Jami)": r.totalIssued,
            "Minganlar (Skanerlangan)": r.usedCount,
            "Vozvrat (Bekor qilingan)": r.refunded
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Karusel_Hisoboti");
        XLSX.writeFile(workbook, `Xiva_Karusel_Stats_${new Date().toLocaleDateString()}.xlsx`);
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
        XLSX.writeFile(workbook, `Xiva_Mijozlar_Jurnali_${new Date().toLocaleDateString()}.xlsx`);
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
                    <div className="sc-header">Jami Biletlar (Qo'lga qlingan pul) <PieChart size={16} /></div>
                    <div className="sc-value" style={{ color: 'var(--text-main)' }}>{totalSales} ta</div>
                    <div className="sc-sub">Bugungacha sotilgan hamma kodlar</div>
                </div>

                <div className="stat-card" style={{ border: '1px solid rgba(255,77,79,0.3)' }}>
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
                            <th style={{ textAlign: 'center' }}>Sotildi (Jami)</th>
                            <th style={{ textAlign: 'center' }}>Minganlar ✅</th>
                            <th style={{ textAlign: 'center' }}>Vozvrat ❌</th>
                            <th style={{ textAlign: 'right' }}>Sof foyda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" style={{ textAlign: 'center' }}>Hisob-kitob qilinmoqda...</td></tr> : 
                        reports.map((r, index) => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600 }}>
                                    {index === 0 && <span style={{ color: 'gold', marginRight: '5px' }}>👑</span>}
                                    {r.name}
                                </td>
                                <td>{r.entrepreneurName}</td>
                                <td style={{ textAlign: 'center' }}>{r.totalIssued} ta</td>
                                <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>{r.usedCount} ✅</td>
                                <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{r.refunded} ❌</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {r.validNet} ta
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
                    <button onClick={exportToExcelCustomers} className="btn" style={{ background: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Jurnal yuklanmoqda...</td></tr> : 
                        customers.map((c, index) => (
                            <tr key={c.id}>
                                <td>{index + 1}</td>
                                <td>
                                    <strong>{c.customerName}</strong><br/>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.customerPhone}</span>
                                </td>
                                <td>
                                    {c.carousels.length > 0 ? (
                                        <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.9rem' }}>
                                            {c.carousels.map((rel, i) => (
                                                <li key={i} style={{ 
                                                    color: rel.status === -1 ? '#f03e3e' : rel.status === 1 ? '#37b24d' : 'inherit', 
                                                    textDecoration: rel.status === -1 ? 'line-through' : 'none',
                                                    fontWeight: rel.status === 1 ? '700' : 'normal'
                                                }}>
                                                    {rel.name} 
                                                    {rel.status === -1 && ' (Vozvrat ❌)'}
                                                    {rel.status === 1 && ' (Kirildi ✅)'}
                                                    {rel.status === 0 && ' (Kutilmoqda)'}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>Mavjud emas</span>
                                    )}
                                </td>
                                <td>
                                    {c.status === 1 ? (
                                        <span style={{ color: 'white', background: 'var(--success)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>MUVAFFARIYATLI</span>
                                    ) : c.status === -1 ? (
                                        <span style={{ color: 'white', background: 'var(--danger)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>BEKOR QILINGAN</span>
                                    ) : (
                                        <span style={{ color: 'white', background: 'orange', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>KUTILMOQDA</span>
                                    )}
                                </td>

                                <td>{c.cashierName}<br/><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span></td>
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
