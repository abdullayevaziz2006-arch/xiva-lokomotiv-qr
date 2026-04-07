import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL, API_URL } from './apiConfig';

const socket = io(API_BASE_URL);

/**
 * Premium Kassir Panel - Vertical Top-Bottom Layout
 * Sales Section is always ON TOP.
 * History Table is always AT THE BOTTOM.
 */
const KassirPanel = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // Sales States
    const [selectedCarousels, setSelectedCarousels] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [error, setError] = useState('');

    // History & Search States
    const [recentTickets, setRecentTickets] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refundCarousels, setRefundCarousels] = useState([]);

    const [carousels, setCarousels] = useState([]);
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('kassirTheme') === 'dark');

    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('kassirTheme', newTheme ? 'dark' : 'light');
    };

    const fetchRecentTickets = async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${API_URL}/qrcodes/recent`);
            setRecentTickets(res.data);
        } catch (err) {
            console.error("Tarixni yuklashda xato:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        const fetchCarousels = async () => {
            try {
                const res = await axios.get(`${API_URL}/carousels`);
                setCarousels(res.data);
            } catch (err) {
                console.error("Karusellarni yuklashda xato:", err);
            }
        };
        fetchCarousels();
        fetchRecentTickets();

        // Real-time update when a QR is used
        socket.on('qr-used', () => {
            fetchRecentTickets();
        });

        return () => socket.off('qr-used');
    }, []);

    const toggleCarouselSelection = (id) => {
        if (selectedCarousels.includes(id)) {
            setSelectedCarousels(selectedCarousels.filter(item => item !== id));
        } else {
            setSelectedCarousels([...selectedCarousels, id]);
        }
    };

    const handleGenerate = async () => {
        if (selectedCarousels.length === 0) {
            setError("Iltimos, kamida bitta karuselni tanlang!");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/qrcodes/generate`, {
                carousels: selectedCarousels,
                createdBy: user ? user.id : 1,
                customerName: customerName || "Mijoz",
                customerPhone: customerPhone || ""
            });

            setGeneratedCode({
                ...response.data.qrCode,
                selectedNames: carousels.filter(c => selectedCarousels.includes(c.id)).map(c => c.name)
            });

            setCustomerName("");
            setCustomerPhone("");
            setSelectedCarousels([]);
            fetchRecentTickets();

            if (response.status === 207) {
                setError(response.data.message);
                setGeneratedCode(prev => ({ ...prev, hasErrors: true }));
            } else {
                setError("");
                setTimeout(() => window.print(), 350);
            }

        } catch (err) {
            setError(err.response?.data?.error || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const selectTicketForRefund = (ticket) => {
        setSearchResult(ticket);
        setSearchQuery(ticket.qrString);
        setRefundCarousels([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        setSearchResult(null);
        try {
            const res = await axios.get(`${API_URL}/qrcodes/search?query=${searchQuery}`);
            setSearchResult(res.data);
        } catch (err) {
            alert(err.response?.data?.error || "Topilmadi!");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRefund = async () => {
        if (refundCarousels.length === 0) {
            alert("Vozvrat uchun o'yingoh tanlang!");
            return;
        }
        try {
            setSearchLoading(true);
            await axios.post(`${API_URL}/qrcodes/refund`, {
                qrId: searchResult.id,
                carouselIds: refundCarousels
            });
            alert("Vozvrat muvaffaqiyatli!");
            setSearchResult(null);
            setSearchQuery('');
            fetchRecentTickets();
        } catch (err) {
            alert(err.response?.data?.error || "Vozvratda xatolik");
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className={`kassir-page ${isDarkMode ? 'dark-mode' : ''}`} style={{
            minHeight: '100vh',
            padding: '24px',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div className="kassir-container" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* HEADER */}
                <header className="kassir-header no-print" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 32px', 
                    borderRadius: '24px', 
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                    border: '1px solid transparent'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#2f54ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
                            🎡
                        </div>
                        <div>
                            <h1 className="brand-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Xiva Lokomotiv</h1>
                            <span style={{ fontSize: '0.75rem', color: '#2f54ff', fontWeight: '700', textTransform: 'uppercase' }}>Kassir Paneli</span>
                        </div>
                    </div>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <button 
                            onClick={toggleTheme}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                fontSize: '24px', 
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {isDarkMode ? '🌞' : '🌙'}
                        </button>
                        <div className="user-info" style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.7rem', color: '#999', display: 'block', fontWeight: '600' }}>MAS'UL KASSIR</span>
                            <span className="user-name" style={{ fontWeight: '800' }}>{user?.fullName}</span>
                        </div>
                        <button 
                            onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} 
                            className="btn-exit"
                            style={{ padding: '10px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', transition: '0.2s' }}
                        >
                            Chiqish
                        </button>
                    </div>
                </header>

                {/* --- VERTICAL LAYOUT START --- */}
                <main className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* TOP SECTION: SALES & SEARCH WRAPPER */}
                    <div className="kassir-main-card glass-card" style={{ 
                        borderRadius: '32px', 
                        padding: '32px', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.04)', 
                        display: 'flex',
                        gap: '40px',
                        flexWrap: 'wrap'
                    }}>
                        {/* 1. SALES FORM */}
                        <div className="sales-column" style={{ flex: '1.2', minWidth: '350px' }}>
                            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', fontWeight: '800' }}>Chipta Sotish</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#666', marginBottom: '8px' }}>Mijoz Ismi:</label>
                                    <input 
                                        type="text" 
                                        value={customerName} 
                                        onChange={e => setCustomerName(e.target.value)}
                                        placeholder="Ismni kiriting..."
                                        className="kassir-input"
                                        style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', fontSize: '1rem', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#666', marginBottom: '12px' }}>Karusellarni Tanlang:</label>
                                    
                                    {/* DESKTOP: BUTTONS */}
                                    <div className="carousel-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {carousels.map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => toggleCarouselSelection(c.id)}
                                                style={{
                                                    padding: '12px 24px',
                                                    borderRadius: '16px',
                                                    boxShadow: selectedCarousels.includes(c.id) ? '0 8px 15px rgba(47, 84, 255, 0.2)' : 'none',
                                                    border: '2px solid ' + (selectedCarousels.includes(c.id) ? '#2f54ff' : 'var(--border)')
                                                }}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* MOBILE: CUSTOM MULTI-SELECT STYLE */}
                                    <div className="carousel-select-mobile" style={{ display: 'none' }}>
                                        <div style={{ 
                                            width: '100%',
                                            padding: '14px', 
                                            borderRadius: '14px', 
                                            border: '2px solid #f0f2f7', 
                                            background: '#fff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            maxHeight: '200px',
                                            overflowY: 'auto'
                                        }}>
                                            {carousels.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => toggleCarouselSelection(c.id)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '10px',
                                                        background: selectedCarousels.includes(c.id) ? '#edf2ff' : '#fcfdfe',
                                                        border: '1px solid ' + (selectedCarousels.includes(c.id) ? '#2f54ff' : '#eee'),
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: '600', color: selectedCarousels.includes(c.id) ? '#2f54ff' : '#444' }}>{c.name}</span>
                                                    {selectedCarousels.includes(c.id) ? <span>✅</span> : <div style={{width: '18px', height: '18px', borderRadius: '50%', border: '1px solid #ddd'}}></div>}
                                                </div>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '8px', paddingLeft: '5px' }}>* Kerakli o'yingohlarni belgilang</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerate}
                                    disabled={loading || selectedCarousels.length === 0}
                                    style={{ 
                                        width: '100%', 
                                        padding: '18px 24px', 
                                        background: 'linear-gradient(135deg, #2f54ff 0%, #4062ff 100%)', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: '20px', 
                                        fontSize: '1.2rem', 
                                        fontWeight: '900', 
                                        cursor: 'pointer', 
                                        boxShadow: '0 15px 30px rgba(47, 84, 255, 0.25)',
                                        marginTop: '10px',
                                        transition: '0.2s'
                                    }}
                                >
                                    {loading ? "Sotilmoqda..." : "SOTISH & CHOP ETISH 🖨️"}
                                </button>
                                {error && <p style={{ color: '#f03e3e', fontSize: '0.9rem', fontWeight: '700', textAlign: 'center', margin: 0 }}>{error}</p>}
                            </div>
                        </div>

                        {/* 2. SEARCH & REFUND SECTION */}
                        <div className="search-column" style={{ flex: '0.8', minWidth: '320px', paddingLeft: '40px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '800' }}>Vozvrat & Qidiruv 🔍</h3>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="QR kod..."
                                    className="kassir-input"
                                    style={{ flex: 1, padding: '14px', borderRadius: '14px', fontSize: '0.9rem', outline: 'none' }}
                                />
                                <button onClick={handleSearch} style={{ padding: '14px 20px', background: '#1a1a1a', color: '#fff', borderRadius: '14px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Izlash</button>
                            </div>

                            {searchResult ? (
                                <div style={{ background: '#f8f9fc', borderRadius: '20px', padding: '20px', border: '1px solid #eef0f5' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#999', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>MIJOZ</span>
                                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1a1a1a' }}>{searchResult.customerName}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {searchResult.carousels.map(rel => (
                                            <div key={rel.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #eef0f5' }}>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {rel.status === 0 && (
                                                        <input type="checkbox" checked={refundCarousels.includes(rel.carouselId)} onChange={e => e.target.checked ? setRefundCarousels([...refundCarousels, rel.carouselId]) : setRefundCarousels(refundCarousels.filter(id => id !== rel.carouselId))} />
                                                    )}
                                                    <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{rel.carousel?.name}</span>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '900', padding: '4px 8px', borderRadius: '6px', background: rel.status === 1 ? '#ebfbee' : rel.status === -1 ? '#fff0f0' : '#edf2ff', color: rel.status === 1 ? '#37b24d' : rel.status === -1 ? '#f03e3e' : '#2f54ff' }}>
                                                    {rel.status === 1 ? "O'TILDI" : rel.status === -1 ? "BEKOR" : "KUTILMOQDA"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {searchResult.status !== -1 && (
                                        <button onClick={handleRefund} disabled={refundCarousels.length === 0} style={{ width: '100%', marginTop: '20px', padding: '14px', background: '#f03e3e', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer' }}>Vozvrat Qilish</button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px 0', border: '2px dashed #f0f2f7', borderRadius: '20px' }}>
                                    <p style={{ fontSize: '0.85rem', color: '#aaa', margin: 0 }}>QR kodni skanerlang yoki yozing</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BOTTOM SECTION: FULL-WIDTH HISTORY TABLE */}
                    <div className="history-card" style={{ 
                        borderRadius: '32px', 
                        padding: '32px', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.03)', 
                        border: '1px solid transparent' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '24px', background: '#2f54ff', borderRadius: '4px' }}></div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Oxirgi Sotuvlar Tarixi 📈</h3>
                            </div>
                            <button onClick={fetchRecentTickets} style={{ background: '#f8f9fc', border: 'none', color: '#2f54ff', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '10px' }}>Yangilash 🔄</button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f4f6f9', textAlign: 'left' }}>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>MIJOZ</th>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>VAQT</th>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>CHIPIBILAT</th>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>MIQDOR</th>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>HOLATI</th>
                                        <th style={{ padding: '16px 24px', color: '#666', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>AMAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTickets.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f8f9fb', transition: '0.2s' }} className="table-row">
                                            <td style={{ padding: '20px 24px', fontWeight: '800', color: '#1a1a1a', fontSize: '0.95rem' }}>{t.customerName}</td>
                                            <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#888', fontWeight: '500' }}>
                                                {new Date(t.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '20px 24px' }}>
                                                <code style={{ background: '#f5f7fa', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#2f54ff', fontWeight: '700' }}>{t.qrString}</code>
                                            </td>
                                            <td style={{ padding: '20px 24px' }}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {t.carousels.map(rel => (
                                                        <span key={rel.id} title={rel.carousel.name} style={{ width: '8px', height: '8px', borderRadius: '50%', background: rel.status === 1 ? '#37b24d' : rel.status === -1 ? '#f03e3e' : '#2f54ff' }}></span>
                                                    ))}
                                                    <span style={{ marginLeft: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#666' }}>{t.carousels.length} ta</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '20px 24px' }}>
                                                <span style={{ 
                                                    padding: '5px 12px', 
                                                    borderRadius: '25px', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: '900',
                                                    background: t.status === -1 ? '#fff0f0' : '#ebfbee',
                                                    color: t.status === -1 ? '#f03e3e' : '#37b24d'
                                                }}>
                                                    {t.status === -1 ? "BEKOR QILINGAN" : "AKTIV"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '20px 24px' }}>
                                                <button onClick={() => selectTicketForRefund(t)} style={{ background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', transition: '0.2s' }}>Vozvrat</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* PRINT OVERLAY */}
            {generatedCode && (
                <div id="print-section" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                    <div style={{ padding: '24px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '320px', margin: '0 auto', fontFamily: 'monospace' }}>
                        <h2 style={{ margin: '0 0 12px 0', fontSize: '22px', letterSpacing: '1px' }}>XIVA LOKOMOTIV</h2>
                        <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', width: '100%', padding: '12px 0', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ margin: '4px 0', fontSize: '18px' }}><b>{customerName || "Mijoz"}</b></p>
                        </div>
                        <ul style={{ margin: '0 0 24px 0', padding: 0, listStyle: 'none', width: '100%', fontSize: '15px' }}>
                            {generatedCode.selectedNames?.map((n, i) => <li key={i} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{n}</span>
                                <span>[TASDIQLANDI]</span>
                            </li>)}
                        </ul>
                        <div style={{ padding: '15px', background: '#fff' }}>
                            <QRCodeSVG value={generatedCode.qrString} size={200} level={"H"} />
                        </div>
                        <p style={{ marginTop: '20px', fontSize: '12px', fontWeight: 'bold' }}>KOD: {generatedCode.qrString}</p>
                        <p style={{ fontSize: '12px' }}>{new Date().toLocaleString()}</p>
                        <p style={{ fontSize: '10px', opacity: 0.7, marginTop: '20px', textAlign: 'center' }}>Chipta 24 soat amal qiladi.</p>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
                
                :root {
                    --bg-page: ${isDarkMode ? '#0b0e14' : '#f4f7fe'};
                    --bg-card: ${isDarkMode ? '#151921' : '#ffffff'};
                    --text-main: ${isDarkMode ? '#ffffff' : '#1a1a1a'};
                    --text-sub: ${isDarkMode ? '#a0aec0' : '#666666'};
                    --border: ${isDarkMode ? '#2d3748' : '#f0f2f7'};
                    --input-bg: ${isDarkMode ? '#1a202c' : '#fcfdfe'};
                    --table-hover: ${isDarkMode ? '#1c2331' : '#f7f9fd'};
                    --btn-exit-bg: ${isDarkMode ? '#2d1b1b' : '#fff5f5'};
                }

                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                .kassir-page {
                    background: var(--bg-page) !important;
                    color: var(--text-main);
                    transition: all 0.3s ease;
                }

                .kassir-header {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                }

                .brand-title { color: var(--text-main) !important; }
                .user-name { color: var(--text-main) !important; }
                
                .btn-exit {
                    background: var(--bg-card) !important;
                    color: #f03e3e !important;
                    border: 2px solid var(--btn-exit-bg) !important;
                }

                .glass-card {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                    color: var(--text-main);
                }

                .kassir-input {
                    background: var(--input-bg) !important;
                    border: 2px solid var(--border) !important;
                    color: var(--text-main) !important;
                }

                .kassir-input::placeholder { color: var(--text-sub); opacity: 0.7; }

                .table-row:hover { background-color: var(--table-hover) !important; }
                
                .history-card {
                    background: var(--bg-card) !important;
                    border: 1px solid var(--border) !important;
                }

                table th { color: var(--text-sub) !important; }
                table td { color: var(--text-main) !important; }

                @media screen and (max-width: 768px) {
                    .kassir-page { padding: 12px !important; }
                    .kassir-header { padding: 16px !important; flex-direction: column; gap: 12px; align-items: stretch !important; border-radius: 16px !important; }
                    .header-right { justify-content: space-between; display: flex; width: 100%; }
                    .carousel-buttons { display: none !important; }
                    .carousel-select-mobile { display: block !important; width: 100% !important; }
                    .kassir-main-card { padding: 20px !important; gap: 20px !important; border-radius: 20px !important; }
                    
                    /* FIXED: Explicitly handle columns on mobile to prevent overflow */
                    .sales-column, .search-column { 
                        min-width: unset !important; 
                        flex: 1 1 100% !important; 
                        padding: 0 !important;
                        border: none !important;
                    }
                    
                    .search-column {
                        border-top: 2px solid var(--border) !important;
                        padding-top: 24px !important;
                    }

                    input[type="text"], .kassir-input { width: 100% !important; }
                }

                @media print {
                    .no-print { display: none !important; }
                    body { visibility: hidden; }
                    #print-section { 
                        visibility: visible !important; 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        color: #000 !important;
                        background: #fff !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default KassirPanel;
