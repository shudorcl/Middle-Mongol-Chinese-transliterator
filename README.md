# 中古蒙汉对音转译程序

基于网上看到的《中古蒙漢對音表試行版（3-18v）》纯 Vibe 开发，仅供娱乐。

## 本地启动

需要 Node.js 22.13.0 或更高版本。

```bash
npm install
npm run dev
```

启动后访问终端显示的本地地址，通常为 <http://localhost:3000>。

## Cloudflare 托管

本地使用 Cloudflare Workers 运行时预览：

```bash
npm run cf:preview
```

首次从本机部署时，先登录 Cloudflare，再执行部署：

```bash
npx wrangler login
npm run cf:deploy
```

也可以在 Cloudflare Workers 中连接 GitHub 仓库并启用自动部署：

- Production branch：`cf`
- Build command：`npm run build`
- Deploy command：`npx wrangler deploy`

应用使用 Workers 免费计划即可运行，不需要 D1、R2 或 Cloudflare Images。
