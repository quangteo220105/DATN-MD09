# Sửa lỗi và hoàn thiện Home.tsx

## Vấn đề cần sửa:

### 1. XÓA khai báo `filtered` thứ 2 (dòng 127-154)

Tìm và XÓA đoạn code này (vì đã có filtered ở dòng 73):

```typescript
// Lọc sản phẩm theo search & brand (thông minh, bỏ dấu)
const filtered = useMemo(() => {
    const q = normalizeText(debouncedQuery.trim());
    const selectedCategory = categories.find(c => c.name === brand);

    return products.filter((p) => {
        // ✅ Chỉ hiển thị sản phẩm đang bán (isActive = true)
        // Sản phẩm đã ngừng bán sẽ không xuất hiện ở Home
        if (!p.isActive) return false;

        // Lọc theo danh mục
        if (brand !== "Tất cả" && selectedCategory && selectedCategory.id !== "all") {
            if (p.categoryId !== selectedCategory.id) return false;
        }

        // Lọc theo tìm kiếm nâng cao
        if (!q) return true;

        const name = normalizeText(p.name);
        const brandName = normalizeText(p.brand || "");
        const categoryName = normalizeText(categories.find(c => c.id === p.categoryId)?.name || "");
        const variantsText = normalizeText(
            (p.variants || [])
                .map((v: any) => `${v.color || ""} ${v.size || ""}`)
                .join(" ")
        );

        return (
            name.includes(q) ||
            brandName.includes(q) ||
            categoryName.includes(q) ||
            variantsText.includes(q)
        );
    });
}, [debouncedQuery, brand, products, categories]);
```

### 2. THÊM nút Filter vào Search Section

Tìm đoạn code Search Section và THAY THẾ bằng:

```typescript
{/* Search Section */}
<View style={styles.searchSection}>
    <View style={styles.searchRow}>
        <View
            style={styles.searchBox}
            onStartShouldSetResponder={() => true}
            onResponderRelease={() => searchInputRef.current?.focus()}
        >
            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput
                placeholder="Tìm kiếm sản phẩm..."
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                placeholderTextColor="#999"
                onFocus={() => {
                    setShowSuggestions(!!query.trim());
                    isSelectingSuggestionRef.current = false;
                }}
                onBlur={() => {
                    setTimeout(() => {
                        if (!isSelectingSuggestionRef.current) {
                            setShowSuggestions(false);
                        }
                        isSelectingSuggestionRef.current = false;
                    }, 200);
                }}
                returnKeyType="search"
                ref={searchInputRef}
                autoCapitalize="none"
                autoCorrect={false}
                underlineColorAndroid="transparent"
                numberOfLines={1}
            />
            {query.length > 0 && (
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        setQuery("");
                        setShowSuggestions(false);
                        searchInputRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </View>
        
        {/* ✅ NÚT FILTER MỚI */}
        <TouchableOpacity 
            style={styles.filterBtn} 
            onPress={() => setShowFilter(true)}
        >
            <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
    </View>

    {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsPanel}>
            {suggestions.map((s: any, index: number) => (
                <TouchableOpacity
                    key={s._id}
                    style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 && styles.suggestionItemLast
                    ]}
                    onPressIn={() => {
                        isSelectingSuggestionRef.current = true;
                    }}
                    onPress={() => {
                        const selectedName = s.name;
                        setQuery(selectedName);
                        setShowSuggestions(false);
                        isSelectingSuggestionRef.current = false;
                        setTimeout(() => {
                            if (searchInputRef.current) {
                                searchInputRef.current.focus();
                                searchInputRef.current.setNativeProps({ text: selectedName });
                            }
                        }, 50);
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="search-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                    <Text numberOfLines={1} style={styles.suggestionText}>{s.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    )}
</View>
```

### 3. THÊM ProductFilter component

Tìm dòng cuối cùng trước `</View>` (trước khi đóng container chính) và THÊM:

```typescript
{/* Product Filter Modal */}
<ProductFilter
    visible={showFilter}
    onClose={() => setShowFilter(false)}
    onApply={(filters) => {
        setActiveFilters(filters);
        setBrand(filters.selectedCategory);
    }}
    categories={categories}
    brands={brands}
/>
```

Vị trí chính xác: Sau dialog "Account Locked" và trước `</View>` cuối cùng.

### 4. THÊM styles cho nút Filter

Trong StyleSheet.create, THÊM:

```typescript
filterBtn: {
    backgroundColor: "#ff4757",
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
},
```

## Tóm tắt các bước:

1. ✅ Xóa khai báo `filtered` thứ 2 (dòng 127-154)
2. ✅ Thêm nút Filter vào Search Section
3. ✅ Thêm ProductFilter component trước `</View>` cuối
4. ✅ Thêm style `filterBtn`

Sau khi hoàn thành, bạn sẽ có bộ lọc chuyên nghiệp hoạt động đầy đủ!
