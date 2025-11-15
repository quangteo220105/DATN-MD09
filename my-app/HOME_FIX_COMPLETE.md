# Sửa lỗi normalizeText và hoàn thiện Home.tsx

## Lỗi: normalizeText is not a function

Nguyên nhân: Hàm `normalizeText` được khai báo SAU khi sử dụng trong `filtered` useMemo.

## Giải pháp:

### Bước 1: DI CHUYỂN hàm normalizeText lên TRƯỚC các useMemo

Tìm dòng này (khoảng dòng 300+):
```typescript
// Utility: remove Vietnamese diacritics and lowercase
const normalizeText = (text: string) =>
    (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}+/gu, "");
```

XÓA nó ở vị trí cũ và DI CHUYỂN lên ngay sau các khai báo useRef (khoảng dòng 50):

```typescript
const searchInputRef = useRef<any>(null);
const isSelectingSuggestionRef = useRef(false);
const lockCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// ✅ DI CHUYỂN HÀM normalizeText LÊN ĐÂY
// Utility: remove Vietnamese diacritics and lowercase
const normalizeText = (text: string) =>
    (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}+/gu, "");

// Lấy thông tin user từ AsyncStorage
const fetchUser = async () => {
    // ... code tiếp theo
```

### Bước 2: XÓA khai báo `filtered` thứ 2 (trùng lặp)

Tìm và XÓA đoạn code này (khoảng dòng 300+):

```typescript
// Lọc sản phẩm theo search & brand (thông minh, bỏ dấu)
const filtered = useMemo(() => {
    const q = normalizeText(debouncedQuery.trim());
    const selectedCategory = categories.find(c => c.name === brand);

    return products.filter((p) => {
        // ... code filter cũ
    });
}, [debouncedQuery, brand, products, categories]);
```

### Bước 3: THÊM nút Filter vào UI

Tìm phần Search Section và thêm nút Filter:

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
        
        {/* ✅ NÚT FILTER */}
        <TouchableOpacity 
            style={styles.filterBtn} 
            onPress={() => setShowFilter(true)}
        >
            <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
    </View>

    {/* Suggestions panel - giữ nguyên code cũ */}
    {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsPanel}>
            {/* ... code suggestions cũ ... */}
        </View>
    )}
</View>
```

### Bước 4: THÊM ProductFilter component

Tìm dòng cuối cùng, sau dialog "Account Locked" và THÊM:

```typescript
        {/* Account Locked Dialog */}
        {showLockedDialog && (
            <View style={styles.dialogOverlay}>
                {/* ... dialog code ... */}
            </View>
        )}

        {/* ✅ THÊM PRODUCT FILTER */}
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
    </View>
);
```

### Bước 5: THÊM style filterBtn

Trong StyleSheet.create, thêm:

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

1. ✅ **DI CHUYỂN** hàm `normalizeText` lên trước các useMemo (sau useRef)
2. ✅ **XÓA** khai báo `filtered` thứ 2 (trùng lặp)
3. ✅ **THÊM** nút Filter vào Search Section
4. ✅ **THÊM** ProductFilter component trước `</View>` cuối
5. ✅ **THÊM** style `filterBtn`

Sau khi hoàn thành, app sẽ chạy không lỗi và có bộ lọc chuyên nghiệp!
