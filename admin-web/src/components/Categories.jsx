import React, { useEffect, useState } from "react";
import { Table, Button, message, Modal, Input, Form } from "antd";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const [form] = Form.useForm();

    // Lấy danh sách danh mục từ API
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/api/categories");
            if (!res.ok) throw new Error("Lỗi khi fetch danh mục!");
            const data = await res.json();
            setCategories(data);
        } catch (error) {
            console.error(error);
            message.error("Không thể tải danh sách danh mục");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Mở modal thêm danh mục
    const openAddModal = () => {
        setEditingCategory(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    // Mở modal sửa danh mục
    const openEditModal = (record) => {
        setEditingCategory(record);
        form.setFieldsValue({ name: record.name, description: record.description });
        setIsModalOpen(true);
    };

    // Xử lý submit modal
    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingCategory) {
                // Sửa
                const res = await fetch(`http://localhost:3000/api/categories/${editingCategory._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });
                if (!res.ok) throw new Error("Cập nhật thất bại!");
                message.success("Cập nhật thành công!");
            } else {
                // Thêm mới
                const res = await fetch("http://localhost:3000/api/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });
                if (!res.ok) throw new Error("Thêm mới thất bại!");
                message.success("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            console.error(error);
            message.error(error.message || "Thao tác thất bại!");
        }
    };

    // Ẩn/Hiện danh mục
    const handleToggleVisibility = async (record) => {
        const action = record.isActive ? "ẩn" : "hiển thị";
        if (!window.confirm(`Bạn có chắc muốn ${action} danh mục "${record.name}"?`)) return;

        try {
            const res = await fetch(`http://localhost:3000/api/categories/${record._id}/toggle-visibility`, {
                method: "PATCH",
            });
            if (!res.ok) throw new Error(`${action === "ẩn" ? "Ẩn" : "Hiển thị"} thất bại!`);
            message.success(`${action === "ẩn" ? "Ẩn" : "Hiển thị"} danh mục thành công!`);
            fetchCategories();
        } catch (error) {
            console.error(error);
            message.error(`${action === "ẩn" ? "Ẩn" : "Hiển thị"} thất bại!`);
        }
    };

    const columns = [
        {
            title: "Tên danh mục",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Trạng thái",
            key: "status",
            render: (_, record) => (
                <span style={{ color: record.isActive ? "#52c41a" : "#ff4d4f", fontWeight: "bold" }}>
                    {record.isActive ? "Hiển thị" : "Đã ẩn"}
                </span>
            ),
        },
        {
            title: "Thao tác",
            key: "action",
            render: (_, record) => (
                <div style={{ display: "flex", gap: 8 }}>
                    <Button type="primary" size="small" style={{ height: 32 }} onClick={() => openEditModal(record)}>
                        Sửa
                    </Button>
                    <Button 
                        type="primary" 
                        danger={record.isActive} 
                        size="small" 
                        style={{ height: 32 }} 
                        onClick={() => handleToggleVisibility(record)}
                    >
                        {record.isActive ? "Ẩn danh mục" : "Hiển thị"}
                    </Button>
                </div>
            ),
        },

    ];

    return (
        <div style={{ padding: 20 }}>
            <h2>🏷️ Quản lý danh mục</h2>
            <Button type="primary" style={{ marginBottom: 16 }} onClick={openAddModal}>
                Thêm danh mục mới
            </Button>

            <Table
                columns={columns}
                dataSource={categories.map((item) => ({ ...item, key: item._id }))}
                loading={loading}
            />

            {/* Modal Thêm/Sửa */}
            <Modal
                title={editingCategory ? "Sửa danh mục" : "Thêm danh mục mới"}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={() => setIsModalOpen(false)}
                okText="Lưu"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Tên danh mục"
                        name="name"
                        rules={[{ required: true, message: "Vui lòng nhập tên danh mục" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
