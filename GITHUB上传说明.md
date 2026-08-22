# Framee · GitHub 上传即用版

这个文件夹已经配置好 Vite 相对资源路径与 GitHub Pages 自动部署流程。
仓库名称可以自由设置，不需要再修改 `vite.config.ts`。

## 上传并发布

1. 在 GitHub 新建一个仓库，建议名称为 `framee`，默认分支使用 `main`。
2. 将本文件夹中的**全部内容**上传到仓库根目录，包括隐藏的 `.github` 文件夹。
3. 打开仓库的 `Settings → Pages`。
4. 在 `Build and deployment → Source` 中选择 `GitHub Actions`。
5. 返回 `Actions` 页面，等待 `Deploy Framee to GitHub Pages` 变成绿色。

发布地址通常为：

```text
https://你的用户名.github.io/仓库名/
```

以后只要继续向 `main` 分支上传或推送文件，网页就会自动重新构建和发布。

## 本地预览

需要 Node.js 20.19 或更新版本：

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
npm run preview
```

## 已针对 GitHub Pages 完成的配置

- `vite.config.ts` 使用 `base: './'`，兼容任意仓库子路径；
- `.github/workflows/deploy-pages.yml` 自动安装、构建和部署；
- `public/.nojekyll` 避免静态资源被 Jekyll 处理；
- 内置 10 页演示和 TJM 品牌素材均随仓库发布；
- 不上传 `node_modules` 和本地 `dist`，GitHub Actions 会自动生成正式版本。
