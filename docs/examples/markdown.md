# Markdown 展示

这是一篇用来检查主题排版的示例文档。

## 标题级别

### 三级标题

#### 四级标题

##### 五级标题

###### 六级标题

## 文本样式

普通文本、**加粗**、*斜体*、~~删除线~~、`行内代码`、[内部链接](/guide/options)、[外部链接](https://example.com)。

> 这是一段引用。Win95 时代的帮助文档经常长这样。
>
> 第二行引用内容。

?> 这是一个 Docsify tip callout。

!> 这是一个 Docsify important callout。

## 无序列表

- 第一项
- 第二项
  - 嵌套项 A
  - 嵌套项 B
- 第三项

## 有序列表

1. 打开开始菜单
2. 点击 Run...
3. 输入 `#/guide/install`
4. 按 Enter

## 任务列表

- [x] 安装主题
- [x] 打开资源管理器
- [ ] 写一篇自己的文档
- [ ] 把窗口拖到第二块屏幕

## 表格

| 系统 | 年份 | 记忆 |
| --- | ---: | --- |
| Windows 95 | 1995 | 开始菜单、任务栏、蓝屏 |
| Windows 98 | 1998 | IE4、USB |
| Windows 2000 | 2000 | 稳定得不像话 |

## 引用与分隔线

> 640K ought to be enough for anybody.
>
> —— 一句经常被误传的话

---

## 图片

图片会被限制在窗口宽度内：

![Win95 徽章](../_media/win95-badge.svg)

## 代码

```js
const theme = {
  name: 'win95',
  draggable: true,
  iframe: true,
};
```

```css
.window {
  background: #c0c0c0;
  border: 2px solid;
  border-color: #fff #000 #000 #fff;
}
```

```bash
npm run serve
# 然后打开 http://localhost:3000
```

## 长表格与横向滚动

| 列 1 | 列 2 | 列 3 | 列 4 | 列 5 | 列 6 |
| --- | --- | --- | --- | --- | --- |
| 内容 | 内容 | 内容 | 内容 | 内容 | 内容 |
| 很长很长的内容 | 很长很长的内容 | 很长很长的内容 | 很长很长的内容 | 很长很长的内容 | 很长很长的内容 |

## 最后

如果你能看到这里，说明窗口的滚动条工作正常。试试拖动窗口右下角，把窗口拉大一点。
