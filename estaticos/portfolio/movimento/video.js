/*!
 * Káiros em Movimento — vídeo institucional feito em código
 * GSAP 3 · palco 1920×1080 · grade de 120 BPM (1 tempo = 0,5 s)
 *
 * Onde mexer:
 *   CONFIG ............ textos, cores, contato e andamento
 *   cena1 … cena6 ...... coreografia de cada cena (tempos absolutos, em segundos)
 *   Cursor ............. o "_" do logo: quique, squash & stretch, digitação
 *
 * Prévia: npm run preview   ·   MP4: npm run render
 */
(function () {
  'use strict';

  /* ======================================================================
   * CONFIG
   * ==================================================================== */
  const CONFIG = {
    marca: 'Káiros',
    // Cores aproximadas do logo — a marca ainda não tem os códigos oficiais.
    cores: { fundo: '#0B0B0C', claro: '#F2F2EE', destaque: '#C6FF3D' },
    bpm: 120,
    grao: true, // textura de filme; false deixa o vídeo liso (arquivo bem menor)
    textos: {
      gancho: 'Antes de chamar, seu cliente pesquisa.',
      busca: 'dentista perto de mim',
      pergunta: ['O que ele', 'encontra?'],
      criacao: 'A Káiros cria o seu site.',
      endereco: 'seunegocio.com.br',
      botao: 'Agendar',
      planosRotulo: 'Planos',
      planos: ['Vitrine', 'Conexão', 'Operação'],
      fraseFixa: 'Seu site',
      fraseVariavel: ['no celular.', 'no Google.', 'no ar.'],
      assinatura: 'Káiros · criação de sites',
      cta: 'Escolha seu plano.',
      contato: '', // ex.: '@suaempresa' ou 'suaempresa.com.br' — vazio, a linha não aparece
    },
  };

  /* ======================================================================
   * Grade e medidas
   * ==================================================================== */
  const W = 1920, H = 1080;
  const M = 144; // margem lateral (7,5 % da largura)
  const DISPLAY = "'League Spartan', 'Futura', 'Century Gothic', sans-serif";
  const TEXT = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif";

  // Cartões dos planos (cena 4). A miniatura do 1º cartão recebe o site montado na cena 3.
  const CARD = { w: 470, h: 520, gap: 36, y: 292, pad: 26, border: 2 };
  CARD.x0 = Math.round((W - (3 * CARD.w + 2 * CARD.gap)) / 2);
  const cardX = (i) => CARD.x0 + i * (CARD.w + CARD.gap);
  const THUMB_S = 414 / 1180;
  const THUMB1 = {
    x: cardX(0) + CARD.border + CARD.pad,
    y: CARD.y + CARD.border + CARD.pad + Math.round((300 - 720 * THUMB_S) / 2),
    s: THUMB_S,
  };

  /* ======================================================================
   * Utilidades
   * ==================================================================== */
  function div(parent, cls, css) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (css) {
      for (const k in css) {
        const v = css[k];
        d.style[k] = typeof v === 'number' && k !== 'opacity' && k !== 'zIndex' && k !== 'flexGrow' ? v + 'px' : v;
      }
    }
    if (parent) parent.appendChild(d);
    return d;
  }
  function box(parent, x, y, w, h, css) {
    return div(parent, 'kv-box', Object.assign({ left: x, top: y, width: w, height: h }, css || {}));
  }
  const NS = 'http://www.w3.org/2000/svg';
  function svg(parent, tag, attrs, style) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (style) Object.assign(e.style, style);
    parent.appendChild(e);
    return e;
  }
  function rand(seed) {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }
  function hexRgb(c) {
    const h = c.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  function mix(a, b, t) {
    const A = hexRgb(a), B = hexRgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  // Cinzas derivados só do fundo e do claro (regra da marca)
  function palette() {
    const { fundo, claro, destaque } = CONFIG.cores;
    return {
      ink: fundo, paper: claro, lime: destaque,
      g1: mix(fundo, claro, 0.03), g2: mix(fundo, claro, 0.06), g3: mix(fundo, claro, 0.11),
      g4: mix(fundo, claro, 0.2), g5: mix(fundo, claro, 0.42), g6: mix(fundo, claro, 0.64),
    };
  }

  /* ======================================================================
   * Texto: cada letra vira um elemento animável, mantendo o kerning da fonte
   * ==================================================================== */
  let measureRoot = null, ctx2d = null;
  const cache = new Map();
  function spec(fam, size, weight, ls) {
    return { family: fam === 'text' ? TEXT : DISPLAY, size, weight, ls: ls || 0 };
  }
  function applyFont(el, s) {
    el.style.font = `${s.weight} ${s.size}px ${s.family}`;
    el.style.lineHeight = '1';
    el.style.letterSpacing = s.ls + 'em';
    el.style.fontKerning = 'normal';
  }
  function measure(str, s) {
    const key = [str, s.family, s.size, s.weight, s.ls].join('|');
    if (cache.has(key)) return cache.get(key);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:0;top:0;white-space:pre';
    applyFont(wrap, s);
    const tn = document.createTextNode(str);
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    wrap.append(tn, probe);
    measureRoot.appendChild(wrap);
    const wr = wrap.getBoundingClientRect();
    const range = document.createRange();
    const xs = [], ws = [];
    for (let i = 0; i < str.length; i++) {
      range.setStart(tn, i);
      range.setEnd(tn, i + 1);
      const r = range.getBoundingClientRect();
      xs.push(r.left - wr.left);
      ws.push(r.width);
    }
    const lsPx = s.ls * s.size;
    ctx2d.font = `${s.weight} ${s.size}px ${s.family}`;
    const res = {
      xs, ws, lsPx,
      base: probe.offsetTop,
      width: str.length ? xs[str.length - 1] + ws[str.length - 1] - lsPx : 0,
      inkL: -ctx2d.measureText(str).actualBoundingBoxLeft, // recuo óptico da 1ª letra
      cap: ctx2d.measureText('H').actualBoundingBoxAscent,
    };
    wrap.remove();
    cache.set(key, res);
    return res;
  }
  // x/y em coordenadas do palco (y = linha de base). origin = posição do pai no palco.
  function text(parent, str, o) {
    const s = spec(o.fam, o.size, o.weight || (o.fam === 'text' ? 500 : 800), o.ls);
    const m = measure(str, s);
    const [ox, oy] = o.origin || [0, 0];
    const optical = o.fam !== 'text' && o.optical !== false;
    const left = o.x - (optical ? m.inkL : 0);
    const top = o.y - m.base;
    const node = document.createElement('div');
    node.className = 'kv-txt';
    applyFont(node, s);
    node.style.left = left - ox + 'px';
    node.style.top = top - oy + 'px';
    node.style.color = o.color || 'var(--paper)';
    const chars = [];
    for (let i = 0; i < str.length; i++) {
      const c = document.createElement('span');
      c.className = 'kv-ch';
      c.textContent = str[i];
      c.style.left = m.xs[i] + 'px';
      node.appendChild(c);
      chars.push(c);
    }
    parent.appendChild(node);
    gsap.set(chars, { transformOrigin: `50% ${m.base}px` }); // squash a partir da linha de base
    return {
      node, chars, str, left, top,
      y: o.y, size: o.size, base: m.base, cap: m.cap, width: m.width,
      right: left + m.width,
      startX: (i) => left + m.xs[i],
      endX: (i) => left + m.xs[i] + m.ws[i] - m.lsPx,
      midX: (i) => left + m.xs[i] + (m.ws[i] - m.lsPx) / 2,
      visible: chars.filter((_, i) => str[i] !== ' '),
    };
  }
  // Texto dentro de uma máscara (as letras sobem de trás de uma "fresta")
  function masked(parent, str, o) {
    const s = spec(o.fam, o.size, o.weight || (o.fam === 'text' ? 500 : 800), o.ls);
    const m = measure(str, s);
    const [ox, oy] = o.origin || [0, 0];
    const inkL = o.fam === 'text' || o.optical === false ? 0 : m.inkL;
    const pad = Math.round(o.size * 0.25);
    const mx = Math.floor(o.x - inkL - pad);
    const my = Math.floor(o.maskY != null ? o.maskY : o.y - o.size * 1.18);
    const mw = o.maskW != null ? o.maskW : Math.ceil(m.width + pad * 2);
    const mh = Math.ceil(o.maskH != null ? o.maskH : o.size * 1.6);
    const mask = div(parent, 'kv-mask', { left: mx - ox, top: my - oy, width: mw, height: mh });
    const T = text(mask, str, Object.assign({}, o, { origin: [mx, my] }));
    T.mask = mask;
    T.maskOrigin = [mx, my];
    T.drop = Math.ceil(o.size * 1.35);
    return T;
  }

  /* ======================================================================
   * O protagonista: o "_" do logo
   * ==================================================================== */
  class Cursor {
    constructor(tl, node) {
      this.tl = tl; this.n = node;
      this.x = 0; this.y = 0; this.w = 10; this.h = 2;
      this.cue = null; // registra eventos que viram som (audio.js)
    }
    rad(h) { return Math.max(1, Math.round(h * 0.16)); }
    init(p) {
      Object.assign(this, { x: p.x, y: p.y, w: p.w, h: p.h });
      gsap.set(this.n, {
        x: p.x, y: p.y, width: p.w, height: p.h, borderRadius: this.rad(p.h),
        transformOrigin: '50% 100%', rotation: 0,
        scaleX: p.scaleX == null ? 1 : p.scaleX, scaleY: p.scaleY == null ? 1 : p.scaleY,
      });
    }
    vars(p) {
      const v = {};
      if (p.x != null) { v.x = p.x; this.x = p.x; }
      if (p.y != null) { v.y = p.y; this.y = p.y; }
      if (p.w != null) { v.width = p.w; this.w = p.w; }
      if (p.h != null) { v.height = p.h; v.borderRadius = this.rad(p.h); this.h = p.h; }
      for (const k of ['opacity', 'scaleX', 'scaleY', 'rotation']) if (p[k] != null) v[k] = p[k];
      return v;
    }
    set(t, p) { this.tl.set(this.n, this.vars(p), t); return t; }
    to(t, p, dur, ease) {
      this.tl.to(this.n, Object.assign(this.vars(p), { duration: dur, ease: ease || 'power3.out' }), t);
      return t + dur;
    }
    // Salto em arco: antecipação → estica na subida → estica na queda → amassa no impacto
    hop(t, x, y, o) {
      o = o || {};
      const tl = this.tl, n = this.n;
      const dur = o.dur || 0.42, lift = o.lift == null ? 120 : o.lift, a = 0.08;
      const x0 = this.x, apex = Math.min(this.y, y) - lift;
      tl.to(n, { scaleX: 1.22, scaleY: 0.72, duration: a, ease: 'power2.out' }, t);
      const t1 = t + a;
      tl.to(n, { x, duration: dur, ease: 'power1.inOut' }, t1);
      tl.to(n, { y: apex, duration: dur / 2, ease: 'power2.out' }, t1);
      tl.to(n, { y, duration: dur / 2, ease: 'power2.in' }, t1 + dur / 2);
      tl.to(n, { scaleX: 0.8, scaleY: 1.32, duration: dur * 0.22, ease: 'power2.out' }, t1);
      tl.to(n, { scaleX: 1, scaleY: 1, duration: dur * 0.28, ease: 'sine.inOut' }, t1 + dur * 0.22);
      tl.to(n, { scaleX: 0.86, scaleY: 1.22, duration: dur / 2, ease: 'power2.in' }, t1 + dur / 2);
      const dir = Math.sign(x - x0);
      if (dir && o.tilt !== false) {
        tl.to(n, { rotation: 9 * dir, duration: dur / 2, ease: 'sine.out' }, t1);
        tl.to(n, { rotation: 0, duration: dur / 2, ease: 'sine.in' }, t1 + dur / 2);
      }
      if (o.w != null || o.h != null) {
        tl.to(n, Object.assign(this.vars({ w: o.w, h: o.h }), { duration: dur, ease: 'power2.inOut' }), t1);
      }
      const t2 = t1 + dur, sq = o.squash || 1;
      tl.to(n, { scaleX: 1 + 0.45 * sq, scaleY: 1 - 0.45 * sq, duration: 0.06, ease: 'power2.out' }, t2);
      tl.to(n, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.35)' }, t2 + 0.06);
      this.x = x; this.y = y;
      if (this.cue && !o.quiet) this.cue(t2, 'land', { size: sq, note: o.note, final: !!o.final });
      return t2; // instante do pouso
    }
    // Deslize horizontal com stretch e assentamento elástico
    slide(t, x, dur) {
      dur = dur || 0.42;
      const tl = this.tl, n = this.n;
      tl.to(n, { x, duration: dur, ease: 'expo.out' }, t);
      tl.to(n, { scaleX: 1.45, scaleY: 0.78, duration: 0.08, ease: 'power2.out' }, t);
      tl.to(n, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, t + 0.08);
      this.x = x;
      return t + dur;
    }
    // Pisca no tempo da música: apaga em t, acende em t + período/2
    blink(t, times, period) {
      for (let i = 0; i < times; i++) {
        this.tl.set(this.n, { opacity: 0 }, t + i * period);
        this.tl.set(this.n, { opacity: 1 }, t + i * period + period / 2);
        if (this.cue) {
          this.cue(t + i * period, 'blink', { on: false });
          this.cue(t + i * period + period / 2, 'blink', { on: true });
        }
      }
      return t + times * period;
    }
  }

  class Pointer {
    constructor(tl, node) { this.tl = tl; this.n = node; this.x = 0; this.y = 0; this.cue = null; }
    init(x, y) { this.x = x; this.y = y; gsap.set(this.n, { x, y, transformOrigin: '0 0' }); }
    move(t, x, y, dur, ease) {
      this.tl.to(this.n, { x, y, duration: dur, ease: ease || 'power3.inOut' }, t);
      this.x = x; this.y = y;
      return t + dur;
    }
    click(t) {
      if (this.cue) this.cue(t, 'click', {});
      this.tl.to(this.n, { scale: 0.8, duration: 0.07, ease: 'power2.out' }, t);
      this.tl.to(this.n, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, t + 0.07);
      return t + 0.07;
    }
  }
  function makePointer(parent) {
    const p = div(parent, 'kv-pointer');
    p.innerHTML =
      '<svg width="44" height="60" viewBox="0 0 44 60" aria-hidden="true">' +
      '<path d="M3 3 L3 46 L13.5 36.5 L21 54 L29 50.5 L21.5 33.5 L36 33.5 Z" ' +
      'style="fill:var(--paper);stroke:var(--ink);stroke-width:3;stroke-linejoin:round"/></svg>';
    return p;
  }

  // Grão de filme discreto: ruído de 100 px ampliado 2× (mais macio e leve para o MP4),
  // seis quadros que se alternam a 8 fps
  function makeGrain(stage, on) {
    if (!on) return () => {};
    const el = div(stage, 'kv-grain');
    const r = rand(7), tiles = [];
    for (let k = 0; k < 6; k++) {
      const c = document.createElement('canvas');
      c.width = c.height = 100;
      const g = c.getContext('2d');
      const img = g.createImageData(100, 100);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (r() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      tiles.push(`url(${c.toDataURL()})`);
    }
    let last = -1;
    return (t) => {
      const f = Math.floor(t * 8) % tiles.length;
      if (f !== last) { last = f; el.style.backgroundImage = tiles[f]; }
    };
  }

  /* ======================================================================
   * Site em esqueleto (cena 3) — o mesmo construtor gera as miniaturas da cena 4
   * Coordenadas locais: 1180 × 720
   * ==================================================================== */
  function browser(parent, x, y, s, live) {
    const g = box(parent, x, y, 1180, 720);
    gsap.set(g, { transformOrigin: '0 0', scale: s });
    const fill = box(g, 0, 0, 1180, 720, { background: 'var(--g1)', borderRadius: 'var(--r)' });
    const sv = svg(g, 'svg', { class: 'kv-svg', width: 1180, height: 720, viewBox: '0 0 1180 720' });
    const frameRect = svg(sv, 'rect', { x: 1, y: 1, width: 1178, height: 718, rx: 10, 'vector-effect': 'non-scaling-stroke' },
      { fill: 'none', stroke: 'var(--g4)', strokeWidth: '2px' });
    const topLine = box(g, 0, 64, 1180, 2, { background: 'var(--g3)' });
    const dots = [0, 1, 2].map((i) => box(g, 26 + i * 24, 25, 14, 14, { borderRadius: '50%', background: 'var(--g4)' }));
    const pill = box(g, 300, 16, 580, 32, { background: 'var(--g2)', borderRadius: 'var(--r)' });
    const url = text(g, CONFIG.textos.endereco, { x: 322, y: 38, size: 18, fam: 'text', weight: 500, color: 'var(--g5)' });
    const page = box(g, 0, 66, 1180, 652, { overflow: 'hidden', borderRadius: '0 0 10px 10px' });
    const pc = box(page, 0, 0, 1180, 652);
    const bar = (p, bx, by, bw, bh, c) => box(p, bx, by, bw, bh, { background: c, borderRadius: 'var(--r-bar)' });
    const nav = bar(pc, 60, 38, 120, 22, 'var(--g5)');
    const links = [860, 950, 1040].map((lx) => bar(pc, lx, 43, 64, 12, 'var(--g4)'));
    const heads = [540, 400].map((w, i) => bar(pc, 60, 124 + i * 62, w, 46, 'var(--paper)'));
    const subs = [500, 470, 300].map((w, i) => bar(pc, 60, 270 + i * 26, w, 14, 'var(--g4)'));
    const btn = box(pc, 60, 384, 220, 64, { background: live ? 'var(--lime)' : 'var(--g3)', borderRadius: 'var(--r)' });
    const lm = measure(CONFIG.textos.botao, spec('text', 26, 600));
    const btnLabel = text(pc, CONFIG.textos.botao, {
      x: 60 + (220 - lm.width) / 2, y: 384 + 32 + lm.cap / 2,
      size: 26, fam: 'text', weight: 600, color: live ? 'var(--ink)' : 'var(--g6)',
    });
    const img = box(pc, 660, 84, 460, 420, { background: 'var(--g2)', borderRadius: 'var(--r)', overflow: 'hidden' });
    const sun = box(img, 312, 70, 64, 64, { borderRadius: '50%', background: 'var(--g3)' });
    const mount = svg(img, 'svg', { class: 'kv-svg', width: 460, height: 420, viewBox: '0 0 460 420' });
    svg(mount, 'polygon', { points: '0,420 0,330 140,200 250,320 320,250 460,380 460,420' }, { fill: 'var(--g3)' });
    gsap.set(sun, { transformOrigin: '50% 50%' });
    gsap.set(mount, { transformOrigin: '50% 100%' });
    const cards = [60, 420, 780].map((cx) => {
      const c = box(pc, cx, 540, 340, 76, { background: 'var(--g2)', borderRadius: 'var(--r)' });
      bar(c, 24, 31, 150, 14, 'var(--g4)');
      return c;
    });
    return { group: g, fill, frameRect, topLine, dots, pill, url, page, pc, nav, links, heads, subs, btn, btnLabel, img, sun, mount, cards };
  }

  // Nós de conexão (WhatsApp, Instagram, formulário) desenhados como ícones neutros
  function glyph(g, kind, x, y, r) {
    const k = r / 28;
    const st = { fill: 'none', stroke: 'var(--g6)', strokeWidth: (2 / k).toFixed(2) + 'px', strokeLinejoin: 'round', strokeLinecap: 'round' };
    let e;
    if (kind === 'chat') {
      e = svg(g, 'path', { d: 'M-12 -9h24a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3h-13l-7 6v-6h-4a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3z' }, st);
    } else if (kind === 'mail') {
      e = svg(g, 'path', { d: 'M-13 -9h26v18h-26zM-13 -9l13 10 13-10' }, st);
    } else {
      e = svg(g, 'text', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, { font: `600 26px ${TEXT}`, fill: 'var(--g6)' });
      e.textContent = '@';
    }
    e.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
  }
  function nodes(card, from, list) {
    const sv = svg(card, 'svg', { class: 'kv-svg', width: 466, height: 516 });
    const lines = [], groups = [];
    list.forEach(([x, y, r, kind]) => {
      const [fx, fy] = from;
      const p = svg(sv, 'path', { d: `M${fx},${fy} C${fx + 44},${fy} ${x - r - 44},${y} ${x - r},${y}` },
        { fill: 'none', stroke: 'var(--g5)', strokeWidth: '2px' });
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      lines.push(p);
      const g = svg(sv, 'g', {});
      svg(g, 'circle', { cx: x, cy: y, r }, { fill: 'var(--g2)', stroke: 'var(--g4)', strokeWidth: '2px' });
      glyph(g, kind, x, y, r);
      gsap.set(g, { opacity: 0.35, scale: 0.85, transformOrigin: '50% 50%' });
      groups.push(g);
    });
    return { lines, nodes: groups };
  }

  // Queda com stretch e pouso com squash (palavras gigantes)
  function slam(tl, chars, t0, stagger, cue) {
    chars.forEach((c, i) => {
      const t = t0 + i * stagger;
      if (cue) cue(t + 0.26, 'slam', { i, big: i === chars.length - 1 });
      gsap.set(c, { autoAlpha: 0, y: -280, scaleY: 1.45, scaleX: 0.82 });
      tl.set(c, { autoAlpha: 1 }, t);
      tl.to(c, { y: 0, duration: 0.26, ease: 'power2.in' }, t);
      tl.to(c, { scaleY: 1.2, scaleX: 0.9, duration: 0.26, ease: 'none' }, t);
      tl.to(c, { scaleY: 0.74, scaleX: 1.16, duration: 0.06, ease: 'power2.out' }, t + 0.26);
      tl.to(c, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, t + 0.32);
    });
  }

  // O cursor contorna um retângulo como uma caneta; a linha nasce atrás dele
  function drawRect(k, rect, t0, bx, by, bw, bh, speed) {
    const { tl, C } = k;
    const len = rect.getTotalLength();
    gsap.set(rect, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(rect, { strokeDashoffset: 0, duration: (2 * (bw + bh)) / speed, ease: 'none' }, t0);
    const pts = [[bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]];
    let t = t0, px0 = bx, py0 = by;
    const corners = [];
    pts.forEach(([x, y], i) => {
      const d = Math.hypot(x - px0, y - py0) / speed;
      tl.to(C.n, { x: x - C.w / 2, y: y - C.h, duration: d, ease: 'none' }, t);
      tl.to(C.n, { rotation: 90 * (i + 1), duration: 0.09, ease: 'power2.inOut' }, t + d - 0.045);
      t += d; px0 = x; py0 = y;
      if (i < 3) corners.push(t);
    });
    k.cue(t0, 'pen', { len: t - t0, corners });
    tl.set(C.n, { rotation: 0 }, t + 0.06);
    C.x = bx - C.w / 2;
    C.y = by - C.h;
    return t;
  }

  /* ======================================================================
   * CENA 1 · Abertura (0:00–0:04) — o traço cai, quica e digita a marca
   * ==================================================================== */
  function cena1(k) {
    const { tl, C, cam } = k;
    const L = k.layer(1, 0, 4.45);
    const size = 400, base = 655, name = CONFIG.marca;
    const m = measure(name, spec('display', size, 800, -0.02));
    const cw = Math.round(size * 0.46), ch = Math.round(size * 0.085), gap = Math.round(size * 0.075);
    const x0 = Math.round((W - (m.width - m.inkL + gap + cw)) / 2);
    const T = text(L, name, { x: x0, y: base, size, weight: 800, ls: -0.02 });
    const cy = base + Math.round(size * 0.035);
    const landX = Math.round(T.midX(0) - cw / 2);
    gsap.set(T.chars, { autoAlpha: 0 });
    C.init({ x: landX, y: -260, w: cw, h: ch, scaleX: 0.72, scaleY: 1.5 });
    k.cue(0.5, 'fall', { dur: 0.5 });
    [[1.0, 1], [1.5, 0.6], [1.75, 0.3]].forEach(([t, size]) => k.cue(t, 'impact', { size }));
    const n = C.n;

    // queda com gravidade — impacto no 3º tempo (1,0 s)
    tl.to(n, { y: cy, duration: 0.5, ease: 'power2.in' }, 0.5);
    tl.to(n, { scaleX: 0.8, scaleY: 1.35, duration: 0.5, ease: 'none' }, 0.5);
    tl.to(n, { scaleX: 1.55, scaleY: 0.45, duration: 0.06, ease: 'power2.out' }, 1.0);
    // 1º quique
    tl.to(n, { y: cy - 150, duration: 0.22, ease: 'power2.out' }, 1.06);
    tl.to(n, { scaleX: 0.84, scaleY: 1.28, duration: 0.08, ease: 'power2.out' }, 1.06);
    tl.to(n, { scaleX: 1, scaleY: 1, duration: 0.14, ease: 'sine.inOut' }, 1.14);
    tl.to(n, { y: cy, duration: 0.22, ease: 'power2.in' }, 1.28);
    tl.to(n, { scaleX: 0.9, scaleY: 1.16, duration: 0.22, ease: 'power2.in' }, 1.28);
    tl.to(n, { scaleX: 1.32, scaleY: 0.66, duration: 0.05, ease: 'power2.out' }, 1.5);
    // 2º quique, menor
    tl.to(n, { y: cy - 44, duration: 0.1, ease: 'power2.out' }, 1.55);
    tl.to(n, { scaleX: 1, scaleY: 1, duration: 0.1, ease: 'sine.out' }, 1.55);
    tl.to(n, { y: cy, duration: 0.1, ease: 'power2.in' }, 1.65);
    tl.to(n, { scaleX: 1.14, scaleY: 0.86, duration: 0.05, ease: 'power2.out' }, 1.75);
    tl.to(n, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.3)' }, 1.8);
    C.x = landX; C.y = cy;

    // 2,0 — o K nasce da linha de base e empurra o cursor
    const K = T.chars[0];
    gsap.set(K, { scaleY: 0, scaleX: 1.3 });
    tl.set(K, { autoAlpha: 1 }, 2.0);
    k.cue(2.0, 'spring', { note: 'A3' });
    tl.to(K, { scaleY: 1.12, scaleX: 0.93, duration: 0.18, ease: 'power3.out' }, 2.0);
    tl.to(K, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 2.18);
    C.slide(2.0, T.endX(0) + gap, 0.3);

    // 2,25 → 2,75 — digita o resto do nome em semicolcheias
    for (let i = 1; i < name.length; i++) {
      const t = 2.25 + (i - 1) * 0.125;
      const c = T.chars[i];
      gsap.set(c, { y: size * 0.12, scaleY: 0.4 });
      tl.set(c, { autoAlpha: 1 }, t);
      tl.to(c, { y: 0, scaleY: 1, duration: 0.32, ease: 'back.out(3)' }, t);
      C.to(t, { x: T.endX(i) + gap }, 0.09, 'power2.out');
      k.cue(t, 'type', { note: ['C5', 'D5', 'E5', 'G5', 'A5'][(i - 1) % 5] }); // a digitação vira escala
    }
    C.blink(3.0, 1, 1.0);
    tl.to(cam, { scale: 1.035, duration: 3.6, ease: 'sine.inOut' }, 0.2);

    // 3,72 — as letras despencam
    const r = rand(11);
    k.cue(3.72, 'whoosh', { len: 0.75, dir: 'down', size: 0.8 });
    T.chars.forEach((c, i) => {
      tl.to(c, { y: 1000, rotation: (r() - 0.5) * 80, duration: 0.62, ease: 'power2.in' }, 3.72 + i * 0.045);
    });
  }

  /* ======================================================================
   * CENA 2 · Gancho (0:04–0:09,5) — a busca do cliente e a pergunta
   * ==================================================================== */
  function cena2(k) {
    const { tl, C, cam } = k;
    const tx = CONFIG.textos;
    const L = k.layer(2, 3.95, 9.5);
    tl.to(cam, { scale: 1, duration: 0.6, ease: 'expo.inOut' }, 3.95);

    const G = div(L, 'kv-layer'); // tudo da busca recua junto
    gsap.set(G, { transformOrigin: `${M + 620}px 520px` });
    const cap = masked(G, tx.gancho, { x: M, y: 214, size: 48, fam: 'text', weight: 500, color: 'var(--g6)' });
    gsap.set(cap.chars, { y: cap.drop });
    tl.to(cap.chars, { y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.008 }, 4.15);

    // campo de busca
    const F = div(G, 'kv-layer');
    const fx = M, fy = 286, fw = 1240, fh = 136, fcy = fy + fh / 2;
    gsap.set(F, { transformOrigin: `${fx + fw / 2}px ${fcy}px` });
    const field = box(F, fx, fy, fw, fh, { border: '2px solid var(--g4)', background: 'var(--g1)', borderRadius: 'var(--r)' });
    gsap.set(field, { clipPath: 'inset(0% 100% 0% 0% round 10px)' });
    tl.to(field, { clipPath: 'inset(0% 0% 0% 0% round 10px)', duration: 0.7, ease: 'expo.out' }, 4.35);
    k.cue(4.3, 'whoosh', { len: 0.5, dir: 'up', size: 0.3, pan: -0.2 });
    const ic = svg(F, 'svg', { class: 'kv-svg', width: W, height: H });
    const lens = svg(ic, 'circle', { cx: fx + 50, cy: fcy - 4, r: 15 }, { fill: 'none', stroke: 'var(--g6)', strokeWidth: '3px' });
    const hand = svg(ic, 'line', { x1: fx + 61, y1: fcy + 7, x2: fx + 72, y2: fcy + 18 }, { stroke: 'var(--g6)', strokeWidth: '3px', strokeLinecap: 'round' });
    const lensLen = 2 * Math.PI * 15, handLen = Math.hypot(11, 11);
    gsap.set(lens, { strokeDasharray: lensLen, strokeDashoffset: lensLen });
    gsap.set(hand, { strokeDasharray: handLen, strokeDashoffset: handLen });
    gsap.set(ic, { autoAlpha: 0 }); // a ponta redonda da linha apareceria como um ponto antes do traço
    tl.set(ic, { autoAlpha: 1 }, 4.55);
    tl.to(lens, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 4.55);
    tl.to(hand, { strokeDashoffset: 0, duration: 0.2, ease: 'power2.out' }, 4.95);

    const qBase = fcy + 20;
    const Q = text(F, tx.busca, { x: fx + 104, y: qBase, size: 58, fam: 'text', weight: 500 });
    gsap.set(Q.chars, { autoAlpha: 0 });

    // o traço do logo vira o cursor do campo
    C.to(3.98, { x: fx + 104, y: qBase + 7, w: 30, h: 6 }, 0.6, 'expo.inOut');
    k.cue(3.98, 'whoosh', { len: 0.6, dir: 'down', size: 0.45, pan: -0.3 });
    tl.to(C.n, { scaleX: 1.6, scaleY: 0.6, duration: 0.3, ease: 'power2.in' }, 3.98);
    tl.to(C.n, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, 4.58);

    // digitação com ritmo humano
    const rr = rand(5);
    let t = 5.0;
    Q.chars.forEach((c, i) => {
      tl.set(c, { autoAlpha: 1 }, t);
      C.set(t, { x: Q.endX(i) + 7 });
      k.cue(t, 'key', { i });
      t += 0.04 + rr() * 0.034;
    });
    // Enter: o campo amassa e volta
    const te = Math.max(t + 0.08, 6.3);
    k.cue(te, 'enter', {});
    tl.to(F, { scaleY: 0.93, scaleX: 1.012, duration: 0.07, ease: 'power2.out' }, te);
    tl.to(F, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, te + 0.07);

    // resultados (concorrentes) em esqueleto
    [[640, 300], [520, 250], [700, 360]].forEach(([tw, uw], i) => {
      const y0 = 470 + i * 112;
      const fav = box(G, M + 2, y0, 30, 30, { borderRadius: '50%', background: 'var(--g4)' });
      const t1 = box(G, M + 54, y0 + 2, tw, 26, { borderRadius: 'var(--r-bar)', background: 'var(--g5)' });
      const u1 = box(G, M + 54, y0 + 46, uw, 14, { borderRadius: 'var(--r-bar)', background: 'var(--g4)' });
      gsap.set(fav, { scale: 0 });
      gsap.set([t1, u1], { scaleX: 0, transformOrigin: '0 50%' });
      const tt = te + 0.2 + i * 0.1;
      k.cue(tt, 'pop', { note: ['E5', 'G5', 'A5'][i] });
      tl.to(fav, { scale: 1, duration: 0.4, ease: 'back.out(2.5)' }, tt);
      tl.to(t1, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, tt + 0.04);
      tl.to(u1, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, tt + 0.1);
    });

    // a pergunta em tipografia gigante
    const size = 300, b1 = 520, b2 = 800;
    const q1 = text(L, tx.pergunta[0], { x: M, y: b1, size, weight: 800, ls: -0.03 });
    const q2 = text(L, tx.pergunta[1], { x: M, y: b2, size, weight: 800, ls: -0.03 });
    const qcw = Math.round(size * 0.46), qch = Math.round(size * 0.085), qgap = Math.round(size * 0.075);
    C.hop(7.15, q2.right + qgap, b2 + Math.round(size * 0.035), { w: qcw, h: qch, dur: 0.46, lift: 160 });
    tl.to(G, { scale: 0.93, y: -24, autoAlpha: 0.08, duration: 0.7, ease: 'power2.inOut' }, 7.3);
    k.cue(7.3, 'whoosh', { len: 0.8, dir: 'down', size: 0.7 });
    slam(tl, q1.visible, 7.55, 0.04, k.cue);
    slam(tl, q2.visible, 7.88, 0.04, k.cue);

    // selecionar tudo… e apagar no tempo forte
    const selX = M - 20, selY = b1 - q1.cap - 46;
    const sel = box(L, selX, selY, Math.max(q1.right, q2.right) + 24 - selX, b2 + 58 - selY, {
      background: 'var(--g4)', borderRadius: 'var(--r-bar)',
    });
    L.insertBefore(sel, q1.node);
    gsap.set(sel, { scaleX: 0, transformOrigin: '0 50%' });
    tl.to(sel, { scaleX: 1, duration: 0.3, ease: 'power3.out' }, 9.0);
    k.cue(9.0, 'select', {});
    C.set(9.0, { opacity: 0 });
    tl.set([sel, q1.node, q2.node, G], { autoAlpha: 0 }, 9.5);
    k.cue(9.5, 'delete', {});
    C.set(9.5, { opacity: 1, x: M, y: b1 + Math.round(size * 0.035) });
  }

  /* ======================================================================
   * CENA 3 · Construção (0:09,5–0:17) — o cursor desenha e monta um site
   * ==================================================================== */
  function cena3(k) {
    const { tl, C, Pt, P } = k;
    const tx = CONFIG.textos;
    const bx = 370, by = 196, bw = 1180, bh = 720, pg = by + 66;
    const L = k.layer(3, 9.5, null, 4);
    const TOP = k.layer('3b', 9.5, null, 60); // acima do cursor: rótulo do botão e onda do clique

    const cap = masked(L, tx.criacao, { x: bx, y: 140, size: 48, fam: 'text', weight: 500, color: 'var(--g6)' });
    gsap.set(cap.chars, { y: cap.drop });
    tl.to(cap.chars, { y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.01 }, 9.62);

    const B = browser(L, bx, by, 1, true);
    gsap.set(B.fill, { autoAlpha: 0 });
    gsap.set(B.topLine, { scaleX: 0, transformOrigin: '0 50%' });
    gsap.set(B.dots, { scale: 0 });
    gsap.set(B.pill, { clipPath: 'inset(0% 100% 0% 0% round 10px)' });
    gsap.set(B.url.chars, { autoAlpha: 0 });
    gsap.set([B.nav].concat(B.links, B.heads, B.subs), { scaleX: 0, transformOrigin: '0 50%' });
    gsap.set(B.img, { scale: 0, transformOrigin: '0% 100%' });
    gsap.set([B.sun, B.mount], { scale: 0 });
    gsap.set(B.cards, { autoAlpha: 0, y: 34 });
    gsap.set([B.btn, B.btnLabel.node], { autoAlpha: 0 });

    // salta para o canto e contorna a janela
    C.hop(9.55, bx - 24, by - 10, { w: 48, h: 10, dur: 0.36, lift: 130 });
    const tDrawn = drawRect(k, B.frameRect, 10.04, bx, by, bw, bh, 3400);
    tl.to(B.fill, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, tDrawn - 0.15);
    tl.to(B.topLine, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, tDrawn - 0.04);
    B.dots.forEach((d, i) => tl.to(d, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, tDrawn + 0.02 + i * 0.06));
    tl.to(B.pill, { clipPath: 'inset(0% 0% 0% 0% round 10px)', duration: 0.55, ease: 'expo.out' }, tDrawn + 0.06);

    // endereço do site
    const tu = C.hop(tDrawn, bx + B.url.startX(0), by + 41, { w: 10, h: 3, dur: 0.3, lift: 70 });
    let t = tu + 0.06;
    B.url.chars.forEach((c, i) => {
      tl.set(c, { autoAlpha: 1 }, t);
      C.set(t, { x: bx + B.url.endX(i) + 3 });
      k.cue(t, 'key', { i: 40 + i });
      t += 0.026;
    });

    // o cursor vira caneta: pousa ao lado de cada bloco e o bloco nasce dele
    const pen = (t0, lx, lb, o) => C.hop(t0, bx + lx - 58, pg + lb - 10, Object.assign({ w: 48, h: 10, dur: 0.3, lift: 80 }, o));
    const t1 = pen(t + 0.12, 60, 60, { lift: 60, note: 'A4' }); // menu (cada pouso é uma nota)
    tl.to(B.nav, { scaleX: 1, duration: 0.5, ease: 'expo.out' }, t1);
    B.links.forEach((l, i) => tl.to(l, { scaleX: 1, duration: 0.45, ease: 'expo.out' }, t1 + 0.1 + i * 0.06));
    const t2 = pen(t1 + 0.12, 60, 232, { note: 'C5' }); // título
    B.heads.forEach((h, i) => tl.to(h, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, t2 + i * 0.08));
    const t3 = pen(t2 + 0.1, 60, 336, { note: 'F5' }); // texto
    B.subs.forEach((s, i) => tl.to(s, { scaleX: 1, duration: 0.55, ease: 'expo.out' }, t3 + i * 0.06));
    const t4 = pen(t3 + 0.1, 660, 504, { dur: 0.36, lift: 150, note: 'G5' }); // imagem
    tl.to(B.img, { scale: 1, duration: 0.6, ease: 'back.out(1.3)' }, t4);
    tl.to(B.mount, { scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, t4 + 0.16);
    tl.to(B.sun, { scale: 1, duration: 0.5, ease: 'back.out(2.2)' }, t4 + 0.24);
    B.cards.forEach((c, i) => tl.to(c, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' }, t4 + 0.12 + i * 0.07));
    const t5 = pen(t4 + 0.14, 60, 448, { dur: 0.36, lift: 120, note: 'C6' }); // botão

    // o traço cresce e vira o botão
    C.to(t5 + 0.05, { x: bx + 60, y: pg + 384, w: 220, h: 64 }, 0.34, 'expo.out');
    k.cue(t5 + 0.05, 'morph', {});
    const lm = measure(tx.botao, spec('text', 26, 600));
    const lab = text(TOP, tx.botao, {
      x: bx + 60 + (220 - lm.width) / 2, y: pg + 384 + 32 + lm.cap / 2,
      size: 26, fam: 'text', weight: 600, color: 'var(--ink)',
    });
    gsap.set(lab.node, { autoAlpha: 0, transformOrigin: `${bx + 170 - lab.left}px ${pg + 448 - lab.top}px` });
    tl.to(lab.node, { autoAlpha: 1, duration: 0.2, ease: 'none' }, t5 + 0.28);

    // a seta entra e clica
    const tp = Pt.move(t5 + 0.1, bx + 210, pg + 426, 0.6, 'power3.out');
    const tc = tp + 0.06;
    Pt.click(tc);
    tl.to([C.n, lab.node], { scaleX: 1.05, scaleY: 0.84, duration: 0.07, ease: 'power2.out' }, tc);
    tl.to([C.n, lab.node], { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, tc + 0.07);
    const ring = box(TOP, -60, -60, 120, 120, { border: '2px solid var(--paper)', borderRadius: '50%' });
    gsap.set(ring, { x: Pt.x, y: Pt.y, scale: 0.15, autoAlpha: 0 });
    tl.set(ring, { autoAlpha: 0.8 }, tc);
    tl.to(ring, { scale: 1.6, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, tc);

    // o cursor se solta do botão (o botão fica, já sem destaque)
    const td = tc + 0.75;
    k.cue(td, 'pop', { note: 'G5' });
    tl.set([B.btn, B.btnLabel.node], { autoAlpha: 1 }, td);
    tl.set(lab.node, { autoAlpha: 0 }, td);
    C.set(td, { x: bx + 60 + 160, y: pg + 384 + 46, w: 48, h: 10 });
    tl.to(B.btn, { backgroundColor: P.g3, duration: 0.45, ease: 'power2.out' }, td + 0.15);
    tl.to(B.btnLabel.node, { color: P.g6, duration: 0.45, ease: 'power2.out' }, td + 0.15);
    Pt.move(td - 0.3, 1660, 1220, 0.5, 'power3.in');
    tl.to(cap.chars, { y: -cap.drop, duration: 0.45, ease: 'power3.in', stagger: 0.006 }, td - 0.1);

    // o site encolhe para dentro do cartão "Vitrine"
    const ts = td + 0.1;
    k.cue(ts, 'whoosh', { len: 1.0, dir: 'down', size: 0.55 });
    tl.to(B.group, { x: THUMB1.x - bx, y: THUMB1.y - by, scale: THUMB1.s, duration: 1.0, ease: 'expo.inOut' }, ts);
    const T4 = ts + 1.0;
    tl.set([L, TOP], { autoAlpha: 0 }, T4);
    return { detach: td, T4 };
  }

  /* ======================================================================
   * CENA 4 · Planos (0:17–0:23,5) — cartões em 3D e o cursor como seleção
   * ==================================================================== */
  function cena4(k, s3, g5) {
    const { tl, C, Pt, P } = k;
    const tx = CONFIG.textos;
    const T4 = s3.T4;
    const L = k.layer(4, s3.detach, T4 + 7.4, 3);
    const co = (i) => [cardX(i) + CARD.border, CARD.y + CARD.border];

    const eb = masked(L, tx.planosRotulo.toUpperCase(), { x: CARD.x0, y: CARD.y - 46, size: 30, fam: 'text', weight: 600, ls: 0.14, color: 'var(--g6)' });
    gsap.set(eb.chars, { y: eb.drop });
    tl.to(eb.chars, { y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.02 }, T4 - 0.15);

    const cards = [0, 1, 2].map((i) => {
      const c = box(L, cardX(i), CARD.y, CARD.w, CARD.h);
      c.classList.add('kv-card');
      gsap.set(c, { transformPerspective: 1300, transformOrigin: '50% 50%' });
      return c;
    });

    // miniaturas: o site da cena 3, + conexões, + painel de operação
    const b1 = browser(cards[0], THUMB1.x - co(0)[0], THUMB1.y - co(0)[1], THUMB1.s, false);
    gsap.set(b1.group, { autoAlpha: 0 });
    tl.set(b1.group, { autoAlpha: 1 }, T4);
    browser(cards[1], 26, 89, 0.24, false);
    const d2 = nodes(cards[1], [309, 175], [[412, 76, 28, 'chat'], [412, 176, 28, 'at'], [412, 276, 28, 'mail']]);
    browser(cards[2], 26, 26, 0.24, false);
    const d3 = nodes(cards[2], [309, 112], [[412, 52, 22, 'chat'], [412, 122, 22, 'at'], [412, 192, 22, 'mail']]);
    const panel = box(cards[2], 26, 216, 283, 110, { border: '2px solid var(--g3)', borderRadius: 'var(--r)', background: 'var(--g1)' });
    const bars = [36, 58, 46, 70, 52, 80, 64].map((h, j) => box(panel, 20 + j * 35, 92 - h, 20, h, { background: 'var(--g4)', borderRadius: 'var(--r-bar)' }));
    gsap.set(bars, { scaleY: 0.25, transformOrigin: '50% 100%' });

    // nomes dos planos
    const nameY = CARD.y + CARD.border + 466;
    const names = tx.planos.map((nm, i) => {
      const o = { x: co(i)[0] + 26, y: nameY, size: 64, weight: 700, ls: -0.01, origin: co(i) };
      return i === 0 ? text(cards[0], nm, o) : masked(cards[i], nm, o);
    });

    // entradas: o 1º cartão nasce em volta do site; os outros giram em 3D
    gsap.set(cards[0], { autoAlpha: 0, scale: 0.96 });
    tl.to(cards[0], { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' }, T4 - 0.6); // termina antes da troca
    [1, 2].forEach((i, j) => {
      gsap.set(cards[i], { autoAlpha: 0, rotationY: -75, x: 200 });
      tl.to(cards[i], { autoAlpha: 1, rotationY: 0, x: 0, duration: 0.9, ease: 'back.out(1.25)' }, T4 - 0.25 + j * 0.12);
      k.cue(T4 - 0.25 + j * 0.12, 'flip', { pan: j ? 0.65 : 0.25 });
    });

    // o cursor sai do botão e digita "Vitrine"
    const n0 = names[0];
    gsap.set(n0.chars, { autoAlpha: 0 });
    C.hop(s3.detach + 0.06, n0.startX(0), nameY + 3, { w: 34, h: 7, dur: 0.46, lift: 170 });
    let t = T4 + 0.15;
    n0.chars.forEach((c, i) => {
      tl.set(c, { autoAlpha: 1 }, t);
      C.set(t, { x: n0.endX(i) + 9 });
      k.cue(t, 'key', { i: 70 + i });
      t += 0.065;
    });
    names.slice(1).forEach((T, j) => {
      gsap.set(T.chars, { y: T.drop });
      tl.to(T.chars, { y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.02 }, T4 + 0.35 + j * 0.1);
    });

    // hover: o cartão sobe; o cursor acompanha o nome
    const LIFT = { y: -20, s: 1.04 };
    const lifted = (i, x, y) => {
      const cx = cardX(i) + CARD.w / 2, cy = CARD.y + CARD.h / 2;
      return [cx + (x - cx) * LIFT.s, cy + (y - cy) * LIFT.s + LIFT.y];
    };
    const hover = (i, t0, on) => tl.to(cards[i], {
      y: on ? LIFT.y : 0, scale: on ? LIFT.s : 1, borderColor: on ? P.g5 : P.g3, duration: 0.45, ease: 'power3.out',
    }, t0);
    const aim = (i) => [cardX(i) + CARD.w * 0.64, CARD.y + CARD.h * 0.4];

    Pt.move(T4 + 0.6, aim(0)[0], aim(0)[1], 0.6, 'power3.out');
    hover(0, T4 + 0.9, true);
    k.cue(T4 + 0.9, 'lift', {});
    const l0 = lifted(0, C.x, C.y);
    C.to(T4 + 0.9, { x: l0[0], y: l0[1] }, 0.45, 'power3.out');
    tl.to(b1.pc, { y: -150, duration: 0.75, ease: 'power2.inOut' }, T4 + 1.35);
    tl.to(b1.pc, { y: 0, duration: 0.75, ease: 'power2.inOut' }, T4 + 2.15);

    const sw = (a, b, t0, note) => {
      hover(a, t0, false);
      Pt.move(t0, aim(b)[0], aim(b)[1], 0.55, 'power3.inOut');
      hover(b, t0 + 0.15, true);
      k.cue(t0 + 0.15, 'lift', {});
      const p = lifted(b, names[b].right + 9, nameY + 3);
      C.hop(t0 + 0.04, p[0], p[1], { dur: 0.48, lift: 140, note });
    };
    sw(0, 1, T4 + 2.4, 'A5');
    const ta2 = T4 + 2.95;
    d2.lines.forEach((l, j) => {
      tl.to(l, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, ta2 + j * 0.08);
      k.cue(ta2 + j * 0.08, 'line', {});
    });
    d2.nodes.forEach((g, j) => {
      tl.to(g, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, ta2 + 0.3 + j * 0.08);
      k.cue(ta2 + 0.3 + j * 0.08, 'node', { note: ['F5', 'A5', 'C6'][j] });
    });
    sw(1, 2, T4 + 4.1, 'C6');
    const ta3 = T4 + 4.65;
    d3.lines.forEach((l, j) => {
      tl.to(l, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, ta3 + j * 0.08);
      k.cue(ta3 + j * 0.08, 'line', {});
    });
    d3.nodes.forEach((g, j) => {
      tl.to(g, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, ta3 + 0.3 + j * 0.08);
      k.cue(ta3 + 0.3 + j * 0.08, 'node', { note: ['G5', 'C6', 'E6'][j] });
    });
    bars.forEach((b, j) => {
      tl.to(b, { scaleY: 1, backgroundColor: j === 5 ? P.paper : P.g5, duration: 0.6, ease: 'back.out(1.6)' }, ta3 + 0.1 + j * 0.05);
      k.cue(ta3 + 0.1 + j * 0.05, 'bar', { note: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'][j] }); // barras sobem em escala
    });

    // saída: o cursor salta para a próxima frase e os cartões despencam
    const tx0 = T4 + 5.8;
    hover(2, tx0, false);
    Pt.move(tx0 - 0.1, 1560, 1240, 0.5, 'power3.in');
    C.hop(tx0, g5.endOf(0), g5.cy, { w: g5.cw, h: g5.ch, dur: 0.5, lift: 230 });
    cards.forEach((c, i) => tl.to(c, { y: 1150, rotation: [-9, 4, 12][i], duration: 0.75, ease: 'power3.in' }, tx0 + 0.1 + i * 0.08));
    k.cue(tx0 + 0.1, 'whoosh', { len: 0.9, dir: 'down', size: 0.85 });
    tl.to(eb.chars, { y: -eb.drop, duration: 0.4, ease: 'power3.in', stagger: 0.012 }, tx0);
    return T4 + 6.5;
  }

  /* ======================================================================
   * CENA 5 · No ar (0:23,5–0:27,5) — frase com palavra que gira
   * ==================================================================== */
  function geomS5() {
    const size = 210, b1 = 470, b2 = 690;
    const s = spec('display', size, 800, -0.025);
    const ms = CONFIG.textos.fraseVariavel.map((w) => measure(w, s));
    const gap = Math.round(size * 0.075);
    return {
      size, b1, b2, gap,
      cw: Math.round(size * 0.46), ch: Math.round(size * 0.085), cy: b2 + Math.round(size * 0.035),
      endOf: (j) => M - ms[j].inkL + ms[j].width + gap,
    };
  }
  function cena5(k, T5, g) {
    const { tl, C } = k;
    const tx = CONFIG.textos;
    const L = k.layer(5, T5 - 1.0, T5 + 4.4);
    const G = div(L, 'kv-layer');
    gsap.set(G, { transformOrigin: `${M}px ${g.b2}px` });
    const o = { x: M, size: g.size, weight: 800, ls: -0.025, maskW: W };
    const l1 = masked(G, tx.fraseFixa, Object.assign({ y: g.b1 }, o));
    const m2top = g.b1 + 16; // a fresta da linha 2 começa abaixo da linha 1
    const first = masked(G, tx.fraseVariavel[0], Object.assign({ y: g.b2, maskY: m2top, maskH: g.b2 + g.size * 0.42 - m2top }, o));
    const words = [first].concat(tx.fraseVariavel.slice(1).map((w) =>
      text(first.mask, w, Object.assign({ y: g.b2, origin: first.maskOrigin }, o))));
    const drop = first.drop;
    gsap.set(l1.chars, { y: drop });
    words.forEach((w) => gsap.set(w.chars, { y: drop, scaleY: 1.3 }));
    tl.to(l1.chars, { y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.035 }, T5);
    k.cue(T5, 'whoosh', { len: 0.6, dir: 'up', size: 0.35 });
    tl.to(words[0].chars, { y: 0, scaleY: 1, duration: 0.8, ease: 'expo.out', stagger: 0.03 }, T5 + 0.22);

    const swap = (a, b, t0) => {
      k.cue(t0, 'swipe', {});
      tl.to(words[a].chars, { y: -drop, scaleY: 1.3, duration: 0.4, ease: 'power3.in', stagger: 0.016 }, t0);
      tl.set(words[a].chars, { autoAlpha: 0 }, t0 + 0.42 + words[a].chars.length * 0.016);
      tl.to(words[b].chars, { y: 0, scaleY: 1, duration: 0.7, ease: 'back.out(1.4)', stagger: 0.024 }, t0 + 0.24);
      C.slide(t0 + 0.3, g.endOf(b), 0.55);
    };
    swap(0, 1, T5 + 1.3);
    swap(1, 2, T5 + 2.3);
    // "no ar." pousa com peso: a frase inteira amassa
    const tp = T5 + 2.9;
    k.cue(tp, 'punch', {});
    tl.to(G, { scaleY: 0.93, duration: 0.07, ease: 'power2.out' }, tp);
    tl.to(G, { scaleY: 1, duration: 0.65, ease: 'elastic.out(1, 0.35)' }, tp + 0.07);
    tl.to(C.n, { scaleX: 1.3, scaleY: 0.6, duration: 0.07, ease: 'power2.out' }, tp);
    tl.to(C.n, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)' }, tp + 0.07);

    // as letras são sugadas pelo cursor
    const items = [];
    l1.chars.forEach((c, i) => { if (l1.str[i] !== ' ') items.push([c, l1.midX(i)]); });
    words[2].chars.forEach((c, i) => { if (words[2].str[i] !== ' ') items.push([c, words[2].midX(i)]); });
    const target = g.endOf(2) + g.cw * 0.25;
    items.sort((a, b) => b[1] - a[1]);
    k.cue(T5 + 3.45, 'suck', { len: 1.03 }); // cresce até o pouso da cena 6 (T6 + 0,48)
    items.forEach(([c, mx], j) => {
      tl.to(c, { x: target - mx, scale: 0.05, autoAlpha: 0, duration: 0.45, ease: 'power3.in' }, T5 + 3.45 + j * 0.022);
    });
    return T5 + 4.0;
  }

  /* ======================================================================
   * CENA 6 · Assinatura (0:27,5–0:34) — o logo gigante e a chamada
   * ==================================================================== */
  function geomS6() {
    const size = 720, base = 868;
    const m = measure('K', spec('display', size, 800));
    const left = M - m.inkL, kEnd = left + m.width;
    const cw = Math.round(size * 0.46), ch = Math.round(size * 0.085), gap = Math.round(size * 0.07);
    return {
      size, base, cw, ch, cy: base + Math.round(size * 0.035),
      landX: Math.round((left + kEnd) / 2 - cw / 2), logoX: kEnd + gap,
    };
  }
  function cena6(k, T6, g) {
    const { tl, C, cam } = k;
    const tx = CONFIG.textos;
    const L = k.layer(6, T6 - 0.1, null);
    const K = text(L, 'K', { x: M, y: g.base, size: g.size, weight: 800 });
    const kc = K.chars[0];
    gsap.set(kc, { autoAlpha: 0, scaleY: 0, scaleX: 1.25 });
    C.hop(T6 - 0.12, g.landX, g.cy, { w: g.cw, h: g.ch, dur: 0.52, lift: 260, squash: 1.1, final: true });
    const tk = T6 + 0.62;
    k.cue(tk, 'spring', { note: 'C3' });
    tl.set(kc, { autoAlpha: 1 }, tk);
    tl.to(kc, { scaleY: 1.1, scaleX: 0.94, duration: 0.2, ease: 'power3.out' }, tk);
    tl.to(kc, { scaleY: 1, scaleX: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' }, tk + 0.2);
    C.slide(tk, g.logoX, 0.45);

    // coluna de informações: alinhada ao topo e à base do K
    const RX = 1110, RW = W - M - RX;
    const capTop = g.base - K.cap;
    const labM = measure(tx.assinatura, spec('text', 30, 600, 0.02));
    const lab = masked(L, tx.assinatura, { x: RX, y: Math.round(capTop + labM.cap), size: 30, fam: 'text', weight: 600, ls: 0.02, color: 'var(--g6)' });
    const rows = [g.base - 198, g.base - 124, g.base - 50];
    const cta = masked(L, tx.cta, { x: RX, y: rows[0] - 46, size: 64, weight: 700, ls: -0.01 });
    const lines = rows.map((y) => box(L, RX, y, RW, 2, { background: 'var(--g3)' }));
    const plans = tx.planos.map((p, i) => masked(L, p, { x: RX, y: rows[i] + 50, size: 36, fam: 'text', weight: 500 }));
    const arrows = rows.map((y) => {
      const s = svg(L, 'svg', { class: 'kv-svg', width: 26, height: 18, viewBox: '0 0 26 18' });
      s.style.left = RX + RW - 26 + 'px';
      s.style.top = y + 28 + 'px';
      svg(s, 'path', { d: 'M1 9h22M16 2l7 7-7 7' }, { fill: 'none', stroke: 'var(--g5)', strokeWidth: '2px', strokeLinecap: 'round', strokeLinejoin: 'round' });
      return s;
    });
    const contact = tx.contato ? masked(L, tx.contato, { x: RX, y: H - 108, size: 30, fam: 'text', weight: 500, color: 'var(--g6)' }) : null;

    const risers = [lab, cta].concat(plans, contact ? [contact] : []);
    risers.forEach((T) => gsap.set(T.chars, { y: T.drop }));
    gsap.set(lines, { scaleX: 0, transformOrigin: '0 50%' });
    gsap.set(arrows, { autoAlpha: 0, x: -14 });
    tl.to(lab.chars, { y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.008 }, T6 + 1.0);
    k.cue(T6 + 1.0, 'reveal', { note: 'E5' });
    tl.to(cta.chars, { y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.014 }, T6 + 1.12);
    k.cue(T6 + 1.12, 'reveal', { note: 'G5' });
    lines.forEach((l, i) => tl.to(l, { scaleX: 1, duration: 0.8, ease: 'expo.out' }, T6 + 1.3 + i * 0.08));
    plans.forEach((T, i) => {
      tl.to(T.chars, { y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.01 }, T6 + 1.4 + i * 0.08);
      k.cue(T6 + 1.4 + i * 0.08, 'reveal', { note: ['A5', 'C6', 'D6'][i] });
    });
    arrows.forEach((a, i) => tl.to(a, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out' }, T6 + 1.6 + i * 0.08));
    if (contact) tl.to(contact.chars, { y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.01 }, T6 + 1.9);

    const END = T6 + 6.3;
    k.cue(END, 'end', {});
    tl.to(cam, { scale: 1.02, duration: END - (T6 + 1.2), ease: 'sine.inOut' }, T6 + 1.2);
    C.blink(T6 + 2.6, 3, 1.0);
    return END;
  }

  /* ======================================================================
   * Montagem
   * ==================================================================== */
  function build(root, opts) {
    gsap.config({ force3D: false }); // mantém o texto nítido em qualquer escala
    const P = palette();
    cache.clear();
    root.innerHTML = '';
    root.classList.add('kv');
    root.classList.toggle('is-render', !!opts.render);
    for (const key in P) root.style.setProperty('--' + key, P[key]);
    if (!measureRoot || !measureRoot.isConnected) measureRoot = div(document.body, 'kv-measure');
    ctx2d = ctx2d || document.createElement('canvas').getContext('2d');

    const player = div(root, 'kv-player');
    const frame = div(player, 'kv-frame');
    const stage = div(frame, 'kv-stage');
    const cam = div(stage, 'kv-cam');
    const tl = gsap.timeline({ paused: true });
    const C = new Cursor(tl, div(cam, 'kv-cursor'));
    const Pt = new Pointer(tl, makePointer(cam));
    Pt.init(1720, 1220);
    const grain = makeGrain(stage, opts.grain !== false && CONFIG.grao !== false);
    const cues = [];
    const cue = (t, type, data) => { cues.push(Object.assign({ t: Math.round(t * 10000) / 10000, type }, data || {})); };
    C.cue = cue;
    Pt.cue = cue;

    const k = {
      tl, C, Pt, cam, P, cue,
      layer(id, from, to, z) {
        const L = div(cam, 'kv-layer', { zIndex: z == null ? id : z });
        L.dataset.cena = id;
        gsap.set(L, { autoAlpha: from <= 0 ? 1 : 0 });
        if (from > 0) tl.set(L, { autoAlpha: 1 }, from);
        if (to != null) tl.set(L, { autoAlpha: 0 }, to);
        return L;
      },
    };

    cena1(k);
    cena2(k);
    const s3 = cena3(k);
    const g5 = geomS5();
    const T5 = cena4(k, s3, g5);
    const T6 = cena5(k, T5, g5);
    const END = cena6(k, T6, geomS6());
    tl.to({}, { duration: 0.001 }, END - 0.001);

    const scenes = [
      { id: 'abertura', nome: 'Abertura', inicio: 0, fim: 4.0 },
      { id: 'gancho', nome: 'Gancho', inicio: 4.0, fim: 9.5 },
      { id: 'construcao', nome: 'Construção', inicio: 9.5, fim: s3.T4 },
      { id: 'planos', nome: 'Planos', inicio: s3.T4, fim: T5 },
      { id: 'no-ar', nome: 'No ar', inicio: T5, fim: T6 },
      { id: 'assinatura', nome: 'Assinatura', inicio: T6, fim: END },
    ];
    scenes.forEach((sc) => cue(sc.inicio, 'scene', { id: sc.id }));
    cues.sort((a, b) => a.t - b.t);

    const listeners = new Set();
    const emit = () => {
      const t = tl.time();
      grain(t);
      listeners.forEach((f) => f(t));
    };
    let sound = null;
    gsap.ticker.add(() => {
      if (tl.paused()) return;
      // com o som tocando, o relógio do áudio conduz e a imagem acompanha
      const c = sound && sound.clock();
      if (c != null && Math.abs(c - tl.time()) > 0.05) tl.time(Math.max(0, Math.min(END, c)));
      emit();
    });
    tl.eventCallback('onComplete', () => { tl.pause(); if (sound) sound.stop(); emit(); });

    const v = {
      tl, duration: END, scenes, cues, config: CONFIG, sound: null,
      dom: { root, player, frame, stage },
      time: () => tl.time(),
      playing: () => !tl.paused() && tl.progress() < 1,
      seek(t) { tl.seek(Math.max(0, Math.min(END, t)), false); if (sound) sound.sync(); emit(); },
      play() {
        if (sound && sound.on && !sound.ready) { sound.unlock(); sound.pending = true; emit(); return; }
        if (tl.progress() >= 1) tl.seek(0, false);
        if (sound) sound.unlock(); // precisa acontecer dentro do clique
        tl.play();
        if (sound) sound.sync();
        emit();
      },
      pause() { tl.pause(); if (sound) { sound.pending = false; sound.stop(); } emit(); },
      toggle() { if (v.playing() || (sound && sound.pending)) v.pause(); else v.play(); },
      speed(x) { tl.timeScale(x); if (sound) sound.sync(); },
      onTime(f) { listeners.add(f); f(tl.time()); return () => listeners.delete(f); },
      // para a renderização quadro a quadro
      frame(t) { v.seek(t); return new Promise((r) => requestAnimationFrame(() => r())); },
    };

    if (!opts.render) {
      const fit = () => { stage.style.transform = `scale(${frame.clientWidth / W})`; };
      new ResizeObserver(fit).observe(frame);
      fit();
      frame.addEventListener('click', () => v.toggle());
    }
    if (!opts.render && opts.sound !== false) {
      sound = makeSound(v);
      if (sound) {
        v.sound = {
          get on() { return sound.on; },
          get ready() { return sound.ready; },
          get pending() { return sound.pending; },
          toggle() { sound.on = !sound.on; if (!sound.on && sound.pending) { sound.pending = false; v.play(); } sound.sync(); return sound.on; },
        };
      }
    }
    v.seek(opts.poster == null ? (opts.render ? 0 : END) : opts.poster);
    return v;
  }

  /* ======================================================================
   * Som no navegador: audio.js gera a trilha a partir das pistas (num Web
   * Worker, sem travar a página) e o player toca em sincronia
   * ==================================================================== */
  function makeSound(v) {
    const A = window.KairosAudio, AC = window.AudioContext || window.webkitAudioContext;
    if (!A || !AC) return null;
    const s = { on: true, ready: false, pending: false, data: null };
    let ctx = null, out = null, src = null, buffer = null, t0 = 0, off = 0;
    const opts = { duration: v.duration, sampleRate: 48000 };
    const done = (d) => {
      s.data = d;
      s.ready = true;
      if (s.pending) { s.pending = false; v.play(); } // o clique em tocar esperou o som ficar pronto
      else if (v.playing()) s.sync();
    };
    const local = () => setTimeout(() => done(A.render(v.cues, opts)), 60);
    try {
      if (window.Worker && A.scriptURL) {
        const w = new Worker(A.scriptURL);
        w.onmessage = (e) => { w.terminate(); done(e.data); };
        w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); w.terminate(); local(); };
        w.postMessage({ cues: v.cues, opts });
      } else local();
    } catch (err) {
      local();
    }
    s.unlock = () => {
      if (!ctx) { ctx = new AC(); out = ctx.createGain(); out.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
    };
    s.stop = () => {
      if (!src) return;
      try { src.stop(); } catch (e) { /* já parado */ }
      src.disconnect();
      src = null;
    };
    // (re)começa o som no ponto atual da animação; mudo fora da velocidade normal
    s.sync = () => {
      s.stop();
      if (!s.on || !s.ready || !ctx || !v.playing() || v.tl.timeScale() !== 1) return;
      if (!buffer) {
        buffer = ctx.createBuffer(2, s.data.L.length, s.data.sampleRate);
        buffer.copyToChannel(s.data.L, 0);
        buffer.copyToChannel(s.data.R, 1);
      }
      off = v.tl.time();
      if (off >= buffer.duration - 0.02) return;
      src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(out);
      t0 = ctx.currentTime;
      src.start(t0, off);
    };
    s.clock = () => (src && ctx && ctx.state === 'running' ? off + (ctx.currentTime - t0) - (ctx.outputLatency || 0) : null);
    return s;
  }

  /* ======================================================================
   * Controles do player
   * ==================================================================== */
  const ICON = {
    play: '<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><path d="M2 1.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><path d="M2 1h3.5v14H2zM8.5 1H12v14H8.5z" fill="currentColor"/></svg>',
    soundOn: '<svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 5.5h3.5L9 1.5v13l-4.5-4H1z" fill="currentColor"/><path d="M12.5 5a4.2 4.2 0 0 1 0 6M15 2.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    soundOff: '<svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true"><path d="M1 5.5h3.5L9 1.5v13l-4.5-4H1z" fill="currentColor"/><path d="M12.5 5.5l5 5M17.5 5.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const fmt = (t) => {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  };
  function button(parent, cls, html, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = html;
    if (label) b.setAttribute('aria-label', label);
    parent.appendChild(b);
    return b;
  }
  function controls(v) {
    const { player } = v.dom;
    player.tabIndex = 0;
    player.setAttribute('aria-label', 'Vídeo Káiros em Movimento');
    const ui = div(player, 'kv-ui');
    const track = div(ui, 'kv-track');
    track.tabIndex = 0;
    track.setAttribute('role', 'slider');
    track.setAttribute('aria-label', 'Linha do tempo');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', v.duration.toFixed(1));
    div(track, 'kv-rail');
    const fill = div(track, 'kv-fill');
    v.scenes.slice(1).forEach((s) => div(track, 'kv-cut', { left: (s.inicio / v.duration) * 100 + '%' }));
    const head = div(track, 'kv-head');
    const chips = div(ui, 'kv-chips');
    const chipEls = v.scenes.map((s) => {
      const b = button(chips, 'kv-chip', s.nome);
      b.style.flexGrow = String(s.fim - s.inicio);
      b.addEventListener('click', () => { v.seek(s.inicio + 0.001); v.play(); });
      return b;
    });
    const row = div(ui, 'kv-row');
    const play = button(row, 'kv-btn kv-play', ICON.play, 'Reproduzir');
    const time = div(row, 'kv-time');
    div(row, 'kv-spacer');
    const hint = div(row, 'kv-hint');
    const HINT = 'Espaço: tocar/pausar · ← → quadro a quadro';
    hint.textContent = HINT;
    const speeds = [1, 0.5, 0.25];
    let si = 0;
    const speed = button(row, 'kv-btn', '1×', 'Velocidade de reprodução');
    speed.addEventListener('click', () => {
      si = (si + 1) % speeds.length;
      v.speed(speeds[si]);
      speed.textContent = String(speeds[si]).replace('.', ',') + '×';
    });
    if (v.sound) {
      const snd = button(row, 'kv-btn kv-snd', ICON.soundOn, 'Desligar o som');
      snd.addEventListener('click', () => {
        const on = v.sound.toggle();
        snd.innerHTML = on ? ICON.soundOn : ICON.soundOff;
        snd.setAttribute('aria-label', on ? 'Desligar o som' : 'Ligar o som');
      });
    }
    play.addEventListener('click', () => v.toggle());

    let drag = false, resume = false;
    const tAt = (e) => {
      const r = track.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * v.duration;
    };
    track.addEventListener('pointerdown', (e) => {
      drag = true;
      resume = v.playing();
      v.pause();
      track.setPointerCapture(e.pointerId);
      v.seek(tAt(e));
    });
    track.addEventListener('pointermove', (e) => { if (drag) v.seek(tAt(e)); });
    const end = () => { if (drag) { drag = false; if (resume) v.play(); } };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    player.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      const step = e.shiftKey ? 1 : 1 / 60;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); v.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); v.pause(); v.seek(v.time() + step); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); v.pause(); v.seek(v.time() - step); }
      else if (e.key === 'Home') { e.preventDefault(); v.seek(0); }
      else if (e.key === 'End') { e.preventDefault(); v.seek(v.duration); }
    });

    let wasPlaying = null;
    v.onTime((t) => {
      const p = (t / v.duration) * 100;
      fill.style.width = p + '%';
      head.style.left = p + '%';
      track.setAttribute('aria-valuenow', t.toFixed(1));
      time.innerHTML = `<b>${fmt(t)}</b> / ${fmt(v.duration)}`;
      chipEls.forEach((b, i) => {
        const s = v.scenes[i];
        b.classList.toggle('is-on', t >= s.inicio && (t < s.fim || (i === v.scenes.length - 1 && t >= s.fim)));
      });
      const wait = !!(v.sound && v.sound.pending);
      hint.textContent = wait ? 'Preparando o som…' : HINT;
      hint.classList.toggle('is-wait', wait);
      const pl = v.playing();
      if (pl !== wasPlaying) {
        wasPlaying = pl;
        play.innerHTML = pl ? ICON.pause : ICON.play;
        play.setAttribute('aria-label', pl ? 'Pausar' : 'Reproduzir');
      }
    });
  }

  /* ======================================================================
   * API pública
   * ==================================================================== */
  function fontsReady() {
    const sample = 'Káiros çãéõ?·@';
    return Promise.all([
      document.fonts.load(`800 100px 'League Spartan'`, sample),
      document.fonts.load(`700 100px 'League Spartan'`, sample),
      document.fonts.load(`500 100px 'Instrument Sans'`, sample),
      document.fonts.load(`600 100px 'Instrument Sans'`, sample),
    ]).catch(() => null).then(() => document.fonts.ready);
  }

  window.KairosVideo = {
    CONFIG,
    create(root, opts) {
      opts = Object.assign({ controls: true, render: false }, opts || {});
      return fontsReady().then(() => {
        const v = build(root, opts);
        if (opts.controls) controls(v);
        return v;
      });
    },
  };
})();
