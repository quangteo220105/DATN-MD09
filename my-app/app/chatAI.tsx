import React, { useRef, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';
import OpenAI from 'openai';

// Lấy API key từ environment variable và trim để loại bỏ khoảng trắng
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();

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

// Hàm format size để hiển thị đẹp hơn
function formatSize(size: any): string {
  const sizeStr = String(size || '').trim();
  // Nếu là số từ 35-50, coi là size EU
  const sizeNum = parseFloat(sizeStr);
  if (!isNaN(sizeNum) && sizeNum >= 35 && sizeNum <= 50) {
    return `EU ${Math.round(sizeNum)}`;
  }
  // Nếu là số từ 22-32, coi là cm
  if (!isNaN(sizeNum) && sizeNum >= 22 && sizeNum <= 32) {
    return `${sizeNum}cm`;
  }
  // Trả về nguyên bản nếu không match
  return sizeStr;
}

// Hàm sắp xếp size thông minh
function sortSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    const na = parseFloat(String(a));
    const nb = parseFloat(String(b));
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return String(a).localeCompare(String(b));
  });
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
    'adidas': ['adidas', 'adi', 'ultraboost', 'stan smith', 'superstar', 'nmd'],
    'nike': ['nike', 'air max', 'air force', 'jordan', 'pegasus', 'react', 'zoom'],
    'vans': ['vans', 'old skool', 'sk8-hi', 'authentic'],
    'converse': ['converse', 'chuck taylor', 'all star', 'chuck 70'],
    'puma': ['puma', 'suede', 'rs-x'],
    'new balance': ['new balance', 'nb', '574', '990'],
    'reebok': ['reebok', 'classic leather'],
    'asics': ['asics', 'gel', 'kayano', 'nimbus'],
    'brooks': ['brooks', 'ghost', 'glycerin', 'adrenaline', 'launch'],
    'under armour': ['under armour', 'ua', 'hovr'],
    'skechers': ['skechers', 'go walk']
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

        // Log thông tin sản phẩm để AI có thể trả lời chính xác
        console.log('📦 Loaded products:', active.length);
        active.forEach((p: any) => {
          const variants = Array.isArray(p.variants) ? p.variants : [];
          const prices = variants.map((v: any) => Number(v.currentPrice || v.originalPrice || 0)).filter((n: number) => n > 0);
          const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
          const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
          console.log(`  - ${p.name} (${p.brand}): Giá ${Math.min(...prices)}-${Math.max(...prices)}đ, Màu: ${colors.join(', ')}, Size: ${sizes.join(', ')}`);
        });

        setProductsCache(active);
        list = active;
      } catch (error) {
        console.error('❌ ensureProducts error', error);
        return [];
      }
    }
    return list.filter((p: any) => p && p.isActive !== false);
  };

  // Hàm gọi OpenAI API
  const callOpenAI = async (userMessage: string, productContext: string): Promise<string> => {
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment');
      console.log('Available env keys:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
      return '';
    }

    // Log để debug (chỉ hiển thị 10 ký tự đầu và cuối)
    console.log('🔑 Using OpenAI key:', OPENAI_API_KEY.substring(0, 10) + '...' + OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4));
    console.log('🔑 Key length:', OPENAI_API_KEY.length);

    try {
      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        dangerouslyAllowBrowser: true // Chỉ dùng cho demo, production nên dùng backend
      });

      const systemPrompt = `Bạn là trợ lý AI tư vấn giày thông minh cho cửa hàng giày. 
Nhiệm vụ của bạn là tư vấn khách hàng về giày dựa trên thông tin sản phẩm có sẵn.

THÔNG TIN SẢN PHẨM HIỆN CÓ:
${productContext}

HƯỚNG DẪN TRẢ LỜI:
- Trả lời ngắn gọn, thân thiện, dùng emoji phù hợp
- Dựa vào thông tin sản phẩm thực tế để tư vấn
- Nếu không có sản phẩm phù hợp, gợi ý sản phẩm tương tự
- Luôn hỏi thêm thông tin nếu cần (size, màu, tầm giá, mục đích)
- Không bịa đặt thông tin không có trong danh sách
- Trả lời bằng tiếng Việt`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('❌ OpenAI API error:', error);
      if (error?.status === 401) {
        return '❌ Lỗi xác thực API key. Vui lòng kiểm tra lại cấu hình.';
      }
      return '';
    }
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

    // Size questions - CHỈ trả lời chung chung khi KHÔNG có thương hiệu cụ thể
    if (/(size|size nào|kích thước|chọn size)/.test(t)) {
      const sizeCm = parseSizeCm(t) || parseSizeEU(t);
      if (sizeCm) {
        // Context will be updated by updateContext, here we just proceed to recommendations
        return '';
      }

      // ✅ Nếu có thương hiệu cụ thể, KHÔNG trả lời ở đây
      const hasBrand = detectBrand(t);
      if (hasBrand) return '';

      return '📏 Để chọn size chuẩn:\n\n1️⃣ Đo chân từ gót đến mũi (cm)\n2️⃣ Size ~ chiều dài chân + 0.5-1cm\n3️⃣ Ví dụ: 25cm → chọn ~ 26-26.5\n\nBạn có thể cho mình biết chiều dài chân (cm) hoặc size EU không?';
    }

    // Price questions - CHỈ trả lời chung chung khi KHÔNG có thương hiệu cụ thể
    if (/(giá|giá bao nhiêu|price|cost|tầm giá)/.test(t)) {
      const b = detectBudget(t) || detectBudgetFromNumber(t);
      if (b) return ''; // proceed to recommendations with updated context

      // ✅ Nếu có thương hiệu cụ thể, KHÔNG trả lời ở đây, để handleBrandAttributeQuestion xử lý
      const hasBrand = detectBrand(t);
      if (hasBrand) return '';

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

  const handleProductDetailQuestion = async (text: string): Promise<{ text: string } | null> => {
    const t = text.toLowerCase();
    const wantsPrice = /(giá|bao nhiêu|price|cost|đắt|mắc|bao nhiêu tiền|tầm giá)/.test(t);
    const wantsSize = /(size|kích thước|cỡ|foot|fit|eu)/.test(t);
    const wantsColor = /(màu|color|tone|sắc)/.test(t);
    const wantsStock = /(còn|có|available|stock|tồn kho)/.test(t);

    if (!wantsPrice && !wantsSize && !wantsColor && !wantsStock) return null;

    const list = await ensureProducts();
    if (!list.length) {
      return { text: '❌ Hiện mình chưa truy cập được danh sách sản phẩm. Bạn thử lại sau chút nhé!' };
    }

    // Tìm sản phẩm cụ thể được nhắc đến
    // Ưu tiên tìm theo thương hiệu trước
    const detectedBrand = detectBrand(text);

    let productMatches = list;

    // Nếu có thương hiệu, lọc theo thương hiệu
    if (detectedBrand) {
      const brandLower = detectedBrand.toLowerCase();
      productMatches = list.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return brand.includes(brandLower) || name.includes(brandLower);
      });
    } else {
      // Nếu không có thương hiệu, tìm theo tên sản phẩm
      productMatches = list.filter((p: any) => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const keywords = name.split(' ').filter((w: string) => w.length > 3);
        return keywords.some((kw: string) => t.includes(kw)) || t.includes(name) || t.includes(brand);
      });
    }

    // Nếu tìm thấy nhiều sản phẩm cùng thương hiệu, trả về tổng hợp CHI TIẾT
    if (productMatches.length > 1 && detectedBrand) {
      const variants = productMatches.flatMap((p: any) => Array.isArray(p.variants) ? p.variants : []);
      const parts: string[] = [];
      parts.push(`🔍 **Thông tin ${titleCase(detectedBrand)}** (${productMatches.length} mẫu):\n`);

      if (wantsPrice && variants.length) {
        const prices = variants
          .map((v: any) => Number(v?.currentPrice ?? v?.originalPrice ?? 0))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        if (prices.length) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
          parts.push(`💰 **Giá**: ${formatCurrency(min)} - ${formatCurrency(max)}`);
          parts.push(`   Trung bình: ${formatCurrency(avg)}`);
        } else {
          parts.push(`💰 **Giá**: Liên hệ`);
        }
      }

      if (wantsColor && variants.length) {
        const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
        if (colors.length) {
          parts.push(`🎨 **Màu sắc** (${colors.length} màu): ${colors.slice(0, 10).map(c => titleCase(String(c))).join(', ')}${colors.length > 10 ? '...' : ''}`);
        } else {
          parts.push(`🎨 **Màu sắc**: Đang cập nhật`);
        }
      }

      if (wantsSize && variants.length) {
        const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
        if (sizes.length) {
          const sortedSizes = sortSizes(sizes.map(s => String(s)));
          const formattedSizes = sortedSizes.map(s => formatSize(s));
          parts.push(`📏 **Size có sẵn**: ${formattedSizes.join(', ')}`);
        } else {
          parts.push(`📏 **Size**: Đang cập nhật`);
        }
      }

      if (wantsStock) {
        const inStock = variants.filter((v: any) => (v.stock || 0) > 0).length;
        const totalVariants = variants.length;
        parts.push(`📦 **Tồn kho**: ${inStock}/${totalVariants} biến thể còn hàng`);
      }

      // Liệt kê các mẫu CHI TIẾT
      parts.push(`\n**📋 Danh sách sản phẩm:**`);
      productMatches.slice(0, 5).forEach((p: any, i: number) => {
        const pVariants = Array.isArray(p.variants) ? p.variants : [];
        const pPrices = pVariants.map((v: any) => Number(v.currentPrice || v.originalPrice || 0)).filter((n: number) => n > 0);
        const minPrice = pPrices.length ? Math.min(...pPrices) : 0;
        const maxPrice = pPrices.length ? Math.max(...pPrices) : 0;
        const pColors = [...new Set(pVariants.map((v: any) => v.color).filter(Boolean))];
        const pSizes = [...new Set(pVariants.map((v: any) => v.size).filter(Boolean))];

        let priceStr = minPrice ? formatCurrency(minPrice) : 'Liên hệ';
        if (maxPrice && maxPrice !== minPrice) {
          priceStr = `${formatCurrency(minPrice)}-${formatCurrency(maxPrice)}`;
        }

        parts.push(`\n${i + 1}. **${p.name}**`);
        parts.push(`   💰 ${priceStr}`);
        if (pColors.length) {
          const colorList = pColors.slice(0, 3).map(c => titleCase(String(c))).join(', ');
          parts.push(`   🎨 Màu: ${colorList}${pColors.length > 3 ? ` (+${pColors.length - 3} màu)` : ''}`);
        }
        if (pSizes.length) {
          const sortedPSizes = sortSizes(pSizes.map(s => String(s)));
          const sizeList = sortedPSizes.slice(0, 5).map(s => formatSize(s)).join(', ');
          parts.push(`   📏 Size: ${sizeList}${sortedPSizes.length > 5 ? ` (+${sortedPSizes.length - 5})` : ''}`);
        }
      });

      if (productMatches.length > 5) {
        parts.push(`\n...và ${productMatches.length - 5} mẫu khác`);
      }

      parts.push(`\n💬 Bạn muốn xem chi tiết mẫu nào không? 😊`);

      return { text: parts.join('\n') };
    }

    // Nếu chỉ tìm thấy 1 sản phẩm
    const productMatch = productMatches[0];

    if (productMatch) {
      const variants = Array.isArray(productMatch.variants) ? productMatch.variants : [];
      const parts: string[] = [];
      parts.push(`🔍 **${productMatch.name}**\n`);

      if (wantsPrice && variants.length) {
        const prices = variants
          .map((v: any) => Number(v?.currentPrice ?? v?.originalPrice ?? 0))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        if (prices.length) {
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          if (min === max) {
            parts.push(`💰 **Giá**: ${formatCurrency(min)}`);
          } else {
            parts.push(`💰 **Giá**: ${formatCurrency(min)} - ${formatCurrency(max)}`);
          }
        } else {
          parts.push(`💰 **Giá**: Liên hệ`);
        }
      }

      if (wantsColor && variants.length) {
        const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
        if (colors.length) {
          parts.push(`🎨 **Màu sắc**: ${colors.map(c => titleCase(String(c))).join(', ')}`);
        } else {
          parts.push(`🎨 **Màu sắc**: Đang cập nhật`);
        }
      }

      if (wantsSize && variants.length) {
        const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
        if (sizes.length) {
          const sortedSizes = sortSizes(sizes.map(s => String(s)));
          const formattedSizes = sortedSizes.map(s => formatSize(s));
          parts.push(`📏 **Size có sẵn**: ${formattedSizes.join(', ')}`);
        } else {
          parts.push(`📏 **Size**: Đang cập nhật`);
        }
      }

      // Thêm thông tin tồn kho
      if (wantsStock) {
        const inStock = variants.filter((v: any) => (v.stock || 0) > 0).length;
        if (inStock > 0) {
          parts.push(`✅ **Còn hàng**: ${inStock}/${variants.length} biến thể`);
        } else {
          parts.push(`⚠️ **Tạm hết hàng**`);
        }
      }

      parts.push(`\n💬 Bạn muốn xem chi tiết hoặc đặt hàng không? 😊`);

      return {
        text: parts.join('\n')
      };
    }

    return null;
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
        parts.push(`💰 **Giá ${titleCase(brand)}**: ${formatCurrency(min)} - ${formatCurrency(max)}`);
        parts.push(`   Trung bình: ${formatCurrency(Math.round(avg))}`);
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
        const sortedSizes = sortSizes(sizes);
        const formattedSizes = sortedSizes.map(s => formatSize(s));
        const displaySizes = formattedSizes.slice(0, 15).join(', ');
        parts.push(`📏 **Size ${titleCase(brand)}**: ${displaySizes}${formattedSizes.length > 15 ? ` (+${formattedSizes.length - 15})` : ''}`);
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
          .slice(0, 8)
          .map(entry => titleCase(entry.label))
          .join(', ');
        parts.push(`🎨 **Màu sắc ${titleCase(brand)}**: ${topColors}${colorMap.size > 8 ? ` (+${colorMap.size - 8} màu)` : ''}`);
      } else {
        parts.push(`🎨 Mình chưa có dữ liệu màu sắc cụ thể của ${titleCase(brand)}.`);
      }
    }

    const summary = parts.join('\n');
    return {
      text: `🔎 **Thông tin ${titleCase(brand)}**:\n\n${summary}\n\n💬 Bạn muốn xem chi tiết mẫu nào không? 😊`,
    };
  };

  const generateReply = async (text: string): Promise<{ text: string; productId?: string }> => {
    updateContext(text);
    const t = text.toLowerCase();

    let activeProducts = productsCache;
    const ensureActiveProducts = async (): Promise<any[]> => {
      if (!activeProducts.length) {
        activeProducts = await ensureProducts();
      }
      return activeProducts;
    };

    // ✅ KIỂM TRA CÂU HỎI VỀ GIÁ MIN/MAX TRƯỚC (ưu tiên cao hơn)
    const askingPriceRange = /(giá.*nhỏ.*nhất|giá.*bé.*nhất|giá.*thấp.*nhất|giá.*rẻ.*nhất|giá.*min|minimum|cheapest|lowest|giá.*lớn.*nhất|giá.*cao.*nhất|giá.*đắt.*nhất|giá.*max|maximum|expensive|highest|khoảng.*giá|price.*range|từ.*đến|range)/.test(t);

    console.log('[ChatAI] 🔍 Checking price range FIRST:', { text: t, match: askingPriceRange });

    if (askingPriceRange) {
      const list = await ensureActiveProducts();
      console.log('[ChatAI] 📊 Products loaded:', list.length);

      if (list.length > 0) {
        // ✅ FIX: Lấy giá từ variants thay vì p.price
        const allPrices: number[] = [];
        const productPriceMap = new Map<number, any>();

        list.forEach((p: any) => {
          const variants = Array.isArray(p.variants) ? p.variants : [];
          const prices = variants
            .map((v: any) => Number(v?.currentPrice ?? v?.originalPrice ?? 0))
            .filter((price: number) => Number.isFinite(price) && price > 0);

          if (prices.length > 0) {
            const minProductPrice = Math.min(...prices);
            const maxProductPrice = Math.max(...prices);
            allPrices.push(minProductPrice, maxProductPrice);

            // Map giá với sản phẩm
            productPriceMap.set(minProductPrice, p);
            productPriceMap.set(maxProductPrice, p);
          }
        });

        console.log('[ChatAI] 💵 Valid prices from variants:', allPrices.length, 'prices from', list.length, 'products');

        if (allPrices.length > 0) {
          const minPrice = Math.min(...allPrices);
          const maxPrice = Math.max(...allPrices);

          // Tìm sản phẩm có giá min và max
          const cheapestProduct = productPriceMap.get(minPrice);
          const expensiveProduct = productPriceMap.get(maxPrice);

          console.log('[ChatAI] 🎯 Price range found:', { minPrice, maxPrice });

          return {
            text: `💰 **Khoảng giá sản phẩm:**\n\n` +
              `🔻 **Giá thấp nhất:** ${formatCurrency(minPrice)}\n` +
              `   ➤ ${cheapestProduct?.name || 'Sản phẩm'}\n\n` +
              `🔺 **Giá cao nhất:** ${formatCurrency(maxPrice)}\n` +
              `   ➤ ${expensiveProduct?.name || 'Sản phẩm'}\n\n` +
              `📊 **Tổng cộng:** ${list.length} sản phẩm\n\n` +
              `💡 Bạn có thể hỏi về giá của thương hiệu cụ thể như "Giá Nike", "Giá Adidas"...`
          };
        } else {
          console.log('[ChatAI] ❌ No valid prices found in variants');
          return {
            text: `😅 Hiện tại chưa có thông tin giá sản phẩm. Bạn thử hỏi về sản phẩm cụ thể nhé!`
          };
        }
      } else {
        console.log('[ChatAI] ❌ No products found');
        return {
          text: `😅 Hiện tại chưa có sản phẩm nào. Vui lòng thử lại sau!`
        };
      }
    }

    // ✅ KIỂM TRA CÂU HỎI VỀ DANH MỤC GIÀY (các danh mục giày, thương hiệu nào, brand nào...)
    const askingCategories = /(danh mục|thương hiệu|brand|hãng|loại giày|các hãng|các thương hiệu|có những gì|có gì|có hãng nào|có brand nào)/.test(t);

    if (askingCategories) {
      const list = await ensureActiveProducts();

      // Lấy tất cả thương hiệu từ sản phẩm
      const brands = new Set<string>();
      list.forEach((p: any) => {
        const brand = (p.brand || '').trim();
        const name = (p.name || '').toLowerCase();

        // Detect brand từ tên sản phẩm nếu không có brand field
        if (brand) {
          brands.add(titleCase(brand));
        } else {
          // Detect từ tên sản phẩm
          if (name.includes('nike')) brands.add('Nike');
          if (name.includes('adidas')) brands.add('Adidas');
          if (name.includes('puma')) brands.add('Puma');
          if (name.includes('asics')) brands.add('Asics');
          if (name.includes('brooks')) brands.add('Brooks');
          if (name.includes('vans')) brands.add('Vans');
          if (name.includes('converse')) brands.add('Converse');
          if (name.includes('new balance')) brands.add('New Balance');
          if (name.includes('under armour')) brands.add('Under Armour');
          if (name.includes('skechers')) brands.add('Skechers');
        }
      });

      const brandList = Array.from(brands).sort();

      if (brandList.length > 0) {
        const brandText = brandList.map((brand, index) => `${index + 1}. **${brand}**`).join('\n');
        return {
          text: `🏷️ **Các thương hiệu giày hiện có:**\n\n${brandText}\n\n💡 Bạn có thể hỏi về giá, màu sắc, size của từng thương hiệu nhé! Ví dụ: "Giá giày Nike", "Adidas có màu gì", "Size Puma"...`
        };
      } else {
        return {
          text: `😅 Hiện tại chưa có thông tin về thương hiệu. Bạn thử hỏi về sản phẩm cụ thể nhé!`
        };
      }
    }

    // ✅ REMOVED DUPLICATE PRICE RANGE CHECK - Already handled above

    // ✅ KIỂM TRA NẾU USER MUỐN XEM GIÀY CỦA THƯƠNG HIỆU (cho tôi xem giày adidas, xem giày nike...)
    const wantsToView = /(cho.*xem|xem|show|hiển thị|cho tôi|muốn xem)/.test(t);
    const hasBrandMention = detectBrand(text);

    if (wantsToView && hasBrandMention) {
      const list = await ensureActiveProducts();
      const brandLower = hasBrandMention.toLowerCase();
      const brandProducts = list.filter((p: any) => {
        const b = (p.brand || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return b.includes(brandLower) || name.includes(brandLower);
      });

      if (brandProducts.length > 0) {
        // Lấy sản phẩm đầu tiên của thương hiệu
        const firstProduct = brandProducts[0];
        return {
          text: `✅ Đây là **${firstProduct.name}** của ${titleCase(hasBrandMention)}! Mình sẽ đưa bạn đến xem chi tiết nhé 👟\n\n(Chúng tôi có ${brandProducts.length} mẫu ${titleCase(hasBrandMention)})`,
          productId: firstProduct._id
        };
      } else {
        return {
          text: `😕 Mình chưa tìm thấy mẫu ${titleCase(hasBrandMention)} nào. Bạn thử thương hiệu khác nhé!`
        };
      }
    }

    // ✅ ƯU TIÊN CAO NHẤT: Kiểm tra câu hỏi về thương hiệu cụ thể (giá, màu, size của brand)
    // Phải check TRƯỚC handleQuestion để tránh bị chặn bởi câu trả lời chung chung
    const brandInfo = await handleBrandAttributeQuestion(text);
    if (brandInfo) {
      return brandInfo;
    }

    // Kiểm tra câu hỏi về sản phẩm cụ thể
    const productDetail = await handleProductDetailQuestion(text);
    if (productDetail) {
      return productDetail;
    }

    const availability = await answerAvailability(text);
    if (availability) {
      return availability;
    }

    // Handle general questions (chỉ khi không phải câu hỏi về sản phẩm cụ thể)
    const questionAnswer = await handleQuestion(text);
    if (questionAnswer) {
      return { text: questionAnswer };
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

    // Tắt OpenAI do hết quota (Error 429)
    // App vẫn hoạt động tốt với logic AI có sẵn
    const useOpenAI = false;

    if (useOpenAI && OPENAI_API_KEY) {
      try {
        const products = await ensureProducts();
        const productContext = products.slice(0, 20).map((p: any) => {
          const variants = Array.isArray(p.variants) ? p.variants : [];
          const prices = variants.map((v: any) => Number(v.currentPrice || v.originalPrice || 0)).filter((n: number) => n > 0);
          const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
          const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
          const minPrice = prices.length ? Math.min(...prices) : 0;
          const maxPrice = prices.length ? Math.max(...prices) : 0;
          return `- ${p.name} (${p.brand}): ${minPrice ? `${formatCurrency(minPrice)}-${formatCurrency(maxPrice)}` : 'Liên hệ'}, Màu: ${colors.join(', ')}, Size: ${sizes.join(', ')}`;
        }).join('\n');

        const aiResponse = await callOpenAI(text, productContext);
        if (aiResponse) {
          return { text: aiResponse };
        }
      } catch (error) {
        console.error('OpenAI fallback error:', error);
      }
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
