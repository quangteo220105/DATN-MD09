import React, { useEffect, useState, useRef } from "react";

export default function ManagerDashboard() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const lastVariantRef = useRef(null);

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

        // Scroll xuống form biến thể mới sau khi render
        setTimeout(() => {
            if (lastVariantRef.current) {
                lastVariantRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }, 100);
    };

    // 🟢 Xóa variant
    const removeVariant = (index) => {
        if (formProduct.variants.length > 1) {
            const newVariants = formProduct.variants.filter((_, i) => i !== index);
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

        // ✅ Kiểm tra biến thể trùng lặp hoàn toàn (không tính ảnh)
        for (let i = 0; i < formProduct.variants.length; i++) {
            for (let j = i + 1; j < formProduct.variants.length; j++) {
                const v1 = formProduct.variants[i];
                const v2 = formProduct.variants[j];

                if (v1.size.trim().toLowerCase() === v2.size.trim().toLowerCase() &&
                    v1.color.trim().toLowerCase() === v2.color.trim().toLowerCase() &&
                    Number(v1.originalPrice) === Number(v2.originalPrice) &&
                    Number(v1.currentPrice) === Number(v2.currentPrice) &&
                    Number(v1.stock) === Number(v2.stock)) {
                    alert(`Biến thể ${i + 1} và ${j + 1} trùng lặp hoàn toàn (Size: ${v1.size}, Màu: ${v1.color}). Vui lòng kiểm tra lại!`);
                    return;
                }
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

    // 🟢 Hàm submit sửa với multiple variants
    const handleUpdate = async () => {
        if (!formProduct.name || !formProduct.categoryId) {
            alert("Tên sản phẩm và danh mục là bắt buộc!");
            return;
        }

        // ✅ Kiểm tra biến thể trùng lặp hoàn toàn (không tính ảnh)
        for (let i = 0; i < formProduct.variants.length; i++) {
            for (let j = i + 1; j < formProduct.variants.length; j++) {
                const v1 = formProduct.variants[i];
                const v2 = formProduct.variants[j];

                if (v1.size.trim().toLowerCase() === v2.size.trim().toLowerCase() &&
                    v1.color.trim().toLowerCase() === v2.color.trim().toLowerCase() &&
                    Number(v1.originalPrice) === Number(v2.originalPrice) &&
                    Number(v1.currentPrice) === Number(v2.currentPrice) &&
                    Number(v1.stock) === Number(v2.stock)) {
                    alert(`Biến thể ${i + 1} và ${j + 1} trùng lặp hoàn toàn (Size: ${v1.size}, Màu: ${v1.color}). Vui lòng kiểm tra lại!`);
                    return;
                }
            }
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

    // 🟠 Toggle trạng thái bán sản phẩm
    const toggleSellingProduct = async (product) => {
        const newStatus = !product.isActive;
        const confirmed = window.confirm(newStatus
            ? "Bạn có chắc muốn mở bán sản phẩm này?"
            : "Bạn có chắc muốn dừng bán sản phẩm này?");
        if (!confirmed) return;

        try {
            const res = await fetch(`http://localhost:3000/api/products/${product._id}/toggle-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: newStatus })
            });
            const data = await res.json();

            if (res.ok) {
                alert(newStatus ? "✅ Đã mở bán sản phẩm." : "✅ Đã dừng bán sản phẩm.");
                fetchProducts();
            } else {
                alert(data.message || "❌ Không thể cập nhật trạng thái sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };

    // 🟠 Toggle dừng bán sản phẩm
    const toggleStopProduct = async (product) => {
        const willStop = product.isActive; // Nếu đang active thì sẽ dừng bán
        const confirmed = window.confirm(willStop
            ? "Bạn có chắc muốn dừng bán sản phẩm này?"
            : "Bạn có chắc muốn mở bán sản phẩm này?");
        if (!confirmed) return;

        try {
            const res = await fetch(`http://localhost:3000/api/products/${product._id}/toggle-stop`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();

            if (res.ok) {
                alert(data.message || (willStop ? "✅ Đã dừng bán sản phẩm." : "✅ Đã mở lại sản phẩm."));
                fetchProducts();
            } else {
                alert(data.message || "❌ Không thể cập nhật trạng thái sản phẩm!");
            }
        } catch (error) {
            console.error(error);
            alert("❌ Lỗi kết nối server!");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.mainContent}>
                <div style={styles.headerRow}>
                    <span style={styles.sectionTitle}>📦 Quản lý sản phẩm</span>
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
                                            {(() => {
                                                const label = totalStock > 0 ? (p.isActive ? "Còn hàng" : "Ngừng kinh doanh") : "Hết hàng";
                                                const style = label === "Còn hàng"
                                                    ? { ...styles.statusBadge, ...styles.badgeInStock }
                                                    : label === "Hết hàng"
                                                        ? { ...styles.statusBadge, ...styles.badgeOutOfStock }
                                                        : { ...styles.statusBadge, ...styles.badgeInactive };
                                                return <span style={style}>{label}</span>;
                                            })()}
                                        </td>

                                        <td style={styles.td}>
                                            <button style={styles.editBtn} onClick={() => handleEditClick(p)}>Sửa</button>
                                            <button
                                                style={!p.isActive ? { ...styles.resumeBtn, backgroundColor: '#22c55e' } : { ...styles.stopBtn, backgroundColor: '#ef4444' }}
                                                onClick={() => toggleStopProduct(p)}
                                            >
                                                {!p.isActive ? "Mở bán" : "Dừng bán"}
                                            </button>
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
                                <h4>Biến thể sản phẩm</h4>
                                <button type="button" style={styles.addVariantBtn} onClick={addVariant}>
                                    + Thêm biến thể
                                </button>
                            </div>

                            {formProduct.variants.map((variant, index) => (
                                <div
                                    key={index}
                                    style={styles.variantCard}
                                    ref={index === formProduct.variants.length - 1 ? lastVariantRef : null}
                                >
                                    <div style={styles.variantHeader}>
                                        <h5>Biến thể {index + 1}</h5>
                                        <div style={styles.variantHeaderActions}>
                                            <button
                                                type="button"
                                                style={styles.addInlineBtn}
                                                onClick={addVariant}
                                                title="Thêm biến thể"
                                            >
                                                +
                                            </button>
                                            {formProduct.variants.length > 1 && (
                                                <button
                                                    type="button"
                                                    style={styles.removeVariantBtn}
                                                    onClick={() => removeVariant(index)}
                                                    title="Xóa biến thể này"
                                                >
                                                    ×
                                                </button>
                                            )}
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
    editBtn: {
        backgroundColor: "#007bff",
        border: "none",
        padding: "6px 14px",
        marginRight: 6,
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        minWidth: 96,
        fontWeight: 600,
    },
    stopBtn: {
        backgroundColor: "#f59e0b",
        border: "none",
        padding: "6px 14px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        minWidth: 96,
        fontWeight: 600,
    },
    resumeBtn: {
        backgroundColor: "#10b981",
        border: "none",
        padding: "6px 14px",
        borderRadius: 6,
        color: "#fff",
        cursor: "pointer",
        minWidth: 96,
        fontWeight: 600,
    },
    statusBadge: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid transparent",
    },
    badgeInStock: {
        backgroundColor: "#dcfce7",
        color: "#065f46",
        borderColor: "#86efac",
    },
    badgeOutOfStock: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        borderColor: "#fca5a5",
    },
    badgeInactive: {
        backgroundColor: "#e5e7eb",
        color: "#374151",
        borderColor: "#d1d5db",
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: "20px",
    },
    modal: {
        backgroundColor: "#ffffff",
        padding: "32px",
        borderRadius: "16px",
        width: "90%",
        maxWidth: "1000px",
        maxHeight: "90vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        animation: "modalFadeIn 0.2s ease-out",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        marginBottom: "16px",
    },
    variantsSection: {
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "#f9fafb",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    variantsHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
    },
    addVariantBtn: {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
        transition: "all 0.2s ease",
    },
    variantCard: {
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        transition: "all 0.2s ease",
    },
    variantHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    variantHeaderActions: {
        display: "flex",
        gap: 8,
        alignItems: "center",
    },
    removeVariantBtn: {
        backgroundColor: "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 24,
        height: 24,
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    addInlineBtn: {
        backgroundColor: "#10b981",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 24,
        height: 24,
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
        gap: "14px",
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "2px solid #f3f4f6",
    },
    cancelBtn: {
        background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
        color: "#fff",
        border: "none",
        padding: "12px 24px",
        borderRadius: "10px",
        cursor: "pointer",
        minWidth: "120px",
        fontSize: "15px",
        fontWeight: "600",
        boxShadow: "0 4px 12px rgba(107, 114, 128, 0.3)",
        transition: "all 0.2s ease",
    },
};
