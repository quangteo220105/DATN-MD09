import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000/api";

export default function ChatManager() {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [adminId] = useState("admin_001"); // ID admin
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
        if (selectedUser) {
            loadMessages();
            const interval = setInterval(() => {
                loadMessages();
            }, 2000); // Refresh mỗi 2 giây
            return () => clearInterval(interval);
        }
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const response = await axios.get(`${API_URL}/messages/admin/conversations?adminId=${adminId}`);
            setConversations(response.data);
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
    };

    const loadMessages = async () => {
        if (!selectedUser) return;
        try {
            const response = await axios.get(`${API_URL}/messages/conversation?senderId=${adminId}&receiverId=${selectedUser._id}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedUser) return;

        try {
            await axios.post(`${API_URL}/messages/send`, {
                senderId: adminId,
                senderName: "Admin",
                senderType: "admin",
                receiverId: selectedUser._id,
                receiverName: selectedUser.name,
                message: newMessage.trim()
            });

            setNewMessage("");
            loadMessages();
            loadConversations(); // Update conversations to show unread count
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Gửi tin nhắn thất bại!");
        }
    };

    return (
        <div style={{ display: "flex", height: "calc(100vh - 100px)", backgroundColor: "#f0f2f5" }}>
            {/* Sidebar - Danh sách người dùng */}
            <div style={{ width: 300, backgroundColor: "#fff", borderRight: "1px solid #e0e0e0" }}>
                <div style={{ padding: 16, borderBottom: "1px solid #e0e0e0" }}>
                    <h2 style={{ margin: 0 }}>💬 Tin nhắn</h2>
                </div>
                <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 180px)" }}>
                    {conversations.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
                            Chưa có tin nhắn
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv._id}
                                onClick={() => setSelectedUser({ _id: conv._id, name: conv.name })}
                                style={{
                                    padding: 16,
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f0f0f0",
                                    backgroundColor: selectedUser?._id === conv._id ? "#e6f7ff" : "#fff",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: "500", marginBottom: 4 }}>{conv.name}</div>
                                    <div style={{ fontSize: 12, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {conv.lastMessage}
                                    </div>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div style={{
                                        backgroundColor: "#ff4d4f",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        width: 20,
                                        height: 20,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: "bold"
                                    }}>
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: 16, backgroundColor: "#fff", borderBottom: "1px solid #e0e0e0" }}>
                            <h3 style={{ margin: 0 }}>{selectedUser.name}</h3>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: 16, backgroundColor: "#f5f5f5" }}>
                            {messages.map((msg) => (
                                <div
                                    key={msg._id}
                                    style={{
                                        marginBottom: 12,
                                        display: "flex",
                                        justifyContent: msg.senderId === adminId ? "flex-end" : "flex-start"
                                    }}
                                >
                                    <div style={{
                                        maxWidth: "60%",
                                        padding: "10px 14px",
                                        borderRadius: 12,
                                        backgroundColor: msg.senderId === adminId ? "#007bff" : "#fff",
                                        color: msg.senderId === adminId ? "#fff" : "#222",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                                    }}>
                                        <div style={{ fontSize: 14 }}>{msg.message}</div>
                                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                                            {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: 16, backgroundColor: "#fff", borderTop: "1px solid #e0e0e0", display: "flex", gap: 8 }}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Nhập tin nhắn..."
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    border: "1px solid #d0d0d0",
                                    borderRadius: 6,
                                    fontSize: 14,
                                    outline: "none"
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                style={{
                                    padding: "8px 20px",
                                    border: "none",
                                    borderRadius: 6,
                                    backgroundColor: "#007bff",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    fontWeight: "500"
                                }}
                            >
                                Gửi
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                            <div>Chọn người dùng để bắt đầu chat</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

