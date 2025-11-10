import React, { useEffect, useState } from "react";
import { Table, Button, Modal, message, Popconfirm, Spin } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";

const API_URL = "http://localhost:3000/api/banners";

export default function Banner() {
    const [banners, setBanners] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ Load danh sách banner
    const fetchBanners = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_URL);
            setBanners(res.data);
        } catch (error) {
            message.error("Không thể tải danh sách banner!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // ✅ Mở dialog thêm banner
    const openModal = () => {
        setSelectedFile(null);
        setPreview("");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setPreview("");
    };

    // ✅ Khi chọn file ảnh (dùng input thuần)
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // ✅ Thêm banner mới
    const handleAddBanner = async () => {
        if (!selectedFile) {
            message.warning("Vui lòng chọn ảnh!");
            return;
        }

        const formData = new FormData();
        formData.append("image", selectedFile);

        try {
            setLoading(true);
            await axios.post(API_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            message.success("Thêm banner thành công!");
            closeModal();
            fetchBanners();
        } catch (error) {
            console.error(error);
            message.error("Không thể thêm banner!");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Xóa banner
    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            message.success("Xóa banner thành công!");
            fetchBanners();
        } catch (error) {
            message.error("Không thể xóa banner!");
        }
    };

    // ✅ Cấu hình bảng
    const columns = [
        {
            title: "Ảnh Banner",
            dataIndex: "image",
            render: (image) => (
                <img
                    src={
                        image.startsWith("http")
                            ? image
                            : `http://localhost:3000${image.startsWith("/uploads") ? image : "/uploads/" + image}`
                    }
                    alt="banner"
                    style={{
                        width: 200,
                        height: "auto",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                    }}
                />
            ),
        },
        {
            title: "Hành động",
            render: (_, record) => (
                <Popconfirm
                    title="Bạn có chắc muốn xóa banner này?"
                    onConfirm={() => handleDelete(record._id)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ marginLeft: 8 }}
                    >
                        Xóa
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>🖼️ Quản lý Banner</h2>

            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openModal}
                style={{ marginBottom: 16 }}
            >
                Thêm Banner
            </Button>

            <Spin spinning={loading}>
                <Table
                    dataSource={banners}
                    columns={columns}
                    rowKey="_id"
                    bordered
                    pagination={{ pageSize: 5 }}
                />
            </Spin>

            {/* 🧩 Dialog thêm banner */}
            <Modal
                title="Thêm Banner Mới"
                open={isModalOpen}
                onOk={handleAddBanner}
                onCancel={closeModal}
                okText="Thêm"
                cancelText="Hủy"
            >
                <div style={{ textAlign: "center" }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{
                            margin: "12px 0",
                            border: "1px solid #ccc",
                            padding: "8px",
                            borderRadius: "6px",
                            width: "100%",
                        }}
                    />
                    {preview && (
                        <img
                            src={preview}
                            alt="preview"
                            style={{
                                width: "100%",
                                maxHeight: 200,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid #ccc",
                                marginTop: 8,
                            }}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}
