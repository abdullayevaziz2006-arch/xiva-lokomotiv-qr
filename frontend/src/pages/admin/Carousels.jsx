import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Trash2, Plus, LayoutGrid, Info, Search } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Carousels = () => {
    const [carousels, setCarousels] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', price: '', terminalId: '' });
    const [editId, setEditId] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cRes, tRes] = await Promise.all([
                axios.get(`${API_URL}/carousels?organizationId=${user?.organizationId}`),
                axios.get(`${API_URL}/terminals?organizationId=${user?.organizationId}`)
            ]);
            setCarousels(cRes.data);
            setTerminals(tRes.data);
        } catch (error) {
            console.error("Fetch xatosi:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`${API_URL}/carousels/${editId}`, { ...form, organizationId: user?.organizationId });
            } else {
                await axios.post(`${API_URL}/carousels`, { ...form, organizationId: user?.organizationId });
            }
            setForm({ name: '', price: '', terminalId: '' });
            setEditId(null);
            fetchData();
        } catch (error) {
            alert("Xatolik: " + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("O'chirmoqchimisiz?")) return;
        try {
            await axios.delete(`${API_URL}/carousels/${id}`);
            fetchData();
        } catch (error) {
            alert("Xatolik yuz berdi");
        }
    };

    return (
        <div className="fade-in outfit">
            <h1 className="page-title">Xizmat nuqtalari.</h1>
            <p className="page-subtitle">Tizimga ulangan aktiv resurslar va terminallar nazorati.</p>

            <div className="stat-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}>
                        <Plus color="var(--primary)" size={18} />
                    </div>
                    <div className="sc-header">{editId ? 'Resursni Tahrirlash' : 'Yangi Xizmat Qo\'shish'}</div>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Xizmat nomi (Masalan: Karusel #1)" required />
                    <input className="form-input" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Sotuv Narxi (so'm)" required />
                    
                    <select className="form-input" value={form.terminalId} onChange={e => setForm({...form, terminalId: e.target.value})} required>
                        <option value="">-- Terminalni tanlang --</option>
                        {terminals.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.ipAddress})</option>
                        ))}
                    </select>

                    <button type="submit" className="btn-primary" style={{ height: '52px' }}>
                        {editId ? 'Saqlash' : "Qo'shish"}
                    </button>
                </form>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>XIZMAT NOMI</th>
                            <th>NARXI (SO'M)</th>
                            <th>ULANGAN TERMINAL</th>
                            <th>MAS'UL SHAXS</th>
                            <th style={{ textAlign: 'right' }}>AMALLAR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px' }}>Yuklanmoqda...</td></tr> : 
                        carousels.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                        {c.name}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--admin-text-main)', fontWeight: 900, fontSize: '1.2rem' }}>
                                    {c.price?.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>UZS</span>
                                </td>
                                <td>
                                    {c.terminal ? <span className="status-pill success">{c.terminal.name}</span> : <span className="status-pill danger">Ulanmagan</span>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '28px', height: '28px', background: 'var(--bg-sub)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', border: '1px solid var(--admin-border)' }}>👤</div>
                                        {c.entrepreneur?.fullName || 'Tizim Admin'}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="icon-btn" style={{ color: 'var(--danger)', margin: '0 0 0 auto' }} onClick={() => handleDelete(c.id)} title="O'chirish"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {carousels.length === 0 && !loading && <tr><td colSpan="5" style={{textAlign: 'center', padding: '100px', color: 'var(--admin-text-muted)' }}>Hozircha ma'lumotlar mavjud emas</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Carousels;
