const path = require("path").join(__dirname, "..") + "/";
const { Unifically } = require(path + "dist/nodes/Unifically/Unifically.node.js");
const { UnificallyApi } = require(path + "dist/credentials/UnificallyApi.credentials.js");
const assert = require("assert");
function run(params, responder) {
  const calls = [];
  const node = new Unifically();
  const ctx = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (n, i, d) => (n in params ? params[n] : d),
    getCredentials: async () => ({ apiKey: "x", baseUrl: "https://api.unifically.com/" }),
    getNode: () => ({ name: "UnificAlly", type: "n8n-nodes-unifically.unifically", typeVersion: 1, parameters: {} }),
    continueOnFail: () => false,
    helpers: { httpRequestWithAuthentication: async function (cred, opts) { calls.push(opts); return responder(opts, calls.length); } },
  };
  return node.execute.call(ctx).then((r) => ({ r, calls }));
}
(async () => {
  let o = await run({ operation: "estimateCost", model: "google/veo-3.1-fast", prompt: "cat", additionalInput: '{"duration":6}' }, () => ({ data: { cost: 0.4 } }));
  assert.deepStrictEqual(o.calls[0].body, { model: "google/veo-3.1-fast", input: { duration: 6, prompt: "cat" }, dry_run: true });
  assert.strictEqual(o.calls[0].url, "https://api.unifically.com/v1/tasks");
  assert.deepStrictEqual(o.r[0][0].json, { model: "google/veo-3.1-fast", cost: 0.4 });
  o = await run({ operation: "generate", model: "m", prompt: "p", options: { pollInterval: 0.01 } }, (opts, n) =>
    opts.method === "POST" ? { data: { task_id: "t1", status: "processing" } } : n < 3 ? { data: { task_id: "t1", status: "processing" } } : { data: { task_id: "t1", status: "completed", output: { video_url: "u" } } });
  assert.strictEqual(o.calls.length, 3); assert.strictEqual(o.calls[1].url, "https://api.unifically.com/v1/tasks/t1");
  assert.strictEqual(o.r[0][0].json.output.video_url, "u");
  await assert.rejects(run({ operation: "generate", model: "m", prompt: "p", options: { pollInterval: 0.01 } }, (opts) =>
    opts.method === "POST" ? { data: { task_id: "t2" } } : { data: { status: "failed", error_message: "bad prompt" } }), /t2 failed: bad prompt/);
  await assert.rejects(run({ operation: "generate", model: "m", additionalInput: "{bad" }, () => ({})), /valid JSON/);
  await assert.rejects(run({ operation: "getTask", taskId: "x" }, () => { throw new Error("boom"); }), (e) => e.constructor.name === "NodeApiError");
  o = await run({ operation: "listTasks", filters: { status: "failed", pageSize: 50, category: "video" } }, () => ({ data: [{ task_id: "a" }], pagination: { page: 1 } }));
  assert.deepStrictEqual(o.calls[0].qs, { status: "failed", category: "video", page_size: 50 });
  assert.deepStrictEqual(o.r[0][0].json.tasks, [{ task_id: "a" }]);
  const c = new UnificallyApi(); assert.strictEqual(c.test.request.url, "/v1/account");
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
