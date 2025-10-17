import React, { useEffect, useState } from "react";

export default function ManagerDashboard() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);

    // 🟢 Form state (1 biến thể duy nhất)
    const [formProduct, setFormProduct] = useState({
        name: "",
        description: "",
        brand: "",
        categoryId: "",
        isActive: true,
        variant: {
            size: "",
            color: "",
            originalPrice: "",
            currentPrice: "",
            stock: "",
            imageFile: null,
        },
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

    // 🟢 Submit form
    // 🟢 Submit form
    const handleSubmit = async () => {
        if (!formProduct.name || !formProduct.categoryId) {
            alert("Tên sản phẩm và danh mục là bắt buộc!");
            return;
        }

        const v = formProduct.variant;
        if (!v.size || !v.color || !v.originalPrice || !v.currentPrice || !v.stock || !v.imageFile) {
            alert("Vui lòng điền đầy đủ thông tin biến thể và chọn ảnh!");
            return;
        }

        const formData = new FormData();
        formData.append("name", formProduct.name);
        formData.append("description", formProduct.description);
        formData.append("brand", formProduct.brand);
        formData.append("categoryId", formProduct.categoryId);
        formData.append("isActive", formProduct.isActive);

        // ✅ Gửi variants dưới dạng JSON string
        const variantsPayload = [
            {
                size: Number(v.size),
                color: v.color,
                originalPrice: Number(v.originalPrice),
                currentPrice: Number(v.currentPrice),
                stock: Number(v.stock),
            },
        ];
        formData.append("variants", JSON.stringify(variantsPayload));

        // ✅ Thêm ảnh cho biến thể
        formData.append("image", v.imageFile);

        try {
            const res = await fetch("http://localhost:3000/api/products", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                alert("Thêm sản phẩm thành công!");
                fetchProducts();
                setShowModal(false);
                // Reset form
                setFormProduct({
                    name: "",
                    description: "",
                    brand: "",
                    categoryId: "",
                    isActive: true,
                    variant: {
                        size: "",
                        color: "",
                        originalPrice: "",
                        currentPrice: "",
                        stock: "",
                        imageFile: null,
                    },
                });
            } else {
                alert(data.message || "Lỗi thêm sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối server!");
        }
    };

    // 🟢 Khi click "Sửa" trên table
    const handleEditClick = (product) => {
        setEditingProduct(product);

        const firstVariant = product.variants?.[0] || {};
        setFormProduct({
            name: product.name || "",
            description: product.description || "",
            brand: product.brand || "",
            categoryId: product.categoryId || "",
            isActive: product.isActive,
            variant: {
                size: firstVariant.size || "",
                color: firstVariant.color || "",
                originalPrice: firstVariant.originalPrice || "",
                currentPrice: firstVariant.currentPrice || "",
                stock: firstVariant.stock || "",
                imageFile: null,
                _id: firstVariant._id || "", // lưu id biến thể để update
            },
        });

        setShowModal(true);
    };

    // 🟢 Hàm submit sửa
    const handleUpdate = async () => {
        if (!formProduct.name || !formProduct.categoryId) {
            alert("Tên sản phẩm và danh mục là bắt buộc!");
            return;
        }

        const v = formProduct.variant;
        if (!v.size || !v.color || !v.currentPrice || !v.stock) {
            alert("Vui lòng điền đầy đủ thông tin biến thể!");
            return;
        }

        const formData = new FormData();
        formData.append("name", formProduct.name);
        formData.append("description", formProduct.description);
        formData.append("brand", formProduct.brand);
        formData.append("categoryId", formProduct.categoryId);
        formData.append("isActive", formProduct.isActive);

        // gửi biến thể dưới dạng array JSON, giữ nguyên originalPrice
        const variantsPayload = [
            {
                _id: v._id, // bắt buộc để backend biết update biến thể nào
                size: v.size,
                color: v.color,
                currentPrice: Number(v.currentPrice),
                stock: Number(v.stock),
            },
        ];
        formData.append("variants", JSON.stringify(variantsPayload));

        // nếu chọn ảnh mới
        if (v.imageFile) {
            formData.append("image-0", v.imageFile); // backend sẽ map image-0
        }

        try {
            const res = await fetch(`http://localhost:3000/api/products/${editingProduct._id}`, {
                method: "PUT",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                alert("Cập nhật sản phẩm thành công!");
                fetchProducts();
                setShowModal(false);
                setEditingProduct(null);
            } else {
                alert(data.message || "Lỗi cập nhật sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối server!");
        }
    };

    return (
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
                                <th style={styles.th}>Size</th>          {/* thêm */}
                                <th style={styles.th}>Màu</th>           {/* thêm */}
                                <th style={styles.th}>Danh mục</th>      {/* thêm */}
                                <th style={styles.th}>Giá bán</th>
                                <th style={styles.th}>Số lượng</th>  {/* ✅ Thêm cột số lượng */}
                                <th style={styles.th}>Trạng thái</th>
                                <th style={styles.th}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => {
                                const firstVariant = p.variants?.[0];
                                const categoryName = categories.find(c => c._id === p.categoryId)?.name || "—";
                                return (
                                    <tr key={p._id} style={{ height: 90 }}>
                                        <td style={styles.td}>
                                            {firstVariant?.image ? (
                                                <img
                                                    src={`http://localhost:3000${firstVariant.image}`}
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
                                        <td style={styles.td}>{firstVariant.size || "—"}</td>           {/* size */}
                                        <td style={styles.td}>{firstVariant.color || "—"}</td>         {/* màu */}
                                        <td style={styles.td}>{categoryName}</td>                      {/* danh mục */}
                                        <td style={styles.td}>{firstVariant?.currentPrice?.toLocaleString() || "—"} ₫</td>
                                        <td style={styles.td}>{firstVariant?.stock || 0}</td> {/* ✅ Hiển thị số lượng */}
                                        <td style={styles.td}>
                                            {firstVariant?.stock > 0 ? (p.isActive ? "Còn hàng" : "Ngừng kinh doanh") : "Hết hàng"}
                                        </td>

                                        <td style={styles.td}>
                                            <button style={styles.editBtn} onClick={() => handleEditClick(p)}>Sửa</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

            </div>

            {/* ===== Modal Thêm sản phẩm ===== */}
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

                        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Biến thể</h4>
                        <div style={styles.variantRow}>
                            <input
                                placeholder="Size"
                                value={formProduct.variant.size}
                                onChange={(e) =>
                                    setFormProduct({ ...formProduct, variant: { ...formProduct.variant, size: e.target.value } })
                                }
                            />
                            <input
                                placeholder="Màu"
                                value={formProduct.variant.color}
                                onChange={(e) =>
                                    setFormProduct({ ...formProduct, variant: { ...formProduct.variant, color: e.target.value } })
                                }
                            />
                            <input
                                placeholder="Giá nhập"
                                type="number"
                                value={formProduct.variant.originalPrice}
                                disabled
                            />
                            <input
                                placeholder="Giá bán"
                                type="number"
                                value={formProduct.variant.currentPrice}
                                onChange={(e) =>
                                    setFormProduct({ ...formProduct, variant: { ...formProduct.variant, currentPrice: e.target.value } })
                                }
                            />
                            <input
                                placeholder="Số lượng"
                                type="number"
                                value={formProduct.variant.stock}
                                onChange={(e) =>
                                    setFormProduct({ ...formProduct, variant: { ...formProduct.variant, stock: e.target.value } })
                                }
                            />
                            {/* Chọn ảnh */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFormProduct({
                                                ...formProduct,
                                                variant: { ...formProduct.variant, imageFile: e.target.files[0] },
                                            });
                                        }
                                    }}
                                />
                                {/* Preview ảnh */}
                                {formProduct.variant.imageFile && (
                                    <img
                                        src={URL.createObjectURL(formProduct.variant.imageFile)}
                                        alt="Preview"
                                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                style={{
                                    ...styles.primaryBtn,
                                    flex: 1,            // chia đều chiều ngang
                                    maxWidth: 120,      // tùy chỉnh chiều ngang tối đa nếu muốn
                                }}
                                onClick={editingProduct ? handleUpdate : handleSubmit}
                            >
                                {editingProduct ? "Cập nhật" : "Lưu"}
                            </button>
                            <button
                                style={{
                                    ...styles.deleteBtn,
                                    flex: 1,            // chia đều chiều ngang
                                    maxWidth: 120,      // giống nút kia
                                }}
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
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
    topBar: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    },
    topBarTitle: { fontSize: 20, fontWeight: 700 },
    topBarRight: { display: "flex", alignItems: "center", gap: 10 },
    userPill: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        borderRadius: 999,
        padding: "6px 10px",
        gap: 8,
    },
    avatarCircle: { width: 24, height: 24, borderRadius: "50%", backgroundColor: "#cbd5e1" },
    userName: { fontSize: 12, color: "#111827" },
    logoutBtn: {
        backgroundColor: "#ef4444",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer",
    },
    mainContent: { backgroundColor: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
    headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 700 },
    primaryBtn: {
        backgroundColor: "#2563eb",
        padding: "8px 20px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        minWidth: 100,  // để nút đồng đều
    },
    table: { width: "100%", borderCollapse: "collapse" },
    productImg: { width: 60, height: 60, objectFit: "cover", borderRadius: 6 },
    editBtn: { backgroundColor: "#facc15", border: "none", padding: "4px 8px", marginRight: 4, borderRadius: 4, cursor: "pointer" },
    deleteBtn: { backgroundColor: "#ef4444", border: "none", padding: "4px 8px", borderRadius: 4, color: "#fff", cursor: "pointer" },
    "th, td": { border: "1px solid #e5e7eb", padding: "8px", textAlign: "center" },
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
        width: 700,
        maxHeight: "90vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    variantRow: {
        display: "flex",
        gap: 8,
        marginBottom: 12,
        flexWrap: "wrap",
    },
    th: {
        border: "1px solid #e5e7eb",
        padding: "8px",
        textAlign: "center",
        verticalAlign: "middle",
    },
    td: {
        border: "1px solid #e5e7eb",
        padding: "8px",
        textAlign: "center",
        verticalAlign: "middle",
    },
    editBtn: {
        backgroundColor: "#007bff",
        border: "none",
        padding: "4px 10px",
        marginRight: 6,
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        marginBottom: 12,  // khoảng cách giữa label & input
    },
};
