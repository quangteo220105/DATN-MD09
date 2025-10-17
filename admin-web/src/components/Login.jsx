import React, { useState } from "react";
import { Input, Button, message } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import "./Login.css";

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            message.warning("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                message.success(data.message || "Đăng nhập thành công!");

                // ✅ Chỉ gọi onLoginSuccess để chuyển sang AdminLayout
                onLoginSuccess();
            } else {
                message.error(data.message || "Sai tài khoản hoặc mật khẩu!");
            }
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            message.error("Không thể kết nối đến server!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <img
                    src="https://vn-test-11.slatic.net/p/3bcf761c315cdd5ffa0f71ed50e9c1aa.jpg"
                    alt="Food combo"
                    className="login-image"
                />
            </div>

            <div className="login-right">
                <div className="login-box">
                    <h2 className="login-title">Welcome Back, Admin!</h2>

                    <Input
                        size="large"
                        placeholder="Email Address"
                        prefix={<MailOutlined />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ marginBottom: 16 }}
                    />

                    <Input.Password
                        size="large"
                        placeholder="Password"
                        prefix={<LockOutlined />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ marginBottom: 20 }}
                    />

                    <Button
                        type="primary"
                        block
                        size="large"
                        onClick={handleLogin}
                        loading={loading}
                        style={{
                            backgroundColor: "#ff8000",
                            borderColor: "#ff8000",
                            fontWeight: "bold",
                        }}
                    >
                        Login
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Login;
