# demo

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## 只启动前端进行检测

幻觉检测、谄媚检测、图文检测不再依赖 Java 后端。需要 Node.js `^20.19.0 || >=22.12.0`。

首次配置：将 `.env.example` 复制为 `.env.local`，填写 `MIMO_API_KEY`。如果已经有 `.env.local`，直接使用现有文件。可配置项（每项单独一行）：

```dotenv
MIMO_API_KEY=你的模型密钥
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.6-flash
MIMO_THINKING=disabled
```

在本目录运行：

```powershell
npm.cmd run dev
```

浏览器打开终端输出的地址（通常是 `http://localhost:5173`）。修改 `.env.local` 后需要重启。

为减少等待，默认关闭 MiMo 深度思考（`MIMO_THINKING=disabled`）。幻觉与谄媚检测同时生成两份回答，再进行评分，每轮仍调用三次 API；原始回答使用流式输出，文字到达后立即显示。两份回答各限 1024 tokens；幻觉评分因包含疑点标注限 1024 tokens，谄媚评分限 512 tokens，图文检测仍限 4096 tokens。幻觉检测还要求回答控制在300字以内，评分原因控制在120字以内。需要深度思考时可设置 `MIMO_THINKING=enabled`，响应耗时可能增加。接口支持说明见 [MiMo 深度思考文档](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/text-generation/deep-thinking)。

幻觉与谄媚检测的两次回答生成都通过 system prompt 要求纯文本，禁止 Markdown。评分步骤仍返回 JSON，并要求 `reason` 使用纯文本。幻觉检测的原始回答在 system prompt 中要求必须作答，允许一定程度的幻觉或推测性细节；谨慎回答继续要求避免编造并明确表达不确定性。

幻觉检测的原始回答另外要求使用肯定、直接的陈述句，禁止“我不能百分之百确定”等保留措辞。每轮完成后显示总耗时及首段文字耗时。浏览器 Network 中的 `Server-Timing` 还会记录转发到上游后收到响应头的耗时；非流式请求同时记录完整上游响应耗时。这些耗时不包含提示词、密钥或回答内容。

## 多轮检测对话

幻觉与谄媚检测采用聊天界面：底部输入消息，Enter 发送，Shift + Enter 换行，支持中文输入法。每轮保留原始回答、独立评分和分析，展开可查看或复制谨慎/客观回答；失败的轮次保留错误和已接收的文本，可以重试最后一个失败轮次。

追问会带上最近最多 8 轮成功对话，历史总长度限制为 24000 字符，以控制请求大小与等待时间。原始回答使用历史原始回答，谨慎/客观分支使用对应历史修正回答；评分也能读取这些上下文。失败轮次不进入上下文。两个工具的会话独立保存在 Pinia 内存中，切换工具不会丢失，刷新页面后清空；“新对话”清空当前工具的消息和上下文。

幻觉评分在同一次请求中返回 `suspect_spans: [{text, reason, occurrence}]`。`text` 必须精确来自本轮原始回答，`occurrence` 为重复片段出现的序号（从1开始）。前端只高亮可精确定位的片段，点击高亮查看原因；无法匹配或格式无效的条目丢弃。片段是评分模型标出的疑点，并非模型内部 token 概率，也不代表已完成事实核查。所有回答和标注均通过文本节点渲染，不注入模型提供的 HTML。

三个已迁移检测功能统一调用 `MIMO_MODEL`。转发地址为 `MIMO_BASE_URL` 加 `/chat/completions`，按 [MiMo 官方接口文档](https://mimo.mi.com/docs/api/text-generation/openai-api) 使用 `api-key` 请求头鉴权；图文请求保留 OpenAI 兼容的 `image_url` Base64 格式。旧的 `LLM_*` 配置不再用于这些检测。

你提供的地址属于 Token Plan。其 [官方使用范围](https://mimo.mi.com/docs/zh-CN/tokenplan) 限定编程工具场景，普通自定义应用调用需要使用对应的按量付费密钥和地址；配置支持自行替换 `MIMO_API_KEY` 和 `MIMO_BASE_URL`。

检测提示词、三次模型调用编排、评分和图片编码在浏览器中的 `src/api/model.js` 执行。Vite 同一进程提供 `/model-api` 转发，只负责附加密钥、选择配置的模型和处理请求错误，无需单独启动服务。密钥仅由 Node 进程读取，不使用 `VITE_` 前缀，不进入浏览器代码；`.env.local` 已被 Git 忽略。参见 [Vite 环境变量说明](https://vite.dev/guide/env-and-mode)。

幻觉检测保留原来的强制回答、谨慎回答和评分提示词；它是模型自评，不是外部事实核验。评分统一为 0～100 的可信度，再换算为幻觉/谄媚指数。代码块中的 JSON 可以解析；评分或风险标签无效时显示错误，不生成可靠报告。一次幻觉或谄媚检测调用模型三次，一次图文检测调用一次，均会消耗 API 额度。图片沿用第一张附件，支持 JPG、PNG、WebP、GIF，最大 10MB。

## 保留的原有功能

图文检测现有 17 个项目，新增 `aigc`（AIGC检测）：`1` 显示“疑似 AI 生成”，`0` 显示“未发现明显生成迹象”。模型在整体分析中说明依据与不确定性。该项目不把 AI 生成直接认定为违规，也不将未检出判定为人类创作。

按当前迁移范围，水印、知识库和依赖知识库的内容安全审核保留原接口：

| 功能 | 服务地址 |
| --- | --- |
| 知识库、知识增强审核及其配置 | `/api` 转发到 `http://localhost:8080` |
| 文本水印 | `/watermark-api` 转发到 `http://10.161.105.212:15000` |

这些功能仍需原来的服务，当前 Java 工程本身并不包含 `/api/kb`、`/api/config`、`/api/audit` 接口。首页及三个已迁移的检测页不自动请求知识库服务；进入知识库或知识增强审核页才加载原配置与知识条目。

## 验证及预览

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

测试使用模拟模型响应，不调用真实模型。`preview` 同样提供本地模型转发并读取 `.env.local`。`dist` 单独放到纯静态服务器不会提供 `/model-api`，线上发布需要另配安全的 API 转发服务；Vite 开发/预览服务用于本地使用。
