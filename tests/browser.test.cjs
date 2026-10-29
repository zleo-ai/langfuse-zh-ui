"use strict";

// Independent acceptance fixtures: no application data, network, React bundle,
// or translator-private selectors/functions are needed. React-like updates use
// the same browser DOM operations (Text.data, replaceChildren, setAttribute).
// Run: CHROME_PATH=/path/to/chrome node --test tests/*.test.cjs
// Negative control: prepend NO_TRANSLATOR=1 to the same command.
// The popup and injected files are real; only the chrome.tabs/scripting transport
// is bridged. This does not test browser installation, activeTab permission UI,
// or the extension's isolated JavaScript world.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { chromium, expect } = require("@playwright/test");

const extensionDir = path.resolve(__dirname, "../extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));
// Freeze inputs for this run so a concurrent developer edit cannot mix versions.
const sources = Object.fromEntries([manifest.action.default_popup, "popup.js", "popup.css", "dictionary.js", "translate.js"].map((file) => [file, fs.readFileSync(path.join(extensionDir, file), "utf8")]));
const noTranslator = process.env.NO_TRANSLATOR === "1";
const popupOrigin = "https://extension-popup.test";
let browser;

before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
});

after(async () => {
  if (browser) await browser.close();
});

function documentHTML(body, title = "Langfuse") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

async function fixture(t, body, options = {}) {
  const url = options.url || "https://cloud.langfuse.com/project/fixture/traces";
  const html = documentHTML(body, options.title);
  const context = await browser.newContext({ serviceWorkers: "block" });
  context.setDefaultTimeout(2500);
  const unexpectedRequests = [];
  const errors = [];
  const injections = [];
  // Every request is either fulfilled from these synthetic fixtures or aborted.
  await context.route("**/*", async (route) => {
    const requestURL = new URL(route.request().url());
    if (requestURL.origin === popupOrigin) {
      const file = requestURL.pathname.slice(1);
      if ([manifest.action.default_popup, "popup.js", "popup.css"].includes(file)) {
        await route.fulfill({
          contentType: file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html",
          body: sources[file],
        });
        return;
      }
    }
    if (route.request().url() === url && route.request().isNavigationRequest()) {
      await route.fulfill({ contentType: "text/html", body: html });
      return;
    }
    unexpectedRequests.push(route.request().url());
    await route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);

  async function inject(files) {
    for (const file of files) {
      assert.ok(["dictionary.js", "translate.js"].includes(file), `Unexpected injected file: ${file}`);
      if (noTranslator && file === "translate.js") continue;
      await page.addScriptTag({ content: sources[file] });
    }
  }

  const popup = await context.newPage();
  popup.on("pageerror", (error) => errors.push(error.message));
  await popup.exposeFunction("testActiveTab", () => options.noActiveTab ? [] : [{ id: 17, url: page.url() }]);
  await popup.exposeFunction("testExecuteScript", async (request) => {
    assert.equal(request.target.tabId, 17);
    if (options.rejectInjection) throw new Error("Synthetic browser injection denial");
    injections.push(request.files || "function");
    if (request.files) {
      await inject(request.files);
      return [{ result: undefined }];
    }
    // Execute the function supplied by the real popup, not a fake translator.
    const result = await page.evaluate(({ source, args }) => (0, eval)(`(${source})`)(...args), request);
    return [{ result }];
  });
  await popup.addInitScript(() => {
    globalThis.chrome = {
      tabs: { query: () => globalThis.testActiveTab() },
      scripting: {
        executeScript: (request) => globalThis.testExecuteScript({
          target: request.target,
          files: request.files,
          source: request.func?.toString(),
          args: request.args || [],
        }),
      },
    };
  });
  await popup.goto(`${popupOrigin}/${manifest.action.default_popup}`);

  t.after(async () => {
    await context.close();
    assert.deepEqual(errors, [], "The browser must not report unhandled JavaScript errors");
    assert.deepEqual(unexpectedRequests, [], "The extension must not make network requests");
  });

  async function setEnabled(enabled) {
    await popup.locator("#status").evaluate((node) => { node.textContent = ""; });
    await popup.getByRole("button", { name: enabled ? "切换为中文" : "恢复英文", exact: true }).click();
    await expect(popup.getByRole("status")).not.toHaveText("", { timeout: 3000 });
  }
  return { page, popup, injections, inject, setEnabled };
}

test("MV3 popup entry is opt-in and opening it does not translate the page", { timeout: 15000 }, async (t) => {
  t.diagnostic(`translate.js sha256=${createHash("sha256").update(sources["translate.js"]).digest("hex")}; NO_TRANSLATOR=${noTranslator}`);
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(!(manifest.content_scripts || []).some((entry) => entry.js?.includes("translate.js")), "Translation must not auto-inject on navigation");
  const { page, popup, injections, setEnabled } = await fixture(t, '<nav><a id="traces" href="/project/fixture/traces">Traces</a></nav>');
  assert.deepEqual(injections, []);
  assert.equal(await page.locator("#traces").textContent(), "Traces");
  await setEnabled(true);
  await expect(page.locator("#traces")).toHaveText("调用链");
  await expect(popup.getByRole("status")).toHaveText("中文已启用。");
  await page.reload();
  assert.equal(await page.locator("#traces").textContent(), "Traces", "A new document requires an explicit click again");
});

test("loading scripts without explicit activation remains inert", { timeout: 15000 }, async (t) => {
  const { page, inject, setEnabled } = await fixture(t, '<nav><button id="settings">Settings</button></nav>');
  await inject(["dictionary.js", "translate.js"]);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 80)));
  assert.equal(await page.locator("#settings").textContent(), "Settings");
  await setEnabled(true);
  await expect(page.locator("#settings")).toHaveText("设置");
});

test("popup handles a missing active tab and performs no injection", { timeout: 15000 }, async (t) => {
  const { page, popup, injections, setEnabled } = await fixture(t, '<button id="save">Save</button>', { noActiveTab: true });
  await setEnabled(true);
  await expect(popup.getByRole("status")).toHaveText("请先打开 Langfuse 网页。");
  assert.deepEqual(injections, []);
  assert.equal(await page.locator("#save").textContent(), "Save");
});

test("popup reports injection failure without changing the page", { timeout: 15000 }, async (t) => {
  const { page, popup, setEnabled } = await fixture(t, '<button id="save">Save</button>', { rejectInjection: true });
  await setEnabled(true);
  await expect(popup.getByRole("status")).toHaveText("未能翻译。请刷新 Langfuse 页面后重试。");
  assert.equal(await page.locator("#save").textContent(), "Save");
});

test("login headings, labels, nested text, buttons and placeholders translate", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <main><h1>Sign in to your account</h1><form>
      <label for="email">Email</label><input id="email" type="email" placeholder="Email">
      <label for="password">Password (<a href="/auth/reset">forgot password?</a>)</label>
      <input id="password" type="password" placeholder="Password">
      <button type="button">Sign in</button><a href="/auth/signup">Create an account</a>
    </form></main>`, { url: "https://cloud.langfuse.com/auth/sign-in" });
  await setEnabled(true);
  await expect(page.locator("h1")).toHaveText("登录你的账号");
  await expect(page.locator('label[for="email"]')).toHaveText("邮箱");
  await expect(page.locator('label[for="password"]')).toContainText("密码");
  await expect(page.locator('a[href="/auth/reset"]')).toHaveText("忘记密码？");
  await expect(page.locator("#email")).toHaveAttribute("placeholder", "邮箱");
  await expect(page.locator("#password")).toHaveAttribute("placeholder", "密码");
  await expect(page.getByRole("button")).toHaveText("登录");
  await expect(page.locator('a[href="/auth/signup"]')).toHaveText("创建账号");
});

test("self-hosted Langfuse navigation, buttons, table headings and accessibility labels translate", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><a href="/">Langfuse</a><a id="projects" href="/">Projects</a><a id="traces" href="/project/fixture/traces">Traces</a><a id="prompts" href="/project/fixture/prompts">Prompts</a></nav>
    <main><button id="filter">Add filter</button><button id="refresh" title="Refresh" aria-label="Refresh">Refresh</button>
    <input id="search" placeholder="Search traces...">
    <table><thead><tr><th>Name</th><th>Latency</th><th>Cost</th></tr></thead><tbody><tr><td>customer trace</td><td>123ms</td><td>0.01</td></tr></tbody></table></main>`,
  { url: "https://observability.example.test/project/fixture/traces", title: "Traces | Langfuse" });
  await setEnabled(true);
  await expect(page.locator("#projects")).toHaveText("项目");
  await expect(page.locator("#traces")).toHaveText("调用链");
  await expect(page.locator("#prompts")).toHaveText("提示词");
  await expect(page.locator("#filter")).toHaveText("添加筛选条件");
  await expect(page.locator("th")).toHaveText(["名称", "耗时", "费用"]);
  await expect(page.locator("#search")).toHaveAttribute("placeholder", "搜索调用链…");
  await expect(page.locator("#refresh")).toHaveAttribute("title", "刷新");
  await expect(page.locator("#refresh")).toHaveAttribute("aria-label", "刷新");
});

test("translation and restore never read or write form values", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="settings">Settings</button></nav><form>
      <label for="email">Email</label><input id="email" type="email" value="fixture@example.test" placeholder="Email">
      <input id="secret" type="password" value="Save" placeholder="Password">
      <input id="search" value="Traces" placeholder="Search...">
      <textarea id="prompt" placeholder="Search...">Settings</textarea>
      <select id="model"><option value="Output" selected>Output</option></select>
      <div id="editable" contenteditable="true"><b>Save</b><span title="Settings">Output</span></div>
    </form>`);
  await page.evaluate(() => {
    globalThis.valueAccess = [];
    globalThis.readNativeValues = [];
    for (const Type of [HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement]) {
      const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, "value");
      globalThis.readNativeValues.push(() => [...document.querySelectorAll(Type === HTMLInputElement ? "input" : Type === HTMLTextAreaElement ? "textarea" : "select")].map((node) => [node.id, descriptor.get.call(node)]));
      Object.defineProperty(Type.prototype, "value", {
        configurable: true,
        get() { globalThis.valueAccess.push(`read:${this.id}`); return descriptor.get.call(this); },
        set(value) { globalThis.valueAccess.push(`write:${this.id}`); descriptor.set.call(this, value); },
      });
    }
  });
  const values = await page.evaluate(() => globalThis.readNativeValues.flatMap((read) => read()));
  const editable = await page.locator("#editable").evaluate((node) => node.outerHTML);
  await setEnabled(true);
  await expect(page.locator("#settings")).toHaveText("设置");
  assert.deepEqual(await page.evaluate(() => globalThis.readNativeValues.flatMap((read) => read())), values);
  assert.deepEqual(await page.evaluate(() => globalThis.valueAccess), []);
  assert.equal(await page.locator("#editable").evaluate((node) => node.outerHTML), editable);
  await setEnabled(false);
  assert.deepEqual(await page.evaluate(() => globalThis.readNativeValues.flatMap((read) => read())), values);
  assert.deepEqual(await page.evaluate(() => globalThis.valueAccess), []);
  await expect(page.locator("#settings")).toHaveText("Settings");
});

test("code, JSON, rendered markdown and rich editors remain byte-for-byte unchanged", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="settings">Settings</button></nav>
    <pre id="pre" data-protected><span>Input</span><button title="Copy">Copy</button></pre>
    <code id="code" data-protected>Save</code>
    <div id="json" class="json-view" data-protected><span>Output</span><span>{"Name":"Settings"}</span><span title="Value">Value</span></div>
    <article id="markdown" class="markdown" data-protected><h2>Settings</h2><p>Output</p><a title="Search">Search</a><table><tr><th>Name</th></tr></table></article>
    <div id="prose" class="prose" data-protected><p>Save</p><button>Delete</button></div>
    <div id="monaco" class="monaco-editor" data-protected><span>Input</span></div>
    <div id="codemirror" class="cm-editor" data-protected><span>Output</span></div>`);
  const beforeHTML = await page.locator("[data-protected]").evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
  await setEnabled(true);
  await expect(page.locator("#settings")).toHaveText("设置");
  assert.deepEqual(await page.locator("[data-protected]").evaluateAll((nodes) => nodes.map((node) => node.outerHTML)), beforeHTML);
  await page.locator("#markdown").evaluate((node) => { node.innerHTML = "<h3>Traces</h3><p>Save</p>"; });
  await page.locator("#json").evaluate((node) => { node.firstElementChild.firstChild.data = "Input"; });
  const updatedHTML = await page.locator("[data-protected]").evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  assert.deepEqual(await page.locator("[data-protected]").evaluateAll((nodes) => nodes.map((node) => node.outerHTML)), updatedHTML);
  await setEnabled(false);
  assert.deepEqual(await page.locator("[data-protected]").evaluateAll((nodes) => nodes.map((node) => node.outerHTML)), updatedHTML);
});

test("user table cells stay unchanged even when names exactly match UI dictionary words", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><a id="traces" href="/project/fixture/traces">Traces</a></nav>
    <table><thead><tr><th>Name</th><th>Input</th><th>Output</th></tr></thead>
      <tbody id="rows"><tr><td><a href="/project/fixture/traces/t1" title="Settings">Settings</a></td><td><span>Save</span></td><td><button aria-label="Output">Output</button></td></tr></tbody>
    </table>`);
  const rows = await page.locator("#rows").evaluate((node) => node.outerHTML);
  await setEnabled(true);
  await expect(page.locator("#traces")).toHaveText("调用链");
  await expect(page.locator("th")).toHaveText(["名称", "输入", "输出"]);
  assert.equal(await page.locator("#rows").evaluate((node) => node.outerHTML), rows);
  await page.locator("#rows").evaluate((node) => { node.insertAdjacentHTML("beforeend", '<tr><td><a title="Save">Save</a></td><td>Input</td><td>Output</td></tr>'); });
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  assert.equal(await page.locator("#rows tr").last().textContent(), "SaveInputOutput");
  await setEnabled(false);
  assert.equal(await page.locator("#rows tr").last().textContent(), "SaveInputOutput");
});

test("ARIA grid cells protect user names and their attributes", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><a id="traces" href="/project/fixture/traces">Traces</a></nav>
    <div role="grid"><div role="row"><div role="columnheader">Name</div></div>
      <div role="row" id="grid-row"><div role="gridcell"><a href="/project/fixture/traces" title="Traces">Traces</a></div><div role="cell">Delete</div></div>
    </div>`);
  const original = await page.locator("#grid-row").evaluate((node) => node.outerHTML);
  await setEnabled(true);
  await expect(page.locator("#traces")).toHaveText("调用链");
  await expect(page.getByRole("columnheader")).toHaveText("名称");
  assert.equal(await page.locator("#grid-row").evaluate((node) => node.outerHTML), original);
});

test("placeholders inside rendered user markdown are protected with their contents", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="save">Save</button></nav>
    <article class="markdown" id="user-content"><p>Output</p><input placeholder="Search..." value="Save"></article>`);
  const original = await page.locator("#user-content").evaluate((node) => node.outerHTML);
  await setEnabled(true);
  await expect(page.locator("#save")).toHaveText("保存");
  assert.equal(await page.locator("#user-content").evaluate((node) => node.outerHTML), original);
});

test("new text nodes inside protected code and user data are not read by the translator", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="save">Save</button></nav><pre id="code"></pre>
    <article id="markdown" class="markdown"></article><table><tbody><tr><td id="cell"></td></tr></tbody></table>`);
  await setEnabled(true);
  await expect(page.locator("#save")).toHaveText("保存");
  await page.evaluate(() => {
    globalThis.protectedReads = [];
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue");
    for (const id of ["code", "markdown", "cell"]) {
      const text = document.createTextNode("Save");
      Object.defineProperty(text, "nodeValue", {
        configurable: true,
        get() { globalThis.protectedReads.push(id); return descriptor.get.call(this); },
        set(value) { descriptor.set.call(this, value); },
      });
      document.getElementById(id).append(text);
    }
  });
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  assert.deepEqual(await page.evaluate(() => globalThis.protectedReads), [], "Excluded user content must be rejected before reading its text");
  assert.deepEqual(await page.locator("#code, #markdown, #cell").allTextContents(), ["Save", "Save", "Save"]);
});

for (const detail of ["traces/trace-123", "prompts/prompt-123", "datasets/dataset-123", "sessions/session-123", "observations/observation-123"]) {
  test(`detail page ${detail}: user headings and breadcrumb names remain English`, { timeout: 15000 }, async (t) => {
    const { page, setEnabled } = await fixture(t, `
      <aside><nav><a id="traces" href="/project/fixture/traces">Traces</a><a href="/project/fixture/settings">Settings</a></nav></aside>
      <main><nav aria-label="Breadcrumb"><a href="/project/fixture/traces">Traces</a><span id="breadcrumb" aria-current="page" title="Settings">Settings</span></nav>
        <h1 id="user-name" title="Settings">Settings</h1><div role="tablist"><button role="tab" id="details">Details</button></div>
        <dl><dt>Name</dt><dd id="user-description">Save</dd></dl>
      </main>`, { url: `https://cloud.langfuse.com/project/fixture/${detail}` });
    const original = await page.locator("#user-name, #breadcrumb, #user-description").evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
    await setEnabled(true);
    await expect(page.locator("#traces")).toHaveText("调用链");
    await expect(page.locator("#details")).toHaveText("详情");
    assert.deepEqual(await page.locator("#user-name, #breadcrumb, #user-description").evaluateAll((nodes) => nodes.map((node) => node.outerHTML)), original);
    await setEnabled(false);
    assert.deepEqual(await page.locator("#user-name, #breadcrumb, #user-description").evaluateAll((nodes) => nodes.map((node) => node.outerHTML)), original);
  });
}

test("React-style text updates, replacement nodes and later attribute updates translate", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="action">Save</button><div id="slot"></div></nav>
    <input id="search" placeholder="Search..."><button id="icon" title="Refresh" aria-label="Refresh">Refresh</button>`);
  await setEnabled(true);
  await expect(page.locator("#action")).toHaveText("保存");
  await page.evaluate(() => {
    document.querySelector("#action").firstChild.data = "Cancel";
    const inserted = document.createElement("button");
    inserted.id = "inserted";
    inserted.append(document.createTextNode("Create"));
    document.querySelector("#slot").replaceChildren(inserted);
    document.querySelector("#search").setAttribute("placeholder", "Search traces...");
    document.querySelector("#icon").setAttribute("title", "Copy");
    document.querySelector("#icon").setAttribute("aria-label", "Copy");
  });
  await expect(page.locator("#action")).toHaveText("取消");
  await expect(page.locator("#inserted")).toHaveText("创建");
  await expect(page.locator("#search")).toHaveAttribute("placeholder", "搜索调用链…");
  await expect(page.locator("#icon")).toHaveAttribute("title", "复制");
  await expect(page.locator("#icon")).toHaveAttribute("aria-label", "复制");
  await page.locator("#action").evaluate((node) => { node.textContent = "Delete"; });
  await expect(page.locator("#action")).toHaveText("删除");
  await setEnabled(false);
  await expect(page.locator("#action")).toHaveText("Delete");
  await expect(page.locator("#inserted")).toHaveText("Create");
  await expect(page.locator("#search")).toHaveAttribute("placeholder", "Search traces...");
  await expect(page.locator("#icon")).toHaveAttribute("title", "Copy");
});

test("restore preserves application updates and removed attributes before observer delivery", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, `
    <nav><button id="unchanged">Save</button><button id="changed">Cancel</button><button id="recognised">Create</button></nav>
    <input id="search" placeholder="Search..."><button id="icon" title="Copy" aria-label="Copy">Copy</button>`);
  await setEnabled(true);
  await expect(page.locator("#unchanged")).toHaveText("保存");
  await page.evaluate(() => {
    document.querySelector("#changed").firstChild.data = "Server changed this label";
    document.querySelector("#recognised").firstChild.data = "Delete";
    document.querySelector("#search").setAttribute("placeholder", "Search new records");
    document.querySelector("#icon").removeAttribute("title");
    document.querySelector("#icon").setAttribute("aria-label", "New application label");
    // Public popup API, called synchronously to cover a real MutationObserver race.
    globalThis.langfuseZhUI.setEnabled(false);
  });
  await expect(page.locator("#unchanged")).toHaveText("Save");
  await expect(page.locator("#changed")).toHaveText("Server changed this label");
  await expect(page.locator("#recognised")).toHaveText("Delete");
  await expect(page.locator("#search")).toHaveAttribute("placeholder", "Search new records");
  assert.equal(await page.locator("#icon").getAttribute("title"), null);
  await expect(page.locator("#icon")).toHaveAttribute("aria-label", "New application label");
  await page.locator("#unchanged").evaluate((node) => { node.firstChild.data = "Cancel"; });
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
  await expect(page.locator("#unchanged")).toHaveText("Cancel");
});

test("restore after translation returns exact original whitespace and attributes", { timeout: 15000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, '<nav><button id="save">  Save\n</button><button id="copy" title="Copy" aria-label="Copy">Copy</button><input id="search" placeholder="Search..."></nav>');
  const original = await page.locator("nav").evaluate((node) => node.outerHTML);
  await setEnabled(true);
  await expect(page.locator("#save")).toHaveText("保存");
  await setEnabled(false);
  assert.equal(await page.locator("nav").evaluate((node) => node.outerHTML), original);
});

test("repeated activation and sustained DOM churn settle without a mutation loop", { timeout: 30000 }, async (t) => {
  const { page, setEnabled } = await fixture(t, '<nav><button id="live">Save</button><span id="ephemeral"></span></nav><input id="search" placeholder="Search...">');
  await setEnabled(true);
  await expect(page.locator("#live")).toHaveText("保存");
  for (let index = 0; index < 6; index++) await setEnabled(true);
  const result = await page.evaluate(async () => {
    let mutations = 0;
    const probe = new MutationObserver((records) => { mutations += records.length; });
    probe.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    const start = performance.now();
    let updates = 0;
    while (performance.now() - start < 5000) {
      document.querySelector("#live").firstChild.data = updates % 2 ? "Save" : "Cancel";
      document.querySelector("#search").setAttribute("placeholder", updates % 2 ? "Search..." : "Search traces...");
      const child = document.createElement("button");
      child.textContent = "Refresh";
      document.querySelector("#ephemeral").replaceChildren(child);
      updates++;
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    document.querySelector("#live").firstChild.data = "Delete";
    await new Promise((resolve) => setTimeout(resolve, 150));
    const settled = mutations;
    await new Promise((resolve) => setTimeout(resolve, 150));
    probe.disconnect();
    return { updates, mutations, afterIdle: mutations - settled, duration: performance.now() - start };
  });
  t.diagnostic(`DOM churn: ${JSON.stringify(result)}`);
  assert.ok(result.updates >= 100, "Timers must continue to run during translation");
  assert.ok(result.duration < 15000, "The browser must remain responsive");
  assert.ok(result.mutations < result.updates * 30 + 100, "Translation must not amplify updates indefinitely");
  assert.equal(result.afterIdle, 0, "Translation must become idle once the application stops updating");
  await expect(page.locator("#live")).toHaveText("删除");
  for (let index = 0; index < 4; index++) {
    await setEnabled(false);
    await expect(page.locator("#live")).toHaveText("Delete");
    await setEnabled(true);
    await expect(page.locator("#live")).toHaveText("删除");
  }
});

for (const unrelated of [
  { url: "https://example.test/dashboard", title: "Customer Portal" },
  { url: "https://cloud.langfuse.com.evil.test/dashboard", title: "Customer Portal" },
  { url: "https://example.test/dashboard?next=https://cloud.langfuse.com", title: "Customer Portal" },
]) {
  test(`non-Langfuse page stays unchanged: ${unrelated.url}`, { timeout: 15000 }, async (t) => {
    const { page, popup, setEnabled } = await fixture(t, '<nav><a href="/traces">Traces</a><button>Settings</button></nav><label>Email</label><input placeholder="Search..."><h1>Overview</h1>', unrelated);
    const original = await page.locator("body").evaluate((node) => node.innerHTML);
    await setEnabled(true);
    assert.equal(await page.locator("body").evaluate((node) => node.innerHTML), original);
    if (!noTranslator) await expect(popup.getByRole("status")).toHaveText("当前页面未识别为 Langfuse。");
    await page.locator("nav").evaluate((node) => { node.insertAdjacentHTML("beforeend", "<button>Save</button>"); });
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    assert.equal(await page.locator("nav button").last().textContent(), "Save");
    await setEnabled(false);
    assert.equal(await page.locator("input").getAttribute("placeholder"), "Search...");
  });
}

for (const mention of [
  { title: "Langfuse integration guide | Engineering notes", body: "<article>How to connect a tracing SDK.</article>" },
  { title: "Engineering tools directory", body: '<article><a href="https://langfuse.com">Langfuse website</a></article>' },
]) {
  test(`an unrelated article mentioning Langfuse stays unchanged: ${mention.title}`, { timeout: 15000 }, async (t) => {
    const { page, setEnabled } = await fixture(t, `${mention.body}<nav><button>Settings</button><button>Save</button></nav><input placeholder="Search...">`, {
      url: "https://notes.example.test/articles/observability", title: mention.title,
    });
    const original = await page.locator("body").evaluate((node) => node.innerHTML);
    await setEnabled(true);
    assert.equal(await page.locator("body").evaluate((node) => node.innerHTML), original);
  });
}
