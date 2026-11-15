/* Káiros · Pix copia e cola (BR Code) e QR Code, sem dependências.
   O gerador de QR segue o padrão ISO/IEC 18004 (modo byte, correção M),
   no mesmo desenho do gerador de referência de Project Nayuki (MIT). */
(function (global) {
  'use strict';

  /* ---------- BR Code do Pix ---------- */

  function campo(id, valor) {
    var v = String(valor);
    var n = v.length;
    if (n > 99) throw new Error('Campo ' + id + ' longo demais');
    return id + (n < 10 ? '0' : '') + n + v;
  }

  function crc16(texto) {
    var crc = 0xFFFF;
    for (var i = 0; i < texto.length; i++) {
      crc ^= texto.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
  }

  function limpar(texto, max) {
    return String(texto || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9 .,\-\/]/g, '')
      .replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function txidValido(t) {
    var s = String(t || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
    return s || '***';
  }

  /* opcoes: {chave, nome, cidade, valor (número em reais), descricao, txid} */
  function payload(o) {
    var conta = campo('00', 'br.gov.bcb.pix') + campo('01', o.chave);
    var desc = limpar(o.descricao, 40);
    if (desc) conta += campo('02', desc);
    var p = campo('00', '01') +
      campo('26', conta) +
      campo('52', '0000') +
      campo('53', '986');
    if (o.valor != null && Number(o.valor) > 0) p += campo('54', Number(o.valor).toFixed(2));
    p += campo('58', 'BR') +
      campo('59', limpar(o.nome, 25).toUpperCase() || 'KAIROS') +
      campo('60', limpar(o.cidade, 15).toUpperCase() || 'SAO PAULO') +
      campo('62', campo('05', txidValido(o.txid)));
    p += '6304';
    return p + crc16(p);
  }

  /* ---------- QR Code ---------- */

  var ECC_M = { ordinal: 1, bits: 0 };
  var ECC_CW = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var ECC_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_CW[ver] * ECC_BLOCKS[ver];
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(deg) {
    var r = [];
    for (var i = 0; i < deg - 1; i++) r.push(0);
    r.push(1);
    var root = 1;
    for (var k = 0; k < deg; k++) {
      for (var j = 0; j < r.length; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  function utf8(texto) {
    var s = unescape(encodeURIComponent(texto)), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function qr(texto) {
    var bytes = utf8(texto), ver, cap;
    for (ver = 1; ver <= 40; ver++) {
      var ccBits = ver <= 9 ? 8 : 16;
      cap = dataCodewords(ver) * 8;
      if (4 + ccBits + bytes.length * 8 <= cap) break;
    }
    if (ver > 40) throw new Error('Texto longo demais para QR');
    var ccb = ver <= 9 ? 8 : 16;

    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, ccb);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }

    /* blocos de correção e entrelaçamento */
    var nb = ECC_BLOCKS[ver], ecl = ECC_CW[ver], raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var div = rsDivisor(ecl), blocks = [], k = 0;
    for (var b = 0; b < nb; b++) {
      var dat = data.slice(k, k + shortLen - ecl + (b < nShort ? 0 : 1));
      k += dat.length;
      var ec = rsRemainder(dat, div);
      if (b < nShort) dat.push(0);
      blocks.push(dat.concat(ec));
    }
    var cw = [];
    for (var x = 0; x < blocks[0].length; x++) {
      for (var y = 0; y < blocks.length; y++) {
        if (x !== shortLen - ecl || y >= nShort) cw.push(blocks[y][x]);
      }
    }

    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (var r = 0; r < size; r++) {
      mod.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    function setF(xx, yy, dark) { mod[yy][xx] = dark; fn[yy][xx] = true; }

    for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
      align = [6];
      for (var pos = size - 7; align.length < na; pos -= step) align.splice(1, 0, pos);
    }
    var nA = align.length;
    for (var ai = 0; ai < nA; ai++) for (var aj = 0; aj < nA; aj++) {
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === nA - 1) || (ai === nA - 1 && aj === 0)) continue;
      for (var ady = -2; ady <= 2; ady++) for (var adx = -2; adx <= 2; adx++) {
        setF(align[ai] + adx, align[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
      }
    }

    function formatBits(mask) {
      var d = ECC_M.bits << 3 | mask, rem = d;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      return ((d << 10) | rem) ^ 0x5412;
    }
    function drawFormat(mask) {
      var fb = formatBits(mask), i;
      function bit(n) { return ((fb >>> n) & 1) !== 0; }
      for (i = 0; i <= 5; i++) setF(8, i, bit(i));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
      setF(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver;
      for (var vi = 0; vi < 12; vi++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = ver << 12 | rem;
      for (var q = 0; q < 18; q++) {
        var c = ((vb >>> q) & 1) !== 0, a = size - 11 + q % 3, bb = Math.floor(q / 3);
        setF(a, bb, c); setF(bb, a, c);
      }
    }

    /* dados em zigue-zague */
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var xx2 = right - jj, up = ((right + 1) & 2) === 0, yy2 = up ? size - 1 - vert : vert;
          if (!fn[yy2][xx2] && bi < cw.length * 8) {
            mod[yy2][xx2] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
            bi++;
          }
        }
      }
    }

    function maskFn(m, xx, yy) {
      switch (m) {
        case 0: return (xx + yy) % 2 === 0;
        case 1: return yy % 2 === 0;
        case 2: return xx % 3 === 0;
        case 3: return (xx + yy) % 3 === 0;
        case 4: return (Math.floor(xx / 3) + Math.floor(yy / 2)) % 2 === 0;
        case 5: return xx * yy % 2 + xx * yy % 3 === 0;
        case 6: return (xx * yy % 2 + xx * yy % 3) % 2 === 0;
        default: return ((xx + yy) % 2 + xx * yy % 3) % 2 === 0;
      }
    }
    function applyMask(m) {
      for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) {
        if (!fn[yy][xx] && maskFn(m, xx, yy)) mod[yy][xx] = !mod[yy][xx];
      }
    }
    function penalty() {
      var p = 0, xx, yy, run, i;
      for (yy = 0; yy < size; yy++) {
        run = 1;
        for (xx = 1; xx < size; xx++) {
          if (mod[yy][xx] === mod[yy][xx - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
          else run = 1;
        }
      }
      for (xx = 0; xx < size; xx++) {
        run = 1;
        for (yy = 1; yy < size; yy++) {
          if (mod[yy][xx] === mod[yy - 1][xx]) { run++; if (run === 5) p += 3; else if (run > 5) p++; }
          else run = 1;
        }
      }
      for (yy = 0; yy < size - 1; yy++) for (xx = 0; xx < size - 1; xx++) {
        var c0 = mod[yy][xx];
        if (c0 === mod[yy][xx + 1] && c0 === mod[yy + 1][xx] && c0 === mod[yy + 1][xx + 1]) p += 3;
      }
      var pat1 = [true, false, true, true, true, false, true, false, false, false, false];
      var pat2 = [false, false, false, false, true, false, true, true, true, false, true];
      function match(get) {
        var hits = 0;
        for (var s = 0; s + 11 <= size; s++) {
          var m1 = true, m2 = true;
          for (i = 0; i < 11; i++) {
            var v = get(s + i);
            if (v !== pat1[i]) m1 = false;
            if (v !== pat2[i]) m2 = false;
          }
          if (m1) hits++;
          if (m2) hits++;
        }
        return hits;
      }
      for (yy = 0; yy < size; yy++) p += 40 * match(function (k2) { return mod[yy][k2]; });
      for (xx = 0; xx < size; xx++) p += 40 * match(function (k2) { return mod[k2][xx]; });
      var dark = 0;
      for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) if (mod[yy][xx]) dark++;
      var total = size * size;
      p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return p;
    }

    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      var pp = penalty();
      if (pp < bestP) { bestP = pp; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { size: size, version: ver, mask: best, modules: mod };
  }

  function svg(texto, opt) {
    opt = opt || {};
    var q = qr(texto), borda = opt.borda == null ? 4 : opt.borda, n = q.size + borda * 2, d = '';
    for (var y = 0; y < q.size; y++) {
      for (var x = 0; x < q.size; x++) {
        if (q.modules[y][x]) {
          var w = 1;
          while (x + w < q.size && q.modules[y][x + w]) w++;
          d += 'M' + (x + borda) + ' ' + (y + borda) + 'h' + w + 'v1h-' + w + 'z';
          x += w - 1;
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges"' +
      (opt.titulo ? ' role="img" aria-label="' + String(opt.titulo).replace(/"/g, '&quot;') + '"' : ' aria-hidden="true"') + '>' +
      '<rect width="' + n + '" height="' + n + '" fill="' + (opt.fundo || '#fff') + '"/>' +
      '<path d="' + d + '" fill="' + (opt.cor || '#0B0B0C') + '"/></svg>';
  }

  var api = { payload: payload, crc16: crc16, qr: qr, svg: svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.KairosPix = api;
})(typeof window !== 'undefined' ? window : this);
