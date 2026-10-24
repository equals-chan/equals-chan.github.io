# 主题选项

在 `window.$docsify.win95` 里配置。所有选项都是可选的。

```js
window.$docsify = {
  win95: {
    boot: true,
    drive: 'C:',
    rootName: 'My Computer',
  },
};
```

## 基础选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `boot` | `Boolean` | `true` | 是否显示 "Starting Windows 95" 启动画面 |
| `openWelcome` | `Boolean` | `true` | 首次加载时自动打开当前路由对应的文档窗口 |
| `drive` | `String` | `'C:'` | 资源管理器里的盘符 |
| `rootName` | `String` | `'My Computer'` | 根节点与资源管理器标题 |
| `startBanner` | `String` | `'Windows 95'` | 开始菜单左侧竖排文字 |
| `clock24` | `Boolean` | `false` | 任务栏时钟是否使用 24 小时制 |
| `wallpaper` | `String` | `''` | 桌面壁纸 URL |
| `docFooter` | `Boolean` | `true` | 每篇文档底部显示文件路径脚注 |

## 窗口尺寸

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `explorerWidth` | `Number` | `560` | 资源管理器初始宽度 |
| `explorerHeight` | `Number` | `540` | 资源管理器初始高度 |
| `docWidth` | `Number` | `600` | 文档窗口初始宽度 |
| `docHeight` | `Number` | `560` | 文档窗口初始高度 |
| `appWidth` | `Number` | `760` | 程序（iframe）窗口初始宽度 |
| `appHeight` | `Number` | `540` | 程序（iframe）窗口初始高度 |

窗口仍然可以自由拖动和缩放。小屏幕（`< 760px`）下窗口会自动最大化。

## 程序与链接

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `externalLinks` | `'window' \| 'browser'` | `'window'` | 文档里的外部链接默认在 iframe 窗口打开，还是新标签页 |
| `exeSuffix` | `Boolean` | `true` | 是否给程序文件自动加上 `.exe` 后缀 |
| `apps` | `Array` | `[]` | 额外的程序列表，会出现在开始菜单 |
| `icons` | `Object` | `{}` | 给侧边栏的 `w95-icon-*` 类名提供自定义图标 |

`apps` 示例：

```js
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
}
```

`url` 相对于 `index.html` 所在目录，也可以直接写绝对 URL。侧边栏里的程序链接则相对于 Docsify 的 `basePath`。

### 自定义程序图标

程序图标会在这些地方使用：

- 资源管理器的文件列表 / 文件夹树
- 程序窗口标题栏
- 任务栏按钮
- 开始菜单
- 桌面快捷方式

**方式一：在 `apps` 里指定**

```js
win95: {
  apps: [
    {
      title: 'Jupyter',
      url: 'https://jupyter.org',
      icon: './icons/jupyter.png',
    },
  ],
}
```

如果侧边栏已经有这个程序，只写 `{ url, icon }` 也会自动合并，不需要重复标题：

```js
win95: {
  apps: [
    { url: 'https://jupyter.org', icon: './icons/jupyter.png' },
  ],
}
```

**方式二：侧边栏类名 + `icons` 映射**

```md
- [记事本](apps/notepad.html ':class=w95-icon-notepad')
- [Jupyter](https://jupyter.org ':class=w95-icon-jupyter')
```

```js
win95: {
  icons: {
    notepad: 'notepad.svg',
    jupyter: './icons/jupyter.png',
  },
}
```

- `.html` 和外部链接会自动识别为程序
- 其他路径想强制当程序打开时，再叠加一个 `:class=w95-exe`
- 类名可以叠加：`:class=w95-exe :class=w95-icon-jupyter`

### 图标路径规则

| 写法 | 解析方式 |
| --- | --- |
| `computer` / `file` / `exe` / `recycle` / `run` / `shutdown` / `help` | 内置图标 |
| `notepad.svg` | `theme/assets/icons/notepad.svg` |
| `./icons/jupyter.png` | 相对于 `index.html` |
| `../assets/foo.ico` | 相对于 `index.html` |
| `/icons/jupyter.png` | 站点根目录 |
| `https://example.com/icon.png` | 远程图片 |

不写 `icon` 时使用默认的 `.exe` 图标。

## 桌面图标

不配置时，桌面会自动生成：`My Computer`、第一篇文章、第一个程序、`Recycle Bin`。

```js
win95: {
  desktop: [
    { title: 'My Computer', icon: 'computer', action: 'explorer' },
    { title: 'README.md', icon: 'file', action: 'doc', pathKey: '/' },
    {
      title: 'Notepad.exe',
      icon: 'notepad.svg',
      action: 'app',
      url: 'docs/apps/notepad.html',
    },
    { title: 'Jupyter', icon: './icons/jupyter.png', action: 'app', url: 'https://jupyter.org' },
    { title: 'Recycle Bin', icon: 'recycle', action: 'recycle' },
    { title: 'Shut Down', icon: 'shutdown', action: 'shutdown' },
  ],
}
```

- `icon` 可以省略：`app` 会自动使用 `apps` 里同 URL 的图标，`explorer` / `recycle` / `run` / `shutdown` 也有默认图标
- 图标路径规则与上面的 [自定义程序图标](#自定义程序图标) 相同
- 想让某个文档显示自定义图标，给 `doc` 项加 `icon`
- `onClick()` 可以直接接管点击行为

支持的 `action`：

| action | 说明 |
| --- | --- |
| `explorer` | 打开资源管理器 |
| `doc` | 打开文档，使用 `pathKey`、`path` 或 `href` |
| `app` | 打开 iframe 程序，使用 `url` |
| `helpdoc` | 打开第一篇文章（Documentation） |
| `run` | 打开 Run 对话框 |
| `about` | 打开关于窗口 |
| `recycle` | 打开回收站 |
| `shutdown` | 打开关机对话框 |

也可以直接传 `onClick() {}` 自定义行为。桌面图标同样支持 `icon`，包括自定义图片。

## 开始菜单

```js
win95: {
  startMenu: [
    { title: 'My Computer', icon: 'computer', action: 'explorer' },
    { title: 'Documentation', icon: 'file', action: 'helpdoc' },
    '-',
    { title: 'Notepad.exe', icon: 'exe', action: 'app', url: 'docs/apps/notepad.html' },
    '-',
    { title: 'Run...', icon: 'run', action: 'run' },
    { title: 'Shut Down...', icon: 'shutdown', action: 'shutdown' },
  ],
}
```

`'-'` 会渲染成分隔线。

## 关于窗口

```js
win95: {
  about: {
    title: 'About This Docs Site',
    html: '<p>内部文档站</p><p>版本 1.0</p>',
  },
}
```

## 关闭主题

```js
win95: false
```

主题脚本仍然会加载，但不会接管页面。
