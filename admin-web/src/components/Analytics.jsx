import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, ComposedChart, Area, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Analytics() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [groupBy, setGroupBy] = useState("day");
    const [loading, setLoading] = useState(false);

    const [summary, setSummary] = useState({ revenue: 0, ordersCount: 0, productsSold: 0 });
    const [series, setSeries] = useState([]); // [{period:{year,month,day}, revenue, orders}]
    const [topProducts, setTopProducts] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]);
    const [growth, setGrowth] = useState({ current: { revenue: 0, orders: 0 }, previous: { revenue: 0, orders: 0 }, revenueChangePct: 0, ordersChangePct: 0 });

    const dateInputStyle = { padding: 8, border: "1px solid #ddd", borderRadius: 6 };
    const labelStyle = { fontSize: 12, color: "#666" };

    const formatCurrency = (n) => (Number(n || 0)).toLocaleString("vi-VN") + " ₫";

    const buildQuery = (extra = {}) => {
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);
        Object.entries(extra).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") params.append(k, String(v)); });
        return params.toString();
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [summaryRes, revenueRes, topProdRes, topCustRes] = await Promise.all([
                fetch(`http://localhost:3000/api/analytics/summary?${buildQuery()}`),
                fetch(`http://localhost:3000/api/analytics/revenue?${buildQuery({ groupBy })}`),
                fetch(`http://localhost:3000/api/analytics/top-products?${buildQuery({ limit: 10 })}`),
                fetch(`http://localhost:3000/api/analytics/top-customers?${buildQuery({ limit: 10 })}`),
            ]);
            const [sumJ, revJ, prodJ, custJ] = await Promise.all([summaryRes.json(), revenueRes.json(), topProdRes.json(), topCustRes.json()]);
            setSummary(sumJ || { revenue: 0, ordersCount: 0, productsSold: 0 });
            setSeries(Array.isArray(revJ) ? revJ : []);
            setTopProducts(Array.isArray(prodJ) ? prodJ : []);
            setTopCustomers(Array.isArray(custJ) ? custJ : []);

            // growth: previous period of equal length
            const fromDate = from ? new Date(from) : null;
            const toDate = to ? new Date(to) : null;
            if (fromDate && toDate) {
                const spanMs = toDate.getTime() - fromDate.getTime();
                const prevTo = new Date(fromDate.getTime() - 1);
                const prevFrom = new Date(prevTo.getTime() - spanMs);
                const qp = new URLSearchParams({
                    currentFrom: fromDate.toISOString(),
                    currentTo: toDate.toISOString(),
                    prevFrom: prevFrom.toISOString(),
                    prevTo: prevTo.toISOString(),
                }).toString();
                const growthRes = await fetch(`http://localhost:3000/api/analytics/growth?${qp}`);
                const growthJ = await growthRes.json();
                setGrowth(growthJ);
            } else {
                setGrowth({ current: { revenue: 0, orders: 0 }, previous: { revenue: 0, orders: 0 }, revenueChangePct: 0, ordersChangePct: 0 });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [groupBy]);

    const onApply = (e) => {
        e?.preventDefault?.();
        fetchAll();
    };

    const chartData = useMemo(() => {
        return (series || []).map((d) => {
            const p = d.period || {}; const y = p.year; const m = p.month?.toString().padStart(2, '0'); const day = p.day?.toString().padStart(2, '0');
            const label = groupBy === 'year' ? `${y}` : groupBy === 'month' ? `${y}-${m}` : `${y}-${m}-${day}`;
            return { label, revenue: d.revenue || 0, orders: d.orders || 0 };
        });
    }, [series, groupBy]);

    const maxRevenue = Math.max(1, ...chartData.map(d => d.revenue));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2>Thống kê doanh thu</h2>
            <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                <form onSubmit={onApply} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={labelStyle}>Từ ngày</span>
                        <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInputStyle} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={labelStyle}>Đến ngày</span>
                        <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} style={dateInputStyle} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={labelStyle}>Nhóm theo</span>
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ ...dateInputStyle, paddingRight: 28 }}>
                            <option value="day">Ngày</option>
                            <option value="month">Tháng</option>
                            <option value="year">Năm</option>
                        </select>
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#111827", color: "#fff", cursor: "pointer" }}>
                        {loading ? 'Đang tải...' : 'Áp dụng'}
                    </button>
                </form>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Doanh thu</div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(summary.revenue)}</div>
                    <div style={{ color: growth.revenueChangePct >= 0 ? '#16a34a' : '#ef4444', fontSize: 12, marginTop: 4 }}>
                        {Number(growth.revenueChangePct || 0) >= 0 ? '▲' : '▼'} {Math.abs(Number(growth.revenueChangePct || 0)).toLocaleString('vi-VN')}%
                    </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Số đơn hàng</div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{summary.ordersCount}</div>
                    <div style={{ color: growth.ordersChangePct >= 0 ? '#16a34a' : '#ef4444', fontSize: 12, marginTop: 4 }}>
                        {Number(growth.ordersChangePct || 0) >= 0 ? '▲' : '▼'} {Math.abs(Number(growth.ordersChangePct || 0)).toLocaleString('vi-VN')}%
                    </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Sản phẩm bán ra</div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{summary.productsSold}</div>
                </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong>Doanh thu theo {groupBy === 'year' ? 'năm' : groupBy === 'month' ? 'tháng' : 'ngày'}</strong>
                </div>
                <div style={{ width: "100%", height: 320 }}>
                    {chartData.length === 0 ? (
                        <div style={{ color: '#888', padding: 12 }}>Không có dữ liệu</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tickFormatter={(v) => (Number(v).toLocaleString('vi-VN'))} tick={{ fontSize: 12 }} width={70} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} width={60} />
                                <Tooltip formatter={(value, name) => {
                                    if (name === 'Doanh thu') return [formatCurrency(value), name];
                                    return [Number(value).toLocaleString('vi-VN'), name];
                                }} />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu" stroke="#1890ff" fill="#e6f4ff" strokeWidth={2} />
                                <Bar yAxisId="right" dataKey="orders" name="Số đơn" barSize={20} fill="#52c41a" radius={[4, 4, 0, 0]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                    <strong>Sản phẩm bán chạy</strong>
                    <div style={{ marginTop: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Sản phẩm</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Màu</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Size</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>SL</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((p, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{p.name}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{p.color}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{p.size}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{p.qty}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{formatCurrency(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topProducts.length === 0 && <div style={{ color: '#888', padding: 8 }}>Không có dữ liệu</div>}
                    </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: 16 }}>
                    <strong>Khách hàng chi tiêu nhiều</strong>
                    <div style={{ marginTop: 8 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Khách hàng</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Email</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Số đơn</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCustomers.map((c, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{c.name || c.userId}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{c.email || '-'}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{c.orders}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{formatCurrency(c.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topCustomers.length === 0 && <div style={{ color: '#888', padding: 8 }}>Không có dữ liệu</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}


