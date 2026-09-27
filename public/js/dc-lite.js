/*
 * dc-lite：設計稿（.dc.html）元件的極簡執行環境
 *
 * 設計稿在 claude.ai 畫布上由 DC runtime 執行；正式網站改用這支小程式，
 * 只實作設計稿實際用到的語法，讓每頁的 `class Component extends DCLogic` 可以原封不動搬過來：
 *   - {{ path }}：文字節點與屬性中的資料綁定（支援 a.b.c 路徑、true/false）
 *   - onClick / onSubmit / onChange / onInput="{{ fn }}"：事件綁定，觸發時呼叫當下 renderVals 裡的函式
 *   - <sc-if value="{{ x }}">：條件顯示
 *   - <sc-for list="{{ xs }}" as="x">：列表重複（可巢狀）
 *   - DCLogic：state / setState / renderVals / componentDidMount / componentWillUnmount
 * 更新採「原地更新」：只改有綁定的文字與屬性，sc-if / sc-for 區塊才重建，其餘 DOM 保持不動，
 * 讓 componentDidMount 裡綁在一般元素上的事件與捲動位置不會被重畫洗掉。
 */
(function () {
  'use strict';

  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  var HAS_HOLE = /\{\{[^}]*\}\}/;
  var EVENTS = { onclick: 'click', onsubmit: 'submit', onchange: 'change', oninput: 'input', onkeydown: 'keydown' };

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    var v = scope;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(tpl, scope) {
    return tpl.replace(HOLE, function (m, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function exprOf(attrValue) {
    var m = /\{\{\s*([^}]*?)\s*\}\}/.exec(attrValue || '');
    return m ? m[1] : (attrValue || '').trim();
  }

  // 走訪節點，收集綁定；sc-if / sc-for 換成註解錨點，內容存成樣板
  function compile(parent) {
    var ctx = { texts: [], attrs: [], events: [], blocks: [], ref: { scope: null } };
    walk(parent, ctx);
    return ctx;
  }

  function walk(node, ctx) {
    var child = node.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 3) {
        if (HAS_HOLE.test(child.nodeValue)) ctx.texts.push({ node: child, tpl: child.nodeValue });
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (tag === 'sc-if' || tag === 'sc-for') {
          var anchor = document.createComment(tag);
          var tpl = document.createElement('template');
          while (child.firstChild) tpl.content.appendChild(child.firstChild);
          var block = { kind: tag, anchor: anchor, tpl: tpl, nodes: [], sub: null, on: false,
                        expr: exprOf(child.getAttribute(tag === 'sc-if' ? 'value' : 'list')),
                        as: child.getAttribute('as') };
          node.replaceChild(anchor, child);
          ctx.blocks.push(block);
        } else {
          var attrs = Array.prototype.slice.call(child.attributes);
          for (var i = 0; i < attrs.length; i++) {
            var a = attrs[i], name = a.name.toLowerCase();
            if (name.indexOf('hint-placeholder') === 0) { child.removeAttribute(a.name); continue; }
            if (!HAS_HOLE.test(a.value)) continue;
            if (EVENTS[name]) {
              child.removeAttribute(a.name);
              bindEvent(child, EVENTS[name], exprOf(a.value), ctx.ref);
            } else {
              ctx.attrs.push({ el: child, name: a.name, tpl: a.value });
            }
          }
          if (tag === 'template') walk(child.content, ctx); else walk(child, ctx);
        }
      }
      child = next;
    }
  }

  function bindEvent(el, type, expr, ref) {
    el.addEventListener(type, function (e) {
      var fn = lookup(ref.scope, expr);
      if (typeof fn === 'function') fn(e);
    });
  }

  function update(ctx, scope) {
    ctx.ref.scope = scope;
    for (var i = 0; i < ctx.texts.length; i++) {
      var t = ctx.texts[i], v = interp(t.tpl, scope);
      if (t.node.nodeValue !== v) t.node.nodeValue = v;
    }
    for (var j = 0; j < ctx.attrs.length; j++) {
      var a = ctx.attrs[j], val = interp(a.tpl, scope);
      if (a.el.getAttribute(a.name) !== val) a.el.setAttribute(a.name, val);
    }
    for (var k = 0; k < ctx.blocks.length; k++) {
      var b = ctx.blocks[k];
      if (b.kind === 'sc-if') updateIf(b, scope); else updateFor(b, scope);
    }
  }

  function clear(block) {
    for (var i = 0; i < block.nodes.length; i++) {
      var n = block.nodes[i];
      if (n.parentNode) n.parentNode.removeChild(n);
    }
    block.nodes = [];
  }

  function instantiate(block, scope) {
    var frag = block.tpl.content.cloneNode(true);
    var sub = compile(frag);
    update(sub, scope);
    var nodes = Array.prototype.slice.call(frag.childNodes);
    return { frag: frag, sub: sub, nodes: nodes };
  }

  function insertAfter(anchor, frag, lastNode) {
    var ref = lastNode || anchor;
    ref.parentNode.insertBefore(frag, ref.nextSibling);
  }

  function updateIf(b, scope) {
    var on = !!lookup(scope, b.expr);
    if (on && b.on) { update(b.sub, scope); return; }
    if (!on && b.on) { clear(b); b.sub = null; b.on = false; return; }
    if (on && !b.on) {
      var inst = instantiate(b, scope);
      insertAfter(b.anchor, inst.frag);
      b.nodes = inst.nodes; b.sub = inst.sub; b.on = true;
    }
  }

  function updateFor(b, scope) {
    clear(b);
    var list = lookup(scope, b.expr) || [];
    var last = null;
    for (var i = 0; i < list.length; i++) {
      var s = Object.create(scope);
      s[b.as] = list[i];
      var inst = instantiate(b, s);
      insertAfter(b.anchor, inst.frag, last);
      if (inst.nodes.length) last = inst.nodes[inst.nodes.length - 1];
      b.nodes = b.nodes.concat(inst.nodes);
    }
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, p);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.componentDidMount = function () {};
  DCLogic.prototype.componentWillUnmount = function () {};

  function mount(Component, root) {
    var inst = new Component({});
    if (!inst.state) inst.state = {};
    var ctx = compile(root);
    var pending = false;
    function render() {
      pending = false;
      update(ctx, inst.renderVals() || {});
    }
    inst.__schedule = function () {
      if (pending) return;
      pending = true;
      Promise.resolve().then(render);
    };
    render();
    root.classList.add('dc-ready');
    inst.componentDidMount();
    window.addEventListener('pagehide', function () { inst.componentWillUnmount(); });
    return inst;
  }

  window.DCLogic = DCLogic;
  window.DCLite = { mount: mount };
})();
