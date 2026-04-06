import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPanel = () => {
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' });
    const [editId, setEditId] = useState(null);

    const fetchTerminals = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/terminals');
            setTerminals(res.data);
        } catch (error) {
            console.error("Error fetching terminals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTerminals();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`${API_URL}/terminals/${editId}`, form);
            } else {
                await axios.post(`${API_URL}/terminals`, form);
            }
            setForm({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' });
            setEditId(null);
            fetchTerminals();
        } catch (error) {
            alert("Xatolik yuz berdi: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rostdan o'chirmoqchimisiz?")) return;
        try {
            await axios.delete(`${API_URL}/terminals/${id}`);
            fetchTerminals();
        } catch (error) {
            alert("Xatolik: ushbu terminalga karusel ulangan bo'lishi mumkin.");
        }
    };

    const handleEdit = (t) => {
        setForm({ name: t.name, ipAddress: t.ipAddress, port: t.port, username: t.username, password: t.password, status: t.status });
        setEditId(t.id);
    };

    const testConnection = async (terminal) => {
        try {
            alert("Ulanish  tekshirilmoqda, kuting...");
            const res = await axios.post(`${API_URL}/terminals/test`, {
                ipAddress: terminal.ipAddress,
                port: terminal.port,
                username: terminal.username,
                password: terminal.password
            });
            if(res.data.success) {
                alert("Muvaffaqiyatli! " + res.data.message);
            } else {
                alert("Xato: " + res.data.message);
            }
        } catch (error) {
            alert(error.response?.data?.message || "Aloqa yo'q: Backend xatosi");
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>Terminallarni Boshqarish (Admin Panel)</h2>
            
            <div style={{ padding: '20px', marginBottom: '20px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
                <h3>{editId ? 'Terminalni Tahrirlash' : 'Yangi Terminal Qo\'shish'}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Terminal Nomi" required />
                        <input value={form.ipAddress} onChange={e => setForm({...form, ipAddress: e.target.value})} placeholder="IP Manzil" required />
                        <input value={form.port} onChange={e => setForm({...form, port: e.target.value})} placeholder="Port (80)" required />
                        <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Login (username)" required />
                        <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Parol" type="password" required />
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                            <option value="active">Faol</option>
                            <option value="inactive">Nofaol</option>
                        </select>
                        <button type="submit" style={{ padding: '5px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none' }}>
                            {editId ? 'Saqlash' : 'Qo\'shish'}
                        </button>
                        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' }); }}>Bekor qilish</button>}
                    </div>
                </form>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} border="1">
                <thead>
                    <tr style={{ backgroundColor: '#eeeeee' }}>
                        <th style={{ padding: '8px' }}>ID</th>
                        <th style={{ padding: '8px' }}>Nomi</th>
                        <th style={{ padding: '8px' }}>IP : Port</th>
                        <th style={{ padding: '8px' }}>Login</th>
                        <th style={{ padding: '8px' }}>Holati</th>
                        <th style={{ padding: '8px' }}>Amallar</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? <tr><td colSpan="6">Yuklanmoqda...</td></tr> : 
                     terminals.map(t => (
                        <tr key={t.id}>
                            <td style={{ padding: '8px' }}>{t.id}</td>
                            <td style={{ padding: '8px' }}>{t.name}</td>
                            <td style={{ padding: '8px' }}>{t.ipAddress}:{t.port}</td>
                            <td style={{ padding: '8px' }}>{t.username}</td>
                            <td style={{ padding: '8px' }}>{t.status}</td>
                            <td style={{ padding: '8px' }}>
                                <button onClick={() => testConnection(t)} style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', marginRight: '5px', padding: '5px' }}>🚀 Test Connection</button>
                                <button onClick={() => handleEdit(t)} style={{ backgroundColor: '#ffc107', border: 'none', marginRight: '5px', padding: '5px' }}>✏️ Tahrirlash</button>
                                <button onClick={() => handleDelete(t.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px' }}>🗑️ O'chirish</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminPanel;
