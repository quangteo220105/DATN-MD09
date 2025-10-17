import React, { useState } from "react";
import {
    DashboardOutlined,
    ShopOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import Dashboard from "./Dashboard";
import Product from "./Product";
import Categories from "./Categories";

export default function AdminLayout({ onLogout }) {
    const [activeTab, setActiveTab] = useState("dashboard");

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard":
                return <Dashboard />;
            case "products":
                return <Product />;
            case "categories":
                return <Categories />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "Arial, sans-serif" }}>
            {/* Sidebar */}
            <div
                style={{
                    width: 80,
                    backgroundColor: "#001529",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 20,
                }}
            >
                {/* Dashboard */}
                <div
                    style={{
                        marginBottom: 20,
                        cursor: "pointer",
                        color: activeTab === "dashboard" ? "#ff8000" : "#fff",
                        fontSize: 24,
                    }}
                    onClick={() => setActiveTab("dashboard")}
                    title="Dashboard"
                >
                    <DashboardOutlined />
                </div>

                {/* Products */}
                <div
                    style={{
                        marginBottom: 20,
                        cursor: "pointer",
                        color: activeTab === "products" ? "#ff8000" : "#fff",
                        fontSize: 24,
                    }}
                    onClick={() => setActiveTab("products")}
                    title="Products"
                >
                    <ShopOutlined />
                </div>

                {/* Categories */}
                <div
                    style={{
                        marginBottom: 20,
                        cursor: "pointer",
                        color: activeTab === "categories" ? "#ff8000" : "#fff",
                        fontSize: 24,
                    }}
                    onClick={() => setActiveTab("categories")}
                    title="Categories"
                >
                    <AppstoreOutlined />
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* TopBar */}
                <div
                    style={{
                        height: 60,
                        backgroundColor: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 20px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        zIndex: 1,
                    }}
                >
                    <span style={{ fontSize: 20, fontWeight: "bold" }}>Admin</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 8px",
                                backgroundColor: "#f0f0f0",
                                borderRadius: 20,
                            }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "#007bff",
                                }}
                            ></div>
                            <span>Nguyễn Văn A</span>
                        </div>
                        <button
                            style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: 6,
                                backgroundColor: "#ff4d4f",
                                color: "#fff",
                                cursor: "pointer",
                            }}
                            onClick={onLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {/* Nội dung chính */}
                <div style={{ flex: 1, padding: 20, backgroundColor: "#f0f2f5", overflowY: "auto" }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
