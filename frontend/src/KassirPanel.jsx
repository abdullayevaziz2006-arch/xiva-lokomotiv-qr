import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL, API_URL } from './apiConfig';

const socket = io(API_BASE_URL);

const KassirPanel = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // Generatsiya statelari
    const [selectedCarousels, setSelectedCarousels] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [error, setError] = useState('');

    // Tarix va Qidiruv statelari
    const [recentTickets, setRecentTickets] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refundCarousels, setRefundCarousels] = useState([]);

    const [carousels, setCarousels] = useState([]);

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
                setTimeout(() => window.print(), 300);
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
        <div className="kassir-page" style={{
            background: '#f8f9fc',
            minHeight: '100vh',
            padding: '24px',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* HEADER */}
                <div className="no-print" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: '#fff', 
                    padding: '16px 28px', 
                    borderRadius: '20px', 
                    boxShadow: '0 10px 25px rgba(47, 84, 255, 0.05)',
                    border: '1px solid #f0f2f7'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'linear-gradient(135deg, #2f54ff 0%, #4062ff 100%)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '20px' }}>🎡</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1a1a1a' }}>Xiva Lokomotiv <span style={{ color: '#2f54ff' }}>Kassa</span></h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#999', display: 'block' }}>Hush kelibsiz!</span>
                            <span style={{ fontWeight: '700' }}>{user?.fullName}</span>
                        </div>
                        <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} style={{ padding: '10px 20px', background: '#ffeef0', color: '#f03e3e', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}>Chiqish</button>
                    </div>
                </div>

                {/* SOTUV VA QIDIRUV (TEPADA, TWO COLUMNS ON WIDE, STACK ON MOBILE) */}
                <div className="no-print" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    
                    {/* CHIPTA SOTISH */}
                    <div style={{ flex: '1.5', minWidth: '400px', background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', border: '1px solid #f0f2f7' }}>
                        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: '800' }}>Yangi Chipta 🎟️</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#666', marginBottom: '8px' }}>Mijoz Ismi:</label>
                                <input 
                                    type="text" 
                                    value={customerName} 
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Ismni kiriting..."
                                    style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2px solid #f0f2f7', fontSize: '1rem', outline: 'none', transition: '0.2s', focus: { borderColor: '#2f54ff'} }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#666', marginBottom: '12px' }}>O'yingohlarni Tanlang:</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {carousels.map(c => (
                                        <button 
                                            key={c.id}
                                            onClick={() => toggleCarouselSelection(c.id)}
                                            style={{
                                                padding: '12px 20px',
                                                borderRadius: '14px',
                                                border: '2px solid ' + (selectedCarousels.includes(c.id) ? '#2f54ff' : '#f0f2f7'),
                                                background: selectedCarousels.includes(c.id) ? '#2f54ff' : '#fff',
                                                color: selectedCarousels.includes(c.id) ? '#fff' : '#444',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: selectedCarousels.includes(c.id) ? '0 8px 15px rgba(47, 84, 255, 0.2)' : 'none'
                                            }}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerate}
                                disabled={loading || selectedCarousels.length === 0}
                                style={{ 
                                    width: '100%', 
                                    padding: '18px', 
                                    background: 'linear-gradient(135deg, #2f54ff 0%, #4062ff 100%)', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: '16px', 
                                    fontSize: '1.2rem', 
                                    fontWeight: '800', 
                                    cursor: 'pointer', 
                                    boxShadow: '0 12px 24px rgba(47, 84, 255, 0.3)',
                                    marginTop: '10px'
                                }}
                            >
                                {loading ? "Tayyorlanmoqda..." : "Sotish & Chop etish 🖨️"}
                            </button>
                            {error && <p style={{ color: '#f03e3e', fontSize: '0.9rem', fontWeight: '700', textAlign: 'center' }}>{error}</p>}
                        </div>
                    </div>

                    {/* QIDIRUV & VOZVRAT */}
                    <div style={{ flex: '1', minWidth: '350px', background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', border: '1px solid #f0f2f7' }}>
                        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: '800' }}>Qidiruv & Vozvrat 🔍</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="QR kod yoki ID..."
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #f0f2f7' }}
                            />
                            <button onClick={handleSearch} style={{ padding: '0 24px', background: '#1a1a1a', color: '#fff', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>Izlash</button>
                        </div>

                        {searchResult ? (
                            <div style={{ background: '#f8f9fc', borderRadius: '18px', padding: '24px', border: '1px solid #eef0f5' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#999', display: 'block' }}>Topilgan Mijoz:</span>
                                    <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#1a1a1a' }}>{searchResult.customerName}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {searchResult.carousels.map(rel => (
                                        <div key={rel.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #eef0f5' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                {rel.status === 0 && (
                                                    <input type="checkbox" checked={refundCarousels.includes(rel.carouselId)} onChange={e => e.target.checked ? setRefundCarousels([...refundCarousels, rel.carouselId]) : setRefundCarousels(refundCarousels.filter(id => id !== rel.carouselId))} />
                                                )}
                                                <span style={{ fontWeight: '700', color: '#444' }}>{rel.carousel?.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', background: rel.status === 1 ? '#ebfbee' : rel.status === -1 ? '#fff0f0' : '#edf2ff', color: rel.status === 1 ? '#37b24d' : rel.status === -1 ? '#f03e3e' : '#2f54ff' }}>
                                                {rel.status === 1 ? "O'TILDI" : rel.status === -1 ? "BEKOR" : "KUTILMOQDA"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleRefund} disabled={refundCarousels.length === 0} style={{ width: '100%', marginTop: '20px', padding: '14px', background: '#f03e3e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 15px rgba(240, 62, 62, 0.2)' }}>VOZVRAT QILISH</button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ccc' }}>
                                <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🔍</span>
                                <p style={{ fontSize: '0.9rem' }}>Qidiruv natijalari shu yerda ko'rinadi</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* TARIX JADVALI (PASTDA) */}
                <div className="no-print" style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 15px 35px rgba(0,0,0,0.05)', border: '1px solid #f0f2f7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Oxirgi Sotilgan Chiptalar 📊</h3>
                        <button onClick={fetchRecentTickets} style={{ background: 'none', border: 'none', color: '#2f54ff', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}>Yangilash 🔄</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f4f6f9', textAlign: 'left' }}>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>MIJOZ</th>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>VAQT</th>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>KOD</th>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>O'YINGOHLAR</th>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>HOLATI</th>
                                    <th style={{ padding: '16px 20px', color: '#666', fontWeight: '700' }}>AMAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTickets.map(t => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid #f8f9fb', transition: '0.2s' }}>
                                        <td style={{ padding: '20px', fontWeight: '800', color: '#1a1a1a' }}>{t.customerName}</td>
                                        <td style={{ padding: '20px', fontSize: '0.9rem', color: '#888' }}>{new Date(t.createdAt).toLocaleTimeString()}</td>
                                        <td style={{ padding: '20px' }}><code style={{ background: '#f5f7fa', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#2f54ff' }}>{t.qrString}</code></td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {t.carousels.map(rel => (
                                                    <span key={rel.id} title={rel.carousel.name} style={{ width: '8px', height: '8px', borderRadius: '50%', background: rel.status === 1 ? '#37b24d' : rel.status === -1 ? '#f03e3e' : '#2f54ff' }}></span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{ 
                                                padding: '5px 12px', 
                                                borderRadius: '25px', 
                                                fontSize: '0.7rem', 
                                                fontWeight: '900',
                                                background: t.status === -1 ? '#fff0f0' : '#ebfbee',
                                                color: t.status === -1 ? '#f03e3e' : '#37b24d'
                                            }}>
                                                {t.status === -1 ? "BEKOR" : "AKTIV"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <button onClick={() => selectTicketForRefund(t)} style={{ background: '#f5f7fa', color: '#444', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>Vozvrat</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* CHOP ETISH QISMI */}
            {generatedCode && (
                <div id="print-section" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                    <div style={{ padding: '20px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', margin: '0 auto', fontFamily: 'monospace' }}>
                        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>XIVA LOKOMOTIV</h2>
                        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', width: '100%', padding: '12px 0', textAlign: 'center' }}>
                            <p style={{ margin: '4px 0', fontSize: '18px' }}><b>{customerName || "Mijoz"}</b></p>
                        </div>
                        <ul style={{ margin: '15px 0', padding: 0, listStyle: 'none', width: '100%', fontSize: '14px' }}>
                            {generatedCode.selectedNames?.map((n, i) => <li key={i} style={{ borderBottom: '1px solid #eee', padding: '6px 0' }}>{n}</li>)}
                        </ul>
                        <div style={{ padding: '10px', background: '#fff' }}>
                            <QRCodeSVG value={generatedCode.qrString} size={180} level={"H"} />
                        </div>
                        <p style={{ marginTop: '15px', fontSize: '11px' }}>{new Date().toLocaleString()}</p>
                        <p style={{ fontSize: '10px', opacity: 0.7 }}>Chipta 24 soat amal qiladi</p>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
                @media print {
                    .no-print { display: none !important; }
                    body { visibility: hidden; }
                    #print-section { visibility: visible !important; position: absolute; left: 0; top: 0; }
                }
                tr:hover { background-color: #fcfdfe !important; }
            `}</style>
        </div>
    );
};

export default KassirPanel;
