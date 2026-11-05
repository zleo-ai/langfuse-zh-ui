# 贡献说明

补词前先确认它是产品界面。用户提示词、模型回复、代码、API 字段、项目和模型名称保持原文。新增静态文案放入相应 `catalog/*.zh-CN.json`，注明 Langfuse 源码位置；新增动态文案要保留变量并绑定完整模板。`translated` 表示补译，`preserved` 必须有原因，已有规则覆盖的枚举应注明规则。

运行 `npm ci`、`npm run catalog:build`、`npm test` 和 `npm run build`。浏览器测试需先运行 `npx playwright install chromium`，或使用已有 Chrome：`CHROME_PATH=/path/to/chrome npm test`。开发依赖仅用于构建、扫描和测试，不进入扩展安装包。

更新源码清单时，先取得对应版本的官方 Langfuse 源码，再运行：

```sh
node scripts/extract-ui.mjs /path/to/langfuse/web/src
npm run test:catalog
```

清单检查通过不代表每个实际页面均已验收。提交说明请分别列出源码审查、测试页和实际页面的结果，以及未实测范围。
