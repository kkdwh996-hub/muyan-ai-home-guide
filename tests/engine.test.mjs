import test from "node:test";
import assert from "node:assert/strict";
import {
  answerQuery,
  getProductsByIds,
  PRODUCTS,
} from "../lib/engine.mjs";

test("推荐会提取预算并优先返回预算内冰箱", () => {
  const result = answerQuery({
    query: "三口之家，预算四千以内，想买省电静音的冰箱",
    profile: {},
  });

  assert.equal(result.intent, "recommendation");
  assert.equal(result.profilePatch.householdSize, 3);
  assert.equal(result.profilePatch.preferredCategory, "冰箱");
  assert.ok(result.profilePatch.priorities.includes("省电"));
  assert.ok(result.profilePatch.priorities.includes("静音"));
  assert.ok(result.profilePatch.budget.max >= 4000);
  assert.ok(result.productIds.length >= 2);
  const products = getProductsByIds(result.productIds);
  assert.ok(products.every((product) => product.category === "冰箱"));
  assert.ok(products[0].price <= result.profilePatch.budget.max);
  assert.match(result.answer, /云栖|小鹿|澄风/);
  assert.ok(result.sources.length > 0);
});

test("支持中文口语预算和洗衣机品类", () => {
  const result = answerQuery({
    query: "四口人用，三千五左右买个洗衣机，最好能烘干",
  });
  const products = getProductsByIds(result.productIds);

  assert.equal(result.intent, "recommendation");
  assert.equal(result.profilePatch.householdSize, 4);
  assert.equal(result.profilePatch.preferredCategory, "洗衣机");
  assert.ok(result.profilePatch.budget.max > 0);
  assert.ok(products.every((product) => product.category === "洗衣机"));
});

test("政策问题返回可核查知识库来源", () => {
  const result = answerQuery({
    query: "冰箱买回来七天内不喜欢可以退吗，保修多久",
  });

  assert.equal(result.intent, "faq");
  assert.ok(result.sources.some((source) => source.title.includes("退换货")));
  assert.ok(result.sources.some((source) => source.title.includes("质保")));
  assert.match(result.answer, /7 天|七天|保修/);
  assert.ok(result.confidence >= 0.9);
});

test("对比请求可使用上一轮推荐商品", () => {
  const lastProductIds = ["fridge-yunqi-420", "fridge-chengfeng-510"];
  const result = answerQuery({
    query: "把刚才两款做个对比",
    profile: {},
    context: { lastProductIds },
  });

  assert.equal(result.intent, "compare");
  assert.deepEqual(result.productIds.slice(0, 2), lastProductIds);
  assert.deepEqual(result.comparisonProductIds.slice(0, 2), lastProductIds);
  assert.equal(result.sources.length, 2);
  assert.match(result.answer, /云栖|澄风/);
});

test("人工转接生成会话摘要", () => {
  const result = answerQuery({
    query: "我要转人工核对一下订单",
    profile: {
      budget: { min: 3000, max: 4000 },
      householdSize: 3,
      preferredCategory: "冰箱",
    },
    context: { lastProductIds: ["fridge-yunqi-420"] },
  });

  assert.equal(result.intent, "handoff");
  assert.ok(result.handoff);
  assert.match(result.handoff.summary, /订单/);
  assert.match(result.handoff.summary, /云栖 420L/);
  assert.match(result.answer, /人工|客服/);
});

test("未知问题不编造商品或来源", () => {
  const result = answerQuery({
    query: "明天火星的天气怎么样",
  });

  assert.equal(result.intent, "general");
  assert.equal(result.productIds.length, 0);
  assert.equal(result.sources.length, 0);
  assert.match(result.answer, /没完全听懂|换一种说法/);
});

test("所有商品都有可展示的字段和唯一 ID", () => {
  const ids = new Set();
  for (const product of PRODUCTS) {
    assert.ok(product.id);
    assert.ok(product.name);
    assert.ok(product.price > 0);
    assert.ok(product.reason);
    assert.ok(product.specs && Object.keys(product.specs).length > 0);
    assert.equal(ids.has(product.id), false);
    ids.add(product.id);
  }
});

test("售后故障问题会追问细节并给出保修依据", () => {
  const result = answerQuery({
    query: "冰箱不制冷了，好像是坏了吧",
    context: { lastProductIds: ["fridge-yunqi-420"] },
  });

  assert.equal(result.intent, "after_sales");
  assert.match(result.answer, /型号|故障|表现/);
  assert.ok(result.sources.some((source) => source.title.includes("质保")));
});
