# 嵌入 EXE / iframe

严格来说，这里没有真正的 `.exe`。所谓“运行程序”，其实是打开一个 **iframe 窗口**，里面加载另一个网页。

这是这个主题最有趣的部分：文档站可以变成一个小型桌面，里面跑着各种“程序”。

## 三种方式

### 1. 侧边栏外部链接（自动）

```md
- [Example.com](https://example.com)
- [Docsify](https://docsify.js.org)
```

所有 `http://` / `https://` 链接都会被识别成程序：

```text
我的文档/
└── 程序/
    ├── Example.com.exe
    └── Docsify.exe
```

点击后打开 iframe 窗口。

### 2. 侧边栏 `.html` 链接（自动）

```md
- [记事本](apps/notepad.html)
```

`.html` / `.htm` 链接也会被当成程序。你可以把自己写的 HTML 小应用放进 `docs/apps/`：

```text
docs/
└── apps/
    └── notepad.html
```

### 3. 显式标记 `:class=w95-exe`

如果链接既不是外部网址，也不是 `.html`，但你希望它用 iframe 打开，可以加 Docsify 的 class 配置：

```md
- [我的应用](some/path ':class=w95-exe')
```

在正文里也可以这样写：

```md
[打开示例网站](https://example.com ':class=w95-exe')
```

Docsify 会在 `<a>` 上加上 `class="w95-exe"`，主题就能识别出来。

## 在正文里嵌入

正文中的外部链接默认也会在 iframe 窗口打开：

```md
[访问 Example](https://example.com)
```

如果你希望外部链接恢复成普通的新标签页行为：

```js
window.$docsify = {
  win95: {
    externalLinks: 'browser',
  },
};
```

## 在配置里注册程序

```js
window.$docsify = {
  win95: {
    apps: [
      {
        title: 'Notepad',
        url: 'docs/apps/notepad.html',
        width: 600,
        height: 440,
      },
      {
        title: 'Example.com',
        url: 'https://example.com',
      },
    ],
  },
};
```

这些程序会出现在：

- 开始菜单
- 默认桌面的第一个程序图标（如果桌面没有自定义）

## 程序窗口有什么？

程序窗口比文档窗口多一个工具栏：

| 按钮 | 作用 |
| --- | --- |
| `Reload` | 重新加载 iframe |
| `Open` | 在浏览器新标签页打开真实网址 |
| 地址栏 | 显示当前 URL，悬停可看完整地址 |

窗口本身可以拖动、缩放、最小化、最大化，和文档窗口一样。

## 为什么有些网站是空白的？

这不是主题的 bug。浏览器有一道硬性安全限制：

- `X-Frame-Options: DENY` / `SAMEORIGIN`
- `Content-Security-Policy: frame-ancestors ...`

只要目标网站不允许被 iframe 嵌入，任何前端代码都无法绕过。此时：

1. 点击 `Open` 在新标签页打开
2. 或者选择支持 iframe 的站点 / 自己写的本地 HTML 小应用

## 安全提醒

主题**没有**给 iframe 加沙箱限制。被嵌入的网站运行在普通 iframe 中，拥有它自己的脚本权限。

如果你要嵌入不受信任的第三方页面，建议：

- 只在内部文档站使用
- 或在 `openApp` 里自行给 iframe 添加 `sandbox`
- 不要把敏感信息放在同源页面里

## 本地程序示例

仓库里的 `docs/apps/notepad.html` 是一个完整的本地 HTML 程序：

- 假的记事本界面
- 三个按钮：New / UPPERCASE / Restore
- 状态栏显示行列号
- 通过 `../../theme/app.css` 复用 Win95 风格

你可以把它当作模板，写自己的扫雷、计算器、终端模拟器、看板……任何网页都能塞进来。

---

> 下一节：[Markdown 展示](/examples/markdown)
