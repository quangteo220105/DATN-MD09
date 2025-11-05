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

function detectBudget(text: string): Budget | null {
  const t = text.toLowerCase();
  if (/(dưới|<|<=|under|below).*1\s*(tr|triệu|m)/.test(t) || /(\b1\s*m\b)/.test(t)) return 'under1m';
  if (/(1\s*-\s*2\s*tr|1-2tr|1 đến 2tr|1 to 2m|1\s*triệu\s*đến\s*2\s*triệu)/.test(t)) return '1to2m';
  if (/(>\s*2\s*tr|trên\s*2\s*triệu|over 2m|more than 2m)/.test(t)) return 'over2m';
  return null;
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
  const scrollRef = useRef<ScrollView>(null);
  const [productsCache, setProductsCache] = useState<any[]>([]);

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
      const detectedBudget = detectBudget(text);
      
      if (detectedBrand) next.brand = detectedBrand;
      if (detectedPurpose) next.purpose = detectedPurpose;
      if (detectedColor) next.color = detectedColor;
      if (detectedBudget) next.budget = detectedBudget;
      
      const s = parseSizeCm(text) || parseNumber(text);
      if (s && s >= 20 && s <= 32) next.size = s;
      return next;
    });
  };

  const fetchRecommendations = async (): Promise<{ text: string; productId?: string }> => {
    try {
      setLoading(true);
      let list = productsCache;
      if (list.length === 0) {
        const res = await axios.get(`${BASE_URL}/products`);
        list = Array.isArray(res.data) ? res.data : [];
        setProductsCache(list.filter((p: any) => p.isActive !== false)); // Cache only active products
      }
      list = list.filter((p: any) => p.isActive !== false); // Only active products

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
          return sizes.some(s => s.includes(wanted) || Math.abs(parseFloat(s) - (ctx.size as number)) <= 0.5);
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
        const priceStr = t.minPrice ? `${Math.round(t.minPrice / 1000)}k` : '';
        const stockStr = t.hasStock ? '✅' : '⚠️';
        return `${i + 1}. ${stockStr} **${t.p.name}**${priceStr ? ` - ${priceStr} VNĐ` : ''}`;
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
      return '👋 Xin chào! Mình có thể giúp gì cho bạn về giày dép? 😊';
    }
    
    // General questions about shoes
    if (/(giày|giày dép|shoe|sneaker)/.test(t) && /(là gì|what|tại sao|why|như thế nào|how)/.test(t)) {
      return '👟 Giày dép là phụ kiện quan trọng cho đôi chân! Mỗi loại giày phù hợp với mục đích khác nhau:\n\n🏃 **Giày chạy**: Đệm êm, nhẹ, hỗ trợ tốt\n👔 **Giày casual**: Thời trang, thoải mái cho hàng ngày\n💪 **Giày tập gym**: Bền, ổn định khi vận động\n\nBạn muốn tìm giày cho mục đích nào? 😊';
    }
    
    // Size questions
    if (/(size|size nào|kích thước|chọn size)/.test(t)) {
      return '📏 Để chọn size phù hợp:\n\n1️⃣ Đo chân từ gót đến mũi (đơn vị cm)\n2️⃣ Thường size giày = độ dài chân + 0.5-1cm\n3️⃣ Ví dụ: chân 25cm → size 26-26.5\n\nBạn đo chân được bao nhiêu cm? Mình sẽ tư vấn size phù hợp! 👟';
    }
    
    // Price questions
    if (/(giá|giá bao nhiêu|price|cost|tầm giá)/.test(t)) {
      return '💰 Giá giày phụ thuộc vào:\n\n• Thương hiệu (Nike, Adidas thường 1-3tr)\n• Chất liệu và công nghệ\n• Mục đích sử dụng\n\nMình có thể tìm giày theo tầm giá bạn muốn:\n• Dưới 1 triệu\n• 1-2 triệu\n• Trên 2 triệu\n\nBạn muốn tầm giá nào? 💵';
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

  const generateReply = async (text: string): Promise<{ text: string; productId?: string }> => {
    updateContext(text);
    const t = text.toLowerCase();

    // Handle general questions first
    const questionAnswer = await handleQuestion(text);
    if (questionAnswer) {
      return { text: questionAnswer };
    }

    // Check if user wants to see a specific product
    const productMatch = text.match(/(?:số|mẫu|sản phẩm)\s*(\d+)|#(\d+)/i);
    if (productMatch && productsCache.length > 0) {
      const index = parseInt(productMatch[1] || productMatch[2]) - 1;
      if (index >= 0 && index < productsCache.length) {
        const product = productsCache[index];
        return { 
          text: `✅ Mình sẽ đưa bạn đến mẫu **${product.name}** nhé! 👟`,
          productId: product._id 
        };
      }
    }

    // Check for product name mentions
    const productNameMatch = productsCache.find(p => {
      const name = (p.name || '').toLowerCase();
      return t.includes(name) || name.split(' ').some(word => word.length > 3 && t.includes(word));
    });
    if (productNameMatch) {
      return { 
        text: `✅ Mình tìm thấy **${productNameMatch.name}**! Bạn muốn xem chi tiết không? 👟`,
        productId: productNameMatch._id 
      };
    }

    // If the message asks for recommendation or provides key info, try to recommend
    const wantsSuggest = /(tư vấn|gợi ý|suggest|nên mua|mẫu nào|loại nào|nên chọn|tìm|search|muốn|đang tìm)/.test(t) 
      || detectBudget(t) || detectBrand(t) || detectPurpose(t) || parseSizeCm(t);
    
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

    const reply = await generateReply(text);
    const aiMsg: Message = { 
      id: String(Date.now() + 1), 
      role: 'ai', 
      text: reply.text, 
      ts: Date.now() + 1,
      productId: reply.productId
    };
    setMessages(prev => [...prev, aiMsg]);
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
