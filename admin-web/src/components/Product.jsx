import React, { useEffect, useState } from "react";

export default function ManagerDashboard() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);

    // 🟢 Form state với multiple variants
    const [formProduct, setFormProduct] = useState({
        name: "",
        description: "",
        brand: "",
        categoryId: "",
        isActive: true,
        variants: [
            {
                size: "",
                color: "",
                originalPrice: "",
                currentPrice: "",
                stock: "",
                imageFile: null,
            }
        ],
    });

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/products");
            const data = await res.json();
            setProducts(data);
            setLoading(false);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/categories");
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    // 🟢 Thêm variant mới
    const addVariant = () => {
        setFormProduct({
            ...formProduct,
            variants: [
                ...formProduct.variants,
                {
                    size: "",
                    color: "",
                    originalPrice: "",
                    currentPrice: "",
                    stock: "",
                    imageFile: null,
                }
            ]
        });

        // Thông báo ngắn gọn
        console.log(`✅ Đã thêm biến thể mới (tổng: ${formProduct.variants.length + 1} biến thể)`);

        // Tự động scroll xuống biến thể mới sau khi render
        setTimeout(() => {
            const variantCards = document.querySelectorAll('[data-variant-card]');
            if (variantCards.length > 0) {
                const lastCard = variantCards[variantCards.length - 1];
                lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    // 🟢 Xóa variant
    const removeVariant = (index) => {
        const newVariants = formProduct.variants.filter((_, i) => i !== index);

        // Nếu xóa hết biến thể, tạo một biến thể trống mới
        if (newVariants.length === 0) {
            setFormProduct({
                ...formProduct,
                variants: [{
                    size: "",
                    color: "",
                    originalPrice: "",
                    currentPrice: "",
                    stock: "",
                    imageFile: null,
                }]
            });
        } else {
            setFormProduct({
                ...formProduct,
                variants: newVariants
            });
        }
    };

    // 🟢 Cập nhật variant
    const updateVariant = (index, field, value) => {
        const newVariants = [...formProduct.variants];
        newVariants[index] = {
            ...newVariants[index],
            [field]: value
        };
        setFormProduct({
            ...formProduct,
            variants: newVariants
        });
    };

    // 🟢 Cập nhật ảnh cho variant
    const updateVariantImage = (index, file) => {
        const newVariants = [...formProduct.variants];
        newVariants[index] = {
            ...newVariants[index],
            imageFile: file
        };
        setFormProduct({
            ...formProduct,
            variants: newVariants
        });
    };

    // 🟢 Submit form với multiple variants
    const handleSubmit = async () => {
        if (!formProduct.name || !formProduct.categoryId) {
            alert("Tên sản phẩm và danh mục là bắt buộc!");
            return;
        }

        // ✅ Kiểm tra từng biến thể
        for (let i = 0; i < formProduct.variants.length; i++) {
            const v = formProduct.variants[i];
            if (!v.size || !v.color || !v.originalPrice || !v.currentPrice || !v.stock || !v.imageFile) {
                alert(`Vui lòng điền đủ thông tin biến thể ${i + 1} và chọn ảnh!`);
                return;
            }
        }

        const formData = new FormData();
        formData.append("name", formProduct.name);
        formData.append("description", formProduct.description);
        formData.append("brand", formProduct.brand);
        formData.append("categoryId", formProduct.categoryId);
        formData.append("isActive", formProduct.isActive ? "true" : "false");

        // ✅ Gửi danh sách variants dưới dạng JSON (chưa có ảnh)
        const variantsPayload = formProduct.variants.map((v, index) => ({
            size: v.size,
            color: v.color,
            originalPrice: Number(v.originalPrice),
            currentPrice: Number(v.currentPrice),
            stock: Number(v.stock),
            imageIndex: index, // giúp backend biết ảnh nào khớp với biến thể
        }));
        formData.append("variants", JSON.stringify(variantsPayload));

        // ✅ Gắn từng ảnh vào FormData
        formProduct.variants.forEach((v, index) => {
            if (v.imageFile) {
                formData.append(`image-${index}`, v.imageFile);
            }
        });

        try {
            const res = await fetch("http://localhost:3000/api/products", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                alert("✅ Thêm sản phẩm thành công!");
                fetchProducts();
                setShowModal(false);
                resetForm();
            } else {
                alert(data.message || "❌ Lỗi thêm sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };

    // 🟢 Reset form
    const resetForm = () => {
        setFormProduct({
            name: "",
            description: "",
            brand: "",
            categoryId: "",
            isActive: true,
            variants: [
                {
                    size: "",
                    color: "",
                    originalPrice: "",
                    currentPrice: "",
                    stock: "",
                    imageFile: null,
                }
            ],
        });
    };

    // 🟢 Khi click "Sửa" trên table
    const handleEditClick = (product) => {
        setEditingProduct(product);

        // Load tất cả variants của sản phẩm
        const variants = product.variants?.map(variant => ({
            _id: variant._id,
            size: variant.size || "",
            color: variant.color || "",
            originalPrice: variant.originalPrice || "",
            currentPrice: variant.currentPrice || "",
            stock: variant.stock || "",
            imageFile: null,
            existingImage: variant.image || null
        })) || [{
            size: "",
            color: "",
            originalPrice: "",
            currentPrice: "",
            stock: "",
            imageFile: null,
        }];

        setFormProduct({
            name: product.name || "",
            description: product.description || "",
            brand: product.brand || "",
            categoryId: product.categoryId || "",
            isActive: product.isActive,
            variants: variants
        });

        setShowModal(true);
    };

    // 🟢 Ngừng bán sản phẩm
    const handleStopSelling = async (productId) => {
        if (!window.confirm("Bạn có chắc chắn muốn ngừng bán sản phẩm này?")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/products/${productId}/toggle-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ isActive: false }),
            });
            const data = await res.json();

            if (res.ok) {
                alert("✅ Đã ngừng bán sản phẩm!");
                fetchProducts();
            } else {
                alert(data.message || "❌ Lỗi ngừng bán sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };

    // 🟢 Tiếp tục bán sản phẩm
    const handleResumeSelling = async (productId) => {
        if (!window.confirm("Bạn có chắc chắn muốn tiếp tục bán sản phẩm này?")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/products/${productId}/toggle-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ isActive: true }),
            });
            const data = await res.json();

            if (res.ok) {
                alert("✅ Đã tiếp tục bán sản phẩm!");
                fetchProducts();
            } else {
                alert(data.message || "❌ Lỗi tiếp tục bán sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };

    // 🟢 Hàm submit sửa với multiple variants
    const handleUpdate = async () => {
        if (!formProduct.name || !formProduct.categoryId) {
            alert("Tên sản phẩm và danh mục là bắt buộc!");
            return;
        }

        const formData = new FormData();
        formData.append("name", formProduct.name);
        formData.append("description", formProduct.description);
        formData.append("brand", formProduct.brand);
        formData.append("categoryId", formProduct.categoryId);
        formData.append("isActive", formProduct.isActive ? "true" : "false");

        // ✅ Cho phép thay toàn bộ biến thể
        formData.append("replaceVariants", "true");

        const variantsPayload = formProduct.variants.map((v, index) => ({
            size: v.size,
            color: v.color,
            originalPrice: Number(v.originalPrice) || 0,
            currentPrice: Number(v.currentPrice) || 0,
            stock: Number(v.stock) || 0,
            imageIndex: index,
        }));

        formData.append("variants", JSON.stringify(variantsPayload));

        formProduct.variants.forEach((v, index) => {
            if (v.imageFile) {
                formData.append(`image-${index}`, v.imageFile);
            }
        });

        try {
            const res = await fetch(`http://localhost:3000/api/products/${editingProduct._id}`, {
                method: "PUT",
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                alert("✅ Cập nhật sản phẩm thành công!");
                fetchProducts();
                setShowModal(false);
                setEditingProduct(null);
            } else {
                alert(data.message || "❌ Lỗi cập nhật sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };


    return (
        <>
            <style>
                {`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .addVariantInlineBtn:hover {
                        background-color: #2563eb !important;
                        transform: scale(1.1);
                    }
                    
                    .removeVariantBtn:hover {
                        background-color: #dc2626 !important;
                        transform: scale(1.1);
                    }
                `}
            </style>
            <div style={styles.page}>
                <div style={styles.mainContent}>
                    <div style={styles.headerRow}>
                        <span style={styles.sectionTitle}>Danh sách sản phẩm</span>
                        <button style={styles.primaryBtn} onClick={() => setShowModal(true)}>
                            + Thêm sản phẩm
                        </button>
                    </div>

                    {loading ? (
                        <p>Đang tải sản phẩm...</p>
                    ) : products.length === 0 ? (
                        <p>Chưa có sản phẩm nào</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Ảnh</th>
                                    <th style={styles.th}>Tên sản phẩm</th>
                                    <th style={styles.th}>Thương hiệu</th>
                                    <th style={styles.th}>Danh mục</th>
                                    <th style={styles.th}>Số biến thể</th>
                                    <th style={styles.th}>Tổng số lượng</th>
                                    <th style={styles.th}>Giá từ</th>
                                    <th style={styles.th}>Trạng thái</th>
                                    <th style={styles.th}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => {
                                    const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                                    const minPrice = p.variants?.reduce((min, v) =>
                                        Math.min(min, v.currentPrice || Infinity), Infinity) || 0;
                                    const categoryName = categories.find(c => c._id === p.categoryId)?.name || "—";

                                    return (
                                        <tr key={p._id} style={{ height: 90 }}>
                                            <td style={styles.td}>
                                                {p.variants?.[0]?.image ? (
                                                    <img
                                                        src={`http://localhost:3000${p.variants[0].image}`}
                                                        alt={p.name}
                                                        style={{
                                                            width: "80px",
                                                            height: "80px",
                                                            objectFit: "cover",
                                                            borderRadius: "10px",
                                                            display: "inline-block",
                                                        }}
                                                    />
                                                ) : (
                                                    <span>Không có ảnh</span>
                                                )}
                                            </td>

                                            <td style={styles.td}>{p.name}</td>
                                            <td style={styles.td}>{p.brand}</td>
                                            <td style={styles.td}>{categoryName}</td>
                                            <td style={styles.td}>{p.variants?.length || 0}</td>
                                            <td style={styles.td}>{totalStock}</td>
                                            <td style={styles.td}>
                                                {minPrice > 0 ? `${minPrice.toLocaleString()} ₫` : "—"}
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.statusContainer}>
                                                    {totalStock > 0 ? (
                                                        p.isActive ? (
                                                            <span style={styles.activeStatus}>🟢 Còn hàng</span>
                                                        ) : (
                                                            <span style={styles.inactiveStatus}>🔴 Ngừng kinh doanh</span>
                                                        )
                                                    ) : (
                                                        <span style={styles.outOfStockStatus}>⚫ Hết hàng</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={styles.td}>
                                                <div style={styles.actionButtons}>
                                                    <button style={styles.editBtn} onClick={() => handleEditClick(p)}>
                                                        Sửa
                                                    </button>
                                                    {p.isActive ? (
                                                        <button
                                                            style={styles.stopSellingBtn}
                                                            onClick={() => handleStopSelling(p._id)}
                                                            title="Ngừng bán sản phẩm này"
                                                        >
                                                            Ngừng bán
                                                        </button>
                                                    ) : (
                                                        <button
                                                            style={styles.resumeSellingBtn}
                                                            onClick={() => handleResumeSelling(p._id)}
                                                            title="Tiếp tục bán sản phẩm này"
                                                        >
                                                            Tiếp tục bán
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                </div>

                {/* ===== Modal Thêm/Sửa sản phẩm ===== */}
                {showModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <h3 style={{ marginBottom: 16 }}>{editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h3>

                            <div style={styles.formGroup}>
                                <label>Tên sản phẩm:</label>
                                <input
                                    type="text"
                                    value={formProduct.name}
                                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>Thương hiệu:</label>
                                <input
                                    type="text"
                                    value={formProduct.brand}
                                    onChange={(e) => setFormProduct({ ...formProduct, brand: e.target.value })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>Mô tả:</label>
                                <textarea
                                    value={formProduct.description}
                                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label>Danh mục:</label>
                                <select
                                    value={formProduct.categoryId}
                                    onChange={(e) => setFormProduct({ ...formProduct, categoryId: e.target.value })}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.formGroup}>
                                <label>Trạng thái:</label>
                                <select
                                    value={formProduct.isActive}
                                    onChange={(e) => setFormProduct({ ...formProduct, isActive: e.target.value === "true" })}
                                >
                                    <option value="true">Còn hàng</option>
                                    <option value="false">Ngừng kinh doanh</option>
                                </select>
                            </div>

                            <div style={styles.variantsSection}>
                                <div style={styles.variantsHeader}>
                                    <div>
                                        <h4>Biến thể sản phẩm</h4>
                                        <small style={{ color: "#6b7280", fontSize: "12px" }}>
                                            Hiện có {formProduct.variants.length} biến thể • Click ➕ trong mỗi biến thể để thêm mới
                                        </small>
                                    </div>
                                    <button type="button" style={styles.addVariantBtn} onClick={addVariant}>
                                        ➕ Thêm biến thể
                                    </button>
                                </div>

                                {formProduct.variants.map((variant, index) => (
                                    <div key={index} style={styles.variantCard} data-variant-card>
                                        <div style={styles.variantHeader}>
                                            <h5>Biến thể {index + 1}</h5>
                                            <div style={styles.variantActions}>
                                                <button
                                                    type="button"
                                                    className="addVariantInlineBtn"
                                                    style={styles.addVariantInlineBtn}
                                                    onClick={addVariant}
                                                    title="Thêm biến thể mới"
                                                >
                                                    ➕
                                                </button>
                                                <button
                                                    type="button"
                                                    className="removeVariantBtn"
                                                    style={styles.removeVariantBtn}
                                                    onClick={() => removeVariant(index)}
                                                    title="Xóa biến thể này"
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        </div>

                                        <div style={styles.variantRow}>
                                            <div style={styles.inputGroup}>
                                                <label>Size:</label>
                                                <input
                                                    placeholder="VD: 40, 41, 42..."
                                                    value={variant.size}
                                                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label>Màu:</label>
                                                <input
                                                    placeholder="VD: Đen, Trắng, Xanh..."
                                                    value={variant.color}
                                                    onChange={(e) => updateVariant(index, 'color', e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label>Giá nhập:</label>
                                                <input
                                                    placeholder="Giá nhập"
                                                    type="number"
                                                    value={variant.originalPrice}
                                                    onChange={(e) => updateVariant(index, 'originalPrice', e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label>Giá bán:</label>
                                                <input
                                                    placeholder="Giá bán"
                                                    type="number"
                                                    value={variant.currentPrice}
                                                    onChange={(e) => updateVariant(index, 'currentPrice', e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label>Số lượng:</label>
                                                <input
                                                    placeholder="Số lượng"
                                                    type="number"
                                                    value={variant.stock}
                                                    onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                                                />
                                            </div>

                                            <div style={styles.inputGroup}>
                                                <label>Ảnh:</label>
                                                <div style={styles.imageUpload}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                updateVariantImage(index, e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                    {/* Preview ảnh */}
                                                    {(variant.imageFile || variant.existingImage) && (
                                                        <img
                                                            src={variant.imageFile ?
                                                                URL.createObjectURL(variant.imageFile) :
                                                                `http://localhost:3000${variant.existingImage}`
                                                            }
                                                            alt="Preview"
                                                            style={styles.previewImage}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    style={styles.primaryBtn}
                                    onClick={editingProduct ? handleUpdate : handleSubmit}
                                >
                                    {editingProduct ? "Cập nhật" : "Lưu"}
                                </button>
                                <button
                                    style={styles.cancelBtn}
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditingProduct(null);
                                        resetForm();
                                    }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

// ===== Styles =====
const styles = {
    page: {
        padding: 16,
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Arial, sans-serif",
    },
    mainContent: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
    },
    sectionTitle: { fontSize: 18, fontWeight: 700 },
    primaryBtn: {
        backgroundColor: "#2563eb",
        padding: "8px 20px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        border: "none",
        minWidth: 100,
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
        border: "1px solid #e5e7eb",
        padding: "8px",
        textAlign: "center",
        verticalAlign: "middle",
        backgroundColor: "#f9fafb",
        fontWeight: 600,
    },
    td: {
        border: "1px solid #e5e7eb",
        padding: "8px",
        textAlign: "center",
        verticalAlign: "middle",
    },
    actionButtons: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        alignItems: "center",
    },
    editBtn: {
        backgroundColor: "#007bff",
        border: "none",
        padding: "4px 10px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        minWidth: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    stopSellingBtn: {
        backgroundColor: "#dc3545",
        border: "none",
        padding: "4px 10px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        minWidth: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    resumeSellingBtn: {
        backgroundColor: "#28a745",
        border: "none",
        padding: "4px 10px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        fontSize: "12px",
        minWidth: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    statusContainer: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    activeStatus: {
        color: "#28a745",
        fontWeight: "600",
        fontSize: "12px",
    },
    inactiveStatus: {
        color: "#dc3545",
        fontWeight: "600",
        fontSize: "12px",
    },
    outOfStockStatus: {
        color: "#6c757d",
        fontWeight: "600",
        fontSize: "12px",
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    modal: {
        backgroundColor: "#fff",
        padding: 24,
        borderRadius: 10,
        width: "90%",
        maxWidth: 1000,
        maxHeight: "90vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        marginBottom: 12,
    },
    variantsSection: {
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        backgroundColor: "#f9fafb",
    },
    variantsHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    addVariantBtn: {
        backgroundColor: "#10b981",
        color: "#fff",
        border: "none",
        padding: "8px 16px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
    },
    variantCard: {
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        backgroundColor: "#fff",
        transition: "all 0.3s ease",
        animation: "fadeInUp 0.5s ease-out",
    },
    variantHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    variantActions: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
    addVariantInlineBtn: {
        backgroundColor: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 28,
        height: 28,
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
    },
    removeVariantBtn: {
        backgroundColor: "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 28,
        height: 28,
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
    },
    variantRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
    },
    imageUpload: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    previewImage: {
        width: 80,
        height: 80,
        objectFit: "cover",
        borderRadius: 6,
        border: "1px solid #d1d5db",
    },
    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        backgroundColor: "#6b7280",
        color: "#fff",
        border: "none",
        padding: "8px 20px",
        borderRadius: 6,
        cursor: "pointer",
        minWidth: 100,
    },
};
