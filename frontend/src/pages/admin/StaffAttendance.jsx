import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, Plus, Trash2, Search, ArrowRightLeft } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const StaffAttendance = () => {
    const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'staff'
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form fields
    const [newStaff, setNewStaff] = useState({ fullName: '', phone: '', employeeId: '' });
    
    const user = JSON.parse(localStorage.getItem('user'));
    const orgId = user?.organizationId;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, attendanceRes] = await Promise.all([
                axios.get(`${API_URL}/staff?organizationId=${orgId}`),
                axios.get(`${API_URL}/staff/attendance?organizationId=${orgId}`)
            ]);
            setStaff(staffRes.data);
            setAttendance(attendanceRes.data);
        } catch (err) {
            console.error("Ma'lumotlarni yuklashda xato:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/staff`, { ...newStaff, organizationId: orgId });
            setNewStaff({ fullName: '', phone: '', employeeId: '' });
            setShowAddForm(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Xatolik yuz berdi");
        }
    };

    return (
        <div className="staff-attendance-page" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>SmartStaff Nazorati 🏢</h2>
                <div style={{ display: 'flex', gap: '12px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'logs' ? '#fff' : 'transparent', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'logs' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                        Davomat Registri
                    </button>
                    <button 
                        onClick={() => setActiveTab('staff')}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === 'staff' ? '#fff' : 'transparent', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'staff' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                        Ishchilar Ro'yxati
                    </button>
                </div>
            </div>

            {activeTab === 'logs' ? (
                <div className="logs-section" style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>So'nggi harakatlar</h3>
                        <button onClick={fetchData} className="btn-refresh">🔄 Yangilash</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>ISHCHI</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>YO'NALISH</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>VAQT</th>
                                <th style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>TERMINAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendance.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px', fontWeight: 700 }}>{log.staff?.fullName}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 12px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 800,
                                            background: log.direction === 'IN' ? '#ecfdf5' : '#fff1f2',
                                            color: log.direction === 'IN' ? '#059669' : '#e11d48'
                                        }}>
                                            {log.direction === 'IN' ? 'KIRDILAR ↑' : 'CHIQDILAR ↓'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem' }}>{log.terminal?.name} ({log.terminal?.ipAddress})</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="staff-section">
                    <button onClick={() => setShowAddForm(true)} style={{ marginBottom: '24px', padding: '12px 24px', borderRadius: '12px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus size={20} /> Yangi ishchi qo'shish
                    </button>

                    {showAddForm && (
                        <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ background: '#fff', padding: '40px', borderRadius: '24px', width: '400px' }}>
                                <h3>Yangi ishchi</h3>
                                <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                                    <input required placeholder="F.I.Sh" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                    <input required placeholder="Ishchi IDsi (Terminal uchun)" value={newStaff.employeeId} onChange={e => setNewStaff({...newStaff, employeeId: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                    <input placeholder="Telefon raqami" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button type="submit" style={{ flex: 1, padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700 }}>Saqlash</button>
                                        <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '10px' }}>Bekor qilish</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {staff.map(s => (
                            <div key={s.id} style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 800 }}>{s.fullName.charAt(0)}</div>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{s.fullName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {s.employeeId}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tel: {s.phone || 'Noma\'lum'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffAttendance;
