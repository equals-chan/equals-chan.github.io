# 关于本项目

## 这是什么

**Win95 Docsify Theme** 是一个把 Docsify 文档站包装成 Windows 95 桌面的主题/插件。

它最初是为了仿照一个 Typecho 的 Win95 主题而写的：

- 目录结构 → 文件夹
- 每篇文档 → 文件
- 点击文件 → 可拖动的窗口
- 外部链接 / `.exe` → iframe 程序窗口
- 任务栏、开始菜单、启动画面、关机彩蛋

## 技术构成

| 部分 | 作用 |
| --- | --- |
| [Docsify](https://docsify.js.org) | Markdown 渲染与路由 |
| [WinBox](https://github.com/nextapps-de/winbox) | 窗口拖动、缩放、最小化、最大化 |
| `theme/win95.css` | 全部 Win95 视觉样式 |
| `theme/win95.js` | 文件夹树、窗口管理、任务栏、开始菜单、iframe 程序 |

## 目录

```text
docsify-win95/
├── index.html              # 演示入口
├── theme/
│   ├── win95.css           # 主题样式
│   ├── win95.js            # Docsify 插件
│   ├── app.css             # iframe 小程序样式
│   ├── assets/icons/       # 像素图标与滚动条素材
│   └── vendor/             # Docsify / WinBox 本地副本
├── docs/                   # 演示文档
│   ├── _sidebar.md
│   ├── README.md
│   └── apps/notepad.html   # 一个假的 Notepad.exe
└── README.md               # 使用说明
```

## 它是怎么工作的？

1. `win95.js` 注册一个 Docsify 插件。
2. Docsify 渲染 `_sidebar.md` 后，插件读取 `.sidebar-nav` 的 DOM，生成虚拟文件系统。
3. 点击文件时，插件修改 `location.hash`，让 Docsify 在隐藏的 `#main` 中渲染目标文档。
4. `doneEach` 钩子触发后，把 `#main` 的内容克隆进 WinBox 窗口。
5. 外部链接不经过 Docsify，直接生成一个包含 iframe 的 WinBox。

这样可以复用 Docsify 自己的 Markdown 编译、相对路径解析、代码高亮和插件渲染结果。

## 已知限制

- 依赖 hash 路由。
- 需要 `loadSidebar: true` 才能生成完整目录树。
- 文档窗口里的 `<script>` 和 Vue 组件不会在克隆后重新初始化。
- 外部网站可能通过 `X-Frame-Options` / CSP 拒绝 iframe。
- 窗口历史没有和浏览器前进/后退完全同步。
- `coverpage`、`navbar` 和 Docsify 自带侧边栏会被 Win95 桌面取代。
- 移动端能用，但体验肯定不如真正的 Win95 鼠标。

## 素材与致谢

- 视觉参考：Typecho 的 Win95 主题（`win95`，作者 vpsmm / h01000110）
- 像素图标与滚动条素材：取自上述 Typecho 主题的 `assets/img`
- 窗口管理：[WinBox.js](https://github.com/nextapps-de/winbox)，Apache-2.0
- 文档框架：[Docsify](https://docsify.js.org)，MIT
- 字体：使用系统字体回退，不包含 Windows 95 的原始字体文件

> 本项目是一个致敬性质的前端主题，不包含任何 Microsoft Windows 95 的系统文件。Windows 是 Microsoft Corporation 的商标。

## License

主题代码以 MIT License 发布。随附的第三方库与图标素材遵循其各自许可证。
