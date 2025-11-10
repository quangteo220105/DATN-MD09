import React, { useRef, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: number;
  productId?: string; // For product recommendations with links
}

type Budget = 'under1m' | '1to2m' | 'over2m' | null;

interface ContextState {
  purpose: string | null; // chạy, đi học, đi làm, casual
  brand: string | null;   // adidas, nike, vans, converse
  size: number | null;    // cm
  budget: Budget;
  color: string | null;
}

const initialState: ContextState = {
  purpose: null,
  brand: null,
  size: null,
  budget: null,
  color: null,
};

function parseNumber(text: string): number | null {
  const m = text.match(/(\d+(?:[\.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function formatCurrency(n: number): string {
  const num = Number(n || 0);
  return num.toLocaleString('vi-VN') + ' ₫';
}

function titleCase(text: string): string {
  if (!text) return '';
  return text
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectBudget(text: string): Budget | null {
  const t = text.toLowerCase();
  if (/(dưới|<|<=|under|below).*1\s*(tr|triệu|m)/.test(t) || /(\b1\s*m\b)/.test(t)) return 'under1m';
  if (/(1\s*-\s*2\s*tr|1-2tr|1 đến 2tr|1 to 2m|1\s*triệu\s*đến\s*2\s*triệu)/.test(t)) return '1to2m';
  if (/(>\s*2\s*tr|trên\s*2\s*triệu|over 2m|more than 2m)/.test(t)) return 'over2m';
  return null;
}

function detectBudgetFromNumber(text: string): Budget | null {
  // Parse amounts like 800k, 1tr, 1.5tr, 1500000
  const t = text.toLowerCase();
  const mTr = t.match(/(\d+(?:[\.,]\d+)?)\s*(tr|triệu|m)\b/);
  const mK = t.match(/(\d+(?:[\.,]\d+)?)\s*(k)\b/);
  const mVnd = t.match(/(\d{6,})\b/); // raw VND number
  let amount = 0;
  if (mTr) amount = parseFloat(mTr[1].replace(',', '.')) * 1_000_000;
  else if (mK) amount = parseFloat(mK[1].replace(',', '.')) * 1_000;
  else if (mVnd) amount = parseFloat(mVnd[1]);
  if (!amount) return null;
  if (amount < 1_000_000) return 'under1m';
  if (amount <= 2_000_000) return '1to2m';
  return 'over2m';
}

function detectBrand(text: string): string | null {
  const t = text.toLowerCase();
  const brandMap: { [key: string]: string[] } = {
    'adidas': ['adidas', 'adi'],
    'nike': ['nike', 'air max', 'air force', 'jordan'],
    'vans': ['vans', 'vans old skool'],
    'converse': ['converse', 'chuck taylor', 'all star'],
    'puma': ['puma'],
    'new balance': ['new balance', 'nb'],
    'reebok': ['reebok']
  };
  for (const [brand, keywords] of Object.entries(brandMap)) {
    if (keywords.some(kw => t.includes(kw))) return brand;
  }
  return null;
}

function detectPurpose(text: string): string | null {
  const t = text.toLowerCase();
  if (/(chạy|running|jogging|marathon|trail|ultra|boost)/.test(t)) return 'running';
  if (/(đi học|đi làm|casual|đi chơi|hàng ngày|everyday|street|thời trang)/.test(t)) return 'casual';
  if (/(tập gym|gym|training|workout|thể hình|fitness)/.test(t)) return 'training';
  if (/(bóng đá|football|soccer|sân cỏ)/.test(t)) return 'football';
  if (/(bóng rổ|basketball|nba)/.test(t)) return 'basketball';
  if (/(tennis|quần vợt)/.test(t)) return 'tennis';
  return null;
}

function detectColor(text: string): string | null {
  const t = text.toLowerCase();
  const colorMap: { [key: string]: string[] } = {
    'trắng': ['trắng', 'white', 'trang'],
    'đen': ['đen', 'black', 'den'],
    'xanh': ['xanh', 'blue', 'xanh dương', 'xanh lá', 'green'],
    'đỏ': ['đỏ', 'red', 'do'],
    'vàng': ['vàng', 'yellow', 'vang'],
    'hồng': ['hồng', 'pink', 'hong'],
    'nâu': ['nâu', 'brown', 'nau'],
    'xám': ['xám', 'grey', 'gray', 'xam', 'gris'],
    'cam': ['cam', 'orange'],
    'tím': ['tím', 'purple', 'violet']
  };
  for (const [color, keywords] of Object.entries(colorMap)) {
    if (keywords.some(kw => t.includes(kw))) return color;
  }
  return null;
}

function parseSizeCm(text: string): number | null {
  // e.g., 26 cm, 25.5cm
  const m = text.toLowerCase().match(/(\d+(?:[\.,]\d+)?)\s*cm/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

function parseSizeEU(text: string): number | null {
  // Detect EU sizes like 40, 41, 42... with optional "EU"
  const t = text.toLowerCase();
  const m = t.match(/\b(?:eu\s*)?(\d{2})(?:\b|[^0-9])/);
  if (!m) return null;
  const eu = parseInt(m[1], 10);
  // Rough mapping EU -> cm (approximate)
  const table: { [eu: number]: number } = {
    39: 24.5, 40: 25, 41: 26, 42: 26.5, 43: 27.5, 44: 28, 45: 29, 46: 29.5, 47: 30
  };
  if (table[eu]) return table[eu];
  // Fallback linear approximation
  return Math.round((eu - 14) * 0.667 * 10) / 10; // very rough
}

function humanBudget(b: Budget): string {
  if (b === 'under1m') return 'dưới 1 triệu';
  if (b === '1to2m') return '1 - 2 triệu';
  if (b === 'over2m') return 'trên 2 triệu';
  return '';
}

export default function ChatAIScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm0', role: 'ai', text: '👋 Xin chào! Mình là trợ lý AI tư vấn giày thông minh. Mình có thể giúp bạn:\n\n✨ Tìm giày phù hợp theo nhu cầu\n💡 Tư vấn về thương hiệu, chất liệu\n💰 So sánh giá và đề xuất tốt nhất\n📏 Hỗ trợ chọn size\n\nHãy cho mình biết bạn đang tìm giày để làm gì nhé! 🏃‍♂️👟', ts: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [ctx, setCtx] = useState<ContextState>(initialState);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [productsCache, setProductsCache] = useState<any[]>([]);

  const ensureProducts = async (): Promise<any[]> => {
    let list = productsCache;
    if (!list.length) {
      try {
        const res = await axios.get(`${BASE_URL}/products`);
        const fetched = Array.isArray(res.data) ? res.data : [];
        const active = fetched.filter((p: any) => p.isActive !== false);
        setProductsCache(active);
        list = active;
      } catch (error) {
        console.error('❌ ensureProducts error', error);
        return [];
      }
    }
    return list.filter((p: any) => p && p.isActive !== false);
  };

  const answerAvailability = async (text: string): Promise<{ text: string; productId?: string } | null> => {
    const brand = detectBrand(text);
    const color = detectColor(text) || ctx.color;
    const sizeCm = parseSizeCm(text) || parseSizeEU(text) || ctx.size;

    const t = text.toLowerCase();
    const asksAvailability = /(có không|còn không|có size|size.*có|available|availability|còn hàng|còn size|màu.*có|có màu)/.test(t);
    const mentionsSizeOrColor = /(size|kích thước|màu|color|eu)/.test(t) || !!sizeCm || !!color;
    if (!brand || !mentionsSizeOrColor || !asksAvailability) return null;

    const list = await ensureProducts();
    if (!list.length) return { text: '❌ Mình chưa thể kiểm tra tồn kho ngay lúc này. Bạn thử lại sau nhé!' };

    const matches = list
      .filter((p: any) => {
        const b = (p.brand || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return b.includes(brand.toLowerCase()) || name.includes(brand.toLowerCase());
      })
      .flatMap((p: any) => {
        const variants = Array.isArray(p.variants) ? p.variants : [];
        return variants
          .filter((v: any) => (v?.stock || 0) > 0)
          .filter((v: any) => {
            let ok = true;
            if (color) ok = ok && String(v.color || '').toLowerCase().includes(color.toLowerCase());
            if (sizeCm) {
              const vs = String(v.size || '');
              const vnum = parseFloat(vs);
              if (!Number.isNaN(vnum)) {
                ok = ok && Math.abs(vnum - (sizeCm as number)) <= 0.5;
              } else {
                ok = ok && vs.includes(String(Math.round((sizeCm as number) * 10) / 10));
              }
            }
            return ok;
          })
          .map((v: any) => ({
            product: p,
            variant: v,
            price: Number(v.currentPrice ?? v.originalPrice ?? 0)
          }));
      });

    if (!matches.length) {
      const parts: string[] = [];
      parts.push(`🔎 Mình chưa thấy mẫu ${titleCase(brand)} phù hợp`);
      if (sizeCm) parts.push(`size ~${sizeCm}cm`);
      if (color) parts.push(`màu ${titleCase(color)}`);
      parts.push('đang còn hàng.');
      return { text: parts.join(' ') + ' Bạn có muốn mình gợi ý mẫu tương tự không?' };
    }

    const sorted = matches.sort((a, b) => a.price - b.price);
    const top = sorted.slice(0, 3);

    const lines = top.map((m, i) => {
      const detail: string[] = [];
      if (m.variant?.size) detail.push(`size ${m.variant.size}`);
      if (m.variant?.color) detail.push(`${m.variant.color}`);
      const priceStr = m.price ? ` - ${formatCurrency(m.price)}` : '';
      return `${i + 1}. ✅ ${m.product.name} (${detail.join(', ')})${priceStr}`;
    });

    return {
      text: `📦 Có ${matches.length} lựa chọn ${titleCase(brand)} phù hợp:\n\n${lines.join('\n')}\n\nBạn muốn xem chi tiết mẫu nào không?`,
      productId: top[0]?.product?._id
    };
  };

  const ctxSummary = useMemo(() => {
    const parts: string[] = [];
    if (ctx.purpose) parts.push(`mục đích ${ctx.purpose}`);
    if (ctx.brand) parts.push(`thương hiệu ${ctx.brand}`);
    if (ctx.budget) parts.push(`tầm giá ${humanBudget(ctx.budget)}`);
    if (ctx.size) parts.push(`size ~ ${ctx.size} cm`);
    if (ctx.color) parts.push(`màu ${ctx.color}`);
    return parts.length ? `(${parts.join(', ')})` : '';
  }, [ctx]);

  const updateContext = (text: string) => {
    setCtx(prev => {
      const next: ContextState = { ...prev };
      // Allow updating context if user explicitly mentions it
      const detectedBrand = detectBrand(text);
      const detectedPurpose = detectPurpose(text);
      const detectedColor = detectColor(text);
      const detectedBudget = detectBudget(text) || detectBudgetFromNumber(text);

      if (detectedBrand) next.brand = detectedBrand;
      if (detectedPurpose) next.purpose = detectedPurpose;
      if (detectedColor) next.color = detectedColor;
      if (detectedBudget) next.budget = detectedBudget;

      const s = parseSizeCm(text) || parseSizeEU(text) || parseNumber(text);
      if (s && s >= 20 && s <= 32) next.size = s;
      return next;
    });
  };

  const fetchRecommendations = async (): Promise<{ text: string; productId?: string }> => {
    try {
      setLoading(true);
      let list = await ensureProducts();
      if (!list.length) {
        return { text: '❌ Hiện mình không lấy được danh sách sản phẩm. Bạn thử lại sau nhé!' };
      }

      // Score each product by how well it matches context
      const scored = list.map(p => {
        const name = `${p.name || ''} ${p.brand || ''} ${(p.description || '')}`.toLowerCase();
        let brandScore = 0;
        if (ctx.brand) {
          const brandLower = ctx.brand.toLowerCase();
          if (name.includes(brandLower)) brandScore = 3;
          else if (p.brand && p.brand.toLowerCase().includes(brandLower)) brandScore = 2;
        }

        let purposeScore = 0;
        if (ctx.purpose) {
          const purposeLower = ctx.purpose.toLowerCase();
          if (purposeLower === 'running') {
            if (/run|chạy|boost|pegasus|air zoom|react/.test(name)) purposeScore = 3;
            else if (/sport|athletic/.test(name)) purposeScore = 1;
          } else if (purposeLower === 'casual') {
            if (/casual|stan smith|air force|classic|lifestyle/.test(name)) purposeScore = 3;
            else if (/street|everyday/.test(name)) purposeScore = 2;
          } else if (purposeLower === 'training') {
            if (/train|gym|workout|crossfit/.test(name)) purposeScore = 3;
          }
        }

        const colorScore = ctx.color ? (name.includes(ctx.color.toLowerCase()) ? 2 : 0) : 0;

        // From variants, compute min price and if within budget
        const variants = Array.isArray(p.variants) ? p.variants : [];
        const prices = variants.map((v: any) => Number(v.currentPrice || v.originalPrice || 0)).filter((n: number) => n > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;

        let budgetScore = 0;
        if (ctx.budget && minPrice) {
          if (ctx.budget === 'under1m' && maxPrice < 1000000) budgetScore = 3;
          else if (ctx.budget === 'under1m' && minPrice < 1000000) budgetScore = 2;
          else if (ctx.budget === '1to2m' && minPrice >= 1000000 && maxPrice <= 2000000) budgetScore = 3;
          else if (ctx.budget === '1to2m' && (minPrice >= 1000000 || maxPrice <= 2000000)) budgetScore = 2;
          else if (ctx.budget === 'over2m' && minPrice > 2000000) budgetScore = 3;
          else if (ctx.budget === 'over2m' && maxPrice > 2000000) budgetScore = 2;
        }

        // Size availability
        const sizeOk = ctx.size ? (() => {
          const wanted = String(Math.round((ctx.size as number) * 10) / 10);
          const sizes = variants.map((v: any) => String(v.size || '')).filter(Boolean);
          return sizes.some((s: string) => s.includes(wanted) || Math.abs(parseFloat(s) - (ctx.size as number)) <= 0.5);
        })() : true;
        const sizeScore = sizeOk ? 2 : 0;

        // Stock availability bonus
        const hasStock = variants.some((v: any) => (v.stock || 0) > 0);
        const stockScore = hasStock ? 1 : 0;

        const score = brandScore + purposeScore + colorScore + budgetScore + sizeScore + stockScore;
        return { p, score, minPrice, maxPrice, hasStock };
      }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.hasStock !== b.hasStock) return b.hasStock ? 1 : -1;
        return a.minPrice - b.minPrice;
      });

      const top = scored.filter(s => s.score > 0).slice(0, 5);
      if (!top.length) {
        return { text: '😔 Mình chưa tìm thấy mẫu phù hợp ngay. Bạn có thể cho mình thêm thông tin:\n\n• Mục đích sử dụng (chạy, đi học/làm, tập gym...)\n• Tầm giá (dưới 1tr / 1-2tr / trên 2tr)\n• Thương hiệu yêu thích\n• Size theo cm (ví dụ: 26 cm)\n• Màu sắc ưa thích\n\n💡 Ví dụ: "Mình muốn giày chạy Nike, size 26, tầm 1-2 triệu, màu đen" 😊' };
      }

      const lines = top.slice(0, 3).map((t, i) => {
        const priceStr = t.minPrice ? `${formatCurrency(t.minPrice)}` : '';
        const stockStr = t.hasStock ? '✅' : '⚠️';
        return `${i + 1}. ${stockStr} **${t.p.name}**${priceStr ? ` - ${priceStr}` : ''}`;
      });

      return {
        text: `✨ Gợi ý theo nhu cầu ${ctxSummary || 'của bạn'}:\n\n${lines.join('\n')}\n\n💬 Bạn muốn xem chi tiết mẫu nào không? Chỉ cần nói số thứ tự hoặc tên sản phẩm nhé! 👟`,
        productId: top[0]?.p?._id
      };
    } catch (e) {
      return { text: '❌ Hiện mình không lấy được danh sách sản phẩm. Bạn thử lại sau nhé!' };
    } finally {
      setLoading(false);
    }
  };

  const handleQuestion = async (text: string): Promise<string> => {
    const t = text.toLowerCase();

    // Greetings
    if (/(xin chào|hello|hi|chào|hey)/.test(t)) {
      const followups = [
        'Bạn đang tìm giày để chạy, đi học/làm hay đi chơi ạ?',
        'Bạn có thương hiệu yêu thích như Nike, Adidas không?',
        'Bạn muốn tầm giá khoảng bao nhiêu (dưới 1tr / 1-2tr / trên 2tr)?'
      ];
      const ask = followups[Math.floor(Math.random() * followups.length)];
      return `👋 Xin chào! Rất vui được gặp bạn. ${ask}`;
    }

    // General questions about shoes
    if (/(giày|giày dép|shoe|sneaker)/.test(t) && /(là gì|what|tại sao|why|như thế nào|how)/.test(t)) {
      return '👟 Giày dép là phụ kiện quan trọng cho đôi chân! Mỗi loại giày phù hợp với mục đích khác nhau:\n\n🏃 **Giày chạy**: Đệm êm, nhẹ, hỗ trợ tốt\n👔 **Giày casual**: Thời trang, thoải mái cho hàng ngày\n💪 **Giày tập gym**: Bền, ổn định khi vận động\n\nBạn muốn tìm giày cho mục đích nào? 😊';
    }

    // Shoe types
    if (/(loại giày|dòng giày|category|kiểu giày)/.test(t)) {
      return '🧭 Các loại giày phổ biến và khi nào nên chọn:\n\n🏃‍♂️ **Running**: Chạy bộ, ưu tiên êm ái và nhẹ\n🏋️ **Training/Gym**: Ổn định, mặt đế phẳng hơn\n👟 **Lifestyle/Casual**: Dễ phối đồ, thoải mái hằng ngày\n🏀 **Basketball**: Cổ cao, hỗ trợ cổ chân\n⚽ **Football**: Đinh bám cho sân cỏ\n\nBạn đang cần giày cho mục đích nào để mình gợi ý chính xác hơn?';
    }

    // Size questions
    if (/(size|size nào|kích thước|chọn size)/.test(t)) {
      const sizeCm = parseSizeCm(t) || parseSizeEU(t);
      if (sizeCm) {
        // Context will be updated by updateContext, here we just proceed to recommendations
        return '';
      }
      return '📏 Để chọn size chuẩn:\n\n1️⃣ Đo chân từ gót đến mũi (cm)\n2️⃣ Size ~ chiều dài chân + 0.5-1cm\n3️⃣ Ví dụ: 25cm → chọn ~ 26-26.5\n\nBạn có thể cho mình biết chiều dài chân (cm) hoặc size EU không?';
    }

    // Price questions
    if (/(giá|giá bao nhiêu|price|cost|tầm giá)/.test(t)) {
      const b = detectBudget(t) || detectBudgetFromNumber(t);
      if (b) return ''; // proceed to recommendations with updated context
      return '💰 Giá giày phụ thuộc vào:\n\n• Thương hiệu (Nike, Adidas thường 1-3tr)\n• Chất liệu và công nghệ\n• Mục đích sử dụng\n\nBạn chọn tầm giá nào: dưới 1tr, 1-2tr, hay trên 2tr?';
    }

    // Brand questions
    if (/(thương hiệu|brand|nike|adidas|vans|converse)/.test(t) && /(tốt|good|nên|nên mua)/.test(t)) {
      return '🏆 Một số thương hiệu phổ biến:\n\n✅ **Nike**: Nổi tiếng về giày chạy và thể thao\n✅ **Adidas**: Boost technology, thoải mái\n✅ **Vans**: Phong cách street, casual\n✅ **Converse**: Classic, đa dạng màu sắc\n\nMỗi hãng có điểm mạnh riêng. Bạn thích phong cách nào? 😊';
    }

    // Material questions
    if (/(chất liệu|material|da|vải|mesh)/.test(t)) {
      return '🧵 Chất liệu giày phổ biến:\n\n• **Da**: Bền, sang trọng nhưng giá cao\n• **Vải/Mesh**: Nhẹ, thoáng khí, phù hợp vận động\n• **Synthetic**: Giá rẻ, dễ vệ sinh\n• **Knit**: Ôm chân, linh hoạt\n\nBạn muốn chất liệu nào? Mình sẽ tìm mẫu phù hợp! 👟';
    }

    // Comparison questions
    if (/(so sánh|compare|khác nhau|difference)/.test(t)) {
      return '🔍 Để so sánh giày hiệu quả, bạn cần cho mình biết:\n\n• 2 mẫu bạn muốn so sánh\n• Hoặc mục đích sử dụng để mình đề xuất\n\nVí dụ: "So sánh Nike Air Max và Adidas Ultraboost" hoặc "Giày nào tốt cho chạy?" 😊';
    }

    // Care/maintenance questions
    if (/(bảo quản|vệ sinh|giặt|clean|maintain)/.test(t)) {
      return '🧼 Cách bảo quản giày:\n\n1️⃣ Vệ sinh nhẹ bằng khăn ẩm sau mỗi lần đi\n2️⃣ Phơi khô tự nhiên, tránh nắng trực tiếp\n3️⃣ Dùng bàn chải mềm cho phần đế\n4️⃣ Bảo quản nơi khô ráo, có giấy báo bên trong\n\nGiữ giày sạch sẽ giúp bền hơn! ✨';
    }

    return '';
  };

  const handleBrandAttributeQuestion = async (text: string): Promise<{ text: string } | null> => {
    const brand = detectBrand(text);
    if (!brand) return null;

    const t = text.toLowerCase();
    const wantsPrice = /(giá|bao nhiêu|price|cost|đắt|mắc|bao nhiêu tiền|tầm giá)/.test(t);
    const wantsSize = /(size|kích thước|cỡ|foot|fit|eu)/.test(t);
    const wantsColor = /(màu|color|tone|sắc)/.test(t);

    if (!wantsPrice && !wantsSize && !wantsColor) return null;

    const list = await ensureProducts();
    if (!list.length) {
      return { text: '❌ Hiện mình chưa truy cập được danh sách sản phẩm. Bạn thử lại sau chút nhé!' };
    }

    const brandLower = brand.toLowerCase();
    const brandProducts = list.filter((p: any) => {
      const b = (p.brand || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return b.includes(brandLower) || name.includes(brandLower);
    });

    if (!brandProducts.length) {
      return { text: `😕 Mình chưa tìm thấy mẫu ${titleCase(brand)} nào trong danh mục hiện tại. Bạn thử thương hiệu khác nhé!` };
    }

    const variants = brandProducts.flatMap((p: any) => (Array.isArray(p.variants) ? p.variants : []));
    if (!variants.length) {
      return { text: `😕 Các mẫu ${titleCase(brand)} hiện chưa có thông tin chi tiết về biến thể. Mình sẽ cập nhật sớm!` };
    }

    const parts: string[] = [];

    if (wantsPrice) {
      const prices = variants
        .map((v: any) => Number(v?.currentPrice ?? v?.originalPrice ?? 0))
        .filter((n: number) => Number.isFinite(n) && n > 0);
      if (prices.length) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((sum, n) => sum + n, 0) / prices.length;
        parts.push(`💰 Giá ${titleCase(brand)} hiện dao động từ khoảng ${formatCurrency(min)} tới ${formatCurrency(max)} (trung bình ~${formatCurrency(Math.round(avg))}).`);
      } else {
        parts.push(`💰 Mình chưa có dữ liệu giá chính xác của ${titleCase(brand)}.`);
      }
    }

    if (wantsSize) {
      const sizeSet = new Set<string>();
      variants.forEach((v: any) => {
        if (v?.size) sizeSet.add(String(v.size).trim());
      });
      if (sizeSet.size) {
        const sizes = Array.from(sizeSet);
        sizes.sort((a, b) => {
          const na = parseFloat(a);
          const nb = parseFloat(b);
          if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
          if (!Number.isNaN(na)) return -1;
          if (!Number.isNaN(nb)) return 1;
          return a.localeCompare(b);
        });
        const displaySizes = sizes.slice(0, 10).join(', ');
        parts.push(`📏 Size phổ biến của ${titleCase(brand)}: ${displaySizes}${sizes.length > 10 ? '…' : ''}.`);
      } else {
        parts.push(`📏 Mình chưa có dữ liệu size cụ thể của ${titleCase(brand)}.`);
      }
    }

    if (wantsColor) {
      const colorMap = new Map<string, { count: number; label: string }>();
      variants.forEach((v: any) => {
        const label = typeof v?.color === 'string' ? v.color.trim() : '';
        if (!label) return;
        const key = label.toLowerCase();
        const existing = colorMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          colorMap.set(key, { count: 1, label });
        }
      });
      if (colorMap.size) {
        const topColors = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(entry => `${titleCase(entry.label)} (${entry.count})`)
          .join(', ');
        parts.push(`🎨 Màu sắc đang có nhiều lựa chọn: ${topColors}${colorMap.size > 5 ? '…' : ''}.`);
      } else {
        parts.push(`🎨 Mình chưa có dữ liệu màu sắc cụ thể của ${titleCase(brand)}.`);
      }
    }

    const summary = parts.join('\n\n');
    return {
      text: `🔎 Thông tin nhanh về ${titleCase(brand)}:\n\n${summary}\n\nBạn muốn mình gợi ý mẫu cụ thể theo tiêu chí nào không?`,
    };
  };

  const generateReply = async (text: string): Promise<{ text: string; productId?: string }> => {
    updateContext(text);
    const t = text.toLowerCase();

    // Handle general questions first
    const questionAnswer = await handleQuestion(text);
    if (questionAnswer) {
      return { text: questionAnswer };
    }

    let activeProducts = productsCache;
    const ensureActiveProducts = async (): Promise<any[]> => {
      if (!activeProducts.length) {
        activeProducts = await ensureProducts();
      }
      return activeProducts;
    };

    const brandInfo = await handleBrandAttributeQuestion(text);
    if (brandInfo) {
      return brandInfo;
    }

    const availability = await answerAvailability(text);
    if (availability) {
      return availability;
    }

    // Check if user wants to see a specific product
    const productMatch = text.match(/(?:số|mẫu|sản phẩm)\s*(\d+)|#(\d+)/i);
    if (productMatch) {
      const list = await ensureActiveProducts();
      const index = parseInt(productMatch[1] || productMatch[2]) - 1;
      if (Number.isFinite(index) && index >= 0 && index < list.length) {
        const product = list[index];
        return {
          text: `✅ Mình sẽ đưa bạn đến mẫu **${product.name}** nhé! 👟`,
          productId: product._id
        };
      }
    }

    // Check for product name mentions
    const productListForNames = await ensureActiveProducts();
    const productNameMatch = productListForNames.find((p: any) => {
      const name = (p.name || '').toLowerCase();
      return t.includes(name) || name.split(' ').some((word: string) => word.length > 3 && t.includes(word));
    });
    if (productNameMatch) {
      return {
        text: `✅ Mình tìm thấy **${productNameMatch.name}**! Bạn muốn xem chi tiết không? 👟`,
        productId: productNameMatch._id
      };
    }

    // If the message asks for recommendation or provides key info, try to recommend
    const wantsSuggest = /(tư vấn|gợi ý|suggest|nên mua|mẫu nào|loại nào|nên chọn|tìm|search|muốn|đang tìm)/.test(t)
      || detectBudget(t) || detectBudgetFromNumber(t) || detectBrand(t) || detectPurpose(t) || parseSizeCm(t) || parseSizeEU(t);
    if (!wantsSuggest && detectColor(t)) {
      return await fetchRecommendations();
    }

    if (wantsSuggest) {
      return await fetchRecommendations();
    }

    // Conversational responses
    if (/(cảm ơn|thanks|thank|thank you)/.test(t)) {
      return { text: '😊 Không có gì! Mình rất vui được giúp bạn. Nếu cần thêm tư vấn, cứ hỏi mình nhé! 👟' };
    }

    if (/(tạm biệt|bye|goodbye|hẹn gặp)/.test(t)) {
      return { text: '👋 Tạm biệt! Chúc bạn tìm được đôi giày ưng ý nhé! 😊' };
    }

    // Otherwise answer conversationally and show what info we still need
    const missing: string[] = [];
    if (!ctx.purpose) missing.push('mục đích (chạy, casual, gym...)');
    if (!ctx.budget) missing.push('tầm giá (dưới 1tr / 1-2tr / trên 2tr)');
    if (!ctx.size) missing.push('size theo cm (ví dụ: 26 cm)');
    if (!ctx.brand) missing.push('thương hiệu ưa thích');

    if (missing.length) {
      return {
        text: `🤔 Mình đã ghi nhận ${ctxSummary || 'yêu cầu của bạn'}.\n\nĐể tư vấn chính xác hơn, bạn bổ sung giúp:\n${missing.map(m => `• ${m}`).join('\n')}\n\n💡 Hoặc bạn có thể hỏi mình về:\n• Cách chọn size\n• So sánh thương hiệu\n• Cách bảo quản giày\n• Và nhiều hơn nữa! 😊`
      };
    }

    // If everything present, recommend
    return await fetchRecommendations();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { id: String(Date.now()), role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    const replyPromise = generateReply(text);
    setTyping(true);
    const reply = await replyPromise;
    await new Promise(res => setTimeout(res, 200));
    const aiMsg: Message = {
      id: String(Date.now() + 1),
      role: 'ai',
      text: reply.text,
      ts: Date.now() + 1,
      productId: reply.productId
    };
    setMessages(prev => [...prev, aiMsg]);
    setTyping(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    // Navigate to product if mentioned
    if (reply.productId) {
      setTimeout(() => {
        router.push(`/product/${reply.productId}` as any);
      }, 1500);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView ref={scrollRef} style={styles.messages} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map(m => (
          <View key={m.id} style={[styles.row, m.role === 'user' ? styles.rowRight : styles.rowLeft]}>
            <TouchableWithoutFeedback onPress={() => m.productId && router.push(`/product/${m.productId}` as any)}>
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI, m.productId && styles.bubbleClickable]}>
                <Text style={[styles.text, m.role === 'user' ? styles.textUser : styles.textAI]}>{m.text}</Text>
                {m.productId && (
                  <Text style={styles.linkHint}>👉 Chạm để xem sản phẩm</Text>
                )}
                <Text style={styles.time}>{new Date(m.ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        ))}
        {typing && (
          <View style={[styles.row, styles.rowLeft]}>
            <View style={[styles.bubble, styles.bubbleAI]}>
              <Text style={styles.textAI}>Đang nhập…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={loading ? 'Đang tìm mẫu phù hợp...' : 'Nhập câu hỏi...'}
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity onPress={send} style={[styles.sendBtn, loading && { opacity: 0.6 }]} disabled={loading}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  messages: { flex: 1, padding: 16 },
  row: { marginBottom: 12 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 14 },
  bubbleUser: { backgroundColor: '#007bff', borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleClickable: { borderWidth: 1, borderColor: '#007bff', backgroundColor: '#f0f8ff' },
  text: { fontSize: 14, lineHeight: 20 },
  textUser: { color: '#fff' },
  textAI: { color: '#222' },
  linkHint: { fontSize: 11, color: '#007bff', marginTop: 6, fontStyle: 'italic' },
  time: { fontSize: 10, opacity: 0.7, marginTop: 4 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d0d0d0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center' }
});
