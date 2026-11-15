/*!
 * Káiros em Movimento — trilha original e efeitos sonoros, sintetizados em código
 *
 * O mesmo arquivo roda em três lugares:
 *   - no navegador, onde o player toca o som em sincronia com a animação;
 *   - num Web Worker, para gerar o som sem travar a página;
 *   - no Node, onde render.js grava out/trilha.wav e mistura no MP4.
 *
 * Entrada: as "pistas" (cues) que cada cena de video.js registra — quique, tecla,
 * clique, salto, troca de palavra… Saída: áudio estéreo. Mudou um tempo na
 * animação, o som acompanha. Tudo é determinístico (sem aleatoriedade solta).
 *
 * Arranjo (120 BPM, compasso de 2 s, Lá menor → Dó maior no final):
 *   abertura ....... pad em Lá menor, impactos nos quiques, digitação que vira escala
 *   gancho ......... bumbo em meio-tempo, chimbal, palmas; rufo e corte seco no "apagar"
 *   construção ..... groove completo no tempo forte seguinte: Am7 · Fmaj7 · Cadd9 · G6
 *   planos ......... entra um arpejo em semicolcheias
 *   no ar .......... subida em Sol com rufo e riser; "no ar." resolve em Dó
 *   assinatura ..... impacto e acorde de Dó com nona, cauda até o fim
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KairosAudio = api;
  if (typeof document !== 'undefined' && document.currentScript) api.scriptURL = document.currentScript.src;
  // dentro de um Web Worker: gera o som quando a página pedir
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    root.onmessage = function (e) {
      const out = api.render(e.data.cues, e.data.opts);
      root.postMessage({ L: out.L, R: out.R, sampleRate: out.sampleRate }, [out.L.buffer, out.R.buffer]);
    };
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---------- notas e utilidades ---------- */
  const SEMI = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function hz(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G]#?)(-?\d)$/.exec(n);
    if (!m) return 440;
    return 440 * Math.pow(2, (SEMI[m[1]] + (parseInt(m[2], 10) - 4) * 12) / 12);
  }
  function rand(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function buf(sr, dur) { return new Float32Array(Math.max(1, Math.ceil(dur * sr))); }
  const seedOf = (t, base) => base + Math.round(t * 1000);

  // Filtro biquad (receitas de R. Bristow-Johnson): passa-baixa, passa-alta e passa-banda
  class Biquad {
    constructor(type, sr) {
      this.type = type; this.sr = sr;
      this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
      this.left = 0;
    }
    set(f, q) {
      const w = (TAU * Math.min(Math.max(f, 10), this.sr * 0.45)) / this.sr;
      const c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al;
      let b0, b1, b2;
      if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
      else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
      else { b0 = al; b1 = 0; b2 = -al; }
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
      this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
      return this;
    }
    // muda a frequência aos poucos, amostra a amostra: trocar os coeficientes em degraus
    // (a cada 16 ou 32 amostras) cria um zumbido em 48000/16 ou 48000/32 Hz
    glide(f, q, steps) {
      if (this.b0 === undefined) return this.set(f, q);
      const p0 = this.b0, p1 = this.b1, p2 = this.b2, p3 = this.a1, p4 = this.a2;
      this.set(f, q);
      this.d0 = (this.b0 - p0) / steps; this.d1 = (this.b1 - p1) / steps; this.d2 = (this.b2 - p2) / steps;
      this.d3 = (this.a1 - p3) / steps; this.d4 = (this.a2 - p4) / steps;
      this.b0 = p0; this.b1 = p1; this.b2 = p2; this.a1 = p3; this.a2 = p4;
      this.left = steps;
      return this;
    }
    run(x) {
      if (this.left > 0) {
        this.b0 += this.d0; this.b1 += this.d1; this.b2 += this.d2; this.a1 += this.d3; this.a2 += this.d4;
        this.left--;
      }
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
      return y;
    }
  }

  /* ---------- mesa de som ----------
   * Dois grupos com envios próprios: "musica" (bateria + instrumentos) e "efeitos".
   * Assim dá para exportar as duas partes separadas (stems). */
  class Mix {
    constructor(sr, dur) {
      this.sr = sr;
      this.n = Math.ceil(dur * sr);
      const two = () => [new Float32Array(this.n), new Float32Array(this.n)];
      this.bus = {
        drums: two(), music: two(), sfx: two(),
        revM: two(), dlyM: two(), revS: two(),
      };
    }
    add(bus, t, sig, o) { this.put(bus, t, sig, sig, o, true); }
    add2(bus, t, L, R, o) { this.put(bus, t, L, R, o, false); }
    put(bus, t, SL, SR, o, mono) {
      o = o || {};
      const g = o.gain == null ? 1 : o.gain;
      const p = ((Math.max(-1, Math.min(1, o.pan || 0)) + 1) * Math.PI) / 4;
      const gl = mono ? Math.cos(p) * Math.SQRT2 * g : g;
      const gr = mono ? Math.sin(p) * Math.SQRT2 * g : g;
      const B = this.bus[bus];
      const isSfx = bus === 'sfx';
      const RV = isSfx ? this.bus.revS : this.bus.revM;
      const DL = this.bus.dlyM;
      const rv = o.rev || 0, dl = isSfx ? 0 : o.dly || 0;
      const s0 = Math.round(t * this.sr);
      const len = Math.min(SL.length, this.n - s0);
      for (let k = Math.max(0, -s0); k < len; k++) {
        const i = s0 + k, l = SL[k] * gl, r = SR[k] * gr;
        B[0][i] += l; B[1][i] += r;
        if (rv) { RV[0][i] += l * rv; RV[1][i] += r * rv; }
        if (dl) { DL[0][i] += l * dl; DL[1][i] += r * dl; }
      }
    }
  }

  /* ======================================================================
   * Instrumentos
   * ==================================================================== */
  function kick(sr) {
    const out = buf(sr, 0.5), rnd = rand(7);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * (47 + 108 * Math.exp(-t / 0.032))) / sr;
      let v = Math.sin(ph) * Math.exp(-t / 0.17) * Math.min(1, t / 0.0015);
      if (t < 0.005) v += (rnd() * 2 - 1) * 0.35 * (1 - t / 0.005);
      out[i] = Math.tanh(v * 1.8) * 0.85;
    }
    return out;
  }
  function clap(sr) {
    const out = buf(sr, 0.4), rnd = rand(11);
    const bp = new Biquad('bp', sr).set(1250, 1.1), hp = new Biquad('hp', sr).set(500, 0.7);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let e = 0;
      for (let k = 0; k < 3; k++) { const d = k * 0.0105; if (t >= d) e = Math.max(e, Math.exp(-(t - d) / 0.005)); }
      if (t >= 0.031) e = Math.max(e, 0.75 * Math.exp(-(t - 0.031) / 0.085));
      out[i] = hp.run(bp.run(rnd() * 2 - 1)) * e * 2.2;
    }
    return out;
  }
  function snare(sr) {
    const out = buf(sr, 0.25), rnd = rand(13), hp = new Biquad('hp', sr).set(900, 0.7);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * 190) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.035) * 0.6 + hp.run(rnd() * 2 - 1) * Math.exp(-t / 0.06) * 0.7;
    }
    return out;
  }
  // chimbal metálico (seis ondas quadradas desafinadas, como numa bateria eletrônica clássica)
  const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
  function hat(sr, o) {
    const open = !!o.open, out = buf(sr, open ? 0.4 : 0.09), rnd = rand(o.seed || 17);
    const bp = new Biquad('bp', sr).set(10000, 0.9), hp = new Biquad('hp', sr).set(7200, 0.7);
    const ph = new Float64Array(6), dec = open ? 0.11 : 0.022;
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (let k = 0; k < 6; k++) { ph[k] += METAL[k] / sr; s += ph[k] % 1 < 0.5 ? 1 : -1; }
      s = (s / 6) * 0.7 + (rnd() * 2 - 1) * 0.5;
      out[i] = hp.run(bp.run(s)) * Math.exp(-(i / sr) / dec) * 1.8;
    }
    return out;
  }
  function crash(sr) {
    const out = buf(sr, 1.8), rnd = rand(5);
    const hp = new Biquad('hp', sr).set(4500, 0.7), bp = new Biquad('bp', sr).set(8000, 0.6);
    const ph = new Float64Array(6);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let m = 0;
      for (let k = 0; k < 6; k++) { ph[k] += (METAL[k] * 1.47) / sr; m += ph[k] % 1 < 0.5 ? 1 : -1; }
      const x = (rnd() * 2 - 1) * 0.8 + (m / 6) * 0.35;
      out[i] = hp.run(bp.run(x) * 0.6 + x * 0.4) * Math.exp(-t / 0.5) * Math.min(1, t / 0.002) * 0.9;
    }
    return out;
  }
  // baixo: dente de serra filtrado + subgrave uma oitava abaixo
  function bass(sr, f, len, bright) {
    const out = buf(sr, len + 0.08), lp = new Biquad('lp', sr);
    let p1 = 0, p2 = 0, p3 = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      if ((i & 15) === 0) lp.glide(180 + (bright || 1100) * Math.exp(-t / 0.07), 1.1, 16);
      p1 += f / sr; p2 += (f * 1.007) / sr; p3 += (f * 0.5) / sr;
      const saw = ((p1 % 1) * 2 - 1) * 0.5 + ((p2 % 1) * 2 - 1) * 0.5;
      const gate = t < len ? 1 : Math.exp(-(t - len) / 0.02);
      const env = Math.min(1, t / 0.004) * (0.55 + 0.45 * Math.exp(-t / 0.09)) * gate;
      out[i] = Math.tanh((lp.run(saw) * 0.7 + Math.sin(TAU * p3) * 0.75) * env * 1.4) * 0.8;
    }
    return out;
  }
  // pad: quatro dentes de serra levemente desafinados por nota, filtro que respira
  function pad(sr, notes, len, o) {
    const att = o.att || 0.3, rel = o.rel == null ? 0.6 : o.rel;
    const cut = o.cut || 1500, cut2 = o.cut2 == null ? cut : o.cut2, decay = o.decay || 0;
    const n = Math.ceil((len + rel * 1.2 + 0.02) * sr);
    const L = new Float32Array(n), R = new Float32Array(n);
    const DET = [-0.0058, -0.0019, 0.0021, 0.0061];
    const nv = notes.length * DET.length;
    const fr = new Float64Array(nv), ph = new Float64Array(nv), side = new Int8Array(nv);
    let v = 0;
    notes.forEach((nt, j) => DET.forEach((d, k) => {
      fr[v] = hz(nt) * (1 + d);
      ph[v] = (j * 0.37 + k * 0.23) % 1;
      side[v] = (k + j) % 2;
      v++;
    }));
    const lpL = new Biquad('lp', sr), lpR = new Biquad('lp', sr);
    const g = ((o.gain == null ? 1 : o.gain) * 0.32) / Math.sqrt(nv);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if ((i & 31) === 0) {
        const u = Math.min(1, t / Math.max(0.001, len));
        const fc = cut * Math.pow(cut2 / cut, u) * (1 + 0.08 * Math.sin(TAU * 0.25 * t));
        lpL.glide(fc, 0.75, 32); lpR.glide(fc * 1.03, 0.75, 32);
      }
      let l = 0, r = 0;
      for (let k = 0; k < nv; k++) {
        let p = ph[k] + fr[k] / sr;
        if (p >= 1) p -= 1;
        ph[k] = p;
        if (side[k]) r += 2 * p - 1; else l += 2 * p - 1;
      }
      let env = t < att ? t / att : 1;
      if (decay) env *= Math.exp(-t / decay);
      if (t > len) env *= Math.exp(-(t - len) / Math.max(0.005, rel / 4));
      L[i] = lpL.run(l + r * 0.35) * env * g;
      R[i] = lpR.run(r + l * 0.35) * env * g;
    }
    return [L, R];
  }
  function pluck(sr, f, o) {
    o = o || {};
    const out = buf(sr, o.len || 0.5), lp = new Biquad('lp', sr), fr = hz(f);
    let p = 0, p2 = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      if ((i & 15) === 0) lp.glide(500 + (o.bright || 4200) * Math.exp(-t / 0.05), 0.9, 16);
      p += fr / sr; p2 += (fr * 2.001) / sr;
      const s = (p % 1 < 0.35 ? 1 : -1) * 0.6 + Math.sin(TAU * p2) * 0.25;
      out[i] = lp.run(s) * Math.min(1, t / 0.002) * Math.exp(-t / (o.decay || 0.12)) * 0.6;
    }
    return out;
  }
  // sino em FM (confirmação, notas de revelação)
  function bell(sr, f, o) {
    o = o || {};
    const out = buf(sr, 1.4), fr = hz(f);
    let pc = 0, pm = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      pc += fr / sr; pm += (fr * 3.5) / sr;
      const idx = 2.2 * Math.exp(-t / 0.25);
      out[i] = Math.sin(TAU * pc + idx * Math.sin(TAU * pm)) * Math.min(1, t / 0.002) * Math.exp(-t / (o.decay || 0.4)) * 0.5;
    }
    return out;
  }

  /* ======================================================================
   * Efeitos
   * ==================================================================== */
  // bolha: a altura cai rápido até a nota
  function pop(sr, f, o) {
    o = o || {};
    const out = buf(sr, 0.14), fe = hz(f), from = o.from || 2.4;
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * fe * (1 + (from - 1) * Math.exp(-t / 0.01))) / sr;
      out[i] = Math.sin(ph) * Math.min(1, t / 0.0008) * Math.exp(-t / (o.decay || 0.035));
    }
    return out;
  }
  function impact(sr, size, seed) {
    const out = buf(sr, 0.25 + 0.5 * size), rnd = rand(seed);
    const lp = new Biquad('lp', sr).set(700 + 900 * size, 0.7);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * (38 + 57 * Math.exp(-t / 0.05))) / sr;
      const body = Math.sin(ph) * Math.exp(-t / (0.08 + 0.22 * size));
      const crack = lp.run(rnd() * 2 - 1) * Math.exp(-t / 0.018) * 0.8;
      out[i] = Math.tanh((body + crack) * 1.6) * 0.8;
    }
    return out;
  }
  // ruído filtrado com o centro varrendo de f0 a f1
  function whoosh(sr, o) {
    const len = o.len || 0.6, out = buf(sr, len), rnd = rand(o.seed || 29);
    const bp = new Biquad('bp', sr), bp2 = new Biquad('bp', sr);
    const f0 = o.f0 || 400, f1 = o.f1 || 3000, peak = o.peak == null ? 0.6 : o.peak, q = o.q || 1.4;
    for (let i = 0; i < out.length; i++) {
      const u = i / sr / len;
      if ((i & 15) === 0) { const fc = f0 * Math.pow(f1 / f0, u); bp.glide(fc, q, 16); bp2.glide(fc * 1.5, q * 1.3, 16); }
      const e = u < peak ? Math.pow(u / peak, 2) : Math.pow(Math.max(0, 1 - (u - peak) / (1 - peak)), 1.6);
      const x = rnd() * 2 - 1;
      out[i] = (bp.run(x) + 0.5 * bp2.run(x)) * e * 1.4;
    }
    return out;
  }
  function key(sr, seed, heavy) {
    const rnd = rand(seed), out = buf(sr, 0.06);
    const hp = new Biquad('hp', sr).set(2500 + rnd() * 1500, 0.8);
    const fT = (heavy ? 110 : 150) + rnd() * 80, vel = 0.8 + 0.2 * rnd();
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * fT) / sr;
      out[i] = (Math.sin(ph) * Math.exp(-t / (heavy ? 0.018 : 0.01)) * 0.5 + hp.run(rnd() * 2 - 1) * Math.exp(-t / 0.0035) * 0.9) * vel;
    }
    return out;
  }
  function thud(sr, o) {
    const out = buf(sr, 0.2), rnd = rand(o.seed || 59), lp = new Biquad('lp', sr).set(1800, 0.7);
    const f0 = o.f0 || 210, f1 = o.f1 || 90, dec = o.decay || 0.06;
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.02))) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / dec) * 0.9 + lp.run(rnd() * 2 - 1) * Math.exp(-t / 0.006) * 0.5;
    }
    return out;
  }
  function tick(sr, f) {
    const out = buf(sr, 0.03);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * f) / sr;
      out[i] = Math.sin(ph) * Math.exp(-t / 0.004) * Math.min(1, t / 0.0004);
    }
    return out;
  }
  // mola: a altura sobe quando o K brota
  function thwip(sr) {
    const out = buf(sr, 0.25);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      ph += (TAU * (130 + 330 * (1 - Math.exp(-t / 0.05)))) / sr;
      out[i] = Math.sin(ph) * Math.min(1, t / 0.003) * Math.exp(-t / 0.07) * 0.8;
    }
    return out;
  }
  // o traço que vira botão
  function bloop(sr, f) {
    const out = buf(sr, 0.35), fe = hz(f);
    let p1 = 0, p2 = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const ff = fe * (0.45 + 0.55 * (1 - Math.exp(-t / 0.05)));
      p1 += (TAU * ff) / sr; p2 += (TAU * ff * 2) / sr;
      out[i] = (Math.sin(p1) + 0.25 * Math.sin(p2)) * Math.min(1, t / 0.004) * Math.exp(-t / 0.12) * 0.6;
    }
    return out;
  }
  function mouse(sr) {
    const out = buf(sr, 0.12), rnd = rand(61), bp = new Biquad('bp', sr).set(2400, 1.5);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      let e = Math.exp(-t / 0.003);
      if (t > 0.075) e += 0.55 * Math.exp(-(t - 0.075) / 0.0025);
      out[i] = bp.run(rnd() * 2 - 1) * e * 2.2;
    }
    return out;
  }
  // caneta riscando: ruído com "grão" irregular
  function pen(sr, len) {
    const out = buf(sr, len + 0.06), rnd = rand(41);
    const bp = new Biquad('bp', sr).set(2700, 1.3), bp2 = new Biquad('bp', sr).set(5200, 2), lfo = new Biquad('lp', sr).set(22, 0.7);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr, x = rnd() * 2 - 1;
      const grain = 0.5 + 0.5 * Math.tanh(lfo.run(rnd() * 2 - 1) * 14);
      const env = Math.min(1, t / 0.025) * (t < len ? 1 : Math.exp(-(t - len) / 0.015));
      out[i] = (bp.run(x) * 0.9 + bp2.run(x) * 0.4) * grain * env;
    }
    return out;
  }
  function zip(sr, seed) {
    const len = 0.3, out = buf(sr, len), rnd = rand(seed), bp = new Biquad('bp', sr);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const u = i / sr / len, f = 500 * Math.pow(3, u);
      if ((i & 15) === 0) bp.glide(f * 3, 2, 16);
      ph += (TAU * f) / sr;
      const e = Math.sin(Math.PI * u);
      out[i] = (Math.sin(ph) * 0.35 + bp.run(rnd() * 2 - 1) * 0.5) * e * e;
    }
    return out;
  }
  function riser(sr, len) {
    const out = buf(sr, len), rnd = rand(43), bp = new Biquad('bp', sr);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const u = i / sr / len;
      if ((i & 15) === 0) bp.glide(300 * Math.pow(25, u), 1.2, 16);
      ph += (TAU * 180 * Math.pow(5, u)) / sr;
      out[i] = (bp.run(rnd() * 2 - 1) * 1.3 + Math.sin(ph) * 0.18) * Math.pow(u, 2.2);
    }
    return out;
  }
  // reverso: cresce até o golpe seguinte
  function suck(sr, len) {
    const out = buf(sr, len), rnd = rand(47), lp = new Biquad('lp', sr);
    let ph = 0;
    for (let i = 0; i < out.length; i++) {
      const u = i / sr / len;
      if ((i & 15) === 0) lp.glide(150 * Math.pow(60, u), 0.9, 16);
      ph += (TAU * (70 + 230 * u * u)) / sr;
      out[i] = (lp.run(rnd() * 2 - 1) * 0.9 + Math.sin(ph) * 0.35) * Math.pow(u, 3) * (u > 0.985 ? (1 - u) / 0.015 : 1);
    }
    return out;
  }

  /* ======================================================================
   * Espaço e masterização
   * ==================================================================== */
  // reverb no estilo Freeverb: 8 filtros pente amortecidos + 4 passa-tudo por canal
  function freeverb(inL, inR, sr, room, damp) {
    const sc = sr / 44100, spread = Math.round(23 * sc);
    const CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225];
    function chan(input, extra) {
      const n = input.length, out = new Float32Array(n);
      const cb = CB.map((d) => new Float32Array(Math.round(d * sc) + extra));
      const ab = AP.map((d) => new Float32Array(Math.round(d * sc) + extra));
      const ci = new Int32Array(8), ai = new Int32Array(4), cs = new Float64Array(8);
      for (let i = 0; i < n; i++) {
        const x = input[i] * 0.015;
        let s = 0;
        for (let k = 0; k < 8; k++) {
          const b = cb[k], j = ci[k], y = b[j];
          cs[k] = y * (1 - damp) + cs[k] * damp;
          b[j] = x + cs[k] * room;
          ci[k] = j + 1 === b.length ? 0 : j + 1;
          s += y;
        }
        // passa-tudo verdadeiro (resposta plana); a versão clássica do Freeverb
        // reforça algumas frequências e, em série, criava um apito perto de 1,3 kHz
        for (let k = 0; k < 4; k++) {
          const b = ab[k], j = ai[k], bo = b[j];
          const vv = s + 0.5 * bo;
          b[j] = vv;
          s = bo - 0.5 * vv;
          ai[k] = j + 1 === b.length ? 0 : j + 1;
        }
        out[i] = s * 3;
      }
      return out;
    }
    return [chan(inL, 0), chan(inR, spread)];
  }
  // eco pingue-pongue (esquerda → direita → esquerda…)
  function pingpong(inL, inR, sr, time, fb) {
    const n = inL.length, d = Math.round(time * sr);
    const bl = new Float32Array(d), br = new Float32Array(d);
    const oL = new Float32Array(n), oR = new Float32Array(n);
    const lpL = new Biquad('lp', sr).set(3500, 0.7), lpR = new Biquad('lp', sr).set(3500, 0.7);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const yl = bl[j], yr = br[j];
      oL[i] = yl; oR[i] = yr;
      bl[j] = (inL[i] + inR[i]) * 0.5 + lpR.run(yr) * fb;
      br[j] = lpL.run(yl) * fb;
      j = j + 1 === d ? 0 : j + 1;
    }
    return [oL, oR];
  }
  // limitador com antecipação de 5 ms (o ganho cai antes do pico chegar)
  function limit(L, R, sr, thr) {
    const n = L.length, la = Math.max(1, Math.round(0.005 * sr));
    const need = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      need[i] = p > thr ? thr / p : 1;
    }
    const win = new Float32Array(n), dq = new Int32Array(n);
    let h = 0, tl = 0;
    for (let i = n - 1; i >= 0; i--) {
      while (tl > h && need[dq[tl - 1]] >= need[i]) tl--;
      dq[tl++] = i;
      while (dq[h] > i + la) h++;
      win[i] = need[dq[h]];
    }
    const att = Math.exp(-1 / (0.0015 * sr)), rel = Math.exp(-1 / (0.09 * sr));
    const knee = (y) => (y > thr ? thr + (1 - thr) * Math.tanh((y - thr) / (1 - thr)) : y < -thr ? -thr - (1 - thr) * Math.tanh((-y - thr) / (1 - thr)) : y);
    let g = 1;
    for (let i = 0; i < n; i++) {
      const target = win[i];
      g = target < g ? target + (g - target) * att : target + (g - target) * rel;
      L[i] = knee(L[i] * g);
      R[i] = knee(R[i] * g);
    }
  }

  // Loudness integrada (ITU-R BS.1770 / EBU R128): filtro K, blocos de 400 ms, portas −70 LUFS e −10 LU
  function lufs(L, R, sr) {
    const n = L.length;
    const k1 = (() => {
      const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
      const K = Math.tan((Math.PI * f0) / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
      const a0 = 1 + K / Q + K * K;
      return { b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
    })();
    const k2 = (() => {
      const f0 = 38.13547087602444, Q = 0.5003270373238773, K = Math.tan((Math.PI * f0) / sr), a0 = 1 + K / Q + K * K;
      return { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] };
    })();
    const sq = new Float64Array(n + 1);
    [L, R].forEach((x) => {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, z1 = 0, z2 = 0;
      for (let i = 0; i < n; i++) {
        const y = k1.b[0] * x[i] + k1.b[1] * x1 + k1.b[2] * x2 - k1.a[0] * y1 - k1.a[1] * y2;
        x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
        const z = y - 2 * u1 + u2 - k2.a[0] * z1 - k2.a[1] * z2;
        u2 = u1; u1 = y; z2 = z1; z1 = z;
        sq[i + 1] += z * z;
      }
    });
    for (let i = 1; i <= n; i++) sq[i] += sq[i - 1];
    const win = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), blocks = [];
    for (let s0 = 0; s0 + win <= n; s0 += hop) blocks.push((sq[s0 + win] - sq[s0]) / win);
    const ld = (z) => -0.691 + 10 * Math.log10(z);
    const abs = blocks.filter((z) => z > 0 && ld(z) > -70);
    if (!abs.length) return -70;
    const rel = ld(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
    const g = abs.filter((z) => ld(z) > rel);
    return ld(g.reduce((a, b) => a + b, 0) / g.length);
  }

  /* ======================================================================
   * Harmonia
   * ==================================================================== */
  const CHORDS = {
    Am9: ['A3', 'E4', 'G4', 'B4', 'C5'],
    Am7: ['A3', 'C4', 'E4', 'G4'],
    Fmaj7: ['F3', 'A3', 'C4', 'E4'],
    Cadd9: ['G3', 'C4', 'E4', 'D5'],
    G6: ['G3', 'B3', 'D4', 'E4'],
    Gsus: ['G3', 'C4', 'D4', 'G4'],
    Cmaj9: ['C3', 'G3', 'B3', 'D4', 'E4', 'G4'],
  };
  const ROOT = { Am7: 'A2', Fmaj7: 'F2', Cadd9: 'C3', G6: 'G2' };
  const ARP = {
    Am7: ['A4', 'C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'C5'],
    Fmaj7: ['F4', 'A4', 'C5', 'E5', 'F5', 'E5', 'C5', 'A4'],
    Cadd9: ['C5', 'E5', 'G5', 'D6', 'C6', 'G5', 'E5', 'D5'],
    G6: ['G4', 'B4', 'D5', 'E5', 'G5', 'E5', 'D5', 'B4'],
  };
  const LOOP = ['Am7', 'Fmaj7', 'Cadd9', 'G6'];

  /* ======================================================================
   * Render: pistas → áudio estéreo
   * ==================================================================== */
  function render(cues, opts) {
    opts = opts || {};
    cues = (cues || []).slice().sort((a, b) => a.t - b.t);
    const sr = opts.sampleRate || 48000;
    const endCue = cues.find((c) => c.type === 'end');
    const end = opts.duration || (endCue ? endCue.t : 34);
    const mix = new Mix(sr, end);
    const beat = 60 / (opts.bpm || 120), bar = beat * 4;
    const find = (type, f) => cues.find((c) => c.type === type && (!f || f(c)));
    const scene = (id, d) => { const c = find('scene', (x) => x.id === id); return c ? c.t : d; };
    const tHook = scene('gancho', 4);
    const tCut = (find('delete') || { t: 9.5 }).t;
    const tDrop = Math.ceil((tCut + 1e-6) / bar) * bar;
    const tPlans = scene('planos', 17.25);
    const tBuild = scene('no-ar', 23.75);
    const tPunch = (find('punch') || { t: 26.65 }).t;
    const tFinal = (find('land', (c) => c.final) || { t: 28.23 }).t;
    // instantes na grade: k·passo + deslocamento, dentro de [a, b)
    const grid = (a, b, step, off) => {
      off = off || 0;
      const out = [];
      for (let t = Math.ceil((a - off) / step - 1e-9) * step + off; t < b - 1e-9; t += step) out.push(Math.round(t * 1e6) / 1e6);
      return out;
    };
    const chordB = (t) => LOOP[((Math.floor(t / bar + 1e-6) - Math.round(tDrop / bar)) % 4 + 4) % 4];
    const kicks = [];

    /* ---------- bateria ---------- */
    const KICK = kick(sr), CLAP = clap(sr), SN = snare(sr), CR = crash(sr);
    const HATS = [hat(sr, { seed: 1 }), hat(sr, { seed: 2 }), hat(sr, { seed: 3 })], OHAT = hat(sr, { open: true, seed: 4 });
    const K = (t, g) => { mix.add('drums', t, KICK, { gain: 0.9 * (g || 1) }); kicks.push(t); };
    // gancho: meio-tempo, chimbal no contratempo, palmas a partir do 2º compasso
    grid(tHook, tCut - 0.4, bar / 2).forEach((t) => K(t, 0.7));
    grid(tHook, tCut - 0.5, beat, beat / 2).forEach((t, i) => mix.add('drums', t, HATS[i % 3], { gain: 0.12, pan: 0.28 }));
    grid(tHook + bar, tCut - 0.5, bar / 2, beat).forEach((t) => mix.add('drums', t, CLAP, { gain: 0.26, rev: 0.22 }));
    grid(tCut - 0.5, tCut, beat / 4).forEach((t, i) => mix.add('drums', t, SN, { gain: 0.08 + i * 0.03, rev: 0.18, pan: 0.08 }));
    // volta no tempo forte: groove completo
    mix.add('drums', tDrop, CR, { gain: 0.3, rev: 0.35 });
    grid(tDrop, tBuild, beat).forEach((t) => K(t));
    grid(tDrop, tBuild, bar / 2, beat).forEach((t) => mix.add('drums', t, CLAP, { gain: 0.4, rev: 0.2 }));
    const HV = [0.05, 0.03, 0.13, 0.03];
    grid(tDrop, tBuild, beat / 4).forEach((t, i) => mix.add('drums', t, HATS[i % 3], { gain: HV[i % 4] * 2.0, pan: 0.3 }));
    grid(tDrop + bar, tBuild, bar, beat * 3.5).forEach((t) => mix.add('drums', t, OHAT, { gain: 0.08, pan: 0.32 }));
    // subida: bumbo segue, rufo acelera, riser cresce
    grid(tBuild, tPunch - 0.6, beat).forEach((t) => K(t, 0.85));
    const roll = (t) => {
      const u = Math.min(1, (t - tBuild) / (tPunch - tBuild));
      mix.add('drums', t, SN, { gain: 0.06 + 0.34 * u * u, rev: 0.25, pan: 0.06 });
    };
    grid(tBuild, tBuild + 1.25, beat / 2).forEach(roll);
    grid(tBuild + 1.25, tPunch - 0.65, beat / 4).forEach(roll);
    grid(tPunch - 0.65, tPunch - 0.12, beat / 8).forEach(roll);
    mix.add('sfx', tBuild + 0.25, riser(sr, Math.max(0.5, tPunch - tBuild - 0.25)), { gain: 0.3, rev: 0.2 });
    // "no ar.": golpe e silêncio
    K(tPunch, 1.15);
    mix.add('drums', tPunch, CR, { gain: 0.36, rev: 0.45 });

    /* ---------- baixo ---------- */
    [[tHook, 'A2'], [tHook + bar, 'F2'], [tHook + bar * 2, 'C3']].forEach(([t, nt], i) => {
      const len = i < 2 ? bar * 0.85 : Math.max(0.2, tCut - t - 0.03);
      mix.add('music', t, bass(sr, hz(nt), len, 500), { gain: 0.32 });
    });
    grid(tDrop, tBuild, beat, beat / 2).forEach((t) => mix.add('music', t, bass(sr, hz(ROOT[chordB(t)]), beat * 0.42), { gain: 0.5 }));
    grid(tBuild, tPunch - 0.15, beat / 2).forEach((t) => {
      const u = (t - tBuild) / (tPunch - tBuild);
      mix.add('music', t, bass(sr, hz('G2'), beat * 0.4, 600 + 2200 * u), { gain: 0.36 });
    });
    mix.add('music', tPunch, bass(sr, hz('C2'), 0.9, 300), { gain: 0.55 });
    mix.add('music', tFinal, bass(sr, hz('C2'), Math.max(0.5, end - tFinal - 0.6), 250), { gain: 0.5 });

    /* ---------- pad ---------- */
    const P = (t, ch, len, o) => {
      const [l, r] = pad(sr, CHORDS[ch], len, o);
      mix.add2('music', t, l, r, { gain: o.g || 1, rev: o.rev == null ? 0.35 : o.rev });
    };
    P(0.15, 'Am9', tHook - 0.05, { att: 1.6, rel: 0.5, cut: 650, cut2: 1500, gain: 0.55 });
    P(tHook, 'Am7', bar, { att: 0.3, cut: 950, gain: 0.62 });
    P(tHook + bar, 'Fmaj7', bar, { att: 0.25, cut: 1000, gain: 0.62 });
    P(tHook + bar * 2, 'Cadd9', Math.max(0.2, tCut - tHook - bar * 2), { att: 0.25, cut: 1100, cut2: 1800, rel: 0.06, gain: 0.65 });
    for (let t = tDrop; t < tBuild - 1e-6; t += bar) {
      const len = Math.min(bar, tBuild - t), last = t + bar >= tBuild - 1e-6;
      P(t, chordB(t), len, { att: 0.08, cut: 1400, gain: 0.95, rel: last ? 0.1 : 0.5 });
    }
    P(tBuild, 'Gsus', Math.max(0.2, tPunch - tBuild - 0.02), { att: 0.5, cut: 800, cut2: 6000, rel: 0.05, gain: 0.95 });
    P(tPunch, 'Cmaj9', 0.3, { att: 0.004, cut: 3200, rel: 0.9, gain: 1, rev: 0.6 });
    P(tFinal, 'Cmaj9', Math.max(0.5, end - tFinal), { att: 0.006, cut: 2400, cut2: 800, rel: 0.4, gain: 1.15, rev: 0.5, decay: 4 });

    /* ---------- arpejo (planos) ---------- */
    grid(tPlans, tBuild, beat / 4).forEach((t, i) => {
      const seq = ARP[chordB(t)];
      mix.add('music', t, pluck(sr, seq[i % 8], { decay: 0.11, bright: 3000 + 1500 * ((i % 16) / 16) }),
        { gain: 0.18, pan: i % 2 ? 0.35 : -0.35, dly: 0.35, rev: 0.12 });
    });

    /* ---------- efeitos, um por pista ---------- */
    const R = rand(99);
    const jitter = (w) => (R() - 0.5) * w;
    cues.forEach((c) => {
      const t = c.t;
      switch (c.type) {
        case 'fall':
          mix.add('sfx', t, whoosh(sr, { len: c.dur || 0.5, f0: 2400, f1: 500, peak: 0.9, seed: 3 }), { gain: 0.12 });
          break;
        case 'impact':
          mix.add('sfx', t, impact(sr, c.size || 1, seedOf(t, 20)), { gain: 0.42 * Math.pow(c.size || 1, 0.7), rev: 0.08 });
          break;
        case 'spring':
          mix.add('sfx', t, thwip(sr), { gain: 0.18 });
          mix.add('music', t, pluck(sr, c.note || 'A3', { decay: 0.3, bright: 2500 }), { gain: 0.18, rev: 0.25, dly: 0.15 });
          break;
        case 'type':
          mix.add('music', t, pluck(sr, c.note || 'A4', { decay: 0.18, bright: 3400 }), { gain: 0.14, rev: 0.22, dly: 0.2, pan: jitter(0.5) });
          mix.add('sfx', t, key(sr, seedOf(t, 100)), { gain: 0.05 });
          break;
        case 'key':
          mix.add('sfx', t, key(sr, 200 + (c.i || 0)), { gain: 0.11, pan: jitter(0.3) });
          break;
        case 'enter':
          mix.add('sfx', t, key(sr, 7, true), { gain: 0.24 });
          mix.add('sfx', t, thud(sr, { f0: 260, f1: 140, decay: 0.08, seed: 8 }), { gain: 0.18 });
          break;
        case 'blink':
          mix.add('sfx', t, tick(sr, c.on ? 4200 : 3000), { gain: 0.035 });
          break;
        case 'whoosh': {
          const up = c.dir === 'up';
          mix.add('sfx', t, whoosh(sr, { len: c.len || 0.6, f0: up ? 500 : 3200, f1: up ? 4200 : 380, peak: up ? 0.75 : 0.35, seed: seedOf(t, 300) }),
            { gain: 0.2 * (c.size || 0.6), pan: c.pan || 0, rev: 0.1 });
          break;
        }
        case 'pop':
          mix.add('sfx', t, pop(sr, c.note || 'A5'), { gain: 0.16, rev: 0.15, pan: jitter(0.4) });
          break;
        case 'slam':
          mix.add('sfx', t, thud(sr, { seed: 400 + (c.i || 0), f0: c.big ? 170 : 230, f1: c.big ? 60 : 95, decay: c.big ? 0.14 : 0.05 }),
            { gain: c.big ? 0.34 : 0.1, pan: jitter(0.3) });
          break;
        case 'select':
          mix.add('sfx', t, whoosh(sr, { len: 0.28, f0: 900, f1: 5500, peak: 0.8, q: 2.2, seed: 77 }), { gain: 0.12 });
          break;
        case 'delete':
          mix.add('sfx', t, thud(sr, { f0: 300, f1: 120, decay: 0.04, seed: 9 }), { gain: 0.24 });
          mix.add('sfx', t, key(sr, 5), { gain: 0.16 });
          break;
        case 'land':
          if (c.final) {
            mix.add('sfx', t, impact(sr, 1.3, 81), { gain: 0.62, rev: 0.15 });
          } else {
            mix.add('sfx', t, thud(sr, { f0: 320, f1: 160, decay: 0.03, seed: seedOf(t, 500) }), { gain: 0.1 * Math.min(1.2, c.size || 1) });
            if (c.note) mix.add('music', t, pluck(sr, c.note, { decay: 0.16, bright: 3600 }), { gain: 0.22, rev: 0.2, dly: 0.28, pan: jitter(0.5) });
          }
          break;
        case 'pen':
          mix.add('sfx', t, pen(sr, c.len || 1), { gain: 0.1, pan: -0.1 });
          (c.corners || []).forEach((tc) => mix.add('sfx', tc, key(sr, seedOf(tc, 600)), { gain: 0.07 }));
          break;
        case 'morph':
          mix.add('sfx', t, bloop(sr, 'C5'), { gain: 0.24, rev: 0.15 });
          break;
        case 'click':
          mix.add('sfx', t, mouse(sr), { gain: 0.3 });
          mix.add('music', t + 0.02, bell(sr, 'G5'), { gain: 0.16, rev: 0.35 });
          mix.add('music', t + 0.11, bell(sr, 'C6'), { gain: 0.16, rev: 0.35 });
          break;
        case 'flip':
          mix.add('sfx', t, whoosh(sr, { len: 0.42, f0: 700, f1: 3600, peak: 0.45, seed: seedOf(t, 700) }), { gain: 0.15, pan: c.pan == null ? 0.4 : c.pan });
          break;
        case 'lift':
          mix.add('sfx', t, thud(sr, { f0: 420, f1: 260, decay: 0.025, seed: seedOf(t, 800) }), { gain: 0.06 });
          break;
        case 'line':
          mix.add('sfx', t, zip(sr, seedOf(t, 900)), { gain: 0.08, pan: 0.3 });
          break;
        case 'node':
          mix.add('sfx', t, pop(sr, c.note || 'A5', { from: 1.8 }), { gain: 0.12, pan: 0.45, rev: 0.15 });
          break;
        case 'bar':
          mix.add('music', t, pluck(sr, c.note || 'C5', { decay: 0.09, bright: 4200 }), { gain: 0.14, pan: 0.2, dly: 0.2 });
          break;
        case 'swipe':
          mix.add('sfx', t, whoosh(sr, { len: 0.42, f0: 650, f1: 5200, peak: 0.7, seed: seedOf(t, 1000) }), { gain: 0.18 });
          break;
        case 'punch':
          mix.add('sfx', t, impact(sr, 1, 91), { gain: 0.5, rev: 0.12 });
          break;
        case 'suck':
          mix.add('sfx', t, suck(sr, c.len || 1), { gain: 0.26 });
          break;
        case 'reveal':
          mix.add('music', t, bell(sr, c.note || 'E5', { decay: 0.3 }), { gain: 0.06, rev: 0.4, pan: 0.4 });
          break;
        default:
          break;
      }
    });

    /* ---------- mixagem final ---------- */
    const n = mix.n;
    // sidechain: a música "respira" a cada bumbo
    const duck = new Float32Array(n).fill(1), dn = Math.round(0.32 * sr);
    kicks.forEach((tk) => {
      const s0 = Math.round(tk * sr);
      for (let k = 0; k < dn && s0 + k < n; k++) {
        const tt = k / sr;
        const g = 1 - 0.5 * (tt < 0.005 ? tt / 0.005 : Math.exp(-(tt - 0.005) / 0.1));
        if (g < duck[s0 + k]) duck[s0 + k] = g;
      }
    });
    const [mRvL, mRvR] = freeverb(mix.bus.revM[0], mix.bus.revM[1], sr, 0.86, 0.32);
    const [sRvL, sRvR] = freeverb(mix.bus.revS[0], mix.bus.revS[1], sr, 0.8, 0.4);
    const [dlL, dlR] = pingpong(mix.bus.dlyM[0], mix.bus.dlyM[1], sr, beat * 0.75, 0.38);
    const D = mix.bus.drums, Mu = mix.bus.music, S = mix.bus.sfx;
    const musL = new Float32Array(n), musR = new Float32Array(n), sfxL = new Float32Array(n), sfxR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = duck[i];
      musL[i] = D[0][i] + (Mu[0][i] + mRvL[i] * 0.9) * d + dlL[i] * 0.5;
      musR[i] = D[1][i] + (Mu[1][i] + mRvR[i] * 0.9) * d + dlR[i] * 0.5;
      sfxL[i] = S[0][i] + sRvL[i] * 0.8;
      sfxR[i] = S[1][i] + sRvR[i] * 0.8;
    }
    // volume final: −14 LUFS (referência de YouTube, Instagram e Spotify) com pico abaixo de −2 dBFS.
    // Ajusta o ganho, passa no limitador, mede de novo e corrige (três passadas).
    const X = new Float32Array(n), Y = new Float32Array(n);
    const hpL = new Biquad('hp', sr).set(28, 0.7), hpR = new Biquad('hp', sr).set(28, 0.7);
    for (let i = 0; i < n; i++) { X[i] = hpL.run(musL[i] + sfxL[i]); Y[i] = hpR.run(musR[i] + sfxR[i]); }
    const target = opts.lufs || -14, ceiling = 0.79;
    let pre = Math.pow(10, (target - lufs(X, Y, sr)) / 20);
    let L = null, Rr = null, measured = 0;
    for (let pass = 0; pass < 3; pass++) {
      L = new Float32Array(n); Rr = new Float32Array(n);
      for (let i = 0; i < n; i++) { L[i] = X[i] * pre; Rr[i] = Y[i] * pre; }
      limit(L, Rr, sr, ceiling);
      measured = lufs(L, Rr, sr);
      if (Math.abs(measured - target) < 0.1) break;
      pre *= Math.pow(10, (target - measured) / 20);
    }
    // entrada e saída suaves
    const fi = Math.round(0.006 * sr), fo = Math.min(n, Math.round(1.4 * sr));
    for (let i = 0; i < fi; i++) { L[i] *= i / fi; Rr[i] *= i / fi; }
    for (let k = 0; k < fo; k++) {
      const i = n - fo + k, g = Math.pow(Math.cos(((k / fo) * Math.PI) / 2), 2);
      L[i] *= g; Rr[i] *= g;
    }
    const result = { L, R: Rr, sampleRate: sr, lufs: Math.round(lufs(L, Rr, sr) * 10) / 10 };
    if (opts.stems) {
      // partes separadas, com o mesmo ganho de entrada (sem limitador)
      for (let i = 0; i < n; i++) { musL[i] *= pre; musR[i] *= pre; sfxL[i] *= pre; sfxR[i] *= pre; }
      result.stems = { musica: { L: musL, R: musR }, efeitos: { L: sfxL, R: sfxR } };
    }
    return result;
  }

  return { render, version: '1.0.0' };
});
