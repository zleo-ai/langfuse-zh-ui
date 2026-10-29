"use strict";

async function apply(enabled) {
  const status = document.getElementById("status");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || "")) {
      status.textContent = "请先打开 Langfuse 网页。";
      return;
    }
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["dictionary.js", "translate.js"],
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (enabled) => globalThis.langfuseZhUI.setEnabled(enabled),
      args: [enabled],
    });
    status.textContent = result ? (enabled ? "中文已启用。" : "已恢复英文。") : "当前页面未识别为 Langfuse。";
  } catch {
    status.textContent = "未能翻译。请刷新 Langfuse 页面后重试。";
  }
}

document.getElementById("translate").addEventListener("click", () => apply(true));
document.getElementById("restore").addEventListener("click", () => apply(false));
