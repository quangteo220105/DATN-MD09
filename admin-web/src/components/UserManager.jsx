import React, { useEffect, useState } from "react";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";
const CUSTOM_USERS_ENDPOINT = process.env.REACT_APP_USERS_ENDPOINT || ""; // vd: /api/auth/list-users

export default function UserManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [debugInfo, setDebugInfo] = useState("");

    const getRegistrationDate = (user) => {
        return (
            user?.createdAt ||
            user?.created_at ||
            user?.signupAt ||
            user?.signupDate ||
            user?.created ||
            user?.registeredAt ||
            null
        );
    };

    const formatViDate = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const normalizeUsers = (payload) => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.users)) return payload.users;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.results)) return payload.results;
        if (payload.data && Array.isArray(payload.data.users)) return payload.data.users;
        if (payload.users && payload.users.docs) return payload.users.docs; // mongoose-paginate-v2
        return [];
    };

    const tryFetchEndpoints = async () => {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const endpoints = [
            // Ưu tiên endpoint custom nếu có
            CUSTOM_USERS_ENDPOINT ? `${BASE_URL}${CUSTOM_USERS_ENDPOINT}` : "",
            `${BASE_URL}/api/user`,
            `${BASE_URL}/api/auth/users`,
            `${BASE_URL}/api/auth/list-users`,
            `${BASE_URL}/api/users/all`,
            `${BASE_URL}/api/users`,
            `${BASE_URL}/users`,
            `${BASE_URL}/auth/users`,
        ].filter(Boolean);

        const attempts = [];
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers });
                const rawText = await res.text();
                attempts.push(`${res.ok ? "OK" : "ERR"} ${res.status} ${url}\n${rawText.slice(0, 200)}`);
                if (!res.ok) continue;
                const data = rawText ? JSON.parse(rawText) : null;
                const list = normalizeUsers(data);
                if (list) {
                    return { list, usedUrl: url, raw: rawText };
                }
            } catch (e) {
                attempts.push(`EXC ${url}: ${e.message}`);
            }
        }
        throw new Error(attempts.join("\n\n"));
    };

    const fetchList = async () => {
        setLoading(true);
        setError("");
        setDebugInfo("");
        try {
            const { list, usedUrl, raw } = await tryFetchEndpoints();
            setUsers(list);
            console.debug("Users payload:", raw);
        } catch (e) {
            console.error("Fetch users failed:", e);
            setError("Không tải được danh sách người dùng. Vui lòng kiểm tra API URL/Backend/Token.");
            setDebugInfo(String(e.message || e));
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLock = async (id, currentLockStatus) => {
        const action = currentLockStatus ? "mở khóa" : "khóa";
        if (!window.confirm(`Bạn chắc chắn muốn ${action} tài khoản này?`)) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BASE_URL}/api/users/${id}/toggle-lock`, {
                method: "PATCH",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await fetchList();
            alert(`${action === "khóa" ? "Khóa" : "Mở khóa"} tài khoản thành công!`);
        } catch (e) {
            alert(`${action === "khóa" ? "Khóa" : "Mở khóa"} thất bại, vui lòng thử lại!`);
        }
    };

    return (
        <div style={{ background: "#fff", borderRadius: 16, padding: 22, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
            <h2 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                <i className="fa fa-users" style={{ color: "#501fcb", marginRight: 12 }} />
                👤 Quản lý tài khoản khách hàng
            </h2>
            {error && <div style={{ color: "#ef4444", marginTop: 8 }}>{error}</div>}
            {false && debugInfo && (
                <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 8, borderRadius: 8, color: '#555', marginTop: 8 }}>
                    {debugInfo}
                </pre>
            )}
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: "100%", background: "#fff", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: "#f7f9fc" }}>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>STT</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Avatar</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Họ tên</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Email</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Số điện thoại</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Ngày đăng ký</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #eaeef3' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>Chưa có tài khoản nào</td></tr>
                        ) : (
                            users.map((u, idx) => {
                                const isLocked = u.isLocked === true;
                                const avatarUrl = u.avatar || u.avatarUrl || u.profilePicture || u.image;
                                return (
                                    <tr key={u._id || u.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fbfdff' }}>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', color: '#334155', borderBottom: '1px solid #eef2f7', width: 60 }}>{idx + 1}</td>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', borderBottom: '1px solid #eef2f7', width: 80 }}>
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl.startsWith('http') ? avatarUrl : `${BASE_URL}${avatarUrl}`}
                                                    alt="Avatar"
                                                    style={{
                                                        width: 45,
                                                        height: 45,
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                        border: '2px solid #e5e7eb',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{
                                                width: 45,
                                                height: 45,
                                                borderRadius: '50%',
                                                backgroundColor: '#e5e7eb',
                                                display: avatarUrl ? 'none' : 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 18,
                                                fontWeight: 700,
                                                color: '#6b7280',
                                                margin: '0 auto',
                                                border: '2px solid #d1d5db'
                                            }}>
                                                {(u.name || u.fullName || '?').charAt(0).toUpperCase()}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'left', padding: '12px 14px', color: '#0f172a', borderBottom: '1px solid #eef2f7', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || u.fullName || "—"}</td>
                                        <td style={{ textAlign: 'left', padding: '12px 14px', color: '#334155', borderBottom: '1px solid #eef2f7', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email || "—"}</td>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', color: '#334155', borderBottom: '1px solid #eef2f7', width: 160 }}>{u.phone || u.phoneNumber || "—"}</td>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', color: '#334155', borderBottom: '1px solid #eef2f7', width: 160 }}>{formatViDate(getRegistrationDate(u))}</td>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', borderBottom: '1px solid #eef2f7', width: 120 }}>
                                            <span style={{
                                                color: isLocked ? '#ef4444' : '#22c55e',
                                                fontWeight: 700,
                                                fontSize: 13
                                            }}>
                                                {isLocked ? '🔒 Đã khóa' : '✅ Hoạt động'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '12px 14px', borderBottom: '1px solid #eef2f7', width: 120 }}>
                                            <button
                                                style={{
                                                    background: isLocked
                                                        ? "linear-gradient(180deg,#22c55e,#16a34a)"
                                                        : "linear-gradient(180deg,#ff6066,#ff4b52)",
                                                    border: "none",
                                                    borderRadius: 10,
                                                    color: "#fff",
                                                    padding: "8px 14px",
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    boxShadow: isLocked
                                                        ? '0 6px 12px rgba(34,197,94,0.25)'
                                                        : '0 6px 12px rgba(255,91,97,0.25)',
                                                    transition: 'transform 0.08s ease-in-out',
                                                }}
                                                onClick={() => handleToggleLock(u._id || u.id, isLocked)}
                                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                            >
                                                {isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
