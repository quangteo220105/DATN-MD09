import React, { useEffect, useState, useRef } from "react";

export default function ManagerDashboard() {
    // Add CSS animations and styles
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            input:focus, select:focus, textarea:focus {
                outline: none;
                border-color: #667eea !important;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
            }
            input[type="number"] {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .variantCard {
                overflow: visible !important;
            }
            .variantFormGrid > * {
                min-width: 0;
                overflow: hidden;
            }
            button:hover {
                transform: translateY(-2px);
            }
            button:active {
                transform: translateY(0);
            }
            .variantCard:hover {
                border-color: #cbd5e1 !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
            }
            .imagePreviewContainer:hover .imagePreviewOverlay {
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(styleSheet);
        return () => {
            if (document.head.contains(styleSheet)) {
                document.head.removeChild(styleSheet);
            }
        };
    }, []);
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
            if (!v.size || !v.color || !v.currentPrice || !v.stock || !v.imageFile) {
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
        // Tự động set originalPrice = currentPrice nếu không có giá trị
        const variantsPayload = formProduct.variants.map((v, index) => ({
            size: v.size,
            color: v.color,
            originalPrice: Number(v.originalPrice) || Number(v.currentPrice) || 0,
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

        // Tự động set originalPrice = currentPrice nếu không có giá trị
        const variantsPayload = formProduct.variants.map((v, index) => ({
            size: v.size,
            color: v.color,
            originalPrice: Number(v.originalPrice) || Number(v.currentPrice) || 0,
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
                <div style={styles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowModal(false);
                        setEditingProduct(null);
                        resetForm();
                    }
                }}>
                    <div style={styles.modal}>
                        {/* Header */}
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>
                                    {editingProduct ? "✏️ Chỉnh sửa sản phẩm" : "➕ Thêm sản phẩm mới"}
                                </h2>
                                <p style={styles.modalSubtitle}>
                                    {editingProduct ? "Cập nhật thông tin sản phẩm" : "Điền thông tin để tạo sản phẩm mới"}
                                </p>
                            </div>
                            <button
                                style={styles.closeBtn}
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                    resetForm();
                                }}
                                title="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        {/* Main Form Content */}
                        <div style={styles.modalBody}>
                            {/* Thông tin cơ bản */}
                            <div style={styles.formSection}>
                                <h3 style={styles.sectionTitle}>📋 Thông tin cơ bản</h3>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Tên sản phẩm <span style={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            style={styles.input}
                                            placeholder="Nhập tên sản phẩm"
                                            value={formProduct.name}
                                            onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Thương hiệu
                                        </label>
                                        <input
                                            type="text"
                                            style={styles.input}
                                            placeholder="Nhập thương hiệu"
                                            value={formProduct.brand}
                                            onChange={(e) => setFormProduct({ ...formProduct, brand: e.target.value })}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>
                                            Danh mục <span style={styles.required}>*</span>
                                        </label>
                                        <select
                                            style={styles.select}
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
                                        <label style={styles.label}>
                                            Trạng thái
                                        </label>
                                        <select
                                            style={styles.select}
                                            value={formProduct.isActive}
                                            onChange={(e) => setFormProduct({ ...formProduct, isActive: e.target.value === "true" })}
                                        >
                                            <option value="true">✅ Còn hàng</option>
                                            <option value="false">⏸️ Ngừng kinh doanh</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Mô tả sản phẩm
                                    </label>
                                    <textarea
                                        style={styles.textarea}
                                        placeholder="Nhập mô tả chi tiết về sản phẩm..."
                                        rows={4}
                                        value={formProduct.description}
                                        onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Biến thể sản phẩm */}
                            <div style={styles.variantsSection}>
                                <div style={styles.variantsHeader}>
                                    <div>
                                        <h3 style={styles.sectionTitle}>🎨 Biến thể sản phẩm</h3>
                                        <p style={styles.sectionDescription}>
                                            Thêm các biến thể với size, màu sắc, giá và số lượng khác nhau
                                        </p>
                                    </div>
                                    <button type="button" style={styles.addVariantBtn} onClick={addVariant}>
                                        ➕ Thêm biến thể
                                    </button>
                                </div>

                                <div style={styles.variantGrid}>
                                    {formProduct.variants.map((variant, index) => (
                                        <div
                                            key={index}
                                            className="variantCard"
                                            style={styles.variantCard}
                                            ref={index === formProduct.variants.length - 1 ? lastVariantRef : null}
                                        >
                                            <div style={styles.variantHeader}>
                                                <div style={styles.variantHeaderLeft}>
                                                    <div style={styles.variantNumberBadge}>
                                                        #{index + 1}
                                                    </div>
                                                    <h5 style={styles.variantTitle}>Biến thể {index + 1}</h5>
                                                </div>
                                                <div style={styles.variantHeaderActions}>
                                                    <button
                                                        type="button"
                                                        style={styles.addInlineBtn}
                                                        onClick={addVariant}
                                                        title="Thêm biến thể mới"
                                                    >
                                                        ➕
                                                    </button>
                                                    {formProduct.variants.length > 1 && (
                                                        <button
                                                            type="button"
                                                            style={styles.removeVariantBtn}
                                                            onClick={() => removeVariant(index)}
                                                            title="Xóa biến thể này"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={styles.variantContent}>
                                                <div style={styles.variantFormGrid}>
                                                    <div style={styles.inputGroup}>
                                                        <label style={styles.variantLabel}>
                                                            Size <span style={styles.required}>*</span>
                                                        </label>
                                                        <input
                                                            style={styles.variantInput}
                                                            placeholder="VD: 40, 41, 42..."
                                                            value={variant.size}
                                                            onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                                        />
                                                    </div>

                                                    <div style={styles.inputGroup}>
                                                        <label style={styles.variantLabel}>
                                                            Màu sắc <span style={styles.required}>*</span>
                                                        </label>
                                                        <input
                                                            style={styles.variantInput}
                                                            placeholder="VD: Đen, Trắng, Xanh..."
                                                            value={variant.color}
                                                            onChange={(e) => updateVariant(index, 'color', e.target.value)}
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
                                                        <label style={styles.variantLabel}>
                                                            Số lượng <span style={styles.required}>*</span>
                                                        </label>
                                                        <input
                                                            style={styles.variantInput}
                                                            placeholder="Nhập số lượng"
                                                            type="number"
                                                            min="0"
                                                            value={variant.stock}
                                                            onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={styles.imageUploadSection}>
                                                    <label style={styles.variantLabel}>
                                                        Ảnh sản phẩm <span style={styles.required}>*</span>
                                                    </label>
                                                    <div style={styles.imageUploadContainer}>
                                                        <label style={styles.imageUploadLabel}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                style={{ display: 'none' }}
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        updateVariantImage(index, e.target.files[0]);
                                                                    }
                                                                }}
                                                            />
                                                            <div style={styles.imageUploadButton}>
                                                                📷 Chọn ảnh
                                                            </div>
                                                        </label>
                                                        {/* Preview ảnh */}
                                                        {(variant.imageFile || variant.existingImage) && (
                                                            <div className="imagePreviewContainer" style={styles.imagePreviewContainer}>
                                                                <img
                                                                    src={variant.imageFile ?
                                                                        URL.createObjectURL(variant.imageFile) :
                                                                        `http://localhost:3000${variant.existingImage}`
                                                                    }
                                                                    alt="Preview"
                                                                    style={styles.previewImage}
                                                                />
                                                                <div className="imagePreviewOverlay" style={styles.imagePreviewOverlay}>
                                                                    <span style={styles.imagePreviewText}>Xem trước</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={styles.modalActions}>
                            <button
                                style={styles.cancelBtn}
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                    resetForm();
                                }}
                            >
                                ❌ Hủy
                            </button>
                            <button
                                style={styles.saveBtn}
                                onClick={editingProduct ? handleUpdate : handleSubmit}
                            >
                                {editingProduct ? "💾 Cập nhật sản phẩm" : "✅ Lưu sản phẩm"}
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
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        padding: "20px",
        animation: "fadeIn 0.2s ease-out",
    },
    modal: {
        backgroundColor: "#ffffff",
        padding: 0,
        borderRadius: "20px",
        width: "95%",
        maxWidth: "1200px",
        maxHeight: "95vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)",
        animation: "slideUp 0.3s ease-out",
    },
    modalHeader: {
        padding: "28px 32px",
        borderBottom: "2px solid #f1f5f9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#ffffff",
    },
    modalTitle: {
        margin: 0,
        fontSize: "24px",
        fontWeight: 700,
        color: "#ffffff",
        letterSpacing: "-0.5px",
    },
    modalSubtitle: {
        margin: "6px 0 0 0",
        fontSize: "14px",
        color: "rgba(255, 255, 255, 0.9)",
        fontWeight: 400,
    },
    closeBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        border: "none",
        borderRadius: "50%",
        width: "36px",
        height: "36px",
        cursor: "pointer",
        fontSize: "24px",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        fontWeight: 300,
        lineHeight: 1,
    },
    modalBody: {
        padding: "32px",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "32px",
    },
    formSection: {
        backgroundColor: "#f8fafc",
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: 700,
        color: "#1e293b",
        margin: "0 0 8px 0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    sectionDescription: {
        fontSize: "13px",
        color: "#64748b",
        margin: "0 0 20px 0",
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "20px",
        width: "100%",
        boxSizing: "border-box",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "14px",
        fontWeight: 600,
        color: "#334155",
        marginBottom: "4px",
    },
    required: {
        color: "#ef4444",
        marginLeft: "2px",
    },
    input: {
        padding: "12px 16px",
        border: "2px solid #e2e8f0",
        borderRadius: "10px",
        fontSize: "14px",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "100%",
    },
    select: {
        padding: "12px 16px",
        border: "2px solid #e2e8f0",
        borderRadius: "10px",
        fontSize: "14px",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        fontFamily: "inherit",
        cursor: "pointer",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "100%",
    },
    textarea: {
        padding: "12px 16px",
        border: "2px solid #e2e8f0",
        borderRadius: "10px",
        fontSize: "14px",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        fontFamily: "inherit",
        resize: "vertical",
        minHeight: "100px",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "100%",
    },
    variantsSection: {
        border: "2px solid #e2e8f0",
        borderRadius: "16px",
        padding: "28px",
        backgroundColor: "#f8fafc",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    },
    variantGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "24px",
        marginTop: "24px",
    },
    variantsHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "8px",
    },
    addVariantBtn: {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "#fff",
        border: "none",
        padding: "12px 24px",
        borderRadius: "12px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
        transition: "all 0.2s ease",
    },
    variantCard: {
        border: "2px solid #e2e8f0",
        borderRadius: "16px",
        padding: "24px",
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        minHeight: "fit-content",
        width: "100%",
        boxSizing: "border-box",
        overflow: "visible",
        position: "relative",
    },
    variantHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        paddingBottom: "16px",
        borderBottom: "2px solid #e2e8f0",
    },
    variantHeaderLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    variantNumberBadge: {
        backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#ffffff",
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: 700,
        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
    },
    variantTitle: {
        margin: 0,
        fontSize: "16px",
        fontWeight: 600,
        color: "#1e293b",
    },
    variantHeaderActions: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
    removeVariantBtn: {
        backgroundColor: "#ef4444",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        width: "32px",
        height: "32px",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
    },
    addInlineBtn: {
        backgroundColor: "#10b981",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        width: "32px",
        height: "32px",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
    },
    variantContent: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    variantFormGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        width: "100%",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
    },
    variantLabel: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#475569",
        marginBottom: "4px",
    },
    variantInput: {
        padding: "10px 14px",
        border: "2px solid #e2e8f0",
        borderRadius: "10px",
        fontSize: "14px",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        maxWidth: "100%",
    },
    imageUploadSection: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    imageUploadContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    imageUploadLabel: {
        cursor: "pointer",
    },
    imageUploadButton: {
        padding: "12px 20px",
        backgroundColor: "#f1f5f9",
        border: "2px dashed #cbd5e1",
        borderRadius: "10px",
        textAlign: "center",
        fontSize: "14px",
        fontWeight: 600,
        color: "#475569",
        transition: "all 0.2s ease",
    },
    imagePreviewContainer: {
        position: "relative",
        display: "inline-block",
    },
    previewImage: {
        width: "120px",
        height: "120px",
        objectFit: "cover",
        borderRadius: "12px",
        border: "2px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    },
    imagePreviewOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0,
        transition: "opacity 0.2s ease",
    },
    imagePreviewText: {
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: 600,
    },
    modalActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "24px 32px",
        borderTop: "2px solid #f1f5f9",
        backgroundColor: "#f8fafc",
    },
    cancelBtn: {
        background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
        color: "#fff",
        border: "none",
        padding: "14px 28px",
        borderRadius: "12px",
        cursor: "pointer",
        minWidth: "140px",
        fontSize: "15px",
        fontWeight: "600",
        boxShadow: "0 4px 16px rgba(107, 114, 128, 0.3)",
        transition: "all 0.2s ease",
    },
    saveBtn: {
        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        color: "#fff",
        border: "none",
        padding: "14px 28px",
        borderRadius: "12px",
        cursor: "pointer",
        minWidth: "180px",
        fontSize: "15px",
        fontWeight: "600",
        boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
        transition: "all 0.2s ease",
    },
};
