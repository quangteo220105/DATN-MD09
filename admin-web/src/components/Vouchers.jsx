import React, { useEffect, useState } from "react";
import { Table, Button, Modal, message, Popconfirm, Spin, Input, Select, DatePicker, Switch, Tag } from "antd";
import { DeleteOutlined, PlusOutlined, EditOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const API_URL = "http://localhost:3000/api/vouchers";
const { TextArea } = Input;

export default function Vouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
        discountType: "percent",
        discountValue: "",
        minOrderAmount: "",
        maxDiscountAmount: "",
        categoryIds: [],
        quantity: "",
        startDate: null,
        endDate: null,
        isActive: true
    });

    // Load danh sách voucher
    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_URL);
            setVouchers(res.data);
        } catch (error) {
            message.error("Không thể tải danh sách voucher!");
        } finally {
            setLoading(false);
        }
    };

    // Load danh sách categories
    const fetchCategories = async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/categories");
            setCategories(res.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchVouchers();
        fetchCategories();
    }, []);

    // Debug: theo dõi categoryIds khi formData thay đổi
    useEffect(() => {
        if (isModalOpen) {
            console.log('FormData categoryIds:', formData.categoryIds, 'Type:', typeof formData.categoryIds, 'IsArray:', Array.isArray(formData.categoryIds));
        }
    }, [formData.categoryIds, isModalOpen]);

    const openModal = () => {
        setEditingId(null);
        setFormData({
            code: "",
            name: "",
            description: "",
            discountType: "percent",
            discountValue: "",
            minOrderAmount: "",
            maxDiscountAmount: "",
            categoryIds: [],
            quantity: "",
            startDate: null,
            endDate: null,
            isActive: true
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Không reset formData ngay, để giữ giá trị khi user muốn mở lại
        setTimeout(() => {
            if (!isModalOpen) {
                setEditingId(null);
            }
        }, 300);
    };

    const openEditModal = (record) => {
        setEditingId(record._id);
        setFormData({
            code: record.code,
            name: record.name,
            description: record.description,
            discountType: record.discountType,
            discountValue: record.discountValue,
            minOrderAmount: record.minOrderAmount,
            maxDiscountAmount: record.maxDiscountAmount || "",
            categoryIds: record.categoryIds && record.categoryIds.length > 0
                ? record.categoryIds.map(id => String(id))
                : [],
            quantity: record.quantity,
            startDate: dayjs(record.startDate),
            endDate: dayjs(record.endDate),
            isActive: record.isActive
        });
        setIsModalOpen(true);
    };

    const handleAdd = async () => {
        if (!formData.code || !formData.name || !formData.discountValue || !formData.quantity || !formData.startDate || !formData.endDate) {
            message.warning("Vui lòng điền đầy đủ thông tin!");
            return;
        }

        try {
            setLoading(true);

            // Đảm bảo categoryIds luôn là array
            const categoryIdsArray = Array.isArray(formData.categoryIds) && formData.categoryIds.length > 0
                ? formData.categoryIds.filter(id => id) // Loại bỏ giá trị null/undefined
                : [];

            console.log('Submitting data:', {
                ...formData,
                categoryIds: categoryIdsArray,
                categoryIdsType: typeof formData.categoryIds,
                categoryIdsLength: formData.categoryIds?.length
            });

            // Đảm bảo tất cả giá trị đều có giá trị hợp lệ
            const data = {
                code: String(formData.code).trim().toUpperCase(),
                name: String(formData.name).trim(),
                description: formData.description ? String(formData.description).trim() : "",
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : 0,
                categoryIds: categoryIdsArray, // Luôn gửi, có thể là empty array
                quantity: Number(formData.quantity),
                startDate: formData.startDate.format('YYYY-MM-DD HH:mm:ss'),
                endDate: formData.endDate.format('YYYY-MM-DD HH:mm:ss'),
                isActive: formData.isActive !== undefined ? Boolean(formData.isActive) : true
            };

            // Đảm bảo categoryIds luôn là array khi gửi
            if (!Array.isArray(data.categoryIds)) {
                data.categoryIds = [];
            }

            console.log('Final data being sent:', JSON.stringify(data, null, 2));

            let response;
            if (editingId) {
                response = await axios.put(`${API_URL}/${editingId}`, data);
                console.log('Update response:', response.data);
                console.log('Updated voucher categoryIds:', response.data.voucher?.categoryIds);

                // Kiểm tra xem categoryIds có được trả về không
                if (response.data.voucher) {
                    console.log('Voucher sau update:', {
                        _id: response.data.voucher._id,
                        code: response.data.voucher.code,
                        categoryIds: response.data.voucher.categoryIds,
                        categoryIdsType: typeof response.data.voucher.categoryIds,
                        isArray: Array.isArray(response.data.voucher.categoryIds)
                    });
                }

                message.success("Cập nhật voucher thành công!");
            } else {
                response = await axios.post(API_URL, data);
                console.log('Create response:', response.data);
                message.success("Thêm voucher thành công!");
            }

            // Reset form data trước khi đóng modal
            setFormData({
                code: "",
                name: "",
                description: "",
                discountType: "percent",
                discountValue: "",
                minOrderAmount: "",
                maxDiscountAmount: "",
                categoryIds: [],
                quantity: "",
                startDate: null,
                endDate: null,
                isActive: true
            });

            // Đóng modal và refresh danh sách
            setIsModalOpen(false);
            setEditingId(null);

            // Refresh danh sách voucher ngay lập tức
            await fetchVouchers();

            console.log('✅ Voucher operation completed successfully');
        } catch (error) {
            console.error('Error in handleAdd:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            // Đảm bảo loading state được reset
            setLoading(false);

            // Đảm bảo modal vẫn mở nếu có lỗi để user có thể sửa
            if (!error.response) {
                message.error("Không thể kết nối đến server!");
            } else if (error.response.status === 400) {
                message.error(error.response.data?.message || "Dữ liệu không hợp lệ!");
            } else if (error.response.status === 404) {
                message.error("Không tìm thấy voucher!");
            } else {
                message.error(error.response.data?.message || "Có lỗi xảy ra!");
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            message.success("Xóa voucher thành công!");
            fetchVouchers();
        } catch (error) {
            message.error("Không thể xóa voucher!");
        }
    };

    const formatDate = (date) => {
        return dayjs(date).format('DD/MM/YYYY HH:mm');
    };

    const isExpired = (endDate) => {
        return new Date(endDate) < new Date();
    };

    const getStatus = (record) => {
        if (!record.isActive) return { text: 'Tắt', color: 'default' };
        if (isExpired(record.endDate)) return { text: 'Hết hạn', color: 'error' };
        if (record.usedCount >= record.quantity) return { text: 'Hết lượt', color: 'warning' };
        if (new Date(record.startDate) > new Date()) return { text: 'Chưa bắt đầu', color: 'cyan' };
        return { text: 'Hoạt động', color: 'success' };
    };

    const columns = [
        {
            title: "Mã Voucher",
            dataIndex: "code",
            key: "code",
            width: 120,
            render: (text) => <strong style={{ color: '#1890ff' }}>{text}</strong>
        },
        {
            title: "Tên",
            dataIndex: "name",
            key: "name",
            width: 150
        },
        {
            title: "Giảm giá",
            key: "discount",
            width: 120,
            render: (_, record) => (
                <div>
                    {record.discountType === 'percent' ? (
                        <Tag color="blue">{record.discountValue}%</Tag>
                    ) : (
                        <Tag color="green">{record.discountValue.toLocaleString('vi-VN')} đ</Tag>
                    )}
                </div>
            )
        },
        {
            title: "Danh mục",
            key: "categoryIds",
            width: 150,
            render: (_, record) => {
                if (!record.categoryIds || record.categoryIds.length === 0) {
                    return <Tag color="default">Tất cả</Tag>;
                }
                const categoryNames = record.categoryIds.map(catId => {
                    const cat = categories.find(c => String(c._id) === String(catId));
                    return cat ? cat.name : 'Unknown';
                });
                return (
                    <div>
                        {categoryNames.map((name, idx) => (
                            <Tag key={idx} color="purple" style={{ marginBottom: 4 }}>
                                {name}
                            </Tag>
                        ))}
                    </div>
                );
            }
        },
        {
            title: "Đơn tối thiểu",
            dataIndex: "minOrderAmount",
            key: "minOrderAmount",
            width: 120,
            render: (amount) => amount > 0 ? `${amount.toLocaleString('vi-VN')} đ` : 'Không'
        },
        {
            title: "Số lượng",
            key: "quantity",
            width: 100,
            render: (_, record) => (
                <div>
                    <Tag color="purple">{record.usedCount}/{record.quantity}</Tag>
                </div>
            )
        },
        {
            title: "Thời gian",
            key: "date",
            width: 200,
            render: (_, record) => (
                <div style={{ fontSize: '12px' }}>
                    <div>Bắt đầu: {formatDate(record.startDate)}</div>
                    <div>Kết thúc: {formatDate(record.endDate)}</div>
                </div>
            )
        },
        {
            title: "Trạng thái",
            key: "status",
            width: 120,
            render: (_, record) => {
                const status = getStatus(record);
                return <Tag color={status.color}>{status.text}</Tag>;
            }
        },
        {
            title: "Hành động",
            key: "actions",
            width: 150,
            render: (_, record) => (
                <div>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                        style={{ marginRight: 8 }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc muốn xóa voucher này?"
                        onConfirm={() => handleDelete(record._id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button
                            type="primary"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>Quản lý Voucher / Mã giảm giá</h2>

            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openModal}
                style={{ marginBottom: 16 }}
            >
                Thêm Voucher
            </Button>

            <Spin spinning={loading}>
                <Table
                    dataSource={vouchers}
                    columns={columns}
                    rowKey="_id"
                    bordered
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1200 }}
                />
            </Spin>

            {/* Dialog thêm/sửa voucher */}
            <Modal
                title={editingId ? "Sửa Voucher" : "Thêm Voucher Mới"}
                open={isModalOpen}
                onOk={handleAdd}
                onCancel={closeModal}
                okText={editingId ? "Cập nhật" : "Thêm"}
                cancelText="Hủy"
                width={700}
                okButtonProps={{ loading: loading }}
                cancelButtonProps={{ disabled: loading }}
                maskClosable={!loading}
                closable={!loading}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label><strong>Mã Voucher *</strong></label>
                        <Input
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            placeholder="VD: WELCOME10"
                            disabled={!!editingId}
                        />
                    </div>

                    <div>
                        <label><strong>Tên Voucher *</strong></label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="VD: Khuyến mãi đặc biệt 10%"
                        />
                    </div>

                    <div>
                        <label><strong>Mô tả</strong></label>
                        <TextArea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Mô tả về voucher"
                            rows={2}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label><strong>Loại giảm giá *</strong></label>
                            <Select
                                value={formData.discountType}
                                onChange={(value) => setFormData({ ...formData, discountType: value })}
                                style={{ width: '100%' }}
                            >
                                <Select.Option value="percent">Phần trăm (%)</Select.Option>
                                <Select.Option value="fixed">Số tiền cố định (VNĐ)</Select.Option>
                            </Select>
                        </div>

                        <div style={{ flex: 1 }}>
                            <label><strong>Giá trị giảm *</strong></label>
                            <Input
                                type="number"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                placeholder={formData.discountType === 'percent' ? 'VD: 10' : 'VD: 50000'}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label><strong>Đơn hàng tối thiểu (VNĐ)</strong></label>
                            <Input
                                type="number"
                                value={formData.minOrderAmount}
                                onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                placeholder="VD: 300000"
                            />
                        </div>

                        {formData.discountType === 'percent' && (
                            <div style={{ flex: 1 }}>
                                <label><strong>Giảm tối đa (VNĐ)</strong></label>
                                <Input
                                    type="number"
                                    value={formData.maxDiscountAmount}
                                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                                    placeholder="VD: 100000"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label><strong>Số lượng voucher *</strong></label>
                        <Input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="VD: 100"
                        />
                    </div>

                    <div>
                        <label><strong>Danh mục áp dụng (tùy chọn)</strong></label>
                        <Select
                            key={`category-select-${editingId || 'new'}-${isModalOpen}`}
                            mode="multiple"
                            value={(() => {
                                const ids = Array.isArray(formData.categoryIds)
                                    ? formData.categoryIds.map(id => String(id)).filter(id => id)
                                    : [];
                                console.log('Select value rendered:', ids);
                                return ids;
                            })()}
                            onChange={(value) => {
                                console.log('CategoryIds onChange triggered:', value);
                                const cleanValue = Array.isArray(value)
                                    ? value.filter(v => v !== null && v !== undefined && v !== '').map(v => String(v))
                                    : [];
                                console.log('CategoryIds cleaned:', cleanValue);
                                setFormData(prev => {
                                    const updated = { ...prev, categoryIds: cleanValue };
                                    console.log('FormData updated:', updated.categoryIds);
                                    return updated;
                                });
                            }}
                            style={{ width: '100%' }}
                            placeholder="Chọn danh mục (để trống = áp dụng cho tất cả)"
                            allowClear
                            maxTagCount="responsive"
                            notFoundContent={categories.length === 0 ? "Đang tải danh mục..." : "Không có danh mục"}
                        >
                            {categories.map(cat => (
                                <Select.Option key={cat._id} value={String(cat._id)}>
                                    {cat.name}
                                </Select.Option>
                            ))}
                        </Select>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                            Nếu không chọn, voucher sẽ áp dụng cho tất cả danh mục. Nếu chọn, chỉ áp dụng cho các danh mục đã chọn.
                        </div>
                        {formData.categoryIds && formData.categoryIds.length > 0 && (
                            <div style={{ fontSize: 12, color: '#1890ff', marginTop: 4 }}>
                                Đã chọn {formData.categoryIds.length} danh mục
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label><strong>Ngày bắt đầu *</strong></label>
                            <DatePicker
                                showTime
                                value={formData.startDate}
                                onChange={(date) => setFormData({ ...formData, startDate: date })}
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY HH:mm"
                            />
                        </div>

                        <div style={{ flex: 1 }}>
                            <label><strong>Ngày kết thúc *</strong></label>
                            <DatePicker
                                showTime
                                value={formData.endDate}
                                onChange={(date) => setFormData({ ...formData, endDate: date })}
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY HH:mm"
                            />
                        </div>
                    </div>

                    <div>
                        <label><strong>Trạng thái</strong></label>
                        <div>
                            <Switch
                                checked={formData.isActive}
                                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                            <span style={{ marginLeft: 8 }}>{formData.isActive ? 'Hoạt động' : 'Tắt'}</span>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
