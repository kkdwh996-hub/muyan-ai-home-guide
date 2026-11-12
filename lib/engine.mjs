function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // Some older browsers expose crypto without UUID support.
    }
  }
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PRODUCTS = [
  {
    id: "fridge-yunqi-420",
    category: "冰箱",
    name: "云栖 420L 十字四门冰箱",
    shortName: "云栖 420L",
    brand: "云栖",
    price: 3799,
    originalPrice: 4299,
    rating: 4.8,
    reviewCount: 1268,
    tags: ["一级能效", "风冷无霜", "低噪", "母婴变温"],
    specs: {
      容量: "420L",
      能效: "一级能效",
      运行噪声: "35dB",
      制冷方式: "风冷无霜",
      尺寸: "宽 753 × 深 650 × 高 1900 mm",
      保修: "整机 3 年，压缩机 10 年",
    },
    service: ["免费送装", "次日可达", "7 天无理由退货"],
    reason: "容量适合三至四口之家，一级能效和 35dB 低噪兼顾省电与夜间安静。",
    imageTone: "sage",
  },
  {
    id: "fridge-chengfeng-510",
    category: "冰箱",
    name: "澄风 510L 法式多门冰箱",
    shortName: "澄风 510L",
    brand: "澄风",
    price: 5299,
    originalPrice: 5999,
    rating: 4.9,
    reviewCount: 842,
    tags: ["一级能效", "双循环", "深冷速冻", "低噪"],
    specs: {
      容量: "510L",
      能效: "一级能效",
      运行噪声: "34dB",
      制冷方式: "双循环风冷",
      尺寸: "宽 830 × 深 690 × 高 1900 mm",
      保修: "整机 3 年，压缩机 10 年",
    },
    service: ["免费送装", "预约配送", "7 天无理由退货"],
    reason: "适合四至六口家庭或一周集中采购，双循环减少串味，34dB 对开放厨房更友好。",
    imageTone: "sand",
  },
  {
    id: "fridge-xiaolu-328",
    category: "冰箱",
    name: "小鹿 328L 三门冰箱",
    shortName: "小鹿 328L",
    brand: "小鹿",
    price: 2399,
    originalPrice: 2799,
    rating: 4.7,
    reviewCount: 3156,
    tags: ["一级能效", "三温区", "租房友好"],
    specs: {
      容量: "328L",
      能效: "一级能效",
      运行噪声: "38dB",
      制冷方式: "风冷无霜",
      尺寸: "宽 625 × 深 650 × 高 1800 mm",
      保修: "整机 3 年，压缩机 10 年",
    },
    service: ["送货上门", "可预约周末", "7 天无理由退货"],
    reason: "占地小、价格轻，适合两口之家和租房场景，三温区能照顾日常分区存放。",
    imageTone: "rose",
  },
  {
    id: "washer-chengguang-10",
    category: "洗衣机",
    name: "澄光 10kg 洗烘一体机",
    shortName: "澄光 10kg",
    brand: "澄光",
    price: 3299,
    originalPrice: 3899,
    rating: 4.8,
    reviewCount: 2087,
    tags: ["洗烘一体", "蒸汽除螨", "一级能效", "低噪"],
    specs: {
      洗涤容量: "10kg",
      烘干容量: "7kg",
      能效: "一级能效",
      运行噪声: "48dB",
      特色: "蒸汽除螨、空气洗",
      尺寸: "宽 595 × 深 630 × 高 850 mm",
    },
    service: ["免费送装", "旧机折价", "7 天无理由退货"],
    reason: "三口之家一次洗床单也不局促，阴雨天气可以直接烘干，机身宽度适合常见阳台柜。",
    imageTone: "sage",
  },
  {
    id: "washer-suyu-12",
    category: "洗衣机",
    name: "素屿 12kg 热泵洗烘套装",
    shortName: "素屿 12kg",
    brand: "素屿",
    price: 4599,
    originalPrice: 5299,
    rating: 4.9,
    reviewCount: 736,
    tags: ["热泵烘干", "12kg 大容量", "除菌", "低温柔烘"],
    specs: {
      洗涤容量: "12kg",
      烘干容量: "10kg",
      能效: "一级能效",
      运行噪声: "42dB",
      特色: "热泵低温烘干、羊毛护理",
      尺寸: "洗衣机宽 595 × 深 620 × 高 850 mm",
    },
    service: ["免费送装", "上门测量", "7 天无理由退货"],
    reason: "大家庭和多孩家庭更合适，热泵低温烘干对羊毛、真丝等衣物更温和。",
    imageTone: "sand",
  },
  {
    id: "aircon-lanfeng-15",
    category: "空调",
    name: "岚风 1.5 匹新一级能效空调",
    shortName: "岚风 1.5 匹",
    brand: "岚风",
    price: 2999,
    originalPrice: 3499,
    rating: 4.8,
    reviewCount: 4892,
    tags: ["新一级能效", "22dB 睡眠低噪", "自清洁", "快速冷暖"],
    specs: {
      匹数: "1.5 匹",
      能效: "新一级能效",
      运行噪声: "22dB（睡眠模式）",
      适用面积: "15–22㎡",
      特色: "56℃ 自清洁、防直吹",
      保修: "整机 6 年",
    },
    service: ["免费上门安装", "基础安装材料包", "7 天无理由退货"],
    reason: "适合常见卧室，睡眠模式 22dB，老人房和儿童房更容易接受。",
    imageTone: "rose",
  },
  {
    id: "aircon-muyu-20",
    category: "空调",
    name: "沐雨 2 匹新一级能效柜机",
    shortName: "沐雨 2 匹",
    brand: "沐雨",
    price: 3899,
    originalPrice: 4399,
    rating: 4.7,
    reviewCount: 1854,
    tags: ["新一级能效", "客厅适用", "大风量", "自清洁"],
    specs: {
      匹数: "2 匹",
      能效: "新一级能效",
      运行噪声: "31dB（低风档）",
      适用面积: "23–34㎡",
      特色: "宽域送风、自清洁",
      保修: "整机 6 年",
    },
    service: ["免费上门安装", "基础安装材料包", "7 天无理由退货"],
    reason: "适合客厅或大卧室，送风覆盖更广，一级能效降低长期使用的电费压力。",
    imageTone: "sage",
  },
  {
    id: "tv-xingye-65",
    category: "电视",
    name: "星野 65 英寸 4K Mini LED 电视",
    shortName: "星野 65 英寸",
    brand: "星野",
    price: 3599,
    originalPrice: 4199,
    rating: 4.8,
    reviewCount: 1642,
    tags: ["Mini LED", "4K 120Hz", "低蓝光", "远场语音"],
    specs: {
      屏幕尺寸: "65 英寸",
      分辨率: "4K",
      刷新率: "120Hz",
      护眼: "低蓝光认证",
      特色: "远场语音、无开机广告",
      保修: "整机 1 年，屏幕 3 年",
    },
    service: ["免费送装", "座装免费", "7 天无理由退货"],
    reason: "适合三米左右观看距离，低蓝光和无开机广告对家里老人更友好。",
    imageTone: "sand",
  },
  {
    id: "clean-qingyu-s10",
    category: "清洁电器",
    name: "清屿 S10 无线吸尘器",
    shortName: "清屿 S10",
    brand: "清屿",
    price: 1699,
    originalPrice: 2099,
    rating: 4.7,
    reviewCount: 2734,
    tags: ["轻量", "长续航", "除螨", "低噪"],
    specs: {
      重量: "1.45kg",
      续航: "最长 60 分钟",
      吸力: "180AW",
      噪声: "72dB",
      配件: "软绒地刷、除螨刷、缝隙刷",
      保修: "整机 2 年",
    },
    service: ["送货上门", "耗材持续供应", "7 天无理由退货"],
    reason: "1.45kg 机身对老人和长时间打扫更省力，多刷头能覆盖地板、沙发和床褥。",
    imageTone: "rose",
  },
];

const POLICY_DOCS = [
  {
    id: "policy-return",
    title: "平台退换货政策",
    section: "退货与换货",
    keywords: ["退货", "退换", "无理由", "七天", "7天", "换货", "退款"],
    detail:
      "大件家电视商品签收后 7 天内，在商品完好、配件和包装齐全且不影响二次销售的前提下，可申请无理由退货。已安装且产生不可逆使用痕迹的商品需先进行售后检测。",
  },
  {
    id: "policy-delivery",
    title: "家电配送与安装说明",
    section: "配送与安装",
    keywords: ["配送", "送货", "安装", "送装", "上门", "到货"],
    detail:
      "冰箱、洗衣机、空调等大件商品支持预约配送。页面标注“免费送装”的型号包含基础配送和安装服务，超出标准范围的辅材或拆旧服务按现场报价确认。",
  },
  {
    id: "policy-warranty",
    title: "商品质保说明",
    section: "保修范围",
    keywords: ["保修", "质保", "维修", "坏了", "维修费", "售后"],
    detail:
      "质保期按商品详情页标注执行。冰箱和洗衣机通常整机 3 年、核心压缩机 10 年；空调整机 6 年；电视整机 1 年、屏幕 3 年。人为损坏、非官方拆机及不可抗力造成的故障不在免费保修范围内。",
  },
  {
    id: "policy-old-for-new",
    title: "以旧换新活动规则",
    section: "补贴与回收",
    keywords: ["以旧换新", "补贴", "回收", "旧机", "折价"],
    detail:
      "符合条件的旧机可参与以旧换新，回收价根据品类、年限和成色现场确认。补贴金额以下单页面展示为准，回收服务和新品配送可预约在同一天完成。",
  },
  {
    id: "guide-fridge",
    title: "冰箱选购指南",
    section: "容量与能效",
    keywords: ["冰箱", "冷藏", "冷冻", "容量", "省电", "能效", "串味", "厨房"],
    detail:
      "两人家庭通常可选 250–350L，三至四口家庭建议 350–500L。开门频繁或一次采购较多时，可优先考虑一级能效、风冷无霜和双循环机型。",
  },
  {
    id: "guide-elderly",
    title: "适老化家电建议",
    section: "语音与易用性",
    keywords: ["老人", "老年", "父母", "适老", "大字", "语音", "操作"],
    detail:
      "面向老年用户时，优先选择按键清晰、支持语音操作、运行噪声较低且售后上门服务覆盖完整的型号。复杂参数可用「够不够用、安不安静、坏了怎么修」来解释。",
  },
];

const CATEGORY_HINTS = [
  { category: "冰箱", words: ["冰箱", "冷藏", "冷冻", "串味", "蔬果", "保鲜"] },
  {
    category: "洗衣机",
    words: ["洗衣机", "洗烘", "烘干", "衣服", "床单", "除螨", "洗衣"],
  },
  {
    category: "空调",
    words: ["空调", "制冷", "制热", "卧室", "客厅", "匹", "挂机", "柜机"],
  },
  {
    category: "电视",
    words: ["电视", "屏幕", "观影", "4k", "miniled", "护眼"],
  },
  {
    category: "清洁电器",
    words: ["吸尘器", "打扫", "扫地", "除尘", "清洁", "除螨"],
  },
];

const PRIORITY_HINTS = [
  { key: "省电", words: ["省电", "节能", "电费", "能效", "一级"] },
  { key: "静音", words: ["静音", "安静", "声音小", "低噪", "吵"] },
  { key: "大容量", words: ["大容量", "装得多", "容量大", "一家", "人多"] },
  {
    key: "老人易用",
    words: ["老人", "父母", "适老", "大字", "好操作", "按键"],
  },
  { key: "除菌", words: ["除菌", "杀菌", "除螨", "卫生", "过敏"] },
  { key: "性价比", words: ["性价比", "便宜点", "划算", "预算有限"] },
  { key: "护眼", words: ["护眼", "低蓝光", "孩子看"] },
  { key: "轻量", words: ["轻一点", "轻便", "太重", "省力"] },
];

const HANDOFF_WORDS = ["人工", "真人", "转接", "投诉", "找客服", "需要电话"];
const COMPARE_WORDS = [
  "对比",
  "比较",
  "哪个好",
  "怎么选",
  "差别",
  "区别",
  "参数表",
  "横向",
];
const BUYING_WORDS = [
  "推荐",
  "想买",
  "选购",
  "买什么",
  "适合",
  "预算",
  "有什么",
  "帮我挑",
  "怎么办",
  "选一个",
];
const GREETING_WORDS = ["你好", "您好", "嗨", "在吗", "hello", "早上好", "晚上好"];
const AFTER_SALES_WORDS = [
  "不制冷",
  "不启动",
  "漏水",
  "异响",
  "报修",
  "修一下",
  "坏了",
  "故障",
  "停机",
  "不运转",
];

const CHINESE_DIGITS = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[，。！？、,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseChineseNumber(text) {
  if (!text) return Number.NaN;
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  let total = 0;
  let current = 0;
  for (const char of text) {
    if (char in CHINESE_DIGITS) {
      current = CHINESE_DIGITS[char];
    } else if (char === "十") {
      total += (current || 1) * 10;
      current = 0;
    } else if (char === "百") {
      total += (current || 1) * 100;
      current = 0;
    } else if (char === "千") {
      total += (current || 1) * 1000;
      current = 0;
    } else if (char === "万") {
      total = (total + current) * 10000;
      current = 0;
    }
  }
  return total + current;
}

function extractBudget(query) {
  const text = normalize(query).replace(/,/g, "");
  const rangeMatch = text.match(
    /(?:预算|大概|约)?\s*(\d{2,6}|[零一二两三四五六七八九十百千万]+)\s*(?:元|块)?\s*(?:到|至|~|—|－)\s*(\d{2,6}|[零一二两三四五六七八九十百千万]+)\s*(元|块|k|千)?/,
  );
  if (rangeMatch) {
    const min = parseChineseNumber(rangeMatch[1]);
    const maxRaw = parseChineseNumber(rangeMatch[2]);
    const max =
      rangeMatch[3] === "k" || rangeMatch[3] === "千"
        ? maxRaw * 1000
        : maxRaw;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        source: "range",
      };
    }
  }

  const kMatch = text.match(
    /(?:预算|大概|约)?\s*(\d+(?:\.\d+)?)\s*(?:k|千)(?:\s*(?:到|至|-)\s*(\d+(?:\.\d+)?)\s*(?:k|千))?/,
  );
  if (kMatch) {
    const min = Number.parseFloat(kMatch[1]) * 1000;
    const max = kMatch[2] ? Number.parseFloat(kMatch[2]) * 1000 : min;
    return { min, max: max * (kMatch[2] ? 1 : 1.05), source: "k" };
  }

  const anchorMatch = text.match(
    /(?:预算|不超过|最多|以内|控制在|大概|约)\s*(\d{2,6}|[零一二两三四五六七八九十百千万]+)\s*(元|块)?/,
  );
  const looseNumber = text.match(/(\d{3,6})\s*(?:元|块|以内|左右)?/);
  const rawValue = anchorMatch?.[1] || looseNumber?.[1];
  if (rawValue) {
    let value = parseChineseNumber(rawValue);
    if (anchorMatch?.[2] === "元" && value < 100) value *= 1000;
    if (value < 100) return null;
    const directional = /以内|不超过|最多|以下|控制在/.test(text);
    const around = /左右|大概|约/.test(text) && !directional;
    return {
      min: directional ? Math.max(0, value * 0.45) : around ? value * 0.8 : null,
      max: around ? value * 1.15 : value,
      source: directional ? "ceiling" : around ? "around" : "exact",
    };
  }

  const thousandMatch = text.match(
    /(?:预算|不超过|最多|以内|控制在|大概|约)?\s*([一二两三四五六七八九])\s*千\s*([一二三四五六七八九])?\s*百?/,
  );
  if (thousandMatch) {
    const thousands = CHINESE_DIGITS[thousandMatch[1]] * 1000;
    const hundreds = thousandMatch[2]
      ? CHINESE_DIGITS[thousandMatch[2]] * 100
      : 0;
    const value = thousands + hundreds;
    return { min: value * 0.65, max: value * 1.1, source: "spoken" };
  }
  return null;
}

function extractHouseholdSize(query) {
  const text = normalize(query);
  const match =
    text.match(/([一二两三四五六七八九十\d]+)\s*(?:口之家|口人|个人|人住|人用)/) ||
    text.match(/(?:三口|四口|五口|六口)之家/);
  if (!match) return null;
  return parseChineseNumber(match[1]);
}

function detectCategory(query) {
  const text = normalize(query);
  return (
    CATEGORY_HINTS.find((item) =>
      item.words.some((word) => text.includes(word)),
    )?.category || null
  );
}

function extractPriorities(query) {
  const text = normalize(query);
  return PRIORITY_HINTS.filter((item) =>
    item.words.some((word) => text.includes(word)),
  ).map((item) => item.key);
}

function findMentionedProducts(query) {
  const text = normalize(query);
  return PRODUCTS.filter((product) =>
    [product.name, product.shortName, product.brand].some((name) =>
      text.includes(normalize(name)),
    ),
  );
}

function textHasAny(text, words) {
  return words.some((word) => text.includes(normalize(word)));
}

function dedupe(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function makeProfile(profile = {}) {
  return {
    budget:
      profile.budget && typeof profile.budget === "object"
        ? profile.budget
        : null,
    householdSize: Number(profile.householdSize) || null,
    priorities: Array.isArray(profile.priorities) ? profile.priorities : [],
    preferredCategory: profile.preferredCategory || null,
    brand: profile.brand || null,
  };
}

function productPriorityScore(product, priorities) {
  const searchable = normalize(
    [
      product.name,
      product.tags.join(" "),
      product.reason,
      JSON.stringify(product.specs),
    ].join(" "),
  );
  const hints = priorities.map((priority) =>
    PRIORITY_HINTS.find((item) => item.key === priority),
  );
  return hints.reduce((score, hint) => {
    if (!hint) return score;
    return (
      score +
      (hint.words.some((word) => searchable.includes(normalize(word))) ? 8 : 0)
    );
  }, 0);
}

function rankProducts({ category, budget, householdSize, priorities, query }) {
  const text = normalize(query);
  return PRODUCTS.map((product) => {
    let score = product.rating * 2;
    if (category) score += product.category === category ? 30 : -100;
    if (budget?.max && product.price <= budget.max) score += 12;
    if (budget?.max && product.price > budget.max) {
      score -= Math.min(50, ((product.price - budget.max) / budget.max) * 60);
    }
    if (householdSize) {
      score += product.category === "冰箱" && householdSize >= 3 ? 7 : 0;
      score += product.category === "洗衣机" && householdSize >= 3 ? 6 : 0;
    }
    score += productPriorityScore(product, priorities);
    const productText = normalize(
      [
        product.name,
        product.tags.join(" "),
        product.reason,
        Object.values(product.specs).join(" "),
      ].join(" "),
    );
    for (const word of text.split(" ")) {
      if (word.length >= 2 && productText.includes(word)) score += 2;
    }
    return { product, score };
  })
    .filter((entry) => !category || entry.product.category === category)
    .sort(
      (a, b) => b.score - a.score || a.product.price - b.product.price,
    );
}

function getProductsByIds(ids = []) {
  const order = new Map(ids.map((id, index) => [id, index]));
  return PRODUCTS.filter((product) => order.has(product.id)).sort(
    (a, b) => order.get(a.id) - order.get(b.id),
  );
}

function productSource(product) {
  return {
    title: `${product.name} 商品卡`,
    section: "官方参数与价格",
    detail: `${Object.entries(product.specs)
      .slice(0, 4)
      .map(([key, value]) => `${key} ${value}`)
      .join("，")}。当前演示价 ¥${product.price.toLocaleString("zh-CN")}。`,
    confidence: 0.98,
  };
}

function policySources(docs, products = []) {
  return [
    ...docs.map((doc) => ({
      title: doc.title,
      section: doc.section,
      detail: doc.detail,
      confidence: 0.96,
    })),
    ...products.slice(0, 2).map(productSource),
  ].slice(0, 4);
}

function findPolicyDocs(query, fallback = ["policy-warranty"]) {
  const text = normalize(query);
  const matched = POLICY_DOCS.filter((doc) =>
    doc.keywords.some((keyword) => text.includes(normalize(keyword))),
  );
  if (matched.length) return matched;
  return POLICY_DOCS.filter((doc) => fallback.includes(doc.id));
}

function makeRecommendationAnswer(products, profile, category) {
  if (!products.length) {
    return "我暂时没找到完全匹配的型号。你可以告诉我预算、家里几口人和最在意的一点，比如省电或静音，我再帮你缩小范围。";
  }
  const first = products[0];
  const others = products.slice(1, 3);
  const contextBits = [
    profile.budget?.max
      ? `预算 ${Math.round(profile.budget.max).toLocaleString("zh-CN")} 元内`
      : "",
    profile.householdSize ? `${profile.householdSize} 口之家` : "",
    profile.priorities?.length
      ? `重视${profile.priorities.join("和")}`
      : "",
  ].filter(Boolean);
  let answer = `${contextBits.length ? `按你说的${contextBits.join("、")}，` : ""}我优先建议${first.name}，演示价 ${first.price.toLocaleString("zh-CN")} 元。${first.reason}`;
  if (others.length) {
    answer += ` 也可以一起比较${others
      .map(
        (product) =>
          `${product.shortName}（${product.price.toLocaleString("zh-CN")} 元）`,
      )
      .join("和")}。`;
  }
  if (!profile.budget) {
    answer += " 你大概想控制在多少预算内？";
  } else {
    answer += ` 要我把这几款${category || "商品"}拉成一张参数对比表吗？`;
  }
  return answer;
}

function makeCompareAnswer(products) {
  if (products.length < 2) {
    return "可以对比，不过我还缺一款商品。你可以直接说两个型号，或者先说想买哪类家电。";
  }
  const [a, b] = products;
  const cheaper = a.price <= b.price ? a : b;
  const quieter =
    [...products]
      .filter((product) => {
        const noise = product.specs["运行噪声"] || product.specs["噪声"];
        return Boolean(noise);
      })
      .sort(
        (left, right) =>
          Number.parseFloat(
            left.specs["运行噪声"] || left.specs["噪声"],
          ) -
          Number.parseFloat(right.specs["运行噪声"] || right.specs["噪声"]),
      )[0] || null;
  let answer = `${a.shortName}和${b.shortName}的核心差别，我先说结论。`;
  answer += `${a.shortName}是 ${a.price.toLocaleString("zh-CN")} 元，${a.reason}`;
  answer += ` ${b.shortName}是 ${b.price.toLocaleString("zh-CN")} 元，${b.reason}`;
  if (quieter) answer += ` 参数表里 ${quieter.shortName} 的运行噪声更低。`;
  answer += ` 如果你更看重价格，先看${cheaper.shortName}；如果更看重${b.tags[0] || "舒适度"}，再考虑另一款。`;
  return answer;
}

function makeFaqAnswer(query, docs, mentionedProducts) {
  const text = normalize(query);
  if (!docs.length) {
    return "这个问题我在当前演示知识库里没有查到确切依据。涉及订单、费用或具体故障时，我可以帮你转人工，避免给你猜测的答案。";
  }
  const primary = docs[0];
  let answer = `${primary.detail}`;
  if (mentionedProducts.length) {
    answer += ` 你提到的${mentionedProducts[0].shortName}在商品卡中标注：${mentionedProducts[0].specs["保修"] || "以商品详情为准"}。`;
  }
  if (/安装|送装|配送/.test(text)) {
    answer += " 下单时可以选择预约日期，大件商品会在送达前再次电话确认。";
  }
  if (/退货|换货|退款/.test(text)) {
    answer += " 具体能否退换，还要看商品是否安装以及是否影响二次销售。";
  }
  answer += " 需要的话，我可以继续帮你查某个型号，或者转人工核对订单。";
  return answer;
}

function makeHandoff(query, profile, lastProducts) {
  const summaryBits = [
    query ? `用户问题：${query}` : "",
    profile.preferredCategory ? `关注品类：${profile.preferredCategory}` : "",
    profile.budget?.max
      ? `预算：${Math.round(profile.budget.max)} 元内`
      : "",
    lastProducts.length
      ? `最近查看：${lastProducts.map((product) => product.shortName).join("、")}`
      : "",
  ].filter(Boolean);
  return {
    reason: "用户明确要求人工服务",
    summary: summaryBits.join("；") || "用户希望进一步咨询",
    queueHint: "人工客服在线时间 08:00–24:00，当前为演示转接",
  };
}

function makeGeneralAnswer(query) {
  if (textHasAny(normalize(query), GREETING_WORDS)) {
    return "你好，我是小慕，你的家电选购顾问。你可以直接说预算、家里几口人和想解决的问题，比如“三口之家，四千以内，想买安静的冰箱”。";
  }
  return "我还没完全听懂你的需求。你可以换一种说法，告诉我想买哪类家电、预算多少，或者直接问配送、安装和保修政策。";
}

export function answerQuery({ query = "", profile = {}, context = {} } = {}) {
  const startedAt = Date.now();
  const cleanQuery = String(query).trim();
  const text = normalize(cleanQuery);
  const nextProfile = makeProfile(profile);
  const budget = extractBudget(cleanQuery);
  const householdSize = extractHouseholdSize(cleanQuery);
  const priorities = extractPriorities(cleanQuery);
  const category = detectCategory(cleanQuery);
  const mentionedProducts = findMentionedProducts(cleanQuery);
  const lastProducts = getProductsByIds(context.lastProductIds || []);

  if (budget) nextProfile.budget = budget;
  if (householdSize) nextProfile.householdSize = householdSize;
  if (priorities.length) {
    nextProfile.priorities = dedupe([
      ...nextProfile.priorities,
      ...priorities,
    ]);
  }
  if (category) nextProfile.preferredCategory = category;

  let intent = "general";
  if (textHasAny(text, HANDOFF_WORDS)) {
    intent = "handoff";
  } else if (textHasAny(text, AFTER_SALES_WORDS)) {
    intent = "after_sales";
  } else if (
    mentionedProducts.length >= 2 ||
    (textHasAny(text, COMPARE_WORDS) &&
      (lastProducts.length >= 2 || mentionedProducts.length >= 2))
  ) {
    intent = "compare";
  } else if (
    findPolicyDocs(cleanQuery, []).some((doc) => doc.id.startsWith("policy-"))
  ) {
    intent = "faq";
  } else if (
    category ||
    budget ||
    priorities.length ||
    householdSize ||
    textHasAny(text, BUYING_WORDS)
  ) {
    intent = "recommendation";
  } else if (textHasAny(text, GREETING_WORDS)) {
    intent = "general";
  }

  let answer;
  let selectedProducts = [];
  let comparisonProductIds = [];
  let sources = [];
  let followUps = [];
  let handoff = null;
  let confidence = 0.86;

  if (intent === "handoff") {
    handoff = makeHandoff(cleanQuery, nextProfile, lastProducts);
    answer = `可以，我已经把当前问题整理好了：${handoff.summary}。${handoff.queueHint}。你也可以继续问我商品参数和政策。`;
    sources = policySources(findPolicyDocs("", ["policy-warranty"]));
    followUps = ["继续问一个商品问题", "查看最近推荐"];
    confidence = 0.98;
  } else if (intent === "compare") {
    let candidates = mentionedProducts;
    if (candidates.length < 2) {
      candidates = [...candidates, ...lastProducts].filter(
        (product, index, array) =>
          array.findIndex((item) => item.id === product.id) === index,
      );
    }
    if (candidates.length < 2) {
      candidates = rankProducts({
        category: nextProfile.preferredCategory,
        budget: nextProfile.budget,
        householdSize: nextProfile.householdSize,
        priorities: nextProfile.priorities,
        query: cleanQuery,
      })
        .slice(0, 2)
        .map((entry) => entry.product);
    }
    selectedProducts = candidates.slice(0, 3);
    comparisonProductIds = selectedProducts.map((product) => product.id);
    answer = makeCompareAnswer(selectedProducts);
    sources = selectedProducts.map(productSource);
    followUps = ["只看更适合老人的那款", "帮我转人工核对价格", "重新推荐"];
    confidence = 0.93;
  } else if (intent === "faq") {
    const docs = findPolicyDocs(cleanQuery);
    selectedProducts = mentionedProducts.length
      ? mentionedProducts.slice(0, 2)
      : lastProducts.slice(0, 2);
    answer = makeFaqAnswer(cleanQuery, docs, selectedProducts);
    sources = policySources(docs, selectedProducts);
    followUps = ["这个型号也适用吗", "我要预约安装", "帮我转人工"];
    confidence = docs.length ? 0.94 : 0.55;
  } else if (intent === "after_sales") {
    const docs = findPolicyDocs(cleanQuery, ["policy-warranty"]);
    selectedProducts = mentionedProducts.length
      ? mentionedProducts.slice(0, 2)
      : lastProducts.slice(0, 2);
    answer = `听起来是使用或故障问题。请先告诉我型号、购买时间和现在的具体表现，比如“完全不通电”还是“制冷变弱”，我才能给你更准确的处理步骤。涉及拆机维修时，我会建议转人工确认工单，避免误操作。`;
    sources = policySources(docs, selectedProducts);
    followUps = ["产品突然不通电", "制冷效果变差", "直接转人工"];
    confidence = 0.82;
  } else if (intent === "recommendation") {
    const ranked = rankProducts({
      category: nextProfile.preferredCategory,
      budget: nextProfile.budget,
      householdSize: nextProfile.householdSize,
      priorities: nextProfile.priorities,
      query: cleanQuery,
    });
    selectedProducts = ranked.slice(0, 3).map((entry) => entry.product);
    answer = makeRecommendationAnswer(
      selectedProducts,
      nextProfile,
      nextProfile.preferredCategory,
    );
    sources = selectedProducts.slice(0, 2).map(productSource);
    if (textHasAny(text, ["老人", "老年", "父母", "适老"])) {
      sources.push(
        ...policySources(
          findPolicyDocs("老人适老", ["guide-elderly"]),
        ).slice(0, 1),
      );
    }
    followUps = selectedProducts
      .slice(0, 2)
      .map((product) => `${product.shortName}有什么优缺点？`);
    followUps.push("把前两款做个对比", "帮我转人工");
    confidence = 0.91;
  } else {
    answer = makeGeneralAnswer(cleanQuery);
    sources = [];
    followUps = [
      "三口之家，四千以内买冰箱",
      "洗烘一体怎么选",
      "退货需要满足什么条件",
    ];
    confidence = 0.7;
  }

  return {
    requestId: createRequestId(),
    intent,
    confidence,
    answer,
    speech: answer.replace(/[「」“”]/g, ""),
    productIds: selectedProducts.map((product) => product.id),
    comparisonProductIds,
    sources,
    followUps: dedupe(followUps).slice(0, 4),
    profilePatch: {
      budget: nextProfile.budget,
      householdSize: nextProfile.householdSize,
      priorities: nextProfile.priorities,
      preferredCategory: nextProfile.preferredCategory,
    },
    ...(handoff ? { handoff } : {}),
    latencyMs: Date.now() - startedAt,
  };
}

export function getCatalog() {
  return PRODUCTS.map((product) => ({
    ...product,
    summary: product.reason,
    highlights: product.tags,
    energy:
      product.specs["能效"] ||
      product.specs["能效等级"] ||
      product.tags.find((tag) => /能效/.test(tag)) ||
      "",
    noise:
      product.specs["运行噪声"] ||
      product.specs["噪声"] ||
      product.tags.find((tag) => /dB|低噪|静音/.test(tag)) ||
      "",
    audience:
      product.category === "冰箱"
        ? "适合日常家庭分区储鲜"
        : product.category === "洗衣机"
          ? "适合日常衣物与床品洗护"
          : product.category === "空调"
            ? "适合卧室或客厅舒适控温"
            : product.category === "电视"
              ? "适合家庭观影与日常娱乐"
              : "适合日常轻量清洁",
    badge: product.tags[0] || "知识库精选"
  }));
}

export { PRODUCTS, POLICY_DOCS, getProductsByIds };
