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

    // Vozvrat statelari
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refundCarousels, setRefundCarousels] = useState([]);

    const [carousels, setCarousels] = useState([]);

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

        // Socket.io orqali real-vaqtda xabarlarni eshitish
        socket.on('qr-used', (data) => {
            console.log('[Socket] QR ishlatildi:', data);

            // Agar hozir ekranda turgan chipta bo'lsa, uning holatini yangilaymiz
            setSearchResult(prev => {
                if (!prev) return null;
                if (prev.id === data.qrCodeId) {
                    const newCarousels = prev.carousels.map(rel => {
                        if (rel.carouselId === data.carouselId) {
                            return { ...rel, status: 1 }; // Ishlatildi deb belgilash
                        }
                        return rel;
                    });
                    return { ...prev, carousels: newCarousels };
                }
                return prev;
            });
        });

        return () => {
            socket.off('qr-used');
        };
    }, []);


    const [recentTickets, setRecentTickets] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

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
        fetchRecentTickets(); // Oxirgi chiptalarni yuklash

        // Socket.io orqali real-vaqtda xabarlarni eshitish
        socket.on('qr-used', (data) => {
            console.log('[Socket] QR ishlatildi:', data);
            fetchRecentTickets(); // Tarixni yangilash
        });

        return () => {
            socket.off('qr-used');
        };
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
                createdBy: user ? user.id : 1, // Kassir ID (Storage dan olindi)
                customerName: customerName || "Mijoz",
                customerPhone: customerPhone || ""
            });

            setGeneratedCode({
                ...response.data.qrCode,
                selectedNames: carousels.filter(c => selectedCarousels.includes(c.id)).map(c => c.name)
            });

            // Chipta sotildi. Formani tozalab yana xarid qilinishini oldini olamiz:
            setCustomerName("");
            setCustomerPhone("");
            setSelectedCarousels([]);
            fetchRecentTickets(); // Jadvalni parda ortida yangilash

            // Xatoliklar qisman bo'lsa (207)
            if (response.status === 207) {
                setError(response.data.message);
                setGeneratedCode(prev => ({ ...prev, hasErrors: true }));
            } else {
                setError(""); // Muaffaqqiyatli ishladi
            }

            // Xato bo'lsa darhol chop etmaymiz (qayta yuklab olgunicha)
            if (response.status !== 207) {
                setTimeout(() => {
                    window.print();
                }, 300);
            }

        } catch (err) {
            setError(err.response?.data?.error || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/qrcodes/${generatedCode.id}/retry`);
            if (res.status === 200) {
                alert("Terminalga qabul qilindi!");
                setError("");
                setGeneratedCode(prev => ({ ...prev, hasErrors: false }));
                setTimeout(() => {
                    window.print();
                    fetchRecentTickets();
                }, 500);
            } else {
                alert(res.data.message);
            }
        } catch (e) {
            alert("Qayta yuklashda baribir xatolik: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleNewTicket = () => {
        setGeneratedCode(null);
        setError("");
    };

    // --- VOZVRAT FUNKSIYALARI ---
    const selectTicketForRefund = (ticket) => {
        setSearchResult(ticket);
        setSearchQuery(ticket.qrString);
        setRefundCarousels([]);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Qidiruvga olib chiqish
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        setSearchResult(null);
        setRefundCarousels([]);
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
            const res = await axios.post(`${API_URL}/qrcodes/refund`, {
                qrId: searchResult.id,
                carouselIds: refundCarousels
            });
            alert("Muvaffaqiyatli! " + res.data.message);
            handleSearch(); // Izlashni yangilash
            fetchRecentTickets(); // Tarixni yangilash
        } catch (err) {
            alert(err.response?.data?.error || "Vozvratda xatolik");
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="kassir-container" style={{
            padding: '20px',
            fontFamily: "'Inter', sans-serif",
            background: '#eff2f5',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center'
        }}>

            {/* TEPADA: GENERATSIYA QISMI (CHIPTA SOTISH) */}
            <div className="no-print glass-card" style={{
                width: '100%',
                maxWidth: '1200px',
                background: '#fff',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1a1a1a' }}>Chipta Sotish</h2>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                         <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Kassir:</span>
                            <b style={{ color: '#2f54ff', marginLeft: '5px' }}>{user ? user.fullName : 'Noma\'lum'}</b>
                        </div>
                        <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} style={{ background: '#f8f9fa', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>Chiqish</button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#444' }}>Mijoz Ismi:</label>
                        <input
                            type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                            style={{ padding: '12px', marginTop: '8px', width: '100%', boxSizing: 'border-box', borderRadius: '10px', border: '2px solid #eee', fontSize: '1rem' }}
                            placeholder="Mijoz ismini kiriting..."
                        />
                    </div>
                    <div style={{ flex: '2', minWidth: '300px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#444' }}>O'yingohlar:</label>
                        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {carousels.map(c => (
                                <button key={c.id}
                                    onClick={() => toggleCarouselSelection(c.id)}
                                    style={{
                                        padding: '8px 16px',
                                        background: selectedCarousels.includes(c.id) ? '#2f54ff' : '#fff',
                                        color: selectedCarousels.includes(c.id) ? '#fff' : '#444',
                                        borderRadius: '30px',
                                        border: '1px solid ' + (selectedCarousels.includes(c.id) ? '#2f54ff' : '#ddd'),
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.85rem',
                                        transition: '0.2s'
                                    }}>
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', alignItems: 'center' }}>
                    {error && <span style={{ color: '#ff4d4f', fontSize: '0.85rem', fontWeight: '600' }}>{error}</span>}
                    
                    {!generatedCode || !generatedCode.hasErrors ? (
                        <button
                            onClick={handleGenerate}
                            disabled={loading || selectedCarousels.length === 0}
                            style={{
                                padding: '12px 30px',
                                backgroundColor: '#2f54ff',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: '700',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(47, 84, 255, 0.3)',
                                opacity: (loading || selectedCarousels.length === 0) ? 0.6 : 1
                            }}
                        >
                            {loading ? "Sotilmoqda..." : "Chiptani Sotish 🖨️"}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleRetry} style={{ padding: '10px 20px', background: '#fcc419', color: '#000', border: 'none', cursor: 'pointer', fontWeight: '800', borderRadius: '10px' }}>
                                QAYTA YUBORISH ♻️
                            </button>
                            <button onClick={handleNewTicket} style={{ background: '#eee', border: 'none', color: '#333', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>
                                Bekor qilish
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ORTADA: VOZVRAT QIDIRUV (FAQAT KERAK BO'LGANDA) */}
            {searchResult && (
                <div className="no-print" style={{ width: '100%', maxWidth: '1200px', background: '#fff0f0', borderRadius: '16px', padding: '20px', border: '2px solid #ffc9c9', animation: 'slideDown 0.3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#c92a2a' }}>Vozvrat: {searchResult.customerName}</h3>
                        <button onClick={() => setSearchResult(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                        {searchResult.carousels.map(rel => (
                            <div key={rel.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                {rel.status === 0 ? (
                                    <input type="checkbox" checked={refundCarousels.includes(rel.carouselId)} onChange={(e) => {
                                        if (e.target.checked) setRefundCarousels([...refundCarousels, rel.carouselId]);
                                        else setRefundCarousels(refundCarousels.filter(id => id !== rel.carouselId));
                                    }} />
                                ) : <span style={{ fontSize: '12px' }}>{rel.status === 1 ? '✅' : '❌'}</span>}
                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{rel.carousel?.name}</span>
                            </div>
                        ))}
                        <button onClick={handleRefund} disabled={refundCarousels.length === 0} style={{ padding: '8px 20px', background: '#f03e3e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>BEKOR QILISH</button>
                    </div>
                </div>
            )}

            {/* PASTDA: SOTUVLAR TARIXI JADVALI */}
            <div className="no-print glass-card" style={{
                width: '100%',
                maxWidth: '1200px',
                background: '#fff',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#1a1a1a' }}>Oxirgi Sotuvlar</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            placeholder="Chipta yoki Ism bo'yicha qidirish..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ddd', width: '250px' }}
                        />
                        <button onClick={handleSearch} style={{ background: '#1a1a1a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>Qidirish</button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f4f4f4' }}>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>MIJOZ</th>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>VAQT</th>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>CHIPIBILAT</th>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>O'YINGOHLAR</th>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>HOLATI</th>
                                <th style={{ padding: '12px', color: '#666', fontSize: '0.85rem' }}>AMALLAR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTickets.length > 0 ? (
                                recentTickets.map((ticket) => (
                                    <tr key={ticket.id} style={{ borderBottom: '1px solid #f9f9f9', transition: '0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '15px 12px' }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{ticket.customerName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#999' }}>{ticket.customerPhone || 'Noma\'lum'}</div>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '0.85rem', color: '#555' }}>
                                            {new Date(ticket.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <code style={{ background: '#eee', padding: '3px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{ticket.qrString}</code>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {ticket.carousels.map(rel => (
                                                    <span key={rel.id} title={rel.carousel.name} style={{ width: '8px', height: '8px', borderRadius: '50%', background: rel.status === 1 ? '#40c057' : rel.status === -1 ? '#fa5252' : '#228be6' }}></span>
                                                ))}
                                                <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '5px' }}>{ticket.carousels.length} ta</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: '800', 
                                                padding: '4px 8px', 
                                                borderRadius: '6px', 
                                                background: ticket.status === -1 ? '#fff0f0' : '#ebfbee',
                                                color: ticket.status === -1 ? '#f03e3e' : '#37b24d'
                                            }}>
                                                {ticket.status === -1 ? 'BEKOR' : 'AKTIV'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button onClick={() => selectTicketForRefund(ticket)} style={{ padding: '6px 12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Vozvrat</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>Ma'lumotlar yo'q</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CHOP ETISH UCHUN QISM */}
            {generatedCode && (
                <div id="print-section" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                    <div style={{ padding: '20px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', margin: '0 auto', fontFamily: 'monospace' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>XIVA LOKOMOTIV BOG'I</h3>
                        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', width: '100%', padding: '10px 0', textAlign: 'center' }}>
                            <p style={{ margin: '2px 0' }}>Mijoz: {customerName}</p>
                            <p style={{ margin: '2px 0' }}>Chipta: {generatedCode.qrString}</p>
                        </div>
                        <p style={{ margin: '10px 0 5px 0', fontSize: '11px', fontWeight: 'bold' }}>Tanlangan karusellar:</p>
                        <ul style={{ margin: '0 0 15px 0', paddingLeft: '20px', fontSize: '11px', width: '100%', textAlign: 'left' }}>
                            {generatedCode.selectedNames?.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                        <div style={{ background: '#fff', padding: '10px' }}>
                            <QRCodeSVG value={generatedCode.qrString} size={160} level={"H"} />
                        </div>
                        <p style={{ fontSize: '10px', marginTop: '15px' }}>{new Date(generatedCode.createdAt).toLocaleString()}</p>
                        <p style={{ fontSize: '9px', opacity: 0.8 }}>Bilet 24 soat davomida amal qiladi</p>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @media print {
                    .no-print { display: none !important; }
                    body { visibility: hidden; }
                    #print-section { 
                        visibility: visible !important; 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                    }
                }
            `}</style>
        </div>
    );

};

export default KassirPanel;
