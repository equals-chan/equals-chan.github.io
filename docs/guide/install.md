# 安装与配置

## 1. 复制主题文件

把整个 `theme/` 目录放到你的 Docsify 站点里。目录结构大约是这样：

```text
my-docs/
├── index.html
├── docs/
│   ├── _sidebar.md
│   └── README.md
└── theme/
    ├── win95.css
    ├── win95.js
    ├── app.css
    ├── vendor/
    │   ├── winbox.min.js
    │   ├── docsify.min.js
    │   └── docsify-core.min.css
    └── assets/
        └── icons/...
```

如果你已经在用 Docsify 的 CDN，也可以只复制 `win95.css`、`win95.js`、`app.css` 和 `assets/`，WinBox 从 CDN 加载。

## 2. 修改 index.html

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>Win95 Docs</title>

    <!-- Docsify 基础主题（也可以换成你自己的 core.css） -->
    <link rel="stylesheet" href="theme/vendor/docsify-core.min.css" />
    <!-- Win95 主题 -->
    <link rel="stylesheet" href="theme/win95.css" />
  </head>

  <body>
    <div id="app"></div>

    <script>
      window.$docsify = {
        name: 'Win95 Docs',
        loadSidebar: true,
        homepage: 'README.md',
        basePath: 'docs/',
        win95: {
          boot: true,
          drive: 'C:',
          rootName: 'My Computer',
        },
      };
    </script>

    <!-- Docsify 本体 -->
    <script src="theme/vendor/docsify.min.js"></script>
    <!-- 窗口管理器 -->
    <script src="theme/vendor/winbox.min.js"></script>
    <!-- 主题插件：必须在 Docsify 初始化前加载 -->
    <script src="theme/win95.js"></script>
  </body>
</html>
```

> `win95.js` 会把自己塞进 `$docsify.plugins`。Docsify 在 `DOMContentLoaded` 时才初始化，所以上面这种顺序是安全的。

## 3. 准备 _sidebar.md

主题通过解析 Docsify 已经渲染好的侧边栏来生成文件夹树，因此必须开启：

```js
window.$docsify = {
  loadSidebar: true,
};
```

`_sidebar.md` 使用普通的嵌套 Markdown 列表即可：

```md
- 开始使用

  - [欢迎](README.md)
  - [安装与配置](guide/install.md)

- 使用指南

  - [窗口](guide/windows.md)
  - [EXE](guide/exe.md)
```

效果：

- `开始使用`、`使用指南` → 文件夹
- 每个链接 → 文件
- 文件名会自动补上 `.md`，显示成 `install.md` 这样的 Windows 文件名

## 4. 必须知道的限制

- **路由模式**：当前实现依赖 hash 路由（Docsify 默认的 `routerMode: 'hash'`）。
- **侧边栏**：建议使用 `_sidebar.md`；如果没有侧边栏，资源管理器只会显示一个空目录。
- **插件内容**：文档窗口是把 Docsify 渲染好的 DOM 克隆进窗口的，因此 `<script>`、Vue 组件等动态内容只会在隐藏的 Docsify 主区域中执行一次，克隆后不会再次初始化。
- **iframe 限制**：不少网站会通过 `X-Frame-Options` 或 CSP 禁止被嵌入。这不是主题能绕过的浏览器安全限制。
- **原生 Docsify 外壳**：`coverpage`、`navbar`、侧边栏这些 Docsify 自带的外壳会被隐藏，由 Win95 桌面、资源管理器和开始菜单取代。

## 5. 本地预览

```bash
cd docsify-win95
python3 -m http.server 8080
# 打开 http://localhost:8080/
```

不要直接双击 `index.html` 打开 `file://`，浏览器会拦截 Docsify 的 AJAX 请求。
