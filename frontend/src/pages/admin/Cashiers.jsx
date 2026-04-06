import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Trash2, Plus } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Cashiers = () => {
    const [cashiers, setCashiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ fullName: '', phone: '', password: '', role: 'kassir' });

    const fetchCashiers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/users?role=kassir`);
            setCashiers(res.data);
        } catch (error) {
            console.error("Fetch xatosi:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCashiers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, form);
            setForm({ fullName: '', phone: '', password: '', role: 'kassir' });
            fetchCashiers();
        } catch (error) {
            alert("Xatolik: " + error.response?.data?.error || error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rostdan ishdan bo'shatmoqchimisiz?")) return;
        try {
            await axios.delete(`${API_URL}/users/${id}`);
            fetchCashiers();
        } catch (error) {
            alert("Xatolik yuz berdi");
        }
    };

    return (
        <div>
            <h1 className="page-title">Xodimlar (Kassirlar).</h1>
            <div className="page-subtitle">Sotrudniki: Bilet sotish huquqiga ega bo'lgan kassirlar ro'yxati.</div>

            <div className="stat-card" style={{ marginBottom: '30px' }}>
                <div className="sc-header" style={{ marginBottom: '20px' }}>Yangi Kassir Qo'shish</div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="F.I.SH" required />
                    <input className="form-input" style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Telefon raqam" required />
                    <input className="form-input" type="text" style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Parol (Kirish uchun)" required />
                    
                    <button type="submit" className="btn btn-primary">
                        <Plus size={16}/> Ishga Qabul Qilish
                    </button>
                </form>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>F.I.SH</th>
                            <th>Telefon</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Yuklanmoqda...</td></tr> : 
                        cashiers.map(c => (
                            <tr key={c.id}>
                                <td>#{c.id}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: 28, height: 28, background: 'var(--admin-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14}/></div>
                                        {c.fullName}
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{c.phone}</td>
                                <td><span style={{ background: '#eafaf1', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{c.role.toUpperCase()}</span></td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="icon-btn" style={{ display: 'inline-flex', color: 'var(--danger)' }} onClick={() => handleDelete(c.id)} title="O'chirish"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {cashiers.length === 0 && !loading && <tr><td colSpan="5" style={{textAlign: 'center'}}>Kassirlar topilmadi</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Cashiers;
