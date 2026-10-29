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

## API 配置与上传注意事项

此仓库仅包含前端。开发时 `/api` 代理到 `http://localhost:8080`，
`/watermark-api` 的代理目标见 `vite.config.js`，需要另外启动对应后端服务。

内容审核直接使用后端已配置的模型和密钥。请在后端运行环境中配置服务商密钥；
不要把密钥写入前端源码或 `VITE_*` 环境变量，这些内容会进入浏览器可读取的构建产物。
前端不再在每次审核前自动设置密钥或覆盖模型。

`.env` 和 `.env.*` 默认不提交；如需示例文件，使用 `.env.example`，只填写占位值。
如果旧密钥曾进入 Git 提交，请先撤销或更换密钥，并清理相关提交历史后再推送。
