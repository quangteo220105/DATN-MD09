import React, { useEffect, useMemo, useState } from "react";

const STATUS_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "Chờ xác nhận", label: "🛒 Chờ xác nhận" },
    { value: "Đã xác nhận", label: "📦 Đã xác nhận" },
    { value: "Đang giao hàng", label: "🚚 Đang giao hàng" },
    { value: "Đã giao hàng", label: "✅ Đã giao hàng" },
];

const pageSizeOptions = [10, 20, 50];

export default function Orders() {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selected, setSelected] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const fetchOrders = async (override = {}) => {
        try {
            setLoading(true);
            const q = Object.prototype.hasOwnProperty.call(override, 'q') ? override.q : query;
            const st = Object.prototype.hasOwnProperty.call(override, 'status') ? override.status : status;
            const pg = Object.prototype.hasOwnProperty.call(override, 'page') ? override.page : page;
            const lim = Object.prototype.hasOwnProperty.call(override, 'limit') ? override.limit : pageSize;

            const params = new URLSearchParams({
                page: String(pg),
                limit: String(lim),
            });
            if ((q || '').trim()) params.append("q", (q || '').trim());
            if (st) params.append("status", st);

            const res = await fetch(`http://localhost:3000/api/orders?${params.toString()}`);
            const data = await res.json();
            // Chấp nhận cả hai dạng: {data, total} hoặc mảng thuần
            const list = Array.isArray(data) ? data : (data.data || []);
            setOrders(list);
            setTotal(Array.isArray(data) ? list.length : (data.total || list.length));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize]);

    const onSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchOrders({ q: query, status, page: 1 });
    };

    const updateStatus = async (orderId, nextStatus) => {
        try {
            const res = await fetch(`http://localhost:3000/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            if (!res.ok) throw new Error('Failed to update status');
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: nextStatus } : o));
        } catch (e) {
            console.error(e);
            alert('Cập nhật trạng thái thất bại');
        }
    };

    const handleCancel = async (order) => {
        if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng ${order.code || order._id || order.id}?`)) {
            return;
        }
        try {
            const res = await fetch(`http://localhost:3000/api/orders/${order._id || order.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Đã hủy' })
            });
            if (!res.ok) throw new Error('Failed to cancel order');
            setOrders(prev => prev.map(o => (o._id || o.id) === (order._id || order.id) ? { ...o, status: 'Đã hủy' } : o));
            alert('Đã hủy đơn hàng thành công');
        } catch (e) {
            console.error(e);
            alert('Hủy đơn hàng thất bại');
        }
    };

    const openDetail = async (order) => {
        try {
            // Thử tải chi tiết mới nhất
            const res = await fetch(`http://localhost:3000/api/orders/${order._id}`);
            const data = await res.json();
            setSelected(data?._id ? data : order);
        } catch {
            setSelected(order);
        }
        setShowModal(true);
    };

    const statusCounts = useMemo(() => {
        // Nếu backend có endpoint thống kê, có thể thay bằng fetch
        const counts = {
            "Chờ xác nhận": 0,
            "Đã xác nhận": 0,
            "Đang giao hàng": 0,
            "Đã giao hàng": 0,
        };
        orders.forEach(o => {
            if (counts[o.status] !== undefined) counts[o.status] += 1;
        });
        return counts;
    }, [orders]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>Quản lý đơn hàng</h2>

            {/* Filters */}
            <form onSubmit={onSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                    value={query}
                    onChange={e => { const v = e.target.value; setQuery(v); if (v.trim() === '' && status === '') { setPage(1); fetchOrders({ q: '', status: '', page: 1 }); } }}
                    placeholder="Tìm theo mã đơn, tên/điện thoại, địa chỉ..."
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 280 }}
                />
                <select value={status} onChange={e => { const st = e.target.value; setStatus(st); setPage(1); /* Chỉ tìm khi bấm nút Tìm kiếm */ }} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}>
                    {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <button type="submit" style={{ padding: '8px 12px', border: 'none', background: '#1677ff', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                    Tìm kiếm
                </button>
            </form>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {Object.entries(statusCounts).map(([k, v]) => (
                    <div key={k} style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{k}</div>
                        <div style={{ color: '#1677ff', fontSize: 20, fontWeight: 700 }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#fafafa' }}>
                            <tr>
                                <th style={th}>Mã đơn</th>
                                <th style={th}>Thời gian</th>
                                <th style={th}>Khách hàng</th>
                                <th style={th}>Tổng tiền</th>
                                <th style={th}>Trạng thái</th>
                                <th style={th}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center' }}>Đang tải...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                            ) : (
                                orders.map((o) => {
                                    const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString() : '';
                                    // Parse tên từ địa chỉ nhận hàng (format: "Tên - Số điện thoại\nĐịa chỉ")
                                    let shippingName = '';
                                    let shippingPhone = '';
                                    if (o.address) {
                                        const parts = o.address.split(' - ');
                                        if (parts.length > 0) {
                                            shippingName = parts[0].trim();
                                            if (parts.length > 1) {
                                                const phoneAndAddress = parts[1];
                                                const phoneMatch = phoneAndAddress.match(/^([^\n]+)/);
                                                if (phoneMatch) shippingPhone = phoneMatch[1].trim();
                                            }
                                        }
                                    }
                                    const displayName = shippingName || o.customerName || o.name || '—';
                                    const displayPhone = shippingPhone || o.customerPhone || o.phone || '';
                                    return (
                                        <tr key={o._id || o.id}>
                                            <td style={td}>{o.code || o._id || o.id}</td>
                                            <td style={td}>{createdAt}</td>
                                            <td style={td}>{displayName}<div style={{ color: '#888', fontSize: 12 }}>{displayPhone}</div></td>
                                            <td style={td}>{(o.total || 0).toLocaleString('vi-VN')} VND</td>
                                            <td style={td}>
                                                <select value={o.status || ''} onChange={e => updateStatus(o._id || o.id, e.target.value)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}>
                                                    {STATUS_OPTIONS.filter(s => s.value !== '').map(s => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <button onClick={() => openDetail(o)} style={btnLink}>Chi tiết</button>
                                                    {o.status !== 'Đã hủy' && o.status !== 'Đã giao hàng' && (
                                                        <button onClick={() => handleCancel(o)} style={{ ...btnLink, color: '#ef4444' }}>Hủy đơn</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Hiển thị</span>
                        <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}>
                            {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span>bản ghi/trang</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={pagerBtn}>&lt;</button>
                        <span>{page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={pagerBtn}>&gt;</button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showModal && selected && (
                <div style={modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0 }}>Chi tiết đơn hàng</h3>
                            <button onClick={() => setShowModal(false)} style={{ ...btn, background: '#eee', color: '#333' }}>Đóng</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                                <div><strong>Mã đơn:</strong> {selected.code || selected._id || selected.id}</div>
                                <div><strong>Ngày tạo:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</div>
                                <div><strong>Trạng thái:</strong> {selected.status}</div>
                            </div>
                            <div>
                                {(() => {
                                    // Parse tên từ địa chỉ nhận hàng
                                    let shippingName = '';
                                    let shippingPhone = '';
                                    if (selected.address) {
                                        const parts = selected.address.split(' - ');
                                        if (parts.length > 0) {
                                            shippingName = parts[0].trim();
                                            if (parts.length > 1) {
                                                const phoneAndAddress = parts[1];
                                                const phoneMatch = phoneAndAddress.match(/^([^\n]+)/);
                                                if (phoneMatch) shippingPhone = phoneMatch[1].trim();
                                            }
                                        }
                                    }
                                    const displayName = shippingName || selected.customerName || selected.name || '—';
                                    const displayPhone = shippingPhone || selected.customerPhone || selected.phone || '—';
                                    return (
                                        <>
                                            <div><strong>Tên khách hàng:</strong> {displayName}</div>
                                            <div><strong>Điện thoại:</strong> {displayPhone}</div>
                                            <div><strong>Địa chỉ:</strong> {selected.address || '—'}</div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={th}>Sản phẩm</th>
                                        <th style={th}>Thuộc tính</th>
                                        <th style={th}>SL</th>
                                        <th style={th}>Giá</th>
                                        <th style={th}>Tổng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selected.items || []).map((it, idx) => (
                                        <tr key={idx}>
                                            <td style={td}>{it.name}</td>
                                            <td style={td}>{[it.size, it.color].filter(Boolean).join(', ')}</td>
                                            <td style={td}>{it.qty}</td>
                                            <td style={td}>{(it.price || 0).toLocaleString('vi-VN')} VND</td>
                                            <td style={td}>{((it.price || 0) * (it.qty || 0)).toLocaleString('vi-VN')} VND</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ textAlign: 'right', marginTop: 10 }}>
                                <strong>Tổng cộng: {(selected.total || 0).toLocaleString('vi-VN')} VND</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const th = { textAlign: 'left', padding: 12, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' };
const td = { padding: 12, borderBottom: '1px solid #f3f3f3', verticalAlign: 'top' };
const btn = { padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer' };
const btnLink = { ...btn, background: 'transparent', color: '#1677ff', padding: 0 };
const pagerBtn = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalCard = { background: '#fff', borderRadius: 12, padding: 16, width: 800, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' };


