import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../server.mjs";

let server;
let baseUrl;

before(async () => {
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("健康检查返回完整语音链路", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.status, "ok");
  assert.deepEqual(data.voicePipeline, [
    "asr",
    "intent",
    "rag",
    "answer",
    "tts"
  ]);
  assert.ok(data.catalogSize >= 5);
});

test("商品目录包含前端可渲染的补充字段", async () => {
  const response = await fetch(`${baseUrl}/api/catalog`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.ok(data.products.length >= 5);
  for (const product of data.products) {
    assert.ok(product.id);
    assert.ok(product.name);
    assert.ok(product.summary);
    assert.ok(Array.isArray(product.highlights));
    assert.ok(product.specs && Object.keys(product.specs).length > 0);
  }
});

test("语音识别后的问答请求返回文本、商品、来源和播报稿", async () => {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "三口之家，预算四千以内，想要省电静音的冰箱",
      channel: "voice",
      profile: {},
      context: { lastProductIds: [] }
    })
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.intent, "recommendation");
  assert.ok(data.answer);
  assert.ok(data.speech);
  assert.ok(data.products.length >= 2);
  assert.ok(data.sources.length >= 1);
  assert.equal(data.profilePatch.householdSize, 3);
  assert.equal(data.profilePatch.preferredCategory, "冰箱");
});

test("转人工会创建带摘要的工单并更新接入状态", async () => {
  const createResponse = await fetch(`${baseUrl}/api/handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: "三口之家，预算四千元内，正在比较云栖 420L 和小鹿 328L",
      reason: "核对配送时间"
    })
  });
  const ticket = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.match(ticket.ticketId, /^MY-/);
  assert.equal(ticket.status, "queued");
  assert.match(ticket.summary, /云栖 420L/);

  await new Promise((resolve) => setTimeout(resolve, 1950));
  const statusResponse = await fetch(
    `${baseUrl}/api/handoff/${encodeURIComponent(ticket.ticketId)}`
  );
  const updated = await statusResponse.json();

  assert.equal(statusResponse.status, 200);
  assert.equal(updated.status, "connected");
  assert.equal(updated.agentName, "人工顾问小林");
});
