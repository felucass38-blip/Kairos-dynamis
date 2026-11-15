/* Káiros Studio v4: tudo automático, sem IA e sem custo. Monta, gera propostas e ajusta com um clique. */
(function () {
  'use strict';
  document.body.classList.add('studio');
  document.documentElement.style.height = '100%';

  var $ = function (id) { return document.getElementById(id); };
  var esc = KE.esc;
  var KAIROS_WA = '5511962431350';
  var KEY = 'kairos-studio-v4', KEYF = 'kairos-fotos-v4';
  var CAMPOS = ['nome','ramo','cidade','zap','desc','serv','hora','endereco','insta','livre'];

  function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function apagar(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function track(ev, p) { if (window.ktrack) window.ktrack(ev, p); }

  /* ---------------- estado ---------------- */
  var vazio = {form: {}, prefs: {direcao: '', cor: 'auto', corManual: '#B4235A'}, propostas: null, spec: null, semente: 0, giro: 0};
  CAMPOS.forEach(function (k) { vazio.form[k] = ''; });
  var salvo = ler(KEY) || {};
  var st = {form: Object.assign({}, vazio.form, salvo.form || {}), prefs: Object.assign({}, vazio.prefs, salvo.prefs || {}),
    propostas: Array.isArray(salvo.propostas) ? salvo.propostas : null, spec: salvo.spec || null, semente: salvo.semente || 0, giro: salvo.giro || 0};
  var fotos = Object.assign({logo: null, logoCores: [], lista: [], capa: null}, ler(KEYF) || {});
  var ho = ler('kairos-handoff');
  if (ho) { apagar('kairos-handoff'); if (ho.nome && !st.spec) st.form.nome = String(ho.nome).slice(0, 60); if (ho.direcao && KC.DIR[ho.direcao]) st.prefs.direcao = ho.direcao; }
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.get('nome') && !st.spec) st.form.nome = String(qs.get('nome')).slice(0, 60);
    if (qs.get('estilo') && KC.DIR[qs.get('estilo')]) st.prefs.direcao = qs.get('estilo');
  } catch (e) {}
  if (st.spec) { try { st.spec = KE.normalizar(st.spec, st.form, fotos.lista.length, st.spec); } catch (e) { st.spec = null; } }

  var hist = [], modo = st.spec ? 'editar' : 'montar', aba = 'ajustes', verProps = false, editando = false;

  var tSave;
  function salvar() { clearTimeout(tSave); tSave = setTimeout(function () { gravar(KEY, st); }, 250); }
  function salvarFotos() { if (!gravar(KEYF, fotos)) $('fotosHint').textContent = 'As fotos não couberam na memória do navegador: elas ficam aqui até você fechar a página.'; }

  function coresMarca() {
    if (st.prefs.cor === 'logo' && fotos.logoCores.length) return fotos.logoCores.slice(0, 3);
    if (st.prefs.cor === 'manual' && KE.isHex(st.prefs.corManual)) return [st.prefs.corManual];
    return [];
  }

  /* ---------------- mensagens ---------------- */
  function status(t, tipo) { $('status').textContent = t || ''; $('status').className = 'status' + (tipo ? ' ' + tipo : ''); }
  function avisoAjuste(t) { $('ajStatus').textContent = t; }
  var tToast;
  function toast(t, comBotao) {
    var el = document.querySelector('.toast'); if (el) el.remove();
    el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>' + esc(t) + '</span>' + (comBotao ? '<button type="button">Ver site</button>' : '');
    document.body.appendChild(el);
    if (comBotao) el.querySelector('button').onclick = function () { irPara('palco'); el.remove(); };
    clearTimeout(tToast); tToast = setTimeout(function () { el.remove(); }, 3500);
  }
  function celular() { return window.matchMedia('(max-width:959px)').matches; }
  function irPara(m) {
    $('app').dataset.m = m;
    document.querySelectorAll('.mtabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.m === m)); });
  }

  /* ---------------- formulário ---------------- */
  $('f-ramo').innerHTML = '<option value="">Escolha o ramo</option>' + KC.RAMOS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('');
  function preencherForm() { CAMPOS.forEach(function (k) { var el = $('f-' + k); if (el) el.value = st.form[k] || ''; }); }
  function lerForm() { CAMPOS.forEach(function (k) { var el = $('f-' + k); if (el) st.form[k] = el.value.trim(); }); }

  function renderDirs() {
    var h = '<button type="button" class="dir auto" data-dir="" aria-pressed="' + (!st.prefs.direcao) + '"><span class="sw5"></span><b>Escolher pelo ramo</b></button>';
    KC.DIRECOES.forEach(function (d) {
      var c = d.p.cores, f = KC.FONTES[d.p.fontes];
      KE.carregarAmostra(d.p.fontes, d.nome);
      h += '<button type="button" class="dir" data-dir="' + d.id + '" aria-pressed="' + (st.prefs.direcao === d.id) + '"><span class="sw5">' +
        [c.fundo, c.primaria, c.secundaria, c.destaque, c.texto].map(function (x) { return '<i style="background:' + x + '"></i>'; }).join('') +
        '</span><b style="font-family:' + KE.pilha(f.d, f.g).replace(/"/g, '&quot;') + (f.fz && f.fz < .8 ? ';font-size:' + Math.round(16 * Math.max(f.fz, .72)) + 'px' : '') + '">' + esc(d.nome) + '</b></button>';
    });
    $('dirs').innerHTML = h;
  }
  function renderCorOp() {
    if (st.prefs.cor === 'logo' && !fotos.logoCores.length) st.prefs.cor = 'auto';
    var h = '<button type="button" data-cor="auto" aria-pressed="' + (st.prefs.cor === 'auto') + '">Cores do estilo</button>';
    if (fotos.logoCores.length) h += '<button type="button" data-cor="logo" aria-pressed="' + (st.prefs.cor === 'logo') + '">' + fotos.logoCores.map(function (c) { return '<i style="width:12px;height:12px;border-radius:50%;display:inline-block;background:' + c + '"></i>'; }).join('') + 'Cores do logo</button>';
    h += '<button type="button" data-cor="manual" aria-pressed="' + (st.prefs.cor === 'manual') + '">Minha cor</button><input type="color" id="corManual" value="' + esc(st.prefs.corManual) + '" aria-label="Escolher a cor da marca">';
    $('corOp').innerHTML = h;
  }

  /* ---------------- preencher automaticamente ---------------- */
  var NOME_CAMPO = {nome: 'nome', ramo: 'ramo', cidade: 'cidade', zap: 'WhatsApp', desc: 'descrição', serv: 'serviços', hora: 'horário', endereco: 'endereço', insta: 'Instagram'};
  function preencherAuto() {
    var t = $('f-livre').value.trim(), s = $('orgStatus');
    if (t.length < 15) { s.textContent = 'Escreva pelo menos uma frase sobre o negócio.'; s.className = 'status err'; return; }
    lerForm();
    var r = KE.extrair(t), achou = [];
    Object.keys(NOME_CAMPO).forEach(function (k) {
      if (!r[k] || st.form[k]) return;
      if (k === 'ramo' && KC.RAMOS.indexOf(r.ramo) < 0) return;
      st.form[k] = r[k]; achou.push(NOME_CAMPO[k]);
    });
    preencherForm(); renderPreview(); salvar();
    if (!achou.length) { s.textContent = 'Não achei nada novo no texto. Preencha os campos abaixo.'; s.className = 'status err'; }
    else { s.textContent = 'Preenchi: ' + achou.join(', ') + '. Confira os campos.'; s.className = 'status ok'; }
    track('preencheu_auto', {campos: achou.length});
  }

  /* ---------------- logo e fotos ---------------- */
  function hexDe(r, g, b) { return '#' + [r, g, b].map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join('').toUpperCase(); }
  function dist(a, b) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.hypot((x >> 16) - (y >> 16), (x >> 8 & 255) - (y >> 8 & 255), (x & 255) - (y & 255)); }
  function coresDoLogo(canvas) {
    var n = 48, k = document.createElement('canvas'); k.width = n; k.height = n;
    var x = k.getContext('2d'); x.drawImage(canvas, 0, 0, n, n);
    var d = x.getImageData(0, 0, n, n).data, b = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 160) continue;
      var r = d[i], g = d[i + 1], bl = d[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      if (mn > 232) continue;
      var key = (r >> 5) + '-' + (g >> 5) + '-' + (bl >> 5), o = b[key] || (b[key] = {p: 0, c: 0, r: 0, g: 0, b: 0});
      o.p += 1 + (mx ? (mx - mn) / mx : 0) * 2; o.c++; o.r += r; o.g += g; o.b += bl;
    }
    var out = [];
    Object.keys(b).map(function (k2) { return b[k2]; }).sort(function (a, z) { return z.p - a.p; }).forEach(function (o) {
      var h = hexDe(o.r / o.c, o.g / o.c, o.b / o.c);
      if (out.length < 3 && out.every(function (y) { return dist(y, h) > 70; })) out.push(h);
    });
    return out;
  }
  function lerImagem(file, max, tipo, q) {
    return new Promise(function (ok, falha) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          ok({src: c.toDataURL(tipo, q), canvas: c});
        };
        im.onerror = falha; im.src = fr.result;
      };
      fr.onerror = falha; fr.readAsDataURL(file);
    });
  }
  function renderFotos() {
    var lb = $('logoBox');
    if (fotos.logo) { lb.classList.add('has'); lb.style.backgroundImage = 'url(' + fotos.logo + ')'; lb.textContent = ''; }
    else { lb.classList.remove('has'); lb.style.backgroundImage = ''; lb.textContent = 'Sem logo'; }
    $('rmLogo').hidden = !fotos.logo;
    $('coresLogo').innerHTML = fotos.logoCores.map(function (c) { return '<i style="background:' + c + '" title="' + c + '"></i>'; }).join('');
    var capa = fotos.capa || (fotos.lista[0] && fotos.lista[0].id);
    $('fotos').innerHTML = fotos.lista.map(function (f) {
      var e = f.id === capa;
      return '<div class="foto' + (e ? ' capa' : '') + '" style="background-image:url(' + f.src + ')"><button type="button" class="fc" data-capa="' + f.id + '" aria-label="Usar como foto de capa">' + (e ? 'Capa' : '☆') + '</button><button type="button" class="fx" data-rmfoto="' + f.id + '" aria-label="Remover foto">×</button></div>';
    }).join('');
    renderCorOp();
  }
  function garantirGaleria() {
    if (!st.spec || !fotos.lista.length || st.spec.secoes.some(function (s) { return s.tipo === 'galeria'; })) return;
    var i = st.spec.secoes.findIndex(function (s) { return s.tipo === 'servicos'; });
    st.spec.secoes.splice(i >= 0 ? i + 1 : st.spec.secoes.length, 0, KE.novaSecao('galeria', st.spec, st.form));
  }

  /* ---------------- prévia ---------------- */
  var root = $('host').attachShadow({mode: 'open'});
  function specRapida() {
    var tem = !!(st.form.nome || st.form.desc || st.form.serv), f = tem ? st.form : KE.EXEMPLO.form;
    var dir = st.prefs.direcao || (KC.RAMO_DIRECOES[f.ramo] || ['editorial'])[0];
    var d = Object.assign({direcao: dir}, KE.copia(KE.preset(dir))), m = coresMarca();
    if (m.length) d.cores = KE.comMarca(d.cores, m);
    return {spec: KE.montar(d, tem ? KE.textosAuto(f, KC.DIR_EXTRA[dir].tom, 0) : KE.EXEMPLO.copy, f, tem ? fotos.lista.length : 0), form: f, exemplo: !tem};
  }
  function renderPreview() {
    var spec, ctx, badge, dica;
    if (st.spec) { spec = st.spec; ctx = {form: st.form, fotos: fotos, edit: true}; badge = 'Sua proposta'; dica = 'Clique em qualquer texto do site para editar.'; }
    else {
      var q = specRapida(); spec = q.spec; ctx = {form: q.form, fotos: q.exemplo ? {lista: []} : fotos, edit: false};
      badge = q.exemplo ? 'Exemplo' : 'Prévia rápida';
      dica = q.exemplo ? 'Exemplo de site. Preencha os seus dados para ver o seu.' : 'Prévia com o estilo escolhido. Crie as 3 propostas para ver mais opções.';
    }
    var vp = $('vp'), y = vp.scrollTop;
    root.innerHTML = '<style>' + KE.css + '</style>' + KE.render(spec, ctx);
    vp.scrollTop = y;
    if (ctx.edit) root.querySelectorAll('[data-e]').forEach(function (el) { el.setAttribute('contenteditable', 'true'); });
    $('badge').textContent = badge; $('badge').className = 'tag' + (st.spec ? ' ia' : ''); $('pdica').textContent = dica;
    $('url').textContent = ctx.form.nome || 'Seu negócio';
    atualizarWant();
  }
  root.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (e.target.closest && e.target.closest('summary') && e.target.closest('[data-e]')) e.preventDefault();
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') { e.preventDefault(); var alvo = root.getElementById(href.slice(1)); if (alvo) alvo.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
    if (st.spec) e.preventDefault();
  });
  root.addEventListener('input', function (e) {
    var el = e.target.closest && e.target.closest('[data-e]');
    if (!el || !st.spec) return;
    if (!editando) { pushHist(); editando = true; }
    KE.setPath(st.spec, el.dataset.e, el.textContent.replace(/\s+/g, ' ').trim());
    salvar(); atualizarWant(); $('undoBtn').hidden = verProps;
  });
  root.addEventListener('focusout', function () { editando = false; });
  root.addEventListener('keydown', function (e) {
    var el = e.target.closest && e.target.closest('[data-e]');
    if (el && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
  });
  root.addEventListener('paste', function (e) {
    var el = e.target.closest && e.target.closest('[data-e]'); if (!el) return;
    e.preventDefault();
    var t = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\s+/g, ' ');
    if (!document.execCommand('insertText', false, t)) el.textContent += t;
  });

  /* ---------------- propostas ---------------- */
  function escalar(box) { box.querySelectorAll('.thumb').forEach(function (t) { var i = t.querySelector('.thumb-in'); if (i && t.clientWidth) i.style.transform = 'scale(' + (t.clientWidth / 1280) + ')'; }); }
  if (window.ResizeObserver) new ResizeObserver(function () { escalar($('props')); }).observe($('props'));
  function renderPropostas() {
    var box = $('props');
    box.innerHTML = (st.propostas || []).map(function (p, i) {
      return '<div class="prop"><div class="thumb" data-esc="' + i + '" role="button" tabindex="0" aria-label="Escolher a proposta ' + esc(p.nome) + '"><div class="thumb-in"></div></div><h3>' + esc(p.nome) + '</h3><p>' + esc(p.porque || '') + '</p>' +
        '<div class="meta"><span>' + esc(KC.FONTES[p.tema.fontes].nome) + '</span></div><button class="btn go sm" type="button" data-esc="' + i + '">Escolher esta</button></div>';
    }).join('');
    box.querySelectorAll('.thumb-in').forEach(function (el, i) {
      var r = el.attachShadow({mode: 'open'});
      r.innerHTML = '<style>' + KE.css + '</style>' + KE.render(st.propostas[i], {form: st.form, fotos: fotos, edit: false, miniatura: true});
    });
    escalar(box);
    box.scrollTop = 0;
  }
  function escolher(i) {
    var p = st.propostas && st.propostas[i]; if (!p) return;
    if (st.spec) pushHist();
    st.spec = KE.copia(p);
    verProps = false; modo = 'editar'; aba = 'ajustes';
    salvar(); renderTudo(); $('painel').scrollTop = 0; if (celular()) irPara('palco');
    avisoAjuste('Você escolheu “' + p.nome + '”. Use os ajustes abaixo ou clique nos textos do site para editar.');
    track('escolheu_proposta', {estilo: p.tema.direcao});
  }
  function gerarPropostas() {
    var n = fotos.lista.length, prefs = {direcao: st.prefs.direcao, cores: coresMarca()};
    st.propostas = KE.propostasAuto(st.form, prefs, n, st.semente).map(function (d, i) {
      return KE.montar(d, KE.textosAuto(st.form, d.tom, st.semente + i), st.form, n);
    });
  }
  function criarPropostas(outras) {
    lerForm();
    if (!st.form.nome) { status('Escreva o nome do negócio.', 'err'); irPara('painel'); modo = 'montar'; renderTudo(); $('f-nome').focus(); return; }
    if (!st.form.desc && !st.form.serv) { status('Conte em uma frase o que o negócio faz ou liste os serviços.', 'err'); irPara('painel'); modo = 'montar'; renderTudo(); $('f-desc').focus(); return; }
    st.semente = outras ? st.semente + 1 : (st.propostas ? st.semente + 1 : 0);
    gerarPropostas();
    verProps = true; salvar(); renderTudo(); renderPropostas(); if (celular()) irPara('palco');
    status('Pronto! Veja as 3 propostas e escolha uma. Não gostou? Clique em "Gerar outras 3".', 'ok');
    track('gerou_propostas', {ramo: st.form.ramo || 'sem ramo', rodada: st.semente});
  }

  /* ---------------- ajustes de um clique ---------------- */
  var AJUSTES = [
    {g: 'Clima', itens: [['h:elegante', 'Mais elegante'], ['h:moderno', 'Mais moderno'], ['h:divertido', 'Mais divertido'], ['h:serio', 'Mais sério'], ['h:ousado', 'Mais ousado'], ['h:calmo', 'Mais calmo']]},
    {g: 'Cores', itens: [['c:escura', 'Fundo escuro'], ['c:clara', 'Fundo claro'], ['c:vibrante', 'Mais colorido'], ['c:pastel', 'Tons pastel'], ['girar', 'Outra paleta'], ['logo', 'Cores do logo']]},
    {g: 'Letras', itens: [['fontes', 'Outras fontes'], ['maior', 'Título maior'], ['menor', 'Título menor'], ['caixa', 'Maiúsculas']]},
    {g: 'Layout', itens: [['abertura', 'Outra abertura'], ['layouts', 'Outros layouts'], ['ordem', 'Outra ordem'], ['textos', 'Outros textos']]}
  ];
  $('ajustes').innerHTML = '<button type="button" class="btn go big" data-aj="surpresa">Surpreenda-me</button>' + AJUSTES.map(function (g) {
    return '<div class="aj-g"><span class="lbl">' + g.g + '</span><div class="aj-b">' + g.itens.map(function (x) { return '<button type="button" data-aj="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
  }).join('');

  function embaralhar(arr, R) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function heros() { return KC.LAYOUTS.hero.filter(function (h) { return fotos.lista.length || h !== 'foto-fundo'; }); }
  function ajustar(id) {
    if (!st.spec) return;
    var s = st.spec, t = s.tema, R = KE.prng(++st.giro * 2654435761), marca = coresMarca(), msg = '';
    pushHist();
    if (id === 'surpresa') {
      var hs = Object.keys(KC.HUMORES); KE.aplicarHumor(s, KE.sorteia(hs, R), st.giro, marca);
      if (R() < .5) t.cores = KE.girarCores(t.cores, 40 + Math.floor(R() * 280));
      if (marca.length) t.cores = KE.comMarca(t.cores, marca);
      s.secoes.forEach(function (x, i) { if (i === 0) x.layout = KE.sorteia(heros(), R); else if (R() < .6) x.layout = KE.sorteia(KC.LAYOUTS[x.tipo], R); });
      msg = 'Surpresa: estilo ' + KC.DIR[t.direcao].nome + ', fontes ' + KC.FONTES[t.fontes].nome + '.';
    } else if (id.indexOf('h:') === 0) {
      var h = id.slice(2); KE.aplicarHumor(s, h, st.giro, marca);
      msg = KC.HUMORES[h].nome + ': estilo ' + KC.DIR[t.direcao].nome + ', fontes ' + KC.FONTES[t.fontes].nome + '.';
    } else if (id.indexOf('c:') === 0) {
      t.cores = KE.variacao(t.cores, id.slice(2)); msg = 'Cores trocadas.';
    } else if (id === 'girar') {
      t.cores = KE.girarCores(t.cores, 40 + Math.floor(R() * 280)); msg = 'Nova paleta.';
    } else if (id === 'logo') {
      if (!fotos.logoCores.length) { hist.pop(); avisoAjuste('Envie o logo na aba "Dados e fotos" para usar as cores dele.'); return; }
      t.cores = KE.comMarca(t.cores, fotos.logoCores); msg = 'Usei as cores do seu logo.';
    } else if (id === 'fontes') {
      var ids = (KC.DIR_EXTRA[t.direcao].fontes.concat(Object.keys(KC.FONTES))).filter(function (k, i, a) { return k !== t.fontes && k !== 'pixel' && a.indexOf(k) === i; });
      t.fontes = R() < .6 ? KE.sorteia(ids.slice(0, 3), R) : KE.sorteia(ids, R); msg = 'Fontes: ' + KC.FONTES[t.fontes].nome + '.';
    } else if (id === 'maior' || id === 'menor') {
      var i0 = KC.ESCALAS.indexOf(t.escala), i1 = Math.max(0, Math.min(2, i0 + (id === 'maior' ? 1 : -1)));
      if (i0 === i1) { hist.pop(); avisoAjuste(id === 'maior' ? 'O título já está no tamanho máximo.' : 'O título já está no tamanho mínimo.'); return; }
      t.escala = KC.ESCALAS[i1]; msg = 'Título ' + KC.NOMES.escala[t.escala].toLowerCase() + '.';
    } else if (id === 'caixa') {
      t.titulos = t.titulos === 'maiusculo' ? 'normal' : 'maiusculo'; msg = t.titulos === 'maiusculo' ? 'Títulos em maiúsculas.' : 'Títulos normais.';
    } else if (id === 'abertura') {
      var lista = heros(), atual = lista.indexOf(s.secoes[0].layout); s.secoes[0].layout = lista[(atual + 1) % lista.length];
      msg = 'Abertura: ' + KC.LAYOUT_NOME[s.secoes[0].layout] + '.';
    } else if (id === 'layouts') {
      s.secoes.forEach(function (x, i) { var op = i === 0 ? heros() : KC.LAYOUTS[x.tipo]; var outros = op.filter(function (l) { return l !== x.layout; }); x.layout = KE.sorteia(outros.length ? outros : op, R); });
      msg = 'Layouts trocados.';
    } else if (id === 'ordem') {
      var meio = s.secoes.slice(1).filter(function (x) { return x.tipo !== 'contato'; }), fim = s.secoes.filter(function (x) { return x.tipo === 'contato'; });
      st.spec.secoes = [s.secoes[0]].concat(embaralhar(meio, R), fim); msg = 'Ordem das seções trocada.';
    } else if (id === 'textos') {
      var copy = KE.normCopy(KE.textosAuto(st.form, KC.DIR_EXTRA[t.direcao].tom, st.giro), st.form), p = KE.preset(t.direcao), r = KE.rascunho(st.form);
      st.spec.secoes = s.secoes.map(function (x) { return KE.limparSecao(KE.secaoDeCopy(x.tipo, x.layout, copy, copy.heroTitulo), p, r); });
      msg = 'Textos novos. Para escrever do seu jeito, clique no texto do site.';
    }
    st.spec.tema.cores = KE.ajustarCores(st.spec.tema.cores);
    salvar(); renderTudo(); avisoAjuste(msg);
    if (celular()) toast('Ajuste aplicado', true);
    track('ajuste', {tipo: id});
  }

  /* ---------------- visual ---------------- */
  var OPCOES = [['cantos', 'Cantos', KC.CANTOS], ['botoes', 'Botões', KC.BOTOES], ['titulos', 'Títulos', KC.TITULOS], ['escala', 'Tamanho do título', KC.ESCALAS], ['textura', 'Textura', KC.TEXTURAS]];
  function sw5(c) { return '<span class="sw5">' + ['fundo','superficie','primaria','secundaria','destaque'].map(function (k) { return '<i style="background:' + c[k] + '"></i>'; }).join('') + '</span>'; }
  function renderVisual() {
    var t = st.spec.tema;
    $('pal').innerHTML = KC.CORES.map(function (k) { return '<label class="pc"><input type="color" data-cor="' + k + '" value="' + t.cores[k] + '">' + KC.COR_NOME[k] + '</label>'; }).join('');
    $('vars').innerHTML = KE.VARIACOES.map(function (v) { return '<button type="button" data-var="' + v[0] + '">' + sw5(KE.variacao(t.cores, v[0])) + v[1] + '</button>'; }).join('');
    $('v-fontes').innerHTML = Object.keys(KC.FONTES).map(function (k) { return '<option value="' + k + '"' + (k === t.fontes ? ' selected' : '') + '>' + esc(KC.FONTES[k].nome) + '</option>'; }).join('');
    $('v-dir').innerHTML = KC.DIRECOES.map(function (d) { return '<option value="' + d.id + '"' + (d.id === t.direcao ? ' selected' : '') + '>' + esc(d.nome) + '</option>'; }).join('');
    $('opts').innerHTML = OPCOES.map(function (o) {
      return '<div class="opt"><span class="lbl">' + o[1] + '</span><div class="seg" data-opt="' + o[0] + '">' + o[2].map(function (v) { return '<button type="button" data-v="' + v + '" aria-pressed="' + (t[o[0]] === v) + '">' + KC.NOMES[o[0]][v] + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }
  function renderSecoes() {
    var s = st.spec.secoes;
    $('secs').innerHTML = s.map(function (x, i) {
      return '<li class="sec-i"><b>' + KC.SECAO_NOME[x.tipo] + (x.tipo === 'galeria' && !fotos.lista.length ? ' <small style="color:var(--mute);font-weight:500">(envie fotos)</small>' : '') + '</b><span class="sec-b">' +
        '<button type="button" data-mv="-1" data-i="' + i + '" aria-label="Subir ' + KC.SECAO_NOME[x.tipo] + '"' + (i <= 1 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" data-mv="1" data-i="' + i + '" aria-label="Descer ' + KC.SECAO_NOME[x.tipo] + '"' + (i === 0 || i === s.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" data-rm="' + i + '" aria-label="Remover ' + KC.SECAO_NOME[x.tipo] + '"' + (i === 0 ? ' disabled' : '') + '>×</button></span>' +
        '<select data-lay="' + i + '" aria-label="Layout de ' + KC.SECAO_NOME[x.tipo] + '">' + KC.LAYOUTS[x.tipo].map(function (l) { return '<option value="' + l + '"' + (l === x.layout ? ' selected' : '') + '>' + KC.LAYOUT_NOME[l] + '</option>'; }).join('') + '</select></li>';
    }).join('');
    var falta = KC.SECOES.filter(function (t) { return !s.some(function (x) { return x.tipo === t; }); });
    $('addSec').innerHTML = falta.length ? falta.map(function (t) { return '<option value="' + t + '">' + KC.SECAO_NOME[t] + '</option>'; }).join('') : '<option value="">Todas as seções já estão no site</option>';
    $('addSecBtn').disabled = !falta.length;
  }

  /* ---------------- histórico ---------------- */
  function pushHist() { if (!st.spec) return; hist.push(JSON.stringify(st.spec)); if (hist.length > 40) hist.shift(); }
  function desfazer() { if (!hist.length) return; st.spec = JSON.parse(hist.pop()); salvar(); renderTudo(); avisoAjuste('Desfeito.'); }

  /* ---------------- WhatsApp ---------------- */
  function atualizarWant() {
    var f = st.form, s = st.spec, l = ['Olá! Montei a prévia do meu site no Káiros Studio e quero esse site.', ''];
    l.push('Negócio: ' + (f.nome || '-') + (f.ramo ? ' (' + f.ramo + ')' : '') + (f.cidade ? ', ' + f.cidade : ''));
    if (s) {
      var t = s.tema, h = s.secoes[0];
      var est = KC.DIR[t.direcao].nome;
      l.push('Estilo: ' + est + (s.nome.indexOf(est) !== 0 ? ' (partiu da proposta ' + s.nome + ')' : ''));
      if (h && h.titulo) l.push('Título: ' + h.titulo);
      l.push('Cores: ' + [t.cores.fundo, t.cores.texto, t.cores.primaria, t.cores.secundaria, t.cores.destaque].join(' '));
      l.push('Fontes: ' + KC.FONTES[t.fontes].nome);
      l.push('Seções: ' + s.secoes.map(function (x) { return KC.SECAO_NOME[x.tipo] + ' (' + KC.LAYOUT_NOME[x.layout] + ')'; }).join(', '));
    } else if (st.prefs.direcao) l.push('Estilo: ' + KC.DIR[st.prefs.direcao].nome);
    if (fotos.logo || fotos.lista.length) l.push('Tenho ' + (fotos.logo ? 'o logo e ' : '') + fotos.lista.length + ' foto(s) para enviar por aqui.');
    if (f.serv) l.push('', 'Serviços:', f.serv);
    $('wantBtn').href = KE.waLink(KAIROS_WA, l.join('\n'));
  }

  /* ---------------- tela ---------------- */
  function renderAba() {
    document.querySelectorAll('#edTabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.t === aba)); });
    ['ajustes', 'visual', 'secoes'].forEach(function (t) { $('t-' + t).hidden = aba !== t; });
    if (!st.spec) return;
    if (aba === 'visual') renderVisual();
    if (aba === 'secoes') renderSecoes();
  }
  function renderTudo() {
    if (!st.spec && modo === 'editar') modo = 'montar';
    $('vMontar').hidden = modo !== 'montar';
    $('vEditar').hidden = modo !== 'editar';
    $('voltarEd').hidden = !(modo === 'montar' && st.spec);
    $('genBtn').textContent = st.spec ? 'Criar 3 novas propostas' : 'Criar 3 propostas';
    $('props').hidden = !verProps; $('browser').hidden = verProps;
    $('verPropBtn').hidden = !(st.propostas && st.propostas.length && !verProps);
    $('voltarSiteBtn').hidden = !(verProps && st.spec);
    $('outrasBtn').hidden = !verProps;
    $('undoBtn').hidden = !hist.length || verProps;
    if (st.spec) { $('propNome').textContent = 'Proposta: ' + st.spec.nome; renderAba(); }
    if (verProps) { $('badge').textContent = '3 propostas'; $('badge').className = 'tag'; $('pdica').textContent = 'Clique numa proposta para escolher. Depois dá para mudar tudo.'; atualizarWant(); }
    else renderPreview();
  }

  /* ---------------- eventos ---------------- */
  var tForm;
  $('vMontar').addEventListener('input', function (e) {
    if (!e.target.id || e.target.id.indexOf('f-') !== 0 || e.target.type === 'file') return;
    clearTimeout(tForm);
    tForm = setTimeout(function () { lerForm(); salvar(); if (!verProps) renderPreview(); else atualizarWant(); }, 280);
  });
  $('dirs').addEventListener('click', function (e) {
    var b = e.target.closest('.dir'); if (!b) return;
    st.prefs.direcao = b.dataset.dir; salvar(); renderDirs();
    if (!st.spec && !verProps) renderPreview();
    track('escolheu_estilo', {estilo: b.dataset.dir || 'ramo'});
  });
  $('corOp').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    st.prefs.cor = b.dataset.cor; salvar(); renderCorOp(); if (!st.spec && !verProps) renderPreview();
  });
  $('corOp').addEventListener('input', function (e) {
    if (e.target.id !== 'corManual') return;
    st.prefs.corManual = e.target.value.toUpperCase(); st.prefs.cor = 'manual'; salvar();
    $('corOp').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cor === 'manual')); });
    if (!st.spec && !verProps) renderPreview();
  });
  $('orgBtn').onclick = preencherAuto;
  $('genBtn').onclick = function () { criarPropostas(false); };
  $('outrasBtn').onclick = function () { criarPropostas(true); };
  $('voltarBtn').onclick = function () { lerForm(); modo = 'editar'; aba = 'ajustes'; renderTudo(); };

  $('f-logo').addEventListener('change', async function () {
    var f = this.files && this.files[0]; this.value = ''; if (!f) return;
    try {
      var r = await lerImagem(f, 480, 'image/png');
      fotos.logo = r.src; fotos.logoCores = coresDoLogo(r.canvas);
      if (fotos.logoCores.length && st.prefs.cor === 'auto') st.prefs.cor = 'logo';
      salvarFotos(); salvar(); renderFotos(); renderPreview();
    } catch (e) { $('fotosHint').textContent = 'Não consegui abrir esse arquivo. Tente um PNG ou JPG.'; }
  });
  $('rmLogo').onclick = function () { fotos.logo = null; fotos.logoCores = []; salvarFotos(); renderFotos(); renderPreview(); };
  $('f-fotos').addEventListener('change', async function () {
    var arr = Array.prototype.slice.call(this.files || [], 0, Math.max(0, 8 - fotos.lista.length)); this.value = '';
    if (!arr.length) { $('fotosHint').textContent = 'O limite é de 8 fotos. Remova alguma para adicionar outra.'; return; }
    $('fotosHint').textContent = 'Preparando as fotos…';
    for (var i = 0; i < arr.length; i++) {
      try { var r = await lerImagem(arr[i], 1280, 'image/jpeg', .8); fotos.lista.push({id: 'f' + Date.now().toString(36) + i, src: r.src}); } catch (e) {}
    }
    if (!fotos.capa && fotos.lista[0]) fotos.capa = fotos.lista[0].id;
    $('fotosHint').textContent = 'Até 8 fotos. Elas ficam só no seu navegador.';
    garantirGaleria(); salvarFotos(); salvar(); renderFotos(); renderPreview();
  });
  $('fotos').addEventListener('click', function (e) {
    var c = e.target.closest('[data-capa]'), x = e.target.closest('[data-rmfoto]');
    if (c) fotos.capa = c.dataset.capa;
    if (x) { fotos.lista = fotos.lista.filter(function (f) { return f.id !== x.dataset.rmfoto; }); if (fotos.capa === x.dataset.rmfoto) fotos.capa = fotos.lista[0] ? fotos.lista[0].id : null; }
    if (c || x) { salvarFotos(); renderFotos(); renderPreview(); }
  });

  $('props').addEventListener('click', function (e) { var b = e.target.closest('[data-esc]'); if (b) escolher(+b.dataset.esc); });
  $('props').addEventListener('keydown', function (e) { var b = e.target.closest('.thumb[data-esc]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); escolher(+b.dataset.esc); } });
  $('verPropBtn').onclick = function () { verProps = true; renderTudo(); renderPropostas(); };
  $('voltarSiteBtn').onclick = function () { verProps = false; renderTudo(); };
  $('undoBtn').onclick = desfazer;
  $('devSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $('devSeg').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('browser').classList.toggle('phone', b.dataset.dev === 'phone');
  });
  document.querySelector('.mtabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) irPara(b.dataset.m); });

  $('edTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t === 'dados') { modo = 'montar'; preencherForm(); renderTudo(); $('painel').scrollTop = 0; return; }
    aba = b.dataset.t; renderAba();
  });
  $('ajustes').addEventListener('click', function (e) { var b = e.target.closest('[data-aj]'); if (b) ajustar(b.dataset.aj); });

  var corDrag = false;
  $('pal').addEventListener('input', function (e) {
    var k = e.target.dataset.cor; if (!k || !st.spec) return;
    if (!corDrag) { pushHist(); corDrag = true; }
    st.spec.tema.cores[k] = e.target.value.toUpperCase();
    st.spec.tema.cores = KE.ajustarCores(st.spec.tema.cores);
    requestAnimationFrame(renderPreview);
  });
  $('pal').addEventListener('change', function () { corDrag = false; salvar(); renderVisual(); $('undoBtn').hidden = !hist.length; });
  $('vars').addEventListener('click', function (e) {
    var b = e.target.closest('[data-var]'); if (!b) return;
    pushHist(); st.spec.tema.cores = KE.variacao(st.spec.tema.cores, b.dataset.var); salvar(); renderTudo();
  });
  $('v-fontes').onchange = function () { pushHist(); st.spec.tema.fontes = this.value; salvar(); renderTudo(); };
  $('v-dir').onchange = function () { pushHist(); st.spec.tema.direcao = this.value; salvar(); renderTudo(); };
  $('usarEstilo').onclick = function () {
    var p = KE.preset(st.spec.tema.direcao); pushHist();
    var m = coresMarca();
    st.spec.tema = KE.normTema(Object.assign({direcao: st.spec.tema.direcao}, KE.copia(p), {cores: m.length ? KE.comMarca(p.cores, m) : p.cores}));
    salvar(); renderTudo();
  };
  $('opts').addEventListener('click', function (e) {
    var b = e.target.closest('button'), g = e.target.closest('[data-opt]'); if (!b || !g) return;
    pushHist(); st.spec.tema[g.dataset.opt] = b.dataset.v; salvar(); renderTudo();
  });
  $('secs').addEventListener('click', function (e) {
    var mv = e.target.closest('[data-mv]'), rm = e.target.closest('[data-rm]'), s = st.spec.secoes;
    if (mv) { var i = +mv.dataset.i, j = i + (+mv.dataset.mv); if (j < 1 || j >= s.length || i < 1) return; pushHist(); var t = s[i]; s[i] = s[j]; s[j] = t; }
    else if (rm) { var k = +rm.dataset.rm; if (k < 1) return; pushHist(); s.splice(k, 1); }
    else return;
    salvar(); renderTudo();
  });
  $('secs').addEventListener('change', function (e) {
    var i = e.target.dataset.lay; if (i == null) return;
    pushHist(); st.spec.secoes[+i].layout = e.target.value; salvar(); renderTudo();
  });
  $('addSecBtn').onclick = function () {
    var t = $('addSec').value; if (!t) return;
    pushHist();
    var s = st.spec.secoes, nova = KE.novaSecao(t, st.spec, st.form), ic = s.findIndex(function (x) { return x.tipo === 'contato'; });
    s.splice(ic > 0 ? ic : s.length, 0, nova);
    salvar(); renderTudo();
  };

  /* ---------------- início ---------------- */
  preencherForm(); renderDirs(); renderFotos(); renderTudo();
})();
