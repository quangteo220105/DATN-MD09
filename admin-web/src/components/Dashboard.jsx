import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col } from "antd";
import { ResponsiveContainer, ComposedChart, Area, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Dashboard() {
    const [kpi, setKpi] = useState({ products: 0, orders: 0, customers: 0, monthRevenue: 0 });
    const [series, setSeries] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]);
    const [loading, setLoading] = useState(false);

    const formatCurrency = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "đ";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const chartData = useMemo(() => {
        return (series || []).map((d) => {
            const p = d.period || {}; const y = p.year; const m = String(p.month || 0).padStart(2, '0');
            return { label: `Th${p.month}`, revenue: d.revenue || 0, orders: d.orders || 0 };
        });
    }, [series]);

    useEffect(() => {
        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const [prodRes, orderRes, usersRes, summaryRes, revenueRes, topCustRes] = await Promise.all([
                    fetch("http://localhost:3000/api/products"),
                    fetch("http://localhost:3000/api/orders?page=1&limit=1"),
                    fetch("http://localhost:3000/api/users"),
                    fetch(`http://localhost:3000/api/analytics/summary?from=${startOfMonth.toISOString()}&to=${endOfMonth.toISOString()}`),
                    fetch(`http://localhost:3000/api/analytics/revenue?from=${startOfYear.toISOString()}&to=${endOfYear.toISOString()}&groupBy=month`),
                    fetch(`http://localhost:3000/api/analytics/top-customers?from=${startOfYear.toISOString()}&to=${endOfYear.toISOString()}&limit=5`),
                ]);

                const products = await prodRes.json();
                const ordersPayload = await orderRes.json();
                const users = await usersRes.json();
                const summary = await summaryRes.json();
                const revenue = await revenueRes.json();
                const topCust = await topCustRes.json();

                setKpi({
                    products: Array.isArray(products) ? products.length : (products?.data?.length || 0),
                    orders: Number(ordersPayload?.total || (Array.isArray(ordersPayload) ? ordersPayload.length : 0)),
                    customers: Array.isArray(users) ? users.length : (users?.data?.length || 0),
                    monthRevenue: Number(summary?.revenue || 0),
                });
                setSeries(Array.isArray(revenue) ? revenue : []);
                setTopCustomers(Array.isArray(topCust) ? topCust : []);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu Dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Tổng quan</h2>
            <Row gutter={16}>
                <Col span={6}>
                    <Card style={{ textAlign: "left" }} bordered={false}>
                        <div style={{ color: "#666", fontSize: 12 }}>Sản phẩm</div>
                        <div style={{ fontWeight: 700, fontSize: 24 }}>{kpi.products}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ textAlign: "left" }} bordered={false}>
                        <div style={{ color: "#666", fontSize: 12 }}>Đơn hàng</div>
                        <div style={{ fontWeight: 700, fontSize: 24 }}>{kpi.orders}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ textAlign: "left" }} bordered={false}>
                        <div style={{ color: "#666", fontSize: 12 }}>Khách hàng</div>
                        <div style={{ fontWeight: 700, fontSize: 24 }}>{kpi.customers}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ textAlign: "left" }} bordered={false}>
                        <div style={{ color: "#666", fontSize: 12 }}>Doanh thu (tháng)</div>
                        <div style={{ fontWeight: 700, fontSize: 24 }}>{formatCurrency(kpi.monthRevenue)}</div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={16}>
                    <Card title="Thống kê đơn hàng theo tháng" bordered={false}>
                        <div style={{ width: "100%", height: 320 }}>
                            {chartData.length === 0 ? (
                                <div style={{ color: '#888' }}>{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>
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
                                        <Bar yAxisId="right" dataKey="orders" name="Đơn hàng" barSize={20} fill="#52c41a" radius={[4, 4, 0, 0]} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="Top khách hàng" bordered={false}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#fafafa' }}>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Tên</th>
                                    <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Đơn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topCustomers.map((c, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{c.name || c.userId}</td>
                                        <td style={{ padding: 8, borderBottom: '1px solid #f0f0f0' }}>{c.orders}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {topCustomers.length === 0 && <div style={{ color: '#888', paddingTop: 8 }}>{loading ? 'Đang tải...' : 'Không có dữ liệu'}</div>}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
