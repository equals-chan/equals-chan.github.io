# 代码高亮

Docsify 内置 Prism，Win95 主题只负责把它放进一个老式窗口里。

## JavaScript

```js
function openWindow(title, html) {
  return new WinBox({
    title,
    html,
    width: 640,
    height: 420,
    background: '#c0c0c0',
    border: 2,
  });
}
```

## TypeScript

```ts
type Win95Options = {
  boot: boolean;
  drive: string;
  rootName: string;
};

const options: Win95Options = {
  boot: true,
  drive: 'C:',
  rootName: 'My Computer',
};
```

## CSS

```css
.title-bar {
  height: 18px;
  color: #fff;
  background: linear-gradient(90deg, #000080, #1084d0);
}

.title-bar.inactive {
  color: #c0c0c0;
  background: linear-gradient(90deg, #808080, #b5b5b5);
}
```

## PHP

```php
<?php
function win95_button($label) {
    return '<button class="btn">' . htmlspecialchars($label) . '</button>';
}

echo win95_button('OK');
```

## Bash

```bash
#!/bin/bash
python3 -m http.server 8080 &
open "http://localhost:8080/"
```

## JSON

```json
{
  "name": "docsify-win95",
  "version": "1.0.0",
  "keywords": ["docsify", "windows95", "theme"],
  "winbox": true
}
```

## 没有语言标记

```text
C:\> dir
 Volume in drive C has no label.
 Directory of C:\DOCS

README      MD      1,024  08-24-95   9:50a
GUIDE       <DIR>           08-24-95   9:50a
```

## 超长行

```js
const longLine = 'This line is intentionally very long so that the code block should show a horizontal scrollbar instead of wrapping awkwardly across the window. 0123456789 0123456789 0123456789 0123456789 0123456789';
```

> 代码块有独立的滚动条。窗口缩放时，代码块不会把整个页面撑破。
