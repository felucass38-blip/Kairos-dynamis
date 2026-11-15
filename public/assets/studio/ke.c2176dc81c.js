var KE = (function () {
  'use strict';
  var E = {};

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  E.esc = esc;
  function str(v, max, fb) { return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, max) : (fb || ''); }
  E.str = str;
  function pick(v, arr, d) { return arr.indexOf(v) >= 0 ? v : d; }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  E.copia = copia;
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  /* ---------------- cor ---------------- */
  function isHex(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()); }
  E.isHex = isHex;
  function rgb(h) { var n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(r, g, b) { return '#' + [r, g, b].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join('').toUpperCase(); }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contraste(a, b) { var A = lum(a), B = lum(b); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function toHsl(h) {
    var c = rgb(h).map(function (v) { return v / 255; }), mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]), l = (mx + mn) / 2, s = 0, hu = 0;
    if (mx !== mn) { var d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === c[0]) hu = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0); else if (mx === c[1]) hu = (c[2] - c[0]) / d + 2; else hu = (c[0] - c[1]) / d + 4; hu *= 60; }
    return [hu, s * 100, l * 100];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) { var k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); }
    return hex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function sobre(cor) { return contraste(cor, '#FFFFFF') >= contraste(cor, '#111111') ? '#FFFFFF' : '#111111'; }
  function garantir(cor, fundo, min) {
    if (contraste(cor, fundo) >= min) return cor;
    var alvo = contraste('#FFFFFF', fundo) > contraste('#000000', fundo) ? '#FFFFFF' : '#000000';
    for (var t = .15; t <= 1.001; t += .05) { var c = mix(cor, alvo, t); if (contraste(c, fundo) >= min) return c; }
    return alvo;
  }
  E.contraste = contraste; E.mix = mix; E.lum = lum;

  /* Corrige a paleta para o texto ficar sempre legível. */
  E.ajustarCores = function (c) {
    c = Object.assign({}, c);
    /* fundo de meio-tom não deixa nenhum texto bem legível: clareia ou escurece o fundo */
    if (Math.max(contraste('#FFFFFF', c.fundo), contraste('#000000', c.fundo)) < 8) {
      var alvoF = lum(c.fundo) > .179 ? '#FFFFFF' : '#000000', f0 = c.fundo;
      for (var k = .1; k <= 1.001; k += .05) { c.fundo = mix(f0, alvoF, k); if (Math.max(contraste('#FFFFFF', c.fundo), contraste('#000000', c.fundo)) >= 8) break; }
    }
    c.texto = garantir(c.texto, c.fundo, 7);
    if (contraste(c.texto, c.superficie) < 4.5) c.superficie = mix(c.fundo, c.texto, .05);
    if (contraste(c.texto, c.superficie) < 4.5) c.superficie = c.fundo;
    c.suave = garantir(c.suave, c.fundo, 4.6);
    if (contraste(c.suave, c.superficie) < 4.5) c.suave = garantir(c.suave, c.superficie, 4.6);
    if (contraste(c.suave, c.fundo) < 4.5 || contraste(c.suave, c.superficie) < 4.5) {
      for (var t = .4; t >= 0; t -= .05) { var s = mix(c.texto, c.fundo, Math.max(t, 0)); if (contraste(s, c.fundo) >= 4.5 && contraste(s, c.superficie) >= 4.5) { c.suave = s; break; } }
    }
    if (contraste(c.primaria, c.fundo) < 1.6) c.primaria = garantir(c.primaria, c.fundo, 2.4);
    return c;
  };

  /* Variações de paleta a partir da cor principal. */
  E.VARIACOES = [['clara','Clara'],['escura','Escura'],['vibrante','Vibrante'],['pastel','Pastel'],['mono','Monocromática'],['terrosa','Terrosa'],['contraste','Alto contraste']];
  E.variacao = function (c, tipo) {
    var h = toHsl(c.primaria), H = h[0], S = Math.max(h[1], 40), L = h[2], r;
    switch (tipo) {
      case 'clara': r = {fundo:fromHsl(H,30,97.5), superficie:'#FFFFFF', texto:fromHsl(H,30,10), suave:fromHsl(H,12,34), primaria:c.primaria, secundaria:fromHsl(H+25,60,86), destaque:fromHsl(H+160,65,38)}; break;
      case 'escura': r = {fundo:fromHsl(H,28,7), superficie:fromHsl(H,22,12), texto:fromHsl(H,25,95), suave:fromHsl(H,12,74), primaria:L < 50 ? fromHsl(H,Math.max(S,60),62) : c.primaria, secundaria:fromHsl(H+25,45,24), destaque:fromHsl(H+160,75,62)}; break;
      case 'vibrante': r = {fundo:fromHsl(H+180,70,96), superficie:'#FFFFFF', texto:fromHsl(H,40,10), suave:fromHsl(H,15,30), primaria:fromHsl(H,85,50), secundaria:fromHsl(H+120,85,62), destaque:fromHsl(H+240,85,58)}; break;
      case 'pastel': r = {fundo:fromHsl(H,60,96), superficie:'#FFFFFF', texto:fromHsl(H,35,16), suave:fromHsl(H,15,36), primaria:fromHsl(H,55,62), secundaria:fromHsl(H+40,70,88), destaque:fromHsl(H+200,55,78)}; break;
      case 'mono': r = {fundo:fromHsl(H,22,96), superficie:fromHsl(H,22,91), texto:fromHsl(H,45,12), suave:fromHsl(H,15,34), primaria:c.primaria, secundaria:fromHsl(H,S,84), destaque:fromHsl(H,S,32)}; break;
      case 'terrosa': r = {fundo:'#F3EDE4', superficie:'#EAE1D3', texto:'#2B2420', suave:'#5B5149', primaria:fromHsl(H,45,40), secundaria:'#C9A97E', destaque:'#5F7653'}; break;
      case 'contraste': r = {fundo:'#0B0B0B', superficie:'#161616', texto:'#FAFAFA', suave:'#C4C4C4', primaria:fromHsl(H,90,58), secundaria:'#FAFAFA', destaque:fromHsl(H+180,90,60)}; break;
      default: r = Object.assign({}, c);
    }
    return E.ajustarCores(r);
  };
  /* Aplica as cores da marca (logo ou escolhida) sobre uma paleta. */
  E.comMarca = function (c, marca) {
    marca = (marca || []).filter(isHex);
    if (!marca.length) return c;
    var r = Object.assign({}, c);
    r.primaria = marca[0].toUpperCase();
    r.secundaria = marca[1] ? marca[1].toUpperCase() : mix(marca[0], c.fundo, .72);
    if (marca[2]) r.destaque = marca[2].toUpperCase();
    return E.ajustarCores(r);
  };

  /* ---------------- fontes ---------------- */
  var carregadas = {};
  E.carregarFonte = function (id) {
    var f = KC.FONTES[id];
    if (!f || carregadas[id] || typeof document === 'undefined') return;
    carregadas[id] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.url + '&display=swap';
    document.head.appendChild(l);
  };
  E.carregarAmostra = function (id, texto) {
    var f = KC.FONTES[id];
    if (!f || typeof document === 'undefined') return;
    var k = id + '|' + texto; if (carregadas[k]) return; carregadas[k] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.d.replace(/ /g, '+') + '&text=' + encodeURIComponent(texto) + '&display=swap';
    document.head.appendChild(l);
  };
  function pilha(nome, g) { return "'" + nome + "'," + (g === 'monospace' ? 'ui-monospace,monospace' : g === 'serif' ? 'Georgia,serif' : g === 'cursive' ? 'cursive' : 'system-ui,sans-serif'); }
  E.pilha = pilha;

  /* ---------------- dados do negócio ---------------- */
  E.parseServ = function (t) {
    return String(t || '').split('\n').map(function (l) { return l.trim().replace(/^[-•*]\s*/, ''); }).filter(Boolean).slice(0, 12).map(function (l) {
      l = l.replace(/(\d[\d.,]*)\s?reais\b/i, 'R$ $1');
      var partes = l.split(/\s+[-–—|]\s+|\s*:\s+(?=R\$)/), nome = partes.shift(), preco = '', desc = [];
      partes.forEach(function (x) { if (/R\$/.test(x)) preco = x.trim(); else if (x.trim()) desc.push(x.trim()); });
      if (!preco) { var m = nome.match(/^(.*?)\s+(R\$\s?[\d.,]+.*)$/); if (m) { nome = m[1]; preco = m[2]; } }
      return {nome: nome.trim(), preco: preco, desc: desc.join(' - ')};
    }).filter(function (x) { return x.nome; });
  };
  function frases(t) { return String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean); }
  E.waLink = function (zap, msg) { var d = String(zap || '').replace(/\D/g, ''); if (d.length < 10) return ''; if (d.length <= 11) d = '55' + d; return 'https://wa.me/' + d + (msg ? '?text=' + encodeURIComponent(msg) : ''); };
  function mapsLink(end) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(end); }
  function instaHandle(v) { var m = String(v || '').trim().match(/([A-Za-z0-9._]{2,30})\/?$/); return m ? m[1] : ''; }
  function fmtZap(z) { var d = String(z || '').replace(/\D/g, ''); if (d.length === 13 && d.slice(0, 2) === '55') d = d.slice(2); if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7); if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); return z; }

  /* Texto de partida feito só com o que o cliente escreveu (nada inventado). */
  E.rascunho = function (f) {
    f = f || {};
    var sv = E.parseServ(f.serv), fr = frases(f.desc), dest = ['Atendimento pelo WhatsApp'];
    if (f.cidade) dest.push('Atendemos ' + f.cidade);
    if (f.hora) dest.push(f.hora);
    var faq = [{p:'Como faço um pedido?', r:'Chame no WhatsApp e conte o que você precisa.'}];
    if (f.hora) faq.push({p:'Qual é o horário de atendimento?', r:f.hora.replace(/\.?$/, '.')});
    if (f.endereco) faq.push({p:'Onde fica?', r:f.endereco.replace(/\.?$/, '.')});
    return {eyebrow:[f.ramo, f.cidade].filter(Boolean).join(' · '), heroTitulo:f.nome || 'Seu negócio', heroTexto:fr[0] || '', cta:'Chamar no WhatsApp',
      destaques:dest, sobreTitulo:'Sobre', sobreTexto:f.desc || '', frase:fr[0] || '', servTitulo:'Serviços', servIntro:'',
      servicos:sv.map(function (s) { return {nome:s.nome, descricao:''}; }), galeriaTitulo:'Galeria', faqTitulo:'Perguntas frequentes', faq:faq,
      chamadaTitulo:'Vamos conversar?', chamadaTexto:'Chame no WhatsApp e tire suas dúvidas.', contatoTitulo:'Fale com a gente', contatoTexto:''};
  };

  E.EXEMPLO = {
    form: {nome:'Ateliê Dona Cida', ramo:'Confeitaria', cidade:'Guarulhos, SP', zap:'11 99999-0000',
      desc:'Bolos e doces caseiros sob encomenda para festas, aniversários e casamentos. Receitas de família, feitas no dia da entrega.',
      serv:'Bolo de festa - a partir de R$ 120\nDocinhos (cento) - R$ 95\nTorta de limão - R$ 70\nKit festa', hora:'Terça a sábado, das 9h às 18h', endereco:'', insta:''},
    copy: {eyebrow:'Confeitaria em Guarulhos', heroTitulo:'Bolos de família para a sua festa', heroTexto:'Bolos e doces caseiros feitos no dia da entrega, com receitas de família.', cta:'Encomendar no WhatsApp',
      destaques:['Feito no dia da entrega','Receitas de família','Encomendas pelo WhatsApp'], sobreTitulo:'Do forno da Cida para a sua mesa',
      sobreTexto:'O ateliê nasceu na cozinha de casa, em Guarulhos. Cada bolo é montado sob encomenda, com receitas de família e tudo preparado no dia.',
      frase:'Bolo bom é o que chega fresquinho e com cheiro de casa.', servTitulo:'Cardápio de encomendas', servIntro:'Escolha o seu e chame no WhatsApp para combinar data e sabor.',
      servicos:[{nome:'Bolo de festa', descricao:'Massa fofinha com recheio à sua escolha.'},{nome:'Docinhos (cento)', descricao:'Brigadeiro, beijinho e casadinho enrolados à mão.'},{nome:'Torta de limão', descricao:'Base crocante, creme azedinho e merengue maçaricado.'},{nome:'Kit festa', descricao:'Bolo e docinhos combinados para a sua comemoração.'}],
      galeriaTitulo:'Da nossa cozinha', faqTitulo:'Perguntas frequentes',
      faq:[{p:'Com quanto tempo de antecedência devo encomendar?', r:'Chame no WhatsApp para ver as datas livres.'},{p:'Vocês entregam?', r:'Combine a retirada ou a entrega pelo WhatsApp.'},{p:'Qual é o horário de atendimento?', r:'Terça a sábado, das 9h às 18h.'}],
      chamadaTitulo:'Tem festa chegando?', chamadaTexto:'Conte a data e o tamanho da festa, a gente monta o pedido com você.', contatoTitulo:'Faça sua encomenda', contatoTexto:'Atendemos pelo WhatsApp de terça a sábado.'}
  };

  /* ---------------- especificação ---------------- */
  E.preset = function (id) { return (KC.DIR[id] || KC.DIR.minimalismo).p; };

  E.normTema = function (t, dirPadrao) {
    t = t || {};
    var dir = KC.DIR[t.direcao] ? t.direcao : (KC.DIR[dirPadrao] ? dirPadrao : 'minimalismo'), p = E.preset(dir), cores = {};
    KC.CORES.forEach(function (k) { var v = t.cores && t.cores[k]; cores[k] = isHex(v) ? v.trim().toUpperCase() : p.cores[k]; });
    return {direcao:dir, cores:E.ajustarCores(cores), fontes:KC.FONTES[t.fontes] ? t.fontes : p.fontes,
      cantos:pick(t.cantos, KC.CANTOS, p.cantos), textura:pick(t.textura, KC.TEXTURAS, p.textura), botoes:pick(t.botoes, KC.BOTOES, p.botoes),
      titulos:pick(t.titulos, KC.TITULOS, p.titulos), escala:pick(t.escala, KC.ESCALAS, p.escala)};
  };

  function lista(v, max, len) { return Array.isArray(v) ? v.map(function (x) { return str(x, len); }).filter(Boolean).slice(0, max) : []; }
  E.normCopy = function (c, f) {
    var r = E.rascunho(f); c = (c && typeof c === 'object') ? c : {};
    var sv = Array.isArray(c.servicos) ? c.servicos.slice(0, 12).map(function (s) { s = s || {}; return {nome:str(s.nome, 70), descricao:str(s.descricao, 200)}; }).filter(function (s) { return s.nome; }) : [];
    var faq = Array.isArray(c.faq) ? c.faq.slice(0, 8).map(function (q) { q = q || {}; return {p:str(q.p, 140), r:str(q.r, 400)}; }).filter(function (q) { return q.p && q.r; }) : [];
    var dest = lista(c.destaques, 6, 60);
    var o = {};
    ['eyebrow','heroTitulo','heroTexto','cta','sobreTitulo','sobreTexto','frase','servTitulo','servIntro','galeriaTitulo','faqTitulo','chamadaTitulo','chamadaTexto','contatoTitulo','contatoTexto'].forEach(function (k) {
      o[k] = str(c[k], k === 'sobreTexto' ? 900 : k === 'heroTexto' ? 280 : 200, r[k]);
    });
    o.servicos = sv.length ? sv : r.servicos; o.faq = faq.length ? faq : r.faq; o.destaques = dest.length ? dest : r.destaques;
    return o;
  };

  E.secaoDeCopy = function (tipo, layout, c, tituloHero) {
    switch (tipo) {
      case 'hero': return {tipo:tipo, layout:layout, eyebrow:c.eyebrow, titulo:tituloHero || c.heroTitulo, texto:c.heroTexto, cta:c.cta};
      case 'destaques': return {tipo:tipo, layout:layout, itens:c.destaques.slice()};
      case 'sobre': return {tipo:tipo, layout:layout, titulo:c.sobreTitulo, texto:c.sobreTexto, frase:c.frase};
      case 'servicos': return {tipo:tipo, layout:layout, titulo:c.servTitulo, intro:c.servIntro, itens:copia(c.servicos)};
      case 'galeria': return {tipo:tipo, layout:layout, titulo:c.galeriaTitulo};
      case 'faq': return {tipo:tipo, layout:layout, titulo:c.faqTitulo, itens:copia(c.faq)};
      case 'chamada': return {tipo:tipo, layout:layout, titulo:c.chamadaTitulo, texto:c.chamadaTexto, cta:c.cta};
      case 'contato': return {tipo:tipo, layout:layout, titulo:c.contatoTitulo, texto:c.contatoTexto};
    }
    return null;
  };

  E.limparSecao = function (x, p, r) {
    var t = x.tipo, L = KC.LAYOUTS[t], s = {tipo:t, layout:pick(x.layout, L, p.layouts[t])};
    function itensServ(v) { var a = Array.isArray(v) ? v.slice(0, 12).map(function (i) { i = i || {}; return {nome:str(i.nome, 70), descricao:str(i.descricao, 200)}; }).filter(function (i) { return i.nome; }) : []; return a.length ? a : copia(r.servicos); }
    function itensFaq(v) { var a = Array.isArray(v) ? v.slice(0, 8).map(function (i) { i = i || {}; return {p:str(i.p, 140), r:str(i.r, 400)}; }).filter(function (i) { return i.p && i.r; }) : []; return a.length ? a : copia(r.faq); }
    if (t === 'hero') { s.eyebrow = str(x.eyebrow, 60); s.titulo = str(x.titulo, 90, r.heroTitulo); s.texto = str(x.texto, 280); s.cta = str(x.cta, 32, r.cta); }
    if (t === 'destaques') { var d = lista(x.itens, 6, 60); s.itens = d.length ? d : r.destaques.slice(); }
    if (t === 'sobre') { s.titulo = str(x.titulo, 70, r.sobreTitulo); s.texto = str(x.texto, 900, r.sobreTexto); s.frase = str(x.frase, 160, r.frase); }
    if (t === 'servicos') { s.titulo = str(x.titulo, 70, r.servTitulo); s.intro = str(x.intro, 200); s.itens = itensServ(x.itens); }
    if (t === 'galeria') { s.titulo = str(x.titulo, 70, r.galeriaTitulo); }
    if (t === 'faq') { s.titulo = str(x.titulo, 70, r.faqTitulo); s.itens = itensFaq(x.itens); }
    if (t === 'chamada') { s.titulo = str(x.titulo, 90, r.chamadaTitulo); s.texto = str(x.texto, 220); s.cta = str(x.cta, 32, r.cta); }
    if (t === 'contato') { s.titulo = str(x.titulo, 70, r.contatoTitulo); s.texto = str(x.texto, 220); }
    return s;
  };

  function ordemValida(ordem, p, nFotos) {
    var o = [];
    (Array.isArray(ordem) ? ordem : []).forEach(function (t) { if (KC.SECOES.indexOf(t) >= 0 && o.indexOf(t) < 0) o.push(t); });
    if (o.length < 3) o = p.ordem.slice();
    o = o.filter(function (t) { return t !== 'hero'; }); o.unshift('hero');
    if (o.indexOf('servicos') < 0) o.splice(1, 0, 'servicos');
    if (o.indexOf('contato') < 0) o.push('contato');
    if (!nFotos) o = o.filter(function (t) { return t !== 'galeria'; });
    else if (o.indexOf('galeria') < 0) o.splice(o.indexOf('servicos') + 1, 0, 'galeria');
    return o;
  }

  /* Junta uma proposta de design + textos + dados do negócio numa especificação completa. */
  E.montar = function (d, copy, f, nFotos) {
    d = (d && typeof d === 'object') ? d : {};
    var tema = E.normTema(d, d.direcao), p = E.preset(tema.direcao), c = E.normCopy(copy, f), r = E.rascunho(f), L = d.layouts || {};
    var secoes = ordemValida(d.ordem, p, nFotos).map(function (t) {
      var x = E.secaoDeCopy(t, L[t], c, t === 'hero' ? str(d.heroTitulo, 90) : '');
      return E.limparSecao(x, p, r);
    });
    return {nome:str(d.nome, 40, KC.DIR[tema.direcao].nome), porque:str(d.porque, 180), tema:tema, secoes:secoes};
  };

  /* Valida um site salvo ou editado. */
  E.normalizar = function (s, f, nFotos, anterior) {
    s = (s && typeof s === 'object') ? s : {};
    var tema = E.normTema(s.tema, anterior && anterior.tema && anterior.tema.direcao), p = E.preset(tema.direcao), r = E.rascunho(f), vistos = {}, secoes = [];
    (Array.isArray(s.secoes) ? s.secoes : []).forEach(function (x) {
      if (!x || KC.SECOES.indexOf(x.tipo) < 0 || vistos[x.tipo]) return;
      vistos[x.tipo] = 1; secoes.push(E.limparSecao(x, p, r));
    });
    if (!vistos.hero) secoes.unshift(E.limparSecao({tipo:'hero'}, p, r));
    var hi = secoes.findIndex(function (x) { return x.tipo === 'hero'; });
    if (hi > 0) secoes.unshift(secoes.splice(hi, 1)[0]);
    return {nome:(anterior && anterior.nome) || KC.DIR[tema.direcao].nome, porque:(anterior && anterior.porque) || '', tema:tema, secoes:secoes};
  };

  E.novaSecao = function (tipo, spec, f) {
    var p = E.preset(spec.tema.direcao), r = E.rascunho(f);
    var tom = (KC.DIR_EXTRA && KC.DIR_EXTRA[spec.tema.direcao] || {}).tom;
    return E.limparSecao(E.secaoDeCopy(tipo, p.layouts[tipo], E.normCopy(E.textosAuto ? E.textosAuto(f, tom, 0) : null, f), ''), p, r);
  };

  /* Três propostas simples a partir dos estilos e do ramo (versão antiga). */
  E.propostasLocais = function (f, prefs) {
    prefs = prefs || {};
    var marca = prefs.cores || [], dirs, mesmo = false;
    if (KC.DIR[prefs.direcao]) { dirs = [prefs.direcao, prefs.direcao, prefs.direcao]; mesmo = true; }
    else dirs = (KC.RAMO_DIRECOES[f.ramo] || KC.RAMO_DIRECOES.Outro).slice(0, 3);
    return dirs.map(function (id, i) {
      var p = copia(E.preset(id)), nome = KC.DIR[id].nome, d = Object.assign({direcao:id, nome:nome, porque:'Ponto de partida do estilo ' + nome + '.'}, p);
      if (marca.length) d.cores = E.comMarca(d.cores, marca);
      if (mesmo && i === 1) { d.nome = nome + ' ousado'; d.porque = 'A mesma ideia com cores mais fortes e título enorme.'; d.escala = 'gigante'; d.cores = E.variacao(d.cores, 'vibrante'); d.layouts.hero = p.layouts.hero === 'poster' ? 'foto-fundo' : 'poster'; d.layouts.servicos = 'bento'; }
      if (mesmo && i === 2) { d.nome = nome + ' sóbrio'; d.porque = 'Versão mais calma, com muito espaço e leitura fácil.'; d.escala = 'grande'; d.cores = E.variacao(d.cores, 'clara'); d.layouts.hero = 'simples'; d.textura = 'nenhuma'; d.layouts.servicos = 'lista'; }
      return d;
    });
  };

  E.setPath = function (o, path, val) {
    var k = path.split('.'), x = o;
    for (var i = 0; i < k.length - 1; i++) { x = x[isNaN(k[i]) ? k[i] : +k[i]]; if (x == null) return; }
    x[isNaN(k[k.length - 1]) ? k[k.length - 1] : +k[k.length - 1]] = val;
  };

  /* ---------------- render ---------------- */
  E.classes = function (s) {
    var t = s.tema;
    return 'site d-' + t.direcao + ' c-' + t.cantos + ' t-' + t.textura + ' b-' + t.botoes + ' h-' + t.titulos + ' e-' + t.escala + (lum(t.cores.fundo) < .18 ? ' escuro' : '');
  };
  E.vars = function (s) {
    var t = s.tema, c = t.cores, f = KC.FONTES[t.fontes] || KC.FONTES.manrope;
    return ['--bg:' + c.fundo, '--sf:' + c.superficie, '--tx:' + c.texto, '--mu:' + c.suave, '--p1:' + c.primaria, '--p2:' + c.secundaria, '--ac:' + c.destaque,
      '--on1:' + sobre(c.primaria), '--on2:' + sobre(c.secundaria), '--onA:' + sobre(c.destaque), '--acT:' + garantir(c.destaque, c.fundo, 3.2), '--p1T:' + garantir(c.primaria, c.fundo, 3.2),
      '--ln:' + mix(c.fundo, c.texto, .16), '--fd:' + pilha(f.d, f.g), '--fb:' + pilha(f.b, f.g === 'monospace' ? 'monospace' : 'sans'), '--fdw:' + f.dw, '--fz:' + (f.fz || 1)].join(';');
  };

  function T(R, path, tag, cls, val, extra) {
    if (!val && !R.ed) return '';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + (R.ed ? ' data-e="' + path + '" data-ph="Escreva aqui"' : '') + (extra || '') + '>' + esc(val) + '</' + tag + '>';
  }
  function img(src, alt, cls) { return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + src + '" alt="' + esc(alt) + '" loading="lazy">'; }

  function contexto(spec, ctx) {
    ctx = ctx || {};
    var f = ctx.form || {}, fotos = ctx.fotos || {lista: []}, ls = fotos.lista || [];
    var capa = ls.filter(function (x) { return x.id === fotos.capa; })[0] || ls[0] || null;
    var outras = ls.filter(function (x) { return x !== capa; });
    var precos = {lista: E.parseServ(f.serv), nome: {}};
    precos.lista.forEach(function (x) { if (x.preco) precos.nome[norm(x.nome)] = x.preco; });
    return {spec:spec, f:f, ed:!!ctx.edit, fotos:fotos, lista:ls, capa:capa, outras:outras.length ? outras : ls, precos:precos,
      wa:E.waLink(f.zap, 'Olá! Vi o site da ' + (f.nome || 'empresa') + ' e quero saber mais.')};
  }
  function precoDe(R, item, j) {
    var n = norm(item.nome); if (R.precos.nome[n]) return R.precos.nome[n];
    var l = R.precos.lista[j]; return (l && l.preco) ? l.preco : '';
  }
  function inicial(R) { var m = String(R.f.nome || 'K').match(/[A-Za-zÀ-ÿ0-9]/); return (m ? m[0] : 'K').toUpperCase(); }
  function mono(R) { return '<div class="mono tx" aria-hidden="true"><span>' + esc(inicial(R)) + '</span><i class="f1"></i><i class="f2"></i><i class="f3"></i></div>'; }
  function botao(R, path, cta) {
    if (!R.wa && !R.ed) return '';
    return '<a class="bt" href="' + esc(R.wa || '#') + '" target="_blank" rel="noopener">' + T(R, path, 'span', '', cta) + '</a>';
  }
  function acoes(R, path, cta, mapa) {
    var a = botao(R, path, cta);
    if (mapa && R.f.endereco) a += '<a class="lk" href="' + esc(mapsLink(R.f.endereco)) + '" target="_blank" rel="noopener">Como chegar</a>';
    return a ? '<div class="acts">' + a + '</div>' : '';
  }
  function titulo1(R, p, s) { return '<h1 class="h1">' + T(R, p + 'titulo', 'span', 'hl', s.titulo) + '</h1>'; }
  function cabeca(R, p, s, introKey) {
    var h = T(R, p + 'titulo', 'h2', '', s.titulo) + (introKey ? T(R, p + introKey, 'p', '', s[introKey]) : '');
    return h ? '<div class="sh">' + h + '</div>' : '';
  }

  var HERO = {
    simples: function (s, p, R) { return '<header class="hx hx-simples tx" id="topo"><div class="in">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) + T(R, p + 'texto', 'p', 'lead', s.texto) + acoes(R, p + 'cta', s.cta, true) + '</div></header>'; },
    centro: function (s, p, R) { return '<header class="hx hx-centro tx" id="topo"><div class="in">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) + T(R, p + 'texto', 'p', 'lead', s.texto) + acoes(R, p + 'cta', s.cta, true) + '</div></header>'; },
    dividido: function (s, p, R) {
      var media = R.capa ? img(R.capa.src, (R.f.nome || 'Foto') + ', foto de capa') : mono(R);
      return '<header class="hx hx-dividido" id="topo"><div class="in grid2"><div class="hx-txt">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) + T(R, p + 'texto', 'p', 'lead', s.texto) + acoes(R, p + 'cta', s.cta, true) + '</div><div class="hx-media">' + media + '</div></div></header>';
    },
    poster: function (s, p, R) {
      var info = '';
      if (R.f.cidade) info += '<div><dt>Onde</dt><dd>' + esc(R.f.cidade) + '</dd></div>';
      if (R.f.hora) info += '<div><dt>Horário</dt><dd>' + esc(R.f.hora) + '</dd></div>';
      return '<header class="hx hx-poster inv tx" id="topo"><div class="in">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) +
        '<div class="hx-info"><div>' + T(R, p + 'texto', 'p', 'lead', s.texto) + '</div>' + (info ? '<dl class="mini">' + info + '</dl>' : '<span></span>') + acoes(R, p + 'cta', s.cta, false) + '</div></div></header>';
    },
    'foto-fundo': function (s, p, R) {
      if (!R.capa) return HERO.simples(s, p, R);
      return '<header class="hx hx-foto" id="topo" style="--img:url(\'' + R.capa.src + '\')"><div class="in">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) + T(R, p + 'texto', 'p', 'lead', s.texto) + acoes(R, p + 'cta', s.cta, true) + '</div></header>';
    },
    editorial: function (s, p, R) {
      var dir = R.f.hora || (R.f.cidade && String(s.eyebrow || '').indexOf(R.f.cidade) < 0 ? R.f.cidade : '');
      return '<header class="hx hx-editorial" id="topo"><div class="in"><div class="mast">' + (T(R, p + 'eyebrow', 'span', 'ey', s.eyebrow) || '<span></span>') + (dir ? '<span class="ey">' + esc(dir) + '</span>' : '') + '</div>' + titulo1(R, p, s) +
        '<div class="ed-row">' + (T(R, p + 'texto', 'p', 'lead', s.texto) || '<span></span>') + acoes(R, p + 'cta', s.cta, true) + '</div>' + (R.capa ? '<figure class="ed-img">' + img(R.capa.src, (R.f.nome || 'Foto') + ', foto de capa') + '</figure>' : '') + '</div></header>';
    },
    cartao: function (s, p, R) {
      return '<header class="hx hx-cartao tx' + (R.capa ? ' has-img' : '') + '" id="topo"' + (R.capa ? ' style="--img:url(\'' + R.capa.src + '\')"' : '') + '><div class="in"><div class="hx-card">' + T(R, p + 'eyebrow', 'p', 'ey', s.eyebrow) + titulo1(R, p, s) + T(R, p + 'texto', 'p', 'lead', s.texto) + acoes(R, p + 'cta', s.cta, true) + '</div></div></header>';
    }
  };

  var SEC = {
    hero: function (s, i, R) { return (HERO[s.layout] || HERO.simples)(s, 'secoes.' + i + '.', R); },
    destaques: function (s, i, R) {
      var p = 'secoes.' + i + '.', it = s.itens || [];
      if (!it.length) return '';
      var li = it.map(function (t, j) { return '<li>' + (s.layout === 'colunas' ? '<i class="mk mk' + (j % 3) + '"></i>' : '') + T(R, p + 'itens.' + j, 'span', '', t) + '</li>'; }).join('');
      if (s.layout === 'faixa') return '<section class="ds ds-faixa inv2" aria-label="Destaques"><div class="in"><ul>' + li + '</ul></div></section>';
      if (s.layout === 'colunas') return '<section class="sc sc-curta ds ds-colunas" aria-label="Destaques"><div class="in"><ul>' + li + '</ul></div></section>';
      return '<section class="ds ds-chips" aria-label="Destaques"><div class="in"><ul>' + li + '</ul></div></section>';
    },
    sobre: function (s, i, R) {
      var p = 'secoes.' + i + '.';
      if (s.layout === 'dividido') {
        var foto = R.outras[0];
        var media = foto ? img(foto.src, (R.f.nome || 'Foto') + ', sobre o negócio') : '<div class="sb-bloco inv2 tx">' + T(R, p + 'frase', 'p', 'sbq', s.frase) + '</div>';
        return '<section class="sc sb sb-dividido" id="sobre"><div class="in grid2"><div class="sb-media">' + media + '</div><div>' + cabeca(R, p, s) + T(R, p + 'texto', 'p', 'bd', s.texto) + '</div></div></section>';
      }
      if (s.layout === 'citacao') return '<section class="sc sb sb-citacao" id="sobre"><div class="in">' + T(R, p + 'titulo', 'p', 'ey', s.titulo) + T(R, p + 'frase', 'blockquote', 'q', s.frase) + T(R, p + 'texto', 'p', 'bd', s.texto) + '</div></section>';
      return '<section class="sc sb sb-texto" id="sobre"><div class="in">' + cabeca(R, p, s) + T(R, p + 'texto', 'p', 'bd', s.texto) + '</div></section>';
    },
    servicos: function (s, i, R) {
      var p = 'secoes.' + i + '.', it = s.itens || [], L = s.layout, h = '';
      if (!it.length && !R.ed) return '';
      function pedir(x) { var l = E.waLink(R.f.zap, 'Olá! Quero pedir: ' + x.nome); return l ? '<a class="lk" href="' + esc(l) + '" target="_blank" rel="noopener">Pedir pelo WhatsApp</a>' : ''; }
      function pr(x, j) { var v = precoDe(R, x, j); return v ? '<p class="pr">' + esc(v) + '</p>' : ''; }
      if (L === 'lista') h = '<ul class="sv-lista">' + it.map(function (x, j) { return '<li><div>' + T(R, p + 'itens.' + j + '.nome', 'h3', '', x.nome) + T(R, p + 'itens.' + j + '.descricao', 'p', '', x.descricao) + '</div><div class="sv-r">' + pr(x, j) + pedir(x) + '</div></li>'; }).join('') + '</ul>';
      else if (L === 'cardapio') h = '<ul class="sv-menu">' + it.map(function (x, j) { var v = precoDe(R, x, j); return '<li><div class="mn-row">' + T(R, p + 'itens.' + j + '.nome', 'h3', '', x.nome) + (v ? '<span class="dots"></span><span class="pr">' + esc(v) + '</span>' : '') + '</div>' + T(R, p + 'itens.' + j + '.descricao', 'p', '', x.descricao) + pedir(x) + '</li>'; }).join('') + '</ul>';
      else h = '<div class="' + (L === 'bento' ? 'sv-bento' : 'sv-g') + '">' + it.map(function (x, j) { return '<article class="cd' + (L === 'bento' && j === 0 ? ' big inv' : '') + '">' + T(R, p + 'itens.' + j + '.nome', 'h3', '', x.nome) + T(R, p + 'itens.' + j + '.descricao', 'p', 'cdx', x.descricao) + pr(x, j) + pedir(x) + '</article>'; }).join('') + '</div>';
      return '<section class="sc sv" id="servicos"><div class="in">' + cabeca(R, p, s, 'intro') + h + '</div></section>';
    },
    galeria: function (s, i, R) {
      if (!R.lista.length) return '';
      var p = 'secoes.' + i + '.', fotos = R.lista.length > 3 ? R.outras : R.lista;
      var g = fotos.map(function (x, k) { return '<figure>' + img(x.src, (R.f.nome || 'Foto') + ', foto ' + (k + 1)) + '</figure>'; }).join('');
      return '<section class="sc gal" id="galeria"><div class="in">' + cabeca(R, p, s) + '<div class="gl gl-' + s.layout + '">' + g + '</div></div></section>';
    },
    faq: function (s, i, R) {
      var p = 'secoes.' + i + '.', it = s.itens || [], h;
      if (s.layout === 'colunas') h = '<div class="fq-col">' + it.map(function (q, j) { return '<div>' + T(R, p + 'itens.' + j + '.p', 'h3', '', q.p) + T(R, p + 'itens.' + j + '.r', 'p', '', q.r) + '</div>'; }).join('') + '</div>';
      else h = '<div class="fq-lista">' + it.map(function (q, j) { return '<details' + (R.ed || j === 0 ? ' open' : '') + '><summary>' + T(R, p + 'itens.' + j + '.p', 'span', '', q.p) + '</summary>' + T(R, p + 'itens.' + j + '.r', 'p', '', q.r) + '</details>'; }).join('') + '</div>';
      return '<section class="sc fq" id="perguntas"><div class="in">' + cabeca(R, p, s) + h + '</div></section>';
    },
    chamada: function (s, i, R) {
      var p = 'secoes.' + i + '.';
      if (s.layout === 'cartaz') return '<section class="ch ch-cartaz inv2 tx"><div class="in">' + T(R, p + 'titulo', 'h2', '', s.titulo) + T(R, p + 'texto', 'p', '', s.texto) + acoes(R, p + 'cta', s.cta, false) + '</div></section>';
      return '<section class="ch ch-faixa inv tx"><div class="in"><div>' + T(R, p + 'titulo', 'h2', '', s.titulo) + T(R, p + 'texto', 'p', '', s.texto) + '</div>' + acoes(R, p + 'cta', s.cta, false) + '</div></section>';
    },
    contato: function (s, i, R) {
      var p = 'secoes.' + i + '.', f = R.f, it = [], ih = instaHandle(f.insta);
      if (f.zap) it.push(['WhatsApp', esc(fmtZap(f.zap)), R.wa ? '<a class="lk" href="' + esc(R.wa) + '" target="_blank" rel="noopener">Abrir conversa</a>' : '']);
      if (f.hora) it.push(['Horário', esc(f.hora), '']);
      if (f.endereco) it.push(['Endereço', esc(f.endereco), '<a class="lk" href="' + esc(mapsLink(f.endereco)) + '" target="_blank" rel="noopener">Como chegar</a>']);
      else if (f.cidade) it.push(['Onde', esc(f.cidade), '']);
      if (ih) it.push(['Instagram', '@' + esc(ih), '<a class="lk" href="https://www.instagram.com/' + esc(ih) + '/" target="_blank" rel="noopener">Ver perfil</a>']);
      var btn = R.wa ? '<div class="acts"><a class="bt" href="' + esc(R.wa) + '" target="_blank" rel="noopener">Chamar no WhatsApp</a></div>' : '';
      if (s.layout === 'dividido') {
        return '<section class="sc ct ct-dividido" id="contato"><div class="in grid2"><div>' + cabeca(R, p, s, 'texto') + btn + '</div>' + (it.length ? '<dl class="ct-dl">' +
          it.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>' + (x[2] ? '<dd class="ct-lk">' + x[2] + '</dd>' : '') + '</div>'; }).join('') + '</dl>' : '') + '</div></section>';
      }
      return '<section class="sc ct ct-cartoes" id="contato"><div class="in">' + cabeca(R, p, s, 'texto') + (it.length ? '<div class="ct-g">' +
        it.map(function (x) { return '<div class="cd"><small>' + x[0] + '</small><strong>' + x[1] + '</strong>' + x[2] + '</div>'; }).join('') + '</div>' : btn) + '</div></section>';
    }
  };

  E.render = function (spec, ctx) {
    var R = contexto(spec, ctx), f = R.f, hero = spec.secoes[0], links = [];
    E.carregarFonte(spec.tema.fontes);
    ['servicos','sobre','galeria','contato'].forEach(function (t) {
      if (spec.secoes.some(function (s) { return s.tipo === t; }) && (t !== 'galeria' || R.lista.length)) links.push('<a href="#' + t + '">' + KC.SECAO_NOME[t] + '</a>');
    });
    var marca = R.fotos.logo ? '<img src="' + R.fotos.logo + '" alt="' + esc(f.nome || 'Logo') + '">' : '<span>' + esc(f.nome || 'Seu negócio') + '</span>';
    var h = '<div class="' + E.classes(spec) + (R.ed ? ' ed' : '') + '" style="' + E.vars(spec) + '">';
    h += '<nav class="nv' + (hero && hero.layout === 'poster' ? ' inv' : '') + '"><div class="in"><a class="marca" href="#topo">' + marca + '</a><div class="nl">' + links.join('') + '</div>' +
      (R.wa ? '<a class="bt" href="' + esc(R.wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</div></nav>';
    spec.secoes.forEach(function (s, i) { var fn = SEC[s.tipo]; if (fn) h += fn(s, i, R); });
    var ih = instaHandle(f.insta);
    h += '<footer class="ft"><div class="in"><span>© ' + new Date().getFullYear() + ' ' + esc(f.nome || '') + '</span>' + (ih ? '<a href="https://www.instagram.com/' + esc(ih) + '/" target="_blank" rel="noopener">@' + esc(ih) + '</a>' : '') + '</div></footer>';
    if (R.wa && !(ctx && ctx.miniatura)) h += '<a class="fab" href="' + esc(R.wa) + '" target="_blank" rel="noopener">WhatsApp</a>';
    return h + '</div>';
  };


  /* ---------------- v4: automação (sem IA) ---------------- */
  function prng(a) { a = (a >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  E.prng = prng;
  function sorteia(arr, R) { return arr[Math.floor(R() * arr.length)]; }
  E.sorteia = sorteia;
  function cidadeCurta(c) { return String(c || '').replace(/\s*[,/–—-]\s*[A-Za-z]{2}\s*$/, '').trim(); }
  E.cidadeCurta = cidadeCurta;
  function nomeCurto(n) { return String(n || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); }
  function maiusc(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function minusc(s) { s = String(s || ''); return /^[A-ZÀ-Ý]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }

  E.titulosAuto = function (f) {
    f = f || {};
    var c = cidadeCurta(f.cidade), info = KC.RAMO_INFO[f.ramo] || {g: 'servico'}, G = KC.GRUPO_TXT[info.g], out = [];
    var sv = E.parseServ(f.serv).map(function (x) { return nomeCurto(x.nome); }).filter(Boolean);
    if (f.nome) out.push(f.nome);
    if (f.ramo && f.ramo !== 'Outro' && f.ramo.indexOf(' ou ') < 0 && c) out.push(f.ramo + ' em ' + c);
    if (info.art && info.nome && c) out.push((info.art === 'a' ? 'Sua ' : 'Seu ') + info.nome + ' em ' + c);
    if (sv.length >= 2) out.push(maiusc(sv[0]) + ' e ' + minusc(sv[1]));
    else if (sv.length === 1 && c) out.push(maiusc(sv[0]) + ' em ' + c);
    if (f.zap) out.push(G.zapTitulo);
    out = out.filter(function (t, i) { return t.length <= 60 && out.indexOf(t) === i; });
    return out.length ? out : ['Seu negócio'];
  };

  var DEST = [[/receitas? de fam[ií]lia/i, 'Receitas de família'], [/feit[oa]s? no dia/i, 'Feito no dia'], [/sob encomenda/i, 'Sob encomenda'],
    [/hora marcada|agendamento/i, 'Com hora marcada'], [/em domic[ií]lio/i, 'Atende em domicílio'], [/artesana/i, 'Artesanal'],
    [/vegan/i, 'Opções veganas'], [/sem gl[uú]ten/i, 'Opções sem glúten'], [/delivery/i, 'Delivery']];
  E.destaquesAuto = function (f) {
    var t = (f.desc || '') + ' ' + (f.serv || ''), out = [], c = cidadeCurta(f.cidade);
    DEST.forEach(function (d) { if (d[0].test(t) && out.indexOf(d[1]) < 0) out.push(d[1]); });
    if (f.zap) out.push('Atendimento pelo WhatsApp');
    if (c) out.push('Em ' + c);
    if (f.hora && f.hora.length <= 40) out.push(f.hora);
    return out.slice(0, 4);
  };
  E.faqAuto = function (f, G) {
    var out = G.faq.map(function (q) { return {p: q[0], r: q[1]}; }), c = cidadeCurta(f.cidade);
    if (f.hora) out.push({p: 'Qual é o horário de atendimento?', r: f.hora.replace(/\.?\s*$/, '.')});
    if (f.endereco) out.push({p: 'Onde fica?', r: f.endereco.replace(/\.?\s*$/, '.')});
    else if (c) out.push({p: 'Onde vocês ficam?', r: 'Em ' + c + '. Chame no WhatsApp para mais detalhes.'});
    return out.slice(0, 5);
  };
  /* Textos do site feitos só com os dados do cliente e frases prontas por ramo. */
  E.textosAuto = function (f, tom, s) {
    f = f || {}; s = s || 0;
    var info = KC.RAMO_INFO[f.ramo] || {g: 'servico'}, G = KC.GRUPO_TXT[info.g], c = cidadeCurta(f.cidade), fr = frases(f.desc);
    var k = s + (tom === 'divertido' ? 2 : tom === 'neutro' ? 1 : 0);
    function um(a) { return a[k % a.length]; }
    var tits = E.titulosAuto(f), titulo = tits[s % tits.length];
    var eyebrow = titulo === f.nome ? [f.ramo && f.ramo !== 'Outro' ? f.ramo : '', c].filter(Boolean).join(' em ') : (f.nome || '');
    return {eyebrow: eyebrow, heroTitulo: titulo, heroTexto: fr.slice(0, 2).join(' ').slice(0, 260), cta: um(G.cta), destaques: E.destaquesAuto(f),
      sobreTitulo: um(['Quem somos', 'Sobre nós', 'Conheça a gente']), sobreTexto: f.desc || '', frase: fr[0] && fr[0].length <= 120 ? fr[0] : '',
      servTitulo: um(G.servTit), servIntro: G.servIntro, servicos: E.parseServ(f.serv).map(function (x) { return {nome: x.nome, descricao: x.desc || ''}; }),
      galeriaTitulo: um(['Galeria', 'Fotos', 'Veja de perto']), faqTitulo: um(['Perguntas frequentes', 'Dúvidas', 'Antes de chamar']), faq: E.faqAuto(f, G),
      chamadaTitulo: um(G.chamada), chamadaTexto: G.chamadaTxt,
      contatoTitulo: um(f.endereco ? ['Fale com a gente', 'Contato', 'Onde nos encontrar'] : ['Fale com a gente', 'Contato', 'Vamos conversar']),
      contatoTexto: f.hora ? 'Atendimento: ' + f.hora.replace(/\.?\s*$/, '') + '.' : 'Chame no WhatsApp.'};
  };

  /* Gira o tom de toda a paleta, mantendo claro e escuro no lugar. */
  E.girarCores = function (c, graus) {
    var r = {};
    KC.CORES.forEach(function (k) { var h = toHsl(c[k]); r[k] = h[1] > 8 ? fromHsl(h[0] + graus, h[1], h[2]) : c[k]; });
    return E.ajustarCores(r);
  };

  /* Três propostas automáticas: estilos que combinam com o ramo, com fontes, paletas e layouts sorteados. */
  E.propostasAuto = function (f, prefs, nFotos, semente) {
    f = f || {}; prefs = prefs || {}; semente = semente || 0;
    var R = prng(semente * 7919 + 17), marca = (prefs.cores || []).filter(isHex), mesmo = !!KC.DIR[prefs.direcao], dirs;
    if (mesmo) dirs = [prefs.direcao, prefs.direcao, prefs.direcao];
    else {
      var lista = (KC.RAMO_DIRECOES[f.ramo] || KC.RAMO_DIRECOES.Outro).concat(KC.RAMO_EXTRAS[f.ramo] || KC.RAMO_EXTRAS.Outro), n = lista.length, ini = (semente * 3) % n;
      dirs = [lista[ini], lista[(ini + 1) % n], lista[(ini + 2) % n]];
    }
    var g = (KC.RAMO_INFO[f.ramo] || {g: 'servico'}).g, fr0 = frases(f.desc)[0], temFrase = !!(fr0 && fr0.length <= 120);
    return dirs.map(function (id, i) {
      var p = copia(E.preset(id)), x = KC.DIR_EXTRA[id], d = Object.assign({direcao: id}, p), v = mesmo ? ['fiel', 'ousada', 'sobria'][i] : 'fiel';
      if (!(semente === 0 && v === 'fiel')) {
        d.fontes = sorteia(x.fontes, R);
        d.layouts.hero = sorteia(x.heros.filter(function (h) { return nFotos || h !== 'foto-fundo'; }), R);
        var cv = sorteia(x.cores, R);
        if (cv === 'girar') d.cores = E.girarCores(d.cores, 40 + Math.floor(R() * 280)); else if (cv !== 'base') d.cores = E.variacao(d.cores, cv);
        ['destaques', 'sobre', 'faq', 'contato', 'galeria', 'chamada'].forEach(function (t) { if (R() < .45) d.layouts[t] = sorteia(KC.LAYOUTS[t], R); });
        if (R() < .3) d.layouts.servicos = sorteia(KC.LAYOUTS.servicos, R);
      }
      if (g === 'comida') d.layouts.servicos = 'cardapio';
      if (v === 'ousada') {
        d.escala = 'gigante'; d.titulos = 'maiusculo'; d.cores = E.variacao(d.cores, 'vibrante');
        d.layouts.hero = nFotos ? 'foto-fundo' : (p.layouts.hero === 'poster' ? 'centro' : 'poster'); if (g !== 'comida') d.layouts.servicos = 'bento';
        var outras = x.fontes.filter(function (k) { return k !== p.fontes; }); d.fontes = outras.length ? sorteia(outras, R) : p.fontes;
      }
      if (v === 'sobria') {
        d.escala = 'grande'; d.cores = E.variacao(d.cores, 'clara'); d.layouts.hero = 'simples'; d.textura = 'nenhuma'; d.botoes = 'solido';
        if (g !== 'comida') d.layouts.servicos = 'lista';
      }
      if (marca.length) d.cores = E.comMarca(d.cores, marca);
      if (!temFrase && d.layouts.sobre === 'citacao') d.layouts.sobre = 'texto';
      d.ordem = p.ordem.filter(function (t) { return t !== 'sobre' || f.desc; });
      d.nome = KC.DIR[id].nome + (v === 'ousada' ? ' ousado' : v === 'sobria' ? ' sóbrio' : '');
      d.porque = v === 'ousada' ? 'A mesma ideia com cores fortes e título enorme.' : v === 'sobria' ? 'Versão mais calma, com muito espaço e leitura fácil.' : x.txt;
      d.tom = x.tom;
      return d;
    });
  };

  /* Ajuste de um clique: troca o "clima" do site. */
  E.aplicarHumor = function (spec, id, semente, marca) {
    var h = KC.HUMORES[id], t = spec.tema, R = prng(semente * 104729 + id.length * 31);
    var cand = h.dirs.filter(function (d) { return d !== t.direcao; });
    t.direcao = sorteia(cand.length ? cand : h.dirs, R);
    var fs = h.fontes.filter(function (k) { return k !== t.fontes; });
    t.fontes = sorteia(fs.length ? fs : h.fontes, R);
    t.cantos = h.cantos; t.botoes = h.botoes; t.titulos = sorteia(h.titulos, R); t.escala = h.escala;
    t.textura = h.textura || E.preset(t.direcao).textura;
    var cv = sorteia(h.cores, R);
    if (cv) t.cores = E.variacao(t.cores, cv);
    if (marca && marca.length) t.cores = E.comMarca(t.cores, marca);
    t.cores = E.ajustarCores(t.cores);
    var x = KC.DIR_EXTRA[t.direcao];
    if (x && R() < .6) spec.secoes[0].layout = sorteia(x.heros, R);
    return spec;
  };

  /* Preenche os campos a partir de um texto livre (sem IA): procura telefone, Instagram, horário, cidade, ramo e serviços. */
  var DIAS = 'segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|seg|qua|qui|sex|sáb|sab|dom|todos os dias|diariamente';
  var NAO_CIDADE = /^(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|whatsapp|instagram)$/i;
  var RAMO_PAL = [['Confeitaria', /\bbolos?\b|\bdoces?\b|confeit|brigadeiro|\btortas?\b|cupcake/i], ['Hamburgueria', /hamb[uú]rguer|burger|\blanches?\b/i], ['Pizzaria', /pizza/i],
    ['Cafeteria', /cafeteria|\bcafés?\b|cappuccino/i], ['Restaurante', /restaurante|marmita|almoço|self.?service|prato feito/i], ['Barbearia', /barbearia|\bbarba\b|corte masculino|degrad[êe]/i],
    ['Manicure', /\bunhas?\b|manicure|pedicure|esmalta/i], ['Estética', /estética|limpeza de pele|depila|massagem|sobrancelha|c[ií]lios/i], ['Salão de beleza', /cabel|salão|escova|progressiva|maquiagem/i],
    ['Tatuagem', /tatua|tattoo|piercing/i], ['Personal trainer', /personal|\btreinos?\b/i], ['Academia', /academia|muscula|crossfit|pilates|funcional/i],
    ['Loja de roupas', /roupas?|\bmoda\b|vestidos?|camisetas?|brech[óo]/i], ['Pet shop', /\bpets?\b|banho e tosa|cachorr|\bgatos?\b|ração/i], ['Oficina mecânica', /oficina|mec[âa]nic|\bcarros?\b|\bmotos?\b|freios?/i],
    ['Odontologia', /dentista|odonto|clareamento/i], ['Psicologia', /psic[oó]log|terapia/i], ['Clínica ou consultório', /clínica|consult[oó]rio|médic|fisioterap|nutricion/i],
    ['Advocacia', /advoga|advocacia|jur[ií]dic/i], ['Contabilidade', /contab|contador|imposto de renda/i], ['Imobiliária', /im[óo]ve(l|is)|imobili|aluguel/i],
    ['Fotografia', /fotograf|\bensaios?\b/i], ['Eventos', /eventos?|buffet|decoração de festa/i]];
  var TEL = /(?:\+?55\s?)?\(?\b\d{2}\)?[\s.-]?9?\s?\d{4}[\s.-]?\d{4}\b/;
  E.extrair = function (texto) {
    var t = String(texto || '').replace(/\s+/g, ' ').trim(), o = {}, m;
    if (!t) return o;
    m = t.match(TEL); if (m) o.zap = m[0].trim();
    m = t.match(/@([A-Za-z0-9._]{2,30})/); if (m) o.insta = '@' + m[1].replace(/\.+$/, '');
    m = t.match(new RegExp('((?:de |das? )?(?:' + DIAS + ')[^.;]{0,40}?\\d{1,2}\\s?h(?:\\d{2})?(?:\\s?(?:às|as|a|-|até)\\s?\\d{1,2}\\s?h(?:\\d{2})?)?)', 'i'));
    if (m) o.hora = maiusc(m[1].replace(/^(?:de|das?)\s+/i, '').trim());
    m = t.match(/\b(?:rua|r\.|avenida|av\.|travessa|alameda|estrada|praça|rodovia)\s+[^,.;]+(?:,\s*(?:n[º°o.]?\s*)?\d+[a-z]?)?/i);
    if (m) o.endereco = maiusc(m[0].trim());
    m = t.match(/\b(?:em|na cidade de)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){0,3})(?:\s*[-,/]\s*([A-Z]{2})\b)?/);
    if (m && !NAO_CIDADE.test(m[1])) o.cidade = m[1] + (m[2] ? ', ' + m[2] : '');
    m = t.match(/(?:se chama|chama-se|chamad[ao]|o nome (?:é|eh)|nome do (?:meu |nosso )?(?:negócio|negocio|salão|salao|loja|restaurante|estúdio|estudio|espaço|espaco) (?:é|eh)|marca (?:é|eh))\s+["“']?([^"”'.,;!?]{2,40})/i)
      || t.match(/["“]([^"”]{2,40})["”]/) || t.match(/^([A-ZÁ-Ú0-9][^:—.!?]{1,38})\s*[:—]\s/);
    if (m) o.nome = m[1].trim();
    for (var i = 0; i < RAMO_PAL.length; i++) { if (RAMO_PAL[i][1].test(t)) { o.ramo = RAMO_PAL[i][0]; break; } }
    var sv = [], re = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ()+&/]{1,40}?)\s*(?:[-:–]\s*)?(?:R\$\s?(\d[\d.,]*)|(\d[\d.,]*)\s?reais)/g, mm;
    while ((mm = re.exec(t)) && sv.length < 10) {
      var nome = mm[1].replace(/^(?:e|o|a|os|as|um|uma|com|por|de|do|da)\s+/i, '').trim();
      if (nome.length >= 2 && !/partir|custa|valor|pre[çc]o|apenas|cobro|cobramos/i.test(nome)) sv.push(maiusc(nome) + ' - R$ ' + (mm[2] || mm[3]).replace(/[.,]+$/, ''));
    }
    if (!sv.length) {
      mm = t.match(/(?:faço|fazemos|vendo|vendemos|ofereço|oferecemos|trabalho com|trabalhamos com|serviços? de)\s+([^.!?]+)/i);
      if (mm) mm[1].replace(/\s+(?:sob|por) encomenda.*$/i, '').replace(/\s+(?:para|em|no|na|pelo|pela|com|todos|de segunda|de terça|das?)\s.*$/i, '')
        .split(/,|\s+e\s+/).forEach(function (x) { x = x.trim(); if (x.length >= 3 && x.length <= 40 && sv.length < 8) sv.push(maiusc(x)); });
    }
    if (sv.length) o.serv = sv.join('\n');
    var limpo = t.replace(new RegExp(TEL.source, 'g'), '').replace(/@[A-Za-z0-9._]+/g, '').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
    var fr = frases(limpo).filter(function (x) { return !/whats|\bzap\b|instagram|\binsta\b|telefone|ligue|ligar|R\$|\breais\b|\brua\b|\bav\.|avenida|\d{1,2}\s?h\b/i.test(x); });
    if (fr.length) o.desc = fr.slice(0, 3).join(' ').slice(0, 600);
    return o;
  };

  var GRAO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.2'/%3E%3C/svg%3E\")";

  E.css = [
'.site{container-type:inline-size;background-color:var(--bg);color:var(--tx);font-family:var(--fb);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;position:relative;overflow-x:clip;text-align:left;--r:10px;--rb:10px;--hs:clamp(38px,8.6cqi,86px)}',
'.site *{box-sizing:border-box;margin:0;padding:0}',
'.site img{display:block;max-width:100%}',
'.site a{color:inherit}',
'.site ul{list-style:none}',
'.site .in{width:100%;max-width:1160px;margin-inline:auto;padding-inline:clamp(20px,5cqi,56px)}',
'.site h1,.site h2,.site h3,.site .q,.site .sbq{font-family:var(--fd);font-weight:var(--fdw);line-height:1.05;letter-spacing:-.02em;text-wrap:balance}',
'.site .h1{font-size:calc(var(--hs) * var(--fz))}',
'.site h2{font-size:calc(clamp(28px,4.8cqi,50px) * var(--fz))}',
'.site h3{font-size:calc(clamp(18px,2cqi,22px) * min(var(--fz),1.05));line-height:1.2}',
'.h-maiusculo h1,.h-maiusculo h2,.h-maiusculo .q{text-transform:uppercase;letter-spacing:0}',
'.h-italico h1,.h-italico h2,.h-italico .q,.h-italico .sbq{font-style:italic}',
'.e-contida{--hs:clamp(32px,6.2cqi,58px)}.e-grande{--hs:clamp(38px,8.6cqi,86px)}.e-gigante{--hs:clamp(46px,12.4cqi,142px)}',
'.e-gigante .h1{line-height:.93;letter-spacing:-.035em}.h-maiusculo.e-gigante .h1{letter-spacing:-.01em}',
'.site .ey{font-family:var(--fb);font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acT);line-height:1.4}',
'.site .lead{font-size:clamp(17px,1.9cqi,21px);max-width:54ch;color:var(--mu)}',
'.site .bd{color:var(--mu);font-size:17px;max-width:64ch}',
'.site .sc{padding-block:clamp(56px,9cqi,124px)}',
'.site .sc-curta{padding-block:clamp(36px,6cqi,72px)}',
'.site .sh{display:flex;flex-direction:column;gap:12px;margin-bottom:clamp(26px,4cqi,48px);max-width:760px}',
'.site .sh p{color:var(--mu);font-size:17px;max-width:60ch}',
'.site .grid2{display:grid;gap:clamp(28px,5cqi,64px);grid-template-columns:1fr;align-items:center}',
'@container (min-width:760px){.site .grid2{grid-template-columns:1fr 1fr}}',
/* botões */
'.site .acts{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;margin-top:28px}',
'.site .bt{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;border-radius:var(--rb);background:var(--p1);color:var(--on1);border:2px solid var(--p1);font:700 16px/1.2 var(--fb);text-decoration:none;transition:transform .15s,box-shadow .15s;white-space:nowrap}',
'.site .bt:hover{transform:translateY(-2px)}',
'.site .lk{font-weight:700;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px}',
'.c-reto{--r:0px;--rb:0px}.c-suave{--r:10px;--rb:10px}.c-redondo{--r:26px;--rb:16px}.b-pilula{--rb:999px}',
'.b-contorno .bt{background:transparent;color:var(--p1T);border-color:var(--p1T)}',
'.b-sombra .bt{border-color:var(--tx);box-shadow:4px 4px 0 var(--tx)}',
'.b-sombra .bt:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--tx)}',
'.b-vidro .bt{background:color-mix(in srgb,var(--p1) 74%,transparent);border-color:color-mix(in srgb,#FFFFFF 50%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 10px 30px color-mix(in srgb,var(--p1) 35%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}',
'.site .inv{background-color:var(--p1);color:var(--on1)}',
'.site .inv2{background-color:var(--p2);color:var(--on2)}',
'.site .inv .ey,.site .inv .lead,.site .inv p,.site .inv .lk{color:var(--on1)}',
'.site .inv2 .ey,.site .inv2 .lead,.site .inv2 p,.site .inv2 .lk{color:var(--on2)}',
'.site .inv .lead,.site .inv2 .lead,.site .inv p,.site .inv2 p{opacity:.9}',
'.site .inv .bt{background:var(--on1);color:var(--p1);border-color:var(--on1)}',
'.site .inv2 .bt{background:var(--on2);color:var(--p2);border-color:var(--on2)}',
'.b-sombra .inv .bt{box-shadow:4px 4px 0 color-mix(in srgb,var(--on1) 40%,transparent)}.b-sombra .inv2 .bt{box-shadow:4px 4px 0 color-mix(in srgb,var(--on2) 40%,transparent)}',
'.b-contorno .inv .bt{background:transparent;color:var(--on1);border-color:var(--on1)}.b-contorno .inv2 .bt{background:transparent;color:var(--on2);border-color:var(--on2)}',
'.b-vidro .inv .bt{background:color-mix(in srgb,var(--on1) 20%,transparent);color:var(--on1);border-color:color-mix(in srgb,var(--on1) 45%,transparent)}',
'.b-vidro .inv2 .bt{background:color-mix(in srgb,var(--on2) 20%,transparent);color:var(--on2);border-color:color-mix(in srgb,var(--on2) 45%,transparent)}',
/* texturas */
'.t-pontos .tx{background-image:radial-gradient(color-mix(in srgb,currentColor 17%,transparent) 1.4px,transparent 1.7px);background-size:14px 14px}',
'.t-grade .tx{background-image:linear-gradient(color-mix(in srgb,currentColor 9%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,currentColor 9%,transparent) 1px,transparent 1px);background-size:40px 40px}',
'.t-listras .tx{background-image:repeating-linear-gradient(-45deg,transparent 0 18px,color-mix(in srgb,currentColor 9%,transparent) 18px 36px)}',
'.t-papel .tx{background-image:repeating-linear-gradient(0deg,color-mix(in srgb,currentColor 6%,transparent) 0 1px,transparent 1px 7px)}',
'.t-grao .tx,.t-grao.site{background-image:' + GRAO + '}',
'.site.t-bolhas{background-image:radial-gradient(circle at 6% 4%,color-mix(in srgb,var(--p1) 40%,transparent),transparent 30%),radial-gradient(circle at 96% 14%,color-mix(in srgb,var(--p2) 55%,transparent),transparent 34%),radial-gradient(circle at 24% 52%,color-mix(in srgb,var(--ac) 28%,transparent),transparent 34%),radial-gradient(circle at 90% 86%,color-mix(in srgb,var(--p1) 26%,transparent),transparent 32%)}',
/* menu */
'.site .nv{position:relative;z-index:2}',
'.site .nv .in{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:18px}',
'.site .marca{display:flex;align-items:center;text-decoration:none;font-family:var(--fd);font-weight:var(--fdw);font-size:calc(20px * min(var(--fz),1.05));line-height:1.1;max-width:62%}',
'.site .marca img{height:46px;width:auto;max-width:170px;object-fit:contain}',
'.site .nl{display:none;gap:28px;font-weight:600;font-size:15px}',
'.site .nl a{text-decoration:none;opacity:.82}',
'@container (min-width:880px){.site .nl{display:flex}}',
'.site .nv .bt{padding:10px 18px;font-size:14px}',
/* abertura */
'.site .hx{position:relative}',
'.site .hx-simples .in{padding-block:clamp(56px,10cqi,140px) clamp(64px,10cqi,150px)}',
'.site .hx-simples .h1{margin-block:18px 22px;max-width:16ch}',
'.site .hx-centro .in{padding-block:clamp(64px,11cqi,156px);text-align:center;display:flex;flex-direction:column;align-items:center}',
'.site .hx-centro .h1{margin-block:18px 22px;max-width:15ch}',
'.site .hx-centro .lead{margin-inline:auto}.site .hx-centro .acts{justify-content:center}',
'.site .hx-dividido .in{padding-block:clamp(36px,7cqi,96px)}',
'.site .hx-dividido .h1{margin-block:16px 20px}',
'.site .hx-media{min-width:0}',
'.site .hx-media img{width:100%;aspect-ratio:4/5;max-height:640px;object-fit:cover;border-radius:var(--r)}',
'.site .mono{position:relative;aspect-ratio:4/5;max-height:600px;width:100%;border-radius:var(--r);background-color:var(--p2);color:var(--on2);display:grid;place-items:center;overflow:hidden}',
'.site .mono span{font-family:var(--fd);font-weight:var(--fdw);font-size:calc(clamp(120px,30cqi,340px) * var(--fz));line-height:1;position:relative;z-index:1}',
'.site .mono i{display:none;position:absolute}',
'.site .hx-poster .in{padding-block:clamp(44px,8cqi,112px) clamp(36px,6cqi,72px)}',
'.site .hx-poster .h1{font-size:calc(var(--hs) * 1.1 * var(--fz));margin-block:20px clamp(32px,6cqi,84px);max-width:12ch}',
'.site .hx-info{display:grid;gap:22px;grid-template-columns:1fr;border-top:2px solid currentColor;padding-top:22px}',
'@container (min-width:760px){.site .hx-info{grid-template-columns:1.3fr 1fr auto;align-items:end}}',
'.site .hx-info .acts{margin-top:0}',
'.site .mini{display:grid;gap:10px;font-size:15px}',
'.site .mini dt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;font-weight:700}',
'.site .mini dd{margin:0;font-weight:600}',
'.site .hx-foto{background-image:linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.28) 40%,rgba(0,0,0,.8) 100%),var(--img);background-size:cover;background-position:center;color:#FFFFFF;min-height:clamp(460px,62cqi,780px);display:flex;align-items:flex-end}',
'.site .hx-foto .in{padding-block:clamp(40px,7cqi,96px)}',
'.site .hx-foto .ey,.site .hx-foto .lead,.site .hx-foto .lk{color:#FFFFFF}',
'.site .hx-foto .lead{opacity:.92}.site .hx-foto .h1{max-width:14ch;margin-block:14px 18px}',
'.site .hx-editorial .in{padding-block:clamp(26px,5cqi,64px) clamp(40px,7cqi,96px)}',
'.site .mast{display:flex;justify-content:space-between;gap:16px;border-block:1px solid var(--tx);padding-block:10px;margin-bottom:clamp(28px,5cqi,64px)}',
'.site .mast .ey{color:var(--tx)}',
'.site .hx-editorial .h1{font-size:calc(var(--hs) * 1.04 * var(--fz))}',
'.site .ed-row{display:grid;gap:20px;margin-top:clamp(24px,4cqi,48px);grid-template-columns:1fr}',
'@container (min-width:760px){.site .ed-row{grid-template-columns:1fr 1fr;align-items:end}.site .ed-row .acts{justify-content:flex-end}}',
'.site .ed-row .acts{margin-top:0}',
'.site .ed-img{margin-top:clamp(28px,5cqi,56px)}',
'.site .ed-img img{width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:var(--r)}',
'.site .hx-cartao .in{padding-block:clamp(36px,8cqi,112px)}',
'.site .hx-cartao.has-img{background-image:var(--img);background-size:cover;background-position:center}',
'.site .hx-card{background:color-mix(in srgb,var(--sf) 84%,transparent);color:var(--tx);border:1px solid color-mix(in srgb,var(--tx) 10%,transparent);border-radius:calc(var(--r) * 1.4);padding:clamp(28px,5cqi,64px);max-width:780px;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 30px 60px -30px color-mix(in srgb,var(--tx) 35%,transparent)}',
'.site .hx-card .h1{margin-block:16px 18px}',
/* destaques */
'.site .ds-faixa{padding-block:22px}',
'.site .ds-faixa ul{display:flex;flex-wrap:wrap;gap:10px 0;justify-content:center;align-items:center}',
'.site .ds-faixa li{font-family:var(--fd);font-weight:var(--fdw);font-size:calc(clamp(17px,2.2cqi,24px) * min(var(--fz),1.1));display:flex;align-items:center;line-height:1.2}',
'.site .ds-faixa li+li::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.6;margin-inline:18px}',
'.h-maiusculo .ds-faixa li{text-transform:uppercase}',
'.site .ds-colunas ul{display:grid;gap:24px;grid-template-columns:1fr}',
'@container (min-width:620px){.site .ds-colunas ul{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}}',
'.site .ds-colunas li{display:flex;flex-direction:column;gap:14px;font-size:18px;font-weight:600;border-top:1px solid var(--ln);padding-top:18px;line-height:1.35}',
'.site .mk{width:22px;height:22px;display:block;background:var(--p1)}',
'.site .mk0{border-radius:50%}.site .mk1{background:var(--p2)}.site .mk2{background:var(--ac);clip-path:polygon(50% 0,100% 100%,0 100%)}',
'.site .ds-chips{padding-block:4px clamp(28px,4cqi,52px)}',
'.site .ds-chips ul{display:flex;flex-wrap:wrap;gap:10px}',
'.site .ds-chips li{border:1px solid var(--ln);background:var(--sf);border-radius:999px;padding:8px 16px;font-size:14px;font-weight:600}',
/* sobre */
'.site .sb-texto .bd{font-size:clamp(18px,2cqi,22px);line-height:1.6}',
'.site .sb-media{min-width:0}',
'.site .sb-media img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--r)}',
'.site .sb-bloco{border-radius:var(--r);padding:clamp(28px,5cqi,56px);aspect-ratio:1/1;display:flex;align-items:flex-end}',
'.site .sbq{font-size:calc(clamp(24px,3.6cqi,42px) * var(--fz));line-height:1.12}',
'.site .sb-citacao .in{display:flex;flex-direction:column;gap:clamp(18px,3cqi,32px)}',
'.site .q{font-size:calc(clamp(30px,6cqi,74px) * var(--fz));line-height:1.06;max-width:22ch}',
'.site .q::before{content:"\\201C";color:var(--p1T);margin-right:.04em}',
'.site .sb-citacao .bd{max-width:58ch}',
/* serviços */
'.site .sv-g{display:grid;gap:clamp(14px,2cqi,22px);grid-template-columns:1fr}',
'@container (min-width:620px){.site .sv-g{grid-template-columns:repeat(2,1fr)}}',
'@container (min-width:960px){.site .sv-g{grid-template-columns:repeat(3,1fr)}}',
'.site .cd{background:var(--sf);color:var(--tx);border:1px solid var(--ln);border-radius:var(--r);padding:clamp(20px,2.6cqi,30px);display:flex;flex-direction:column;gap:10px;position:relative}',
'.site .cd p{color:var(--mu)}.site .cd .cdx{flex:1}',
'.site .pr{font-weight:800;font-variant-numeric:tabular-nums;font-size:18px;color:var(--tx)}',
'.site .cd .lk,.site .sv-r .lk,.site .sv-menu .lk{font-size:14px}',
'.site .sv-lista li{display:grid;gap:10px 28px;grid-template-columns:1fr;padding-block:22px;border-top:1px solid var(--ln)}',
'.site .sv-lista li:last-child{border-bottom:1px solid var(--ln)}',
'@container (min-width:700px){.site .sv-lista li{grid-template-columns:1fr auto;align-items:center}}',
'.site .sv-lista h3{font-size:calc(clamp(20px,2.6cqi,30px) * min(var(--fz),1.1))}',
'.site .sv-lista p{color:var(--mu);margin-top:6px;max-width:60ch}',
'.site .sv-r{display:flex;gap:18px;align-items:center;flex-wrap:wrap}',
'.site .sv-menu{display:grid;gap:28px 64px;grid-template-columns:1fr}',
'@container (min-width:760px){.site .sv-menu{grid-template-columns:1fr 1fr}}',
'.site .mn-row{display:flex;align-items:baseline;gap:10px}',
'.site .mn-row .dots{flex:1;border-bottom:2px dotted var(--ln);transform:translateY(-5px);min-width:16px}',
'.site .sv-menu p{color:var(--mu);margin-top:6px;font-size:15px}',
'.site .sv-menu .lk{display:inline-block;margin-top:8px}',
'.site .sv-bento{display:grid;gap:16px;grid-template-columns:1fr}',
'@container (min-width:700px){.site .sv-bento{grid-template-columns:repeat(2,1fr)}.site .sv-bento .big{grid-column:span 2}}',
'@container (min-width:980px){.site .sv-bento{grid-template-columns:repeat(3,1fr)}.site .sv-bento .big{grid-column:span 2;grid-row:span 2}}',
'.site .sv-bento .big{justify-content:flex-end;min-height:260px}',
'.site .sv-bento .big h3{font-size:calc(clamp(26px,3.6cqi,46px) * min(var(--fz),1.1))}',
'.site .cd.inv{background:var(--p1);color:var(--on1);border-color:var(--p1)}',
'.site .cd.inv p,.site .cd.inv .pr,.site .cd.inv .lk{color:var(--on1)}',
/* galeria */
'.site .gl{display:grid;gap:12px}',
'.site .gl figure{margin:0;min-width:0}',
'.site .gl img{width:100%;height:100%;object-fit:cover;border-radius:var(--r)}',
'.site .gl-grade{grid-template-columns:repeat(2,1fr)}',
'@container (min-width:760px){.site .gl-grade{grid-template-columns:repeat(3,1fr)}}',
'.site .gl-grade img{aspect-ratio:1/1}',
'.site .gl-mosaico{grid-template-columns:repeat(2,1fr);grid-auto-rows:clamp(140px,22cqi,260px)}',
'@container (min-width:760px){.site .gl-mosaico{grid-template-columns:repeat(4,1fr)}}',
'.site .gl-mosaico figure:nth-child(5n+1){grid-column:span 2;grid-row:span 2}.site .gl-mosaico figure:nth-child(5n+4){grid-row:span 2}',
'.site .gl-faixa{display:flex;overflow-x:auto;gap:14px;scroll-snap-type:x mandatory;padding-bottom:10px}',
'.site .gl-faixa figure{flex:0 0 clamp(220px,40cqi,420px);scroll-snap-align:start}',
'.site .gl-faixa img{aspect-ratio:3/4}',
/* perguntas */
'.site .fq-lista{max-width:880px}',
'.site .fq-lista details{border-top:1px solid var(--ln);padding-block:20px}',
'.site .fq-lista details:last-child{border-bottom:1px solid var(--ln)}',
'.site .fq-lista summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:20px;font-weight:700;font-size:18px}',
'.site .fq-lista summary::-webkit-details-marker{display:none}',
'.site .fq-lista summary::after{content:"+";font-family:var(--fd);color:var(--p1T);font-size:24px;line-height:1}',
'.site .fq-lista details[open] summary::after{content:"\\2212"}',
'.site .fq-lista details p{color:var(--mu);margin-top:10px;max-width:64ch}',
'.site .fq-col{display:grid;gap:34px 56px;grid-template-columns:1fr}',
'@container (min-width:760px){.site .fq-col{grid-template-columns:1fr 1fr}}',
'.site .fq-col h3{font-size:19px;margin-bottom:8px}.site .fq-col p{color:var(--mu)}',
/* chamada */
'.site .ch .in{padding-block:clamp(56px,9cqi,124px)}',
'.site .ch-faixa .in{display:grid;gap:24px;grid-template-columns:1fr;align-items:center}',
'@container (min-width:860px){.site .ch-faixa .in{grid-template-columns:1.4fr 1fr}.site .ch-faixa .acts{justify-content:flex-end}}',
'.site .ch-faixa h2{max-width:18ch;margin-bottom:12px}',
'.site .ch-cartaz .in{text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}',
'.site .ch-cartaz h2{font-size:calc(clamp(40px,10cqi,124px) * var(--fz));max-width:14ch;line-height:.95}',
'.site .ch-cartaz .acts{justify-content:center}',
'.site .ch p{font-size:18px;max-width:52ch}',
/* contato */
'.site .ct-g{display:grid;gap:16px;grid-template-columns:1fr}',
'@container (min-width:620px){.site .ct-g{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}}',
'.site .ct-g small,.site .ct-dl dt{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--mu)}',
'.site .ct-g strong{font-size:18px;font-weight:700;overflow-wrap:anywhere}',
'.site .ct-dl{display:grid;gap:22px}',
'.site .ct-dl dd{margin:4px 0 0;font-size:19px;font-weight:600;overflow-wrap:anywhere}',
'.site .ct-dl .ct-lk{font-size:14px;font-weight:400}',
'.site .ct-dividido .grid2{align-items:start}',
'.site .ft{border-top:1px solid var(--ln);font-size:14px;color:var(--mu)}',
'.site .ft .in{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-block:26px 30px}',
'.site .fab{position:sticky;bottom:16px;margin:-62px 16px 16px auto;width:max-content;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:var(--p1);color:var(--on1);font:700 14px/1 var(--fb);text-decoration:none;box-shadow:0 10px 24px rgba(0,0,0,.25);z-index:5}',
'.site .fab::before{content:"";width:8px;height:8px;border-radius:50%;background:#25D366;box-shadow:0 0 0 3px color-mix(in srgb,#25D366 30%,transparent)}',
/* edição direta */
'.ed [data-e]{cursor:text;border-radius:3px;outline:1px dashed transparent;outline-offset:3px;transition:outline-color .15s;caret-color:var(--tx)}',
'.ed .inv [data-e],.ed .inv2 [data-e],.ed .hx-foto [data-e]{caret-color:currentColor}',
'.ed [data-e]:hover{outline-color:color-mix(in srgb,currentColor 55%,transparent)}',
'.ed [data-e]:focus{outline:2px solid color-mix(in srgb,currentColor 75%,transparent)}',
'.ed [data-e]:empty::before{content:attr(data-ph);opacity:.4}',
/* ===== direções ===== */
'.d-minimalismo h1,.d-minimalismo h2{font-weight:500;letter-spacing:-.045em}',
'.d-minimalismo .cd{background:none;border:0;border-top:1px solid var(--tx);border-radius:0;padding:18px 0 0}',
'.d-minimalismo .ey{color:var(--mu)}',
'.d-maximalismo .cd{border:3px solid var(--tx);box-shadow:6px 6px 0 var(--tx)}',
'.d-maximalismo .sv-g .cd:nth-child(3n+2),.d-maximalismo .sv-bento .cd:nth-child(3n+2){background:var(--p2);color:var(--on2)}',
'.d-maximalismo .sv-g .cd:nth-child(3n),.d-maximalismo .sv-bento .cd:nth-child(3n){background:var(--ac);color:var(--onA)}',
'.d-maximalismo .sv-g .cd:nth-child(3n+2) p,.d-maximalismo .sv-g .cd:nth-child(3n) p,.d-maximalismo .sv-bento .cd:nth-child(3n+2) p,.d-maximalismo .sv-bento .cd:nth-child(3n) p{color:inherit;opacity:.88}',
'.d-maximalismo .ds-faixa{border-block:3px solid var(--tx)}',
'.d-maximalismo .gl img,.d-maximalismo .hx-media img{border:3px solid var(--tx)}',
'.d-futurista .cd,.d-futurista .bt,.d-futurista .gl img,.d-futurista .hx-media img,.d-futurista .mono,.d-futurista .sb-media img{clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))}',
'.d-futurista .cd{border-top:2px solid var(--acT)}',
'.d-futurista .ey::before{content:"// "}',
'.d-futurista .mono{background:var(--sf)}.d-futurista .mono span{color:transparent;-webkit-text-stroke:2px var(--acT)}',
'.d-vetorial .cd{border:2px solid var(--tx);box-shadow:0 5px 0 var(--tx)}',
'.d-vetorial .bt{border-color:var(--tx);box-shadow:0 4px 0 var(--tx)}',
'.d-vetorial .sv-g .cd::before{content:"";width:36px;height:36px;border-radius:50%;background:var(--p1);border:2px solid var(--tx)}',
'.d-vetorial .sv-g .cd:nth-child(3n+2)::before{background:var(--p2);border-radius:10px}',
'.d-vetorial .sv-g .cd:nth-child(3n)::before{background:var(--ac);border-radius:50% 50% 0 50%}',
'.d-vetorial .mono span{display:none}.d-vetorial .mono i{display:block}',
'.d-vetorial .mono .f1{width:58%;aspect-ratio:1;border-radius:50%;background:var(--p1);left:8%;top:10%}',
'.d-vetorial .mono .f2{width:38%;aspect-ratio:1;border-radius:24px;background:var(--ac);right:8%;bottom:14%;transform:rotate(12deg)}',
'.d-vetorial .mono .f3{width:30%;aspect-ratio:1;background:var(--tx);clip-path:polygon(50% 0,100% 100%,0 100%);left:14%;bottom:8%}',
'.d-colagem .hx .hl{background:var(--tx);color:var(--bg);padding:0 .14em;line-height:1.32;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
'.d-colagem .hx-foto .hl,.d-colagem .hx-poster .hl{background:none;color:inherit;padding:0}',
'.d-colagem .cd{transform:rotate(-1.2deg);box-shadow:2px 6px 16px color-mix(in srgb,var(--tx) 18%,transparent);border:0}',
'.d-colagem .cd:nth-child(even){transform:rotate(1.3deg)}',
'.d-colagem .cd::after{content:"";position:absolute;top:-12px;left:50%;width:84px;height:24px;margin-left:-42px;background:color-mix(in srgb,var(--ac) 72%,transparent);transform:rotate(-4deg)}',
'.d-colagem .gl-grade figure,.d-colagem .gl-faixa figure{background:#FFFFFF;padding:10px 10px 30px;box-shadow:0 6px 16px rgba(0,0,0,.18);transform:rotate(-1.5deg)}',
'.d-colagem .gl-grade figure:nth-child(even),.d-colagem .gl-faixa figure:nth-child(even){transform:rotate(1.8deg)}',
'.d-colagem .gl-grade img,.d-colagem .gl-faixa img{border-radius:0}',
'.d-retro .hx{border-bottom:14px solid var(--p1);box-shadow:0 14px 0 var(--p2),0 28px 0 var(--ac);margin-bottom:28px}',
'.d-retro .cd{border:2px solid var(--tx)}',
'.d-retro .ds-faixa{border-block:2px solid var(--tx)}',
'.d-retro .mono,.d-retro .hx-media img{border-radius:999px 999px var(--r) var(--r)}',
'.d-pop .h1{text-shadow:4px 4px 0 var(--ac)}.d-pop .hx-foto .h1{text-shadow:4px 4px 0 #000}',
'.d-pop .cd,.d-pop .gl img,.d-pop .hx-media img,.d-pop .mono,.d-pop .sb-media img{border:3px solid var(--tx);box-shadow:6px 6px 0 var(--tx)}',
'.d-pop .sv-g .cd:nth-child(3n+2){background:var(--p2);color:var(--on2)}.d-pop .sv-g .cd:nth-child(3n){background:var(--ac);color:var(--onA)}',
'.d-pop .sv-g .cd:nth-child(3n+2) p,.d-pop .sv-g .cd:nth-child(3n) p{color:inherit;opacity:.88}',
'.d-pop .ds-chips li{border:3px solid var(--tx);border-radius:0;background:var(--sf)}',
'.d-pop .ds-faixa{border-block:3px solid var(--tx)}',
'.d-cyberpunk .h1{text-shadow:2px 0 var(--p1),-2px 0 var(--p2),0 0 28px color-mix(in srgb,var(--p1) 55%,transparent)}',
'.d-cyberpunk .bt{box-shadow:0 0 0 1px var(--p2),0 0 22px color-mix(in srgb,var(--p2) 45%,transparent)}',
'.d-cyberpunk .cd{box-shadow:inset 3px 0 0 var(--p1);border-color:color-mix(in srgb,var(--p2) 28%,transparent)}',
'.d-cyberpunk .ds-chips li{border-color:var(--p1);background:transparent;border-radius:0}',
'.d-cyberpunk .mono{background:var(--sf)}.d-cyberpunk .mono span{color:transparent;-webkit-text-stroke:2px var(--p1)}',
'.d-glass .cd,.d-glass .ds-chips li{background:color-mix(in srgb,var(--sf) 52%,transparent);border:1px solid color-mix(in srgb,#FFFFFF 70%,transparent);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 10px 30px color-mix(in srgb,var(--tx) 10%,transparent)}',
'.d-glass .mono{background:linear-gradient(135deg,color-mix(in srgb,var(--p1) 75%,transparent),color-mix(in srgb,var(--p2) 75%,transparent));color:#FFFFFF}',
'.d-neumorfismo{--sh1:color-mix(in srgb,var(--bg) 80%,#000);--sh2:color-mix(in srgb,var(--bg) 50%,#FFF)}',
'.d-neumorfismo .cd{border:0;background:var(--bg);box-shadow:9px 9px 18px var(--sh1),-9px -9px 18px var(--sh2)}',
'.d-neumorfismo .bt{box-shadow:5px 5px 12px var(--sh1),-5px -5px 12px var(--sh2)}',
'.d-neumorfismo .ds-chips li{border:0;background:var(--bg);box-shadow:inset 3px 3px 6px var(--sh1),inset -3px -3px 6px var(--sh2)}',
'.d-neumorfismo .hx-card{background:var(--bg);border:0;box-shadow:14px 14px 30px var(--sh1),-14px -14px 30px var(--sh2);-webkit-backdrop-filter:none;backdrop-filter:none}',
'.d-neumorfismo .mono{background:var(--bg);color:var(--p1T);box-shadow:inset 10px 10px 24px var(--sh1),inset -10px -10px 24px var(--sh2)}',
'.d-neumorfismo .ds-colunas li{border:0}',
'.d-clay .cd{border:0;box-shadow:0 16px 30px -8px color-mix(in srgb,var(--p1) 30%,transparent),inset 0 -8px 14px color-mix(in srgb,var(--tx) 10%,transparent),inset 0 6px 12px rgba(255,255,255,.9)}',
'.d-clay .sv-g .cd:nth-child(3n+1),.d-clay .sv-bento .cd:nth-child(3n+2){background:color-mix(in srgb,var(--p2) 32%,var(--sf))}',
'.d-clay .sv-g .cd:nth-child(3n+2),.d-clay .sv-bento .cd:nth-child(3n){background:color-mix(in srgb,var(--ac) 28%,var(--sf))}',
'.d-clay .sv-g .cd:nth-child(3n),.d-clay .sv-bento .cd:nth-child(3n+4){background:color-mix(in srgb,var(--p1) 12%,var(--sf))}',
'.d-clay .bt{box-shadow:0 10px 18px -6px color-mix(in srgb,var(--p1) 60%,transparent),inset 0 -4px 8px rgba(0,0,0,.18),inset 0 4px 6px rgba(255,255,255,.35)}',
'.d-clay .mono{border-radius:40% 60% 55% 45% / 50% 45% 55% 50%;box-shadow:inset 0 -18px 30px rgba(0,0,0,.12),inset 0 14px 24px rgba(255,255,255,.6)}',
'.d-clay .hx-media img,.d-clay .sb-media img{border-radius:36px}',
'.d-clay .ds-chips li{border:0;box-shadow:0 5px 0 color-mix(in srgb,var(--p1) 25%,transparent)}',
'.d-pixel .cd,.d-pixel .gl img,.d-pixel .hx-media img,.d-pixel .mono,.d-pixel .sb-media img{border:4px solid var(--tx);box-shadow:6px 6px 0 color-mix(in srgb,var(--tx) 25%,transparent);border-radius:0}',
'.d-pixel .bt{box-shadow:inset -4px -4px 0 rgba(0,0,0,.3),4px 4px 0 var(--tx);border:0;font-family:var(--fd);font-size:12px;font-weight:400;padding:15px 18px;line-height:1.4}',
'.d-pixel h1,.d-pixel h2,.d-pixel h3,.d-pixel .q,.d-pixel .sbq{line-height:1.45;letter-spacing:0}',
'.d-pixel h3,.d-pixel .marca{font-size:13px}.d-pixel .ds-faixa li{font-size:13px}',
'.d-pixel .mono span{font-size:clamp(80px,18cqi,200px)}',
'.d-editorial .hx-editorial{border-bottom:4px double var(--tx)}',
'.d-editorial h2{font-style:italic;font-weight:500}',
'.d-editorial .sb-texto .bd::first-letter,.d-editorial .sb-citacao .bd::first-letter{float:left;font-family:var(--fd);font-size:3.6em;line-height:.82;padding:6px 10px 0 0;color:var(--acT)}',
'.d-editorial .cd{background:none;border:0;border-top:2px solid var(--tx);border-radius:0;padding:16px 0 0}',
'.d-editorial .ey{letter-spacing:.24em}',
'.d-y2k .hx-centro .h1,.d-y2k .hx-simples .h1,.d-y2k .hx-dividido .h1,.d-y2k .hx-cartao .h1,.d-y2k .hx-editorial .h1{background:linear-gradient(180deg,var(--tx) 0%,color-mix(in srgb,var(--tx) 50%,var(--bg)) 47%,var(--tx) 53%,color-mix(in srgb,var(--tx) 70%,var(--p1)) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}',
'.d-y2k .bt{background-image:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 55%);box-shadow:0 6px 16px color-mix(in srgb,var(--p1) 35%,transparent)}',
'.d-y2k .ds-chips li{background:var(--sf);border-color:transparent;box-shadow:0 4px 12px color-mix(in srgb,var(--p1) 18%,transparent)}',
'.d-y2k .ds-chips li::before{content:"\\2726  ";color:var(--p1T)}',
'.d-y2k .cd{border:1px solid color-mix(in srgb,#FFFFFF 80%,transparent);box-shadow:0 12px 28px color-mix(in srgb,var(--p1) 16%,transparent)}',
'.d-y2k .mono{background:linear-gradient(160deg,#FFFFFF 0%,var(--p2) 45%,var(--ac) 100%);color:#1A1A2E}',
'.d-suico .hx:not(.hx-poster):not(.hx-foto){border-top:18px solid var(--p1)}',
'.d-suico .cd{background:none;border:0;border-top:4px solid var(--tx);border-radius:0;padding:14px 0 0}',
'.d-suico h1,.d-suico h2{letter-spacing:-.045em}',
'.d-suico .ey::before{content:"";display:inline-block;width:.8em;height:.8em;background:var(--p1);margin-right:8px;vertical-align:-1px}',
'.d-suico .inv .ey::before{background:var(--on1)}',
'.d-surreal.site{background-image:linear-gradient(180deg,color-mix(in srgb,var(--ac) 55%,var(--bg)) 0%,color-mix(in srgb,var(--p1) 16%,var(--bg)) 20%,color-mix(in srgb,var(--p2) 50%,var(--bg)) 46%,var(--bg) 78%)}',
'@container (min-width:760px){.d-surreal .hx-centro::after,.d-surreal .hx-simples::after{content:"";position:absolute;width:clamp(120px,20cqi,250px);aspect-ratio:1;border-radius:50%;right:5%;top:10%;background:radial-gradient(circle at 35% 35%,#FFFDF2,color-mix(in srgb,var(--ac) 70%,#FFF) 60%,transparent 72%);pointer-events:none}}',
'.d-surreal .hx .in{position:relative;z-index:1}',
'.d-surreal .cd:nth-child(odd){border-radius:64px 8px 64px 8px}.d-surreal .cd:nth-child(even){border-radius:8px 64px 8px 64px}',
'.d-surreal .cd{background:color-mix(in srgb,var(--sf) 70%,transparent);border:0;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 18px 40px color-mix(in srgb,var(--p1) 14%,transparent)}',
'.d-surreal .hx-media img,.d-surreal .mono,.d-surreal .sb-media img{border-radius:999px 999px 24px 24px}',
'.d-bauhaus .cd{border:2px solid var(--tx)}',
'.d-bauhaus .sv-g .cd:nth-child(3n+1){border-top:12px solid var(--p1)}.d-bauhaus .sv-g .cd:nth-child(3n+2){border-top:12px solid var(--p2)}.d-bauhaus .sv-g .cd:nth-child(3n){border-top:12px solid var(--ac)}',
'.d-bauhaus .hx{box-shadow:inset 0 -12px 0 var(--ac)}',
'.d-bauhaus .mono{background:var(--sf)}.d-bauhaus .mono span{display:none}.d-bauhaus .mono i{display:block}',
'.d-bauhaus .mono .f1{width:56%;aspect-ratio:1;border-radius:50%;background:var(--p1);left:6%;top:8%}',
'.d-bauhaus .mono .f2{width:44%;aspect-ratio:1;background:var(--p2);right:6%;bottom:16%}',
'.d-bauhaus .mono .f3{width:72%;height:9%;background:var(--ac);left:6%;bottom:6%}',
'.d-bauhaus .ds-colunas .mk{width:30px;height:30px}',
'.d-brutal .cd,.d-brutal .gl img,.d-brutal .hx-media img,.d-brutal .mono,.d-brutal .sb-media img{border:3px solid var(--tx);box-shadow:8px 8px 0 var(--tx);border-radius:0}',
'.d-brutal .hx{border-bottom:3px solid var(--tx)}',
'.d-brutal .ey{background:var(--tx);color:var(--bg);display:inline-block;padding:3px 8px;letter-spacing:.06em}',
'.d-brutal .inv .ey{background:var(--on1);color:var(--p1)}',
'.d-brutal .lk{text-decoration-thickness:3px}',
'.d-brutal .ds-faixa{border-block:3px solid var(--tx)}',
'.d-brutal .sv-lista li{border-top:3px solid var(--tx)}',
'.d-grafite .h1{transform:rotate(-2deg);text-shadow:3px 3px 0 #000,6px 6px 0 var(--p1);line-height:1.08}',
'.d-grafite .ds-chips li{background:var(--tx);color:var(--bg);border:0;border-radius:4px;transform:rotate(-2deg);font-weight:800}',
'.d-grafite .ds-chips li:nth-child(even){background:var(--p2);color:var(--on2);transform:rotate(2.5deg)}',
'.d-grafite .cd{border:2px dashed var(--ln)}',
'.d-grafite .bt{transform:rotate(-1deg)}.d-grafite .q{transform:rotate(-1deg)}',
'.d-grafite .mono{background:var(--p1);color:var(--on1)}.d-grafite .mono span{transform:rotate(-8deg)}',
'.d-liquid .cd,.d-liquid .ds-chips li,.d-liquid .hx-card{background:color-mix(in srgb,var(--sf) 40%,transparent);border:1px solid color-mix(in srgb,#FFFFFF 22%,transparent);-webkit-backdrop-filter:blur(24px) saturate(170%);backdrop-filter:blur(24px) saturate(170%);box-shadow:inset 0 1px 0 color-mix(in srgb,#FFFFFF 45%,transparent),0 24px 48px -20px rgba(0,0,0,.45)}',
'.d-liquid .mono{background:radial-gradient(circle at 30% 30%,color-mix(in srgb,#FFFFFF 55%,transparent),transparent 40%),linear-gradient(135deg,var(--p1),var(--p2));color:#FFFFFF}',
'@media (prefers-reduced-motion:reduce){.site .bt{transition:none}}'
  ].join('\n');

  return E;
})();

/* Comum a todas as páginas da Káiros: medição (opcional, com consentimento), cliques no WhatsApp e copiar número. */
