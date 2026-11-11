/*
 * ChatGPT → PDF
 * 在 ChatGPT 页面里运行：收集完整对话 → 克隆已渲染的 DOM（保留原样式与 KaTeX 公式）
 * → 把横向滚动的内容改为换行 / 自动缩放 → 预览 → 浏览器「另存为 PDF」。
 */
(function () {
  'use strict';
  if (window.__cgptPdfLoaded) return;
  window.__cgptPdfLoaded = true;

  const ROOT_ID = 'cgpt-pdf-root';
  const PAGE_WIDTH_PX = 690; // A4/Letter 去掉 12mm 页边距后的可用宽度（约值）
  const MIN_ZOOM = 0.55;     // 缩放下限，再小就看不清了

  // ---------- 样式 ----------
  const CSS = `
#cgpt-pdf-fab{--c1:#bdeedd;--c2:#8fdcc2;--ink:#1f5f4a;position:fixed;right:20px;top:64px;z-index:2147483646;
  display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 15px 0 8px;border-radius:999px;
  border:2px solid #fff;background:linear-gradient(180deg,var(--c1),var(--c2));color:var(--ink);
  font:800 13px/1 "Nunito","Varela Round",ui-rounded,"Segoe UI",system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;
  box-shadow:0 3px 0 rgba(31,95,74,.18),0 6px 16px rgba(31,95,74,.18);transition:transform .2s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
#cgpt-pdf-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 5px 0 rgba(31,95,74,.16),0 10px 22px rgba(31,95,74,.2)}
#cgpt-pdf-fab:hover .ico{animation:cgpt-wiggle .5s ease}
#cgpt-pdf-fab:active{transform:translateY(1px) scale(.98);box-shadow:0 1px 0 rgba(31,95,74,.2),0 3px 8px rgba(31,95,74,.15)}
#cgpt-pdf-fab .ico{display:block;width:26px;height:26px}
@keyframes cgpt-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}50%{transform:rotate(8deg)}75%{transform:rotate(-4deg)}}
html[data-theme="dark"] #cgpt-pdf-fab,html.dark #cgpt-pdf-fab{border-color:#3a3a3a}
#cgpt-pdf-overlay{position:fixed;inset:0;z-index:2147483647;background:#e9e9ec;overflow:auto}
#cgpt-pdf-bar{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;justify-content:center;
  padding:10px;background:#fff;border-bottom:1px solid #ddd;font:14px system-ui,sans-serif;color:#111}
#cgpt-pdf-bar button{padding:7px 14px;border-radius:8px;border:1px solid #bbb;background:#fff;color:#111;cursor:pointer;font:600 13px system-ui}
#cgpt-pdf-bar button.primary{background:#10a37f;border-color:#10a37f;color:#fff}
#cgpt-pdf-bar .info{color:#555;font-size:12px}
#${ROOT_ID}{box-sizing:content-box;width:${PAGE_WIDTH_PX}px;margin:24px auto;padding:10px 45px 45px;background:var(--main-surface-primary,#fff);
  box-shadow:0 0 0 1px #ddd;color:var(--text-primary,#0d0d0d)}
#${ROOT_ID} .cgpt-pdf-title{font:700 20px/1.3 system-ui,sans-serif;margin:0 0 4px}
#${ROOT_ID} .cgpt-pdf-meta{font:12px system-ui,sans-serif;color:#777;margin:0 0 18px}
#${ROOT_ID} .cgpt-pdf-head{padding:18px 0 0}
#${ROOT_ID} .cgpt-pdf-turn{padding:0}

/* —— 取消所有限宽 / 截断 / 滚动，内容全部展开（KaTeX 内部除外） —— */
#${ROOT_ID} *:not(.katex):not(.katex *){max-height:none!important;-webkit-line-clamp:unset!important;
  line-clamp:none!important;content-visibility:visible!important;contain:none!important}
#${ROOT_ID} *:not(.katex):not(.katex *):not(img):not(svg){overflow:visible!important}
#${ROOT_ID} [class*="sticky"],#${ROOT_ID} .sticky{position:static!important}
#${ROOT_ID} [class*="max-w-"],#${ROOT_ID} [class*="thread-content"]{max-width:100%!important}
#${ROOT_ID} .cgpt-pdf-turn > *{width:100%!important}

/* —— 代码块：长行自动折行 —— */
#${ROOT_ID} pre,#${ROOT_ID} pre code,#${ROOT_ID} .cm-content,#${ROOT_ID} .cm-line{
  white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important}
#${ROOT_ID} pre{overflow:visible!important}
#${ROOT_ID} .cm-editor,#${ROOT_ID} .cm-scroller,#${ROOT_ID} .cm-content{height:auto!important;min-height:0!important}
#${ROOT_ID} .cm-content{flex-shrink:1!important;width:100%!important}
#${ROOT_ID} code{overflow-wrap:anywhere}
#${ROOT_ID} p,#${ROOT_ID} li,#${ROOT_ID} a{overflow-wrap:anywhere}

/* —— 表格：单元格内换行 —— */
#${ROOT_ID} table{max-width:100%!important;width:auto}
#${ROOT_ID} td,#${ROOT_ID} th{white-space:normal!important;overflow-wrap:break-word;word-break:normal}
#${ROOT_ID} table.cgpt-anywhere td,#${ROOT_ID} table.cgpt-anywhere th{overflow-wrap:anywhere;word-break:break-word;min-width:0!important}

/* —— 公式：行间公式允许在 = + − 等处断行 —— */
#${ROOT_ID} .katex-display{overflow:visible!important}
#${ROOT_ID} .katex-display.cgpt-wrap > .katex,
#${ROOT_ID} .katex-display.cgpt-wrap > .katex > .katex-html{white-space:normal!important}
#${ROOT_ID} .katex-display.cgpt-wrap > .katex > .katex-html{display:block;text-align:center}
#${ROOT_ID} .katex-display.cgpt-wrap .cgpt-katex-group{display:inline-block;white-space:nowrap;margin:3px 0}
#${ROOT_ID} .katex-display.cgpt-wrap > .katex > .katex-html > .tag{position:static!important;margin-left:1em}

/* —— 图片 —— */
#${ROOT_ID} img,#${ROOT_ID} video,#${ROOT_ID} canvas{max-width:100%!important;height:auto!important}

/* —— 去掉按钮等交互元素 —— */
#${ROOT_ID} .cgpt-pdf-hide{display:none!important}

/* —— 分页 —— */
#${ROOT_ID} .katex-display,#${ROOT_ID} img,#${ROOT_ID} tr,#${ROOT_ID} h1,#${ROOT_ID} h2,#${ROOT_ID} h3{break-inside:avoid}
#${ROOT_ID} h1,#${ROOT_ID} h2,#${ROOT_ID} h3,#${ROOT_ID} h4{break-after:avoid}

@media print{
  @page{margin:12mm}
  html,body{height:auto!important;min-height:0!important;overflow:visible!important;background:#fff!important}
  body:has(> #cgpt-pdf-overlay) > *:not(#cgpt-pdf-overlay){display:none!important}
  #cgpt-pdf-overlay{position:static!important;overflow:visible!important;background:none!important;inset:auto}
  #cgpt-pdf-bar,#cgpt-pdf-fab{display:none!important}
  #${ROOT_ID}{width:auto!important;max-width:${PAGE_WIDTH_PX}px;margin:0 auto!important;padding:0!important;box-shadow:none!important}
  #${ROOT_ID},#${ROOT_ID} *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}`;

  // 两种方式注入样式：<style> 标签 + 可构造样式表（后者不受页面 CSP 的 inline style 限制）
  const styleEl = document.createElement('style');
  styleEl.id = 'cgpt-pdf-style';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch (e) { /* 旧浏览器不支持，忽略 */ }

  // ---------- 工具函数 ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ChatGPT 改版频繁：按顺序尝试多种结构，取第一个能找到的
  const TURN_SELECTORS = [
    '[data-turn-key]',                     // 2026-11 版：每轮问答一个容器
    '[data-testid^="conversation-turn-"]', // 旧版
    '[data-content-search-turn-key]',
    '[data-chatgpt-search-unit-key]',
    '[data-message-author-role]',
  ];
  function topLevel(list) {
    return list.filter((t) => !list.some((o) => o !== t && o.contains(t)));
  }
  function getTurns() {
    for (const sel of TURN_SELECTORS) {
      const found = topLevel([...document.querySelectorAll(sel)])
        .filter((t) => !t.closest('nav, aside, [role="dialog"], #cgpt-pdf-overlay'));
      if (found.length) return found;
    }
    return [];
  }

  function scrollParent(el) {
    for (let p = el && el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 10) return p;
    }
    return document.scrollingElement;
  }

  // 1. 不遗漏：反复滚到顶/底，直到消息数量稳定（触发懒加载）
  async function loadAllTurns(setStatus) {
    const first = getTurns()[0];
    if (!first) return;
    const sc = scrollParent(first);
    const saved = sc.scrollTop;
    let last = -1, stable = 0;
    for (let i = 0; i < 60 && stable < 3; i++) {
      // 先往下一点再回到顶部，确保每一轮都会触发 scroll 事件 / IntersectionObserver
      sc.scrollTop = Math.min(600, sc.scrollHeight);
      await sleep(80);
      sc.scrollTop = 0;
      sc.dispatchEvent(new Event('scroll'));
      await sleep(450);
      const n = getTurns().length;
      setStatus && setStatus(`Loading full conversation… ${n} turns found`);
      if (n === last) stable++; else { stable = 0; last = n; }
    }
    // 再从上到下滚一遍，让 content-visibility / 懒加载图片都渲染出来
    for (let y = 0; y <= sc.scrollHeight; y += Math.max(400, sc.clientHeight * 0.9)) {
      sc.scrollTop = y;
      await sleep(60);
    }
    sc.scrollTop = saved;
  }

  // 2. 长代码：ChatGPT 的代码编辑器（CodeMirror）只渲染看得见的几十行，其余是空白占位。
  //    导出前在每个编辑器里从上到下滚一遍，按行号收集每一行（保留语法高亮），复制时再拼成完整代码。
  function cmView(editor) {
    const cc = editor.querySelector('.cm-content');
    const t = cc && (cc.cmTile || cc.cmView);
    return t && (t.view || t.rootView?.view || t.root?.view) || null; // 需要在页面主环境中运行才能拿到
  }
  function innerScroller(el, stop) {
    for (let p = el; p && p !== stop; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 5) return p;
    }
    return null;
  }
  async function captureEditors(turns, setStatus) {
    const editors = turns.flatMap((t) => [...t.querySelectorAll('.cm-editor')]);
    for (let i = 0; i < editors.length; i++) {
      const ed = editors[i];
      const view = cmView(ed);
      const lines = new Map();
      const grab = () => ed.querySelectorAll('.cm-content > .cm-line').forEach((ln, k, all) => {
        let key;
        if (view) { try { key = view.state.doc.lineAt(view.posAtDOM(ln)).number; } catch (e) { return; } }
        else key = 'y' + ln.offsetTop; // 没拿到编辑器对象时：按位置去重
        if (!lines.has(key)) lines.set(key, ln.cloneNode(true));
      });
      setStatus && setStatus(`Reading long code blocks… ${i + 1}/${editors.length}`);
      ed.scrollIntoView({ block: 'start' });
      await sleep(120);
      const sc = innerScroller(ed.querySelector('.cm-content'), ed.parentElement?.parentElement?.parentElement) || ed.querySelector('.cm-scroller');
      const saved = sc ? sc.scrollTop : 0;
      grab();
      if (sc) {
        for (let y = 0; y <= sc.scrollHeight; y += Math.max(100, sc.clientHeight * 0.6)) {
          sc.scrollTop = y;
          await new Promise(requestAnimationFrame); await sleep(40);
          grab();
        }
        sc.scrollTop = sc.scrollHeight; await new Promise(requestAnimationFrame); await sleep(40); grab();
        sc.scrollTop = saved;
      }
      ed.__cgptLines = { lines, total: view ? view.state.doc.lines : 0, text: view ? (n) => view.state.doc.line(n).text : null };
    }
  }
  // 在复制出来的编辑器里，用收集到的行替换「只渲染了一部分」的内容
  function rebuildEditors(clone, original) {
    const src = [...original.querySelectorAll('.cm-editor')], dst = [...clone.querySelectorAll('.cm-editor')];
    dst.forEach((ed, i) => {
      const data = src[i] && src[i].__cgptLines;
      const content = ed.querySelector('.cm-content');
      if (!data || !content || !data.lines.size) return;
      const frag = document.createDocumentFragment();
      if (data.total) {
        for (let n = 1; n <= data.total; n++) {
          let ln = data.lines.get(n);
          if (!ln) { ln = document.createElement('div'); ln.className = 'cm-line'; ln.textContent = data.text(n) || '​'; }
          frag.appendChild(ln.cloneNode(true));
        }
      } else {
        [...data.lines.entries()].sort((a, b) => parseFloat(a[0].slice(1)) - parseFloat(b[0].slice(1)))
          .forEach(([, ln]) => frag.appendChild(ln.cloneNode(true)));
      }
      content.replaceChildren(frag);
      content.style.removeProperty('min-height');
      ed.querySelectorAll('.cm-gap, .cm-gutters, .cm-cursorLayer, .cm-selectionLayer, .cm-announced').forEach((g) => g.classList.add('cgpt-pdf-hide'));
    });
  }

  const UI_TEXT = /^(run|run code|copy( code)?|copied!?|edit|share|retry|regenerate|read aloud|good response|bad response|more actions|switch model|复制(代码)?|已复制|编辑|分享|重试|重新生成|朗读|show more|show less|显示更多|收起|显示更少)$/i;

  const LABEL_TEXT = /^(You said:?|ChatGPT said:?|你说：?|ChatGPT 说：?|You|ChatGPT)$/;
  function cleanClone(clone, original) {
    // 原页面里看不见的元素（悬停才出现的按钮/时间、屏幕阅读器标签）在 PDF 里也隐藏
    const o = original.querySelectorAll('*'), c = clone.querySelectorAll('*');
    if (o.length === c.length) {
      for (let i = 0; i < o.length; i++) {
        const el = o[i];
        if (el.closest('.katex')) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const srOnly = cs.position === 'absolute' && r.width <= 2 && r.height <= 2 && el.textContent.trim();
        if (cs.opacity === '0' || cs.visibility === 'hidden' || srOnly) c[i].classList.add('cgpt-pdf-hide');
      }
    }
    clone.querySelectorAll('span,h5,h6,div').forEach((n) => {
      if (n.children.length === 0 && LABEL_TEXT.test(n.textContent.trim())) n.classList.add('cgpt-pdf-hide');
    });
    clone.querySelectorAll('time').forEach((t) => (t.parentElement || t).classList.add('cgpt-pdf-hide'));
    // canvas（图表等）克隆后是空白的，换成图片
    const srcCanvases = original.querySelectorAll('canvas');
    clone.querySelectorAll('canvas').forEach((c, i) => {
      try {
        const img = document.createElement('img');
        img.src = srcCanvases[i].toDataURL();
        img.style.cssText = c.style.cssText;
        c.replaceWith(img);
      } catch (e) { /* 跨域 canvas 无法导出，保留原样 */ }
    });
    // 表单元素的当前值
    clone.querySelectorAll('textarea').forEach((t) => {
      const d = document.createElement('div');
      d.style.whiteSpace = 'pre-wrap';
      d.textContent = t.value;
      t.replaceWith(d);
    });
    // 按钮：纯图标按钮或常见操作按钮隐藏；带有内容（如附件名、"已思考 10 秒"）的保留
    clone.querySelectorAll('button,[role="button"]').forEach((b) => {
      const txt = (b.innerText || b.textContent || '').trim();
      if (!txt || UI_TEXT.test(txt) || b.querySelector('img') === null && txt.length <= 2) {
        b.classList.add('cgpt-pdf-hide');
      }
    });
    // 每条消息下面的操作栏（复制/点赞/朗读等），以及屏幕阅读器专用文字
    clone.querySelectorAll('[data-testid*="copy-turn"],[data-testid*="voice"],[data-testid*="feedback"],[data-testid$="-action-button"],[aria-label="Response actions"],[role="toolbar"],.sr-only')
      .forEach((n) => n.classList.add('cgpt-pdf-hide'));
    // 懒加载图片改为立即加载
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.removeAttribute('srcset');
    });
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  }

  // 4. 宽内容处理
  const LIGHT_ZOOM = 0.85; // 只超出一点点时：整体略缩小，保持原样排版

  // 把 KaTeX 行间公式的 .base 分组：只允许在「括号外」的 = ≤ + − 等运算符后断行
  function groupKatexBreaks(html) {
    const bases = [...html.children].filter((c) => c.classList.contains('base'));
    let depth = 0, group = null;
    bases.forEach((b) => {
      if (!group) {
        group = document.createElement('span');
        group.className = 'cgpt-katex-group';
        b.before(group);
      }
      group.appendChild(b);
      // 只数真正的括号
      // （KaTeX 会把 ")^n" 包成嵌套的 mclose；n! 的 "!" 也标成 mclose；分式两边还有空的 nulldelimiter）
      const real = (sel, chars) => [...b.querySelectorAll(sel)].filter((e) => !e.querySelector(sel) && chars.includes(e.textContent.trim().charAt(0)));
      depth += real('.mopen', '([{⟨⌊⌈\u2016') .length - real('.mclose', ')]}⟩⌋⌉\u2016').length;
      if (depth < 0) depth = 0;
      const ops = [...b.children].filter((c) => !c.classList.contains('mspace') && !c.classList.contains('strut'));
      const last = ops[ops.length - 1];
      const breakable = depth <= 0 && last && (last.classList.contains('mrel') || last.classList.contains('mbin'));
      if (breakable) group = null; // 下一个 base 开始新的一组（这里可以断行）
    });
  }

  function fitWideContent(root) {
    const zoomTo = (el, need, have) => {
      if (need > have + 1) el.style.zoom = Math.max(MIN_ZOOM, have / need).toFixed(3);
    };

    // —— 行间公式 ——
    root.querySelectorAll('.katex-display').forEach((d) => {
      const k = d.querySelector(':scope > .katex');
      const html = k && k.querySelector(':scope > .katex-html');
      if (!html) return;
      const have = d.clientWidth, need = html.scrollWidth;
      if (need <= have + 1) return;
      if (have / need >= LIGHT_ZOOM) { zoomTo(k, need, have); return; }
      groupKatexBreaks(html);           // 在括号外的运算符处断成多行
      d.classList.add('cgpt-wrap');
      html.querySelectorAll(':scope > .cgpt-katex-group').forEach((g) => {
        const w = g.getBoundingClientRect().width;
        if (w > have + 1) zoomTo(g, w, have); // 单块（矩阵、长分式）仍放不下：缩放这一块
      });
    });

    // —— 表格 ——
    root.querySelectorAll('table').forEach((t) => {
      const box = t.parentElement, have = box.clientWidth;
      let need = t.scrollWidth;
      if (need <= have + 1) return;
      if (have / need >= MIN_ZOOM) { zoomTo(t, need, have); return; }
      t.classList.add('cgpt-anywhere'); // 列太多：允许在单词中间断行
      need = t.scrollWidth;
      zoomTo(t, need, have);
    });

    // 最后兜底：任何仍比页面宽的元素
    const rootRight = root.getBoundingClientRect().right;
    [...root.querySelectorAll('pre, .katex, svg, img, [class*="overflow-x"]')].forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > rootRight + 1 && r.width > 0) {
        const z = Math.max(MIN_ZOOM, (rootRight - r.left) / r.width);
        el.style.zoom = ((parseFloat(el.style.zoom) || 1) * z).toFixed(3);
      }
    });
  }

  // 5. 打印友好：代码块改为白底，文字压暗；语法高亮保留色相（不同颜色的含义不变）
  const parseRGB = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  function rgb2hsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  // 浅色文字 → 深色：灰色系按亮度反转（白→近黑，浅灰注释→中灰）；彩色保留色相和饱和度，只降低亮度
  function inkColor(c) {
    const [h, s, l] = rgb2hsl(c);
    const nl = Math.min(0.42, Math.max(s < 0.15 ? 0.1 : 0.24, 1 - l));
    return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(nl * 100).toFixed(0)}%)`;
  }
  function isDarkBg(el) { const c = parseRGB(getComputedStyle(el).backgroundColor); return c && c.a > 0.3 && lum(c) < 0.4; }
  // 找代码块：深色背景 + 里面大部分文字是等宽字体（不依赖 ChatGPT 用的是 <pre> 还是编辑器组件）
  const MONO = /mono|consol|courier|menlo|monaco|code|fira|jetbrains|cascadia/i;
  function monoShare(el) {
    let all = 0, mono = 0;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const len = n.data.trim().length;
      if (!len || n.parentElement.closest('.cgpt-pdf-hide')) continue;
      all += len;
      if (MONO.test(getComputedStyle(n.parentElement).fontFamily)) mono += len;
    }
    return all ? mono / all : 0;
  }
  function codeBlocks(root) {
    const dark = [...root.querySelectorAll('*')].filter((e) => !e.closest('.cgpt-pdf-hide, .katex') && isDarkBg(e));
    const code = dark.filter((e) => e.textContent.trim() && monoShare(e) >= 0.6);
    const top = code.filter((e) => !code.some((o) => o !== e && o.contains(e))); // 只取最外层
    // 往外扩到整个代码块（包括单独的 "python" 标题栏），但不超出代码块范围
    return [...new Set(top.map((e) => {
      let box = e;
      for (let p = e.parentElement, i = 0; p && p !== root && i < 4; p = p.parentElement, i++) {
        if (p.textContent.trim().length > e.textContent.trim().length + 60) break;
        box = p;
      }
      return box;
    }))];
  }
  const touched = [];
  function printFriendlyCode(root, on) {
    if (!on) { // 还原
      touched.forEach(([el, css]) => el.setAttribute('style', css)); touched.length = 0; return;
    }
    codeBlocks(root).forEach((block) => {
      const els = [block, ...block.querySelectorAll('*')].filter((e) => !e.closest('.cgpt-pdf-hide'));
      const plan = els.map((e) => { const cs = getComputedStyle(e); const d = isDarkBg(e); return [e, parseRGB(cs.color), d, d && monoShare(e) < 0.5]; }); // 先全部读取，再统一修改
      plan.forEach(([e, col, darkBg, isHeader]) => {
        touched.push([e, e.getAttribute('style') || '']);
        if (e === block) {
          e.style.setProperty('background', '#fff', 'important');
          e.style.setProperty('border', '1px solid #d4d4d4', 'important');
          e.style.setProperty('border-radius', '8px', 'important');
        } else if (darkBg) {
          e.style.setProperty('background', 'transparent', 'important');
          if (isHeader) e.style.setProperty('border-bottom', '1px solid #e5e5e5', 'important'); // 标题栏和代码之间的分隔线
        }
        if (col && lum(col) > 0.45) e.style.setProperty('color', inkColor(col), 'important');
      });
    });
  }

  function waitImages(root) {
    const imgs = [...root.querySelectorAll('img')].filter((i) => !i.complete);
    return Promise.race([
      Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
      sleep(8000),
    ]);
  }

  // ---------- 主流程 ----------
  let themeBackup = null;
  function forceLight(on) {
    const h = document.documentElement;
    if (on) {
      themeBackup = { cls: h.className, theme: h.getAttribute('data-theme'), scheme: h.style.colorScheme };
      if (h.getAttribute('data-theme') === 'dark') h.setAttribute('data-theme', 'light'); // 2026 版
      if (h.classList.contains('dark')) { h.classList.remove('dark'); h.classList.add('light'); } // 旧版
      h.style.colorScheme = 'light';
    } else if (themeBackup) {
      h.className = themeBackup.cls;
      if (themeBackup.theme === null) h.removeAttribute('data-theme'); else h.setAttribute('data-theme', themeBackup.theme);
      h.style.colorScheme = themeBackup.scheme;
      themeBackup = null;
    }
  }

  function closePreview() {
    touched.length = 0;
    document.getElementById('cgpt-pdf-overlay')?.remove();
    document.documentElement.classList.remove('cgpt-pdf-printing');
    forceLight(false);
  }

  async function exportPdf() {
    closePreview();
    const overlay = document.createElement('div');
    overlay.id = 'cgpt-pdf-overlay';
    overlay.innerHTML = `<div id="cgpt-pdf-bar"><span class="info" id="cgpt-pdf-status">Preparing…</span></div>`;
    document.body.appendChild(overlay);
    const status = overlay.querySelector('#cgpt-pdf-status');
    const setStatus = (s) => { status.textContent = s; };

    overlay.style.visibility = 'hidden'; // 先让原页面能滚动加载
    overlay.style.pointerEvents = 'none';
    await loadAllTurns(setStatus);
    await captureEditors(getTurns(), setStatus);
    overlay.style.visibility = '';
    overlay.style.pointerEvents = '';

    const turns = getTurns();
    if (!turns.length) {
      setStatus('No conversation found on this page. Open a ChatGPT chat first.');
      addButtons(overlay, false);
      return;
    }

    forceLight(true);
    const root = document.createElement('div');
    root.id = ROOT_ID;
    const title = (document.title || 'ChatGPT').replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim();
    const head = document.createElement('div');
    head.className = 'cgpt-pdf-head';
    head.innerHTML = `<div class="cgpt-pdf-title"></div><div class="cgpt-pdf-meta"></div>`;
    head.querySelector('.cgpt-pdf-title').textContent = title;
    head.querySelector('.cgpt-pdf-meta').textContent = `${location.href} · Exported ${new Date().toLocaleString()}`;
    root.appendChild(head);

    turns.forEach((t) => {
      const wrap = document.createElement('div');
      wrap.className = 'cgpt-pdf-turn';
      const c = t.cloneNode(true);
      cleanClone(c, t);
      rebuildEditors(c, t);
      wrap.appendChild(c);
      root.appendChild(wrap);
    });
    overlay.appendChild(root);

    setStatus('Processing images and math…');
    await waitImages(root);
    await document.fonts?.ready;
    await sleep(50);
    fitWideContent(root);
    printFriendlyCode(root, true);

    setStatus(`${turns.length} turns. In the print dialog, enable "Background graphics" (under More settings).`);
    addButtons(overlay, true);
  }

  // 6. 打印：放进独立的 iframe 里打印。
  //    ChatGPT 自己监听打印事件，会生成它的打印版并隐藏页面其他内容（导致空白、预览很慢），
  //    在 iframe 里打印就完全绕开它，而且页面小，打印预览更快。
  function cssFromSheet(sheet) {
    const base = sheet.href || location.href;
    const fixUrls = (t) => t.replace(/url\((['"]?)(?!data:|https?:|blob:|#)([^'")]+)\1\)/g, (m, q, u) => {
      try { return `url("${new URL(u, base).href}")`; } catch (e) { return m; }
    });
    const ser = (rule) => {
      if (rule instanceof CSSMediaRule && /\bprint\b/.test(rule.media.mediaText) && !/\b(screen|all)\b/.test(rule.media.mediaText)) return '';
      if (rule.cssRules && rule.cssRules.length && !(rule instanceof CSSStyleRule)) {
        const head = rule.cssText.slice(0, rule.cssText.indexOf('{'));
        return head + '{' + [...rule.cssRules].map(ser).join('\n') + '}';
      }
      return rule.cssText;
    };
    return fixUrls([...sheet.cssRules].map(ser).join('\n'));
  }
  // 把导出的内容写进一个独立文档（新标签页，或打不开时用 iframe）
  function buildPrintDoc(doc, root, title) {
    doc.open(); doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'); doc.close();
    for (const a of document.documentElement.attributes) doc.documentElement.setAttribute(a.name, a.value);
    for (const a of document.body.attributes) doc.body.setAttribute(a.name, a.value);
    doc.documentElement.classList.remove('cgpt-pdf-printing');
    let css = '';
    for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
      try { css += cssFromSheet(sh) + '\n'; } catch (e) {
        if (sh.href) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = sh.href; doc.head.appendChild(l); }
      }
    }
    const st = doc.createElement('style');
    st.textContent = css + `
@page{size:auto;margin:0}
html,body{height:auto!important;min-height:0!important;overflow:visible!important;background:#fff!important;margin:0!important;padding:0!important}
/* 页边距由内容自己提供（不依赖打印对话框里的边距设置）：外层盒子 12mm 内边距，并在每一页重复 */
.cgpt-page{padding:12mm;-webkit-box-decoration-break:clone;box-decoration-break:clone}
#${ROOT_ID}{width:auto!important;max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important}
#${ROOT_ID},#${ROOT_ID} *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
@media screen{body{background:#e9e9ec!important}.cgpt-page{max-width:${PAGE_WIDTH_PX}px;margin:24px auto;background:#fff}}`;
    doc.head.appendChild(st);
    doc.title = title;
    const page = doc.createElement('div');
    page.className = 'cgpt-page';
    page.appendChild(doc.importNode(root, true));
    doc.body.appendChild(page);
  }
  async function waitForDoc(doc) {
    await Promise.race([Promise.all([doc.fonts?.ready, ...[...doc.images].filter((i) => !i.complete)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r; }))]), sleep(8000)]);
    await sleep(150);
  }
  // 在新标签页里打印（独立的顶层页面：页边距等打印设置都会正常生效，也不受 ChatGPT 自己的打印功能影响）
  async function printIsolated(root, title, win) {
    if (win && !win.closed) {
      buildPrintDoc(win.document, root, title);
      await waitForDoc(win.document);
      win.focus();
      win.print();   // 打印对话框关闭后才返回
      win.close();
      return;
    }
    // 新标签页被拦截时：退回 iframe
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:820px;height:600px;border:0;opacity:0;pointer-events:none;z-index:-1';
    document.body.appendChild(frame);
    buildPrintDoc(frame.contentDocument, root, title);
    await waitForDoc(frame.contentDocument);
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }

  function addButtons(overlay, canPrint) {
    const bar = overlay.querySelector('#cgpt-pdf-bar');
    if (canPrint) {
      const p = document.createElement('button');
      p.className = 'primary';
      p.textContent = 'Save as PDF';
      p.onclick = async () => {
        const title = (overlay.querySelector('.cgpt-pdf-title')?.textContent || 'ChatGPT').replace(/[\\/:*?"<>|]/g, '_');
        const win = window.open('', '_blank'); // 必须在点击时立刻打开，否则会被浏览器拦截
        p.disabled = true; p.textContent = 'Opening print…';
        try {
          await printIsolated(overlay.querySelector('#' + ROOT_ID), title, win);
        } catch (e) {
          console.warn('[Tabby PDF] isolated print failed, falling back', e);
          try { win && win.close(); } catch (_) {}
          document.documentElement.classList.add('cgpt-pdf-printing');
          window.print();
          document.documentElement.classList.remove('cgpt-pdf-printing');
        }
        p.disabled = false; p.textContent = 'Save as PDF';
      };
      bar.prepend(p);
    }
    if (canPrint) {
      const lab = document.createElement('label');
      lab.className = 'info';
      lab.style.cssText = 'display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none';
      lab.innerHTML = '<input type="checkbox" checked> Ink-saving code blocks';
      lab.querySelector('input').onchange = (e) => printFriendlyCode(overlay.querySelector('#' + ROOT_ID), e.target.checked);
      bar.appendChild(lab);
    }
    const c = document.createElement('button');
    c.textContent = 'Close';
    c.onclick = closePreview;
    bar.appendChild(c);
  }

  // ---------- 入口：右下角按钮 ----------
  function ensureFab() {
    if (document.getElementById('cgpt-pdf-fab') || !document.body) return;
    const b = document.createElement('button');
    b.id = 'cgpt-pdf-fab';
    // 图标：一张会笑的小纸片
    b.innerHTML = '<svg class="ico" viewBox="0 0 32 32" aria-hidden="true">'
      + '<path d="M9 4h10l7 7v15a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" fill="#fff" stroke="#1f5f4a" stroke-width="2" stroke-linejoin="round"/>'
      + '<path d="M19 4v5a2 2 0 0 0 2 2h5" fill="#e6f8f1" stroke="#1f5f4a" stroke-width="2" stroke-linejoin="round"/>'
      + '<circle cx="12.5" cy="17.5" r="1.6" fill="#1f5f4a"/><circle cx="19.5" cy="17.5" r="1.6" fill="#1f5f4a"/>'
      + '<path d="M13.5 21.5q2.5 2.2 5 0" fill="none" stroke="#1f5f4a" stroke-width="1.8" stroke-linecap="round"/>'
      + '<circle cx="10.6" cy="20.6" r="1.3" fill="#ffd166" opacity=".9"/><circle cx="21.4" cy="20.6" r="1.3" fill="#ffd166" opacity=".9"/>'
      + '</svg><span>PDF</span>';
    b.title = 'Tabby · Export this ChatGPT conversation to PDF';
    b.onclick = exportPdf;
    document.body.appendChild(b);
  }
  ensureFab();
  setInterval(ensureFab, 2000); // ChatGPT 是单页应用，页面切换后可能被移除
  window.__cgptPdfExport = exportPdf;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });
})();
