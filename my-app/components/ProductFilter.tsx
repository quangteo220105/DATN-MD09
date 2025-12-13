import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    categories: { name: string; id: string }[];
    brands: string[];
}

export interface FilterState {
    selectedCategory: string;
    selectedBrand: string;
    priceRange: { min: number; max: number };
    minRating: number;
}

export default function ProductFilter({ visible, onClose, onApply, categories, brands }: FilterProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
    const [selectedBrand, setSelectedBrand] = useState<string>('Tất cả');
    const [priceMin, setPriceMin] = useState<number>(0);
    const [priceMax, setPriceMax] = useState<number>(10000000);
    const [minRating, setMinRating] = useState<number>(0);
    // Ensure the "Tất cả" option only appears once per section
    const sanitizedCategories = categories.filter((cat) => cat.name !== 'Tất cả');
    const sanitizedBrands = brands.filter((brand) => brand !== 'Tất cả');
    const categoryOptions = [{ id: '__default_all__', name: 'Tất cả' }, ...sanitizedCategories];
    const brandOptions = ['Tất cả', ...sanitizedBrands];
    const quickRanges = [
        { label: 'Dưới 100.000', min: 0, max: 100000 },
        { label: '100.000 - 200.000', min: 100000, max: 200000 },
        { label: '200.000 - 300.000', min: 200000, max: 300000 },
        { label: 'Trên 300.000', min: 300000, max: 1000000 },
    ];
    const filterSummary = [
        { label: 'Danh mục', value: selectedCategory },
        { label: 'Thương hiệu', value: selectedBrand },
        {
            label: 'Khoảng giá',
            value: `${priceMin.toLocaleString('vi-VN')} - ${priceMax.toLocaleString('vi-VN')} đ`,
        },
        { label: 'Đánh giá', value: minRating === 0 ? 'Tất cả' : `${minRating}★ trở lên` },
    ];
    const isQuickRangeActive = (min: number, max: number) => priceMin === min && priceMax === max;

    const handleReset = () => {
        setSelectedCategory('Tất cả');
        setSelectedBrand('Tất cả');
        setPriceMin(0);
        setPriceMax(10000000);
        setMinRating(0);
    };

    const handleApply = () => {
        onApply({
            selectedCategory,
            selectedBrand,
            priceRange: { min: priceMin, max: priceMax },
            minRating,
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.handle} />
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>Bộ lọc sản phẩm</Text>
                            <Text style={styles.headerSubtitle}>Tinh chỉnh kết quả tìm kiếm của bạn</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.summaryRow}>
                        {filterSummary.map((item) => (
                            <View key={item.label} style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>{item.label}</Text>
                                <Text style={styles.summaryValue} numberOfLines={1}>
                                    {item.value}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                        {/* Danh mục */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="grid" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Danh mục</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {categoryOptions.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.chip,
                                            selectedCategory === cat.name && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedCategory(cat.name)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedCategory === cat.name && styles.chipTextActive,
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Thương hiệu */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="pricetag" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Thương hiệu</Text>
                            </View>
                            <View style={styles.chipContainer}>
                                {brandOptions.map((brand) => (
                                    <TouchableOpacity
                                        key={brand}
                                        style={[
                                            styles.chip,
                                            selectedBrand === brand && styles.chipActive,
                                        ]}
                                        onPress={() => setSelectedBrand(brand)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedBrand === brand && styles.chipTextActive,
                                            ]}
                                        >
                                            {brand}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Khoảng giá */}
                        <View style={styles.section}>
<<<<<<< HEAD
                            <View style={styles.sectionHeading}>
                                <Ionicons name="cash" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Khoảng giá</Text>
                            </View>
                            <Text style={styles.sectionSubtitle}>Nhập mức giá phù hợp với ngân sách của bạn</Text>
                            <View style={styles.priceInputRow}>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Từ</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMin === 0 ? '' : priceMin.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 0;
                                            setPriceMin(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                                <Text style={styles.priceSeparator}>-</Text>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.priceLabel}>Đến</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        value={priceMax === 10000000 ? '' : priceMax.toLocaleString('vi-VN')}
                                        onChangeText={(text) => {
                                            const num = parseInt(text.replace(/\D/g, '')) || 10000000;
                                            setPriceMax(num);
                                        }}
                                        keyboardType="numeric"
                                        placeholder="10,000,000"
                                    />
                                    <Text style={styles.priceCurrency}>đ</Text>
                                </View>
                            </View>
=======
                            <Text style={styles.sectionTitle}>Khoảng giá</Text>
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
                            {/* Quick price range buttons */}
                            <View style={styles.quickPriceContainer}>
                                {quickRanges.map((range) => (
                                    <TouchableOpacity
                                        key={range.label}
                                        style={[
                                            styles.quickPriceBtn,
                                            isQuickRangeActive(range.min, range.max) && styles.quickPriceBtnActive,
                                        ]}
                                        onPress={() => {
                                            setPriceMin(range.min);
                                            setPriceMax(range.max);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.quickPriceText,
                                                isQuickRangeActive(range.min, range.max) && styles.quickPriceTextActive,
                                            ]}
                                        >
                                            {range.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Đánh giá */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeading}>
                                <Ionicons name="star" size={18} color="#475569" />
                                <Text style={styles.sectionTitle}>Đánh giá</Text>
                            </View>
                            <Text style={styles.sectionSubtitle}>Chọn số sao chính xác</Text>
                            <View style={styles.ratingContainer}>
                                {[0, 1, 2, 3, 4, 5].map((rating) => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[
                                            styles.ratingChip,
                                            minRating === rating && styles.ratingChipActive,
                                        ]}
                                        onPress={() => setMinRating(rating)}
                                    >
                                        <Text
                                            style={[
                                                styles.ratingText,
                                                minRating === rating && styles.ratingTextActive,
                                            ]}
                                        >
                                            {rating === 0 ? 'Tất cả' : `${rating}★`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Ionicons name="refresh" size={18} color="#475569" />
                            <Text style={styles.resetBtnText}>Thiết lập lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                            <Text style={styles.applyBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        marginHorizontal: 12,
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
        overflow: 'hidden',
    },
    handle: {
        width: 60,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eceffb',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    closeBtn: {
        padding: 6,
        backgroundColor: '#eef2ff',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e0e7ff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
<<<<<<< HEAD
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
=======
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
        backgroundColor: '#f1f5f9',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    summaryCard: {
        width: '47%',
        backgroundColor: '#fff',
<<<<<<< HEAD
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e3e8ff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
=======
        borderRadius: 10,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e3e8ff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#94a3b8',
        marginBottom: 2,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0f172a',
        lineHeight: 16,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    section: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 18,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e3e8ff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 4,
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 12,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    chipActive: {
        backgroundColor: '#1d4ed8',
        borderColor: '#1d4ed8',
        shadowOpacity: 0.15,
        elevation: 4,
    },
    chipText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
<<<<<<< HEAD
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        marginTop: 8,
    },
    priceInputWrapper: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    priceLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 6,
    },
    priceInput: {
        borderWidth: 0,
        borderRadius: 8,
        padding: 0,
        fontSize: 14,
        color: '#0f172a',
    },
    priceCurrency: {
        position: 'absolute',
        right: 20,
        bottom: 14,
        fontSize: 14,
        color: '#94a3b8',
    },
    priceSeparator: {
        marginHorizontal: 12,
        fontSize: 16,
        color: '#94a3b8',
    },
=======

>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    quickPriceContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
<<<<<<< HEAD
        marginTop: 16,
=======
        marginTop: 8,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    },
    quickPriceBtn: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    quickPriceBtnActive: {
        backgroundColor: '#e0f2fe',
        borderColor: '#0ea5e9',
        shadowOpacity: 0.18,
        elevation: 4,
    },
    quickPriceText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
    quickPriceTextActive: {
        color: '#0f172a',
        fontWeight: '700',
    },
    ratingContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    ratingChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minWidth: 70,
        alignItems: 'center',
        shadowColor: '#0f172a',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    ratingChipActive: {
        backgroundColor: '#f97316',
        borderColor: '#f97316',
        shadowOpacity: 0.12,
    },
    ratingText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    ratingTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
<<<<<<< HEAD
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 14,
=======
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 10,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        shadowColor: '#0f172a',
<<<<<<< HEAD
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
=======
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 4,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
<<<<<<< HEAD
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        gap: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
=======
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        gap: 6,
    },
    resetBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    },
    applyBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
<<<<<<< HEAD
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: '#0f172a',
        shadowColor: '#0f172a',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
=======
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#FF4757',
        shadowColor: '#FF4757',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
>>>>>>> 698cb07305b5e089552a507f3cce18c7838b4bf0
    },
    applyBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});
