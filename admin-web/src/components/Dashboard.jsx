import React, { useEffect, useState } from "react";
import { Card, Row, Col } from "antd";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalCategories: 0,
    });

    useEffect(() => {
        // Giả lập fetch dữ liệu từ API
        async function fetchStats() {
            try {
                const productsRes = await fetch("http://localhost:3000/api/products");
                const productsData = await productsRes.json();

                const categoriesRes = await fetch("http://localhost:3000/api/categories");
                const categoriesData = await categoriesRes.json();

                setStats({
                    totalProducts: productsData.length,
                    totalCategories: categoriesData.length,
                });
            } catch (err) {
                console.error("Lỗi lấy dữ liệu Dashboard:", err);
            }
        }

        fetchStats();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Dashboard</h2>
            <Row gutter={16}>
                <Col span={8}>
                    <Card style={{ textAlign: "center" }} title="Tổng sản phẩm" bordered={false}>
                        <h1>{stats.totalProducts}</h1>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ textAlign: "center" }} title="Tổng danh mục" bordered={false}>
                        <h1>{stats.totalCategories}</h1>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ textAlign: "center" }} title="Thông tin khác" bordered={false}>
                        <h1>...</h1>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
