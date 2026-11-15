/* Káiros Dynamis · pagamento automático (Stripe) e configurador de sistemas.
   O preço que vale é o do servidor (netlify/functions/checkout.mjs). Aqui só mostramos. */
(function () {
  'use strict';
  var d = document, w = window;
  var C = w.KD_CATALOGO;
  if (!C) return;
  var ENTRADA = (C.entrada_percentual || 50) / 100;

  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function reais(v, centavos) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0 });
  }
  function meia(v) { return Math.round(v * ENTRADA * 100) / 100; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ICONE_FECHAR = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  var SETA = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';

  /* ---------- descrição e valor de cada pedido (para mostrar e para o Pix de reserva) ---------- */
  function descrever(p) {
    if (p.tipo === 'site') {
      var s = C.sites[p.plano]; if (!s) return null;
      return { titulo: 'Entrada do site ' + s.nome, valor: meia(s.preco), detalhe: '50% de ' + reais(s.preco) + '. O restante é pago na entrega.' };
    }
    if (p.tipo === 'instagram') {
      var i = C.instagram.planos[p.plano]; if (!i) return null;
      return { titulo: 'Gestão de Instagram ' + i.nome, valor: i.mensal, detalhe: 'Mensalidade de ' + reais(i.mensal) + '. Contrato mínimo de ' + C.instagram.minimo_meses + ' meses.' };
    }
    if (p.tipo === 'sistema') {
      var r = C.sistemas.ramos[p.ramo]; if (!r) return null;
      var total = C.sistemas.base.preco;
      (p.modulos || []).forEach(function (id) { r.modulos.forEach(function (m) { if (m.id === id) total += m.preco; }); });
      return { titulo: 'Entrada do sistema para ' + r.nome.toLowerCase(), valor: meia(total), detalhe: '50% de ' + reais(total) + '. O restante é pago na entrega.' };
    }
    if (p.tipo === 'avulso') {
      return { titulo: 'Pagamento avulso', valor: Number(p.valor), detalhe: p.referencia ? 'Referência: ' + p.referencia : '' };
    }
    return null;
  }

  /* ---------- janela (Pix de reserva e erros) ---------- */
  var janela;
  function abrirJanela(titulo, html) {
    if (!janela) {
      janela = d.createElement('dialog');
      janela.className = 'janela';
      janela.setAttribute('aria-labelledby', 'janela-titulo');
      d.body.appendChild(janela);
      janela.addEventListener('click', function (e) { if (e.target === janela || e.target.closest('[data-fechar-janela]')) janela.close(); });
    }
    janela.innerHTML = '<div class="janela-topo"><h2 id="janela-titulo" class="subtitulo">' + esc(titulo) + '</h2><button type="button" class="fechar" data-fechar-janela aria-label="Fechar">' + ICONE_FECHAR + '</button></div><div class="janela-corpo">' + html + '</div>';
    if (janela.showModal) janela.showModal(); else janela.setAttribute('open', '');
    var copiar = $('[data-copiar-pix]', janela);
    if (copiar) copiar.addEventListener('click', function () {
      var campo = $('input', copiar.parentNode); campo.select();
      var feito = function () { copiar.textContent = 'Copiado'; setTimeout(function () { copiar.textContent = 'Copiar'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(campo.value).then(feito, feito); else { try { d.execCommand('copy'); } catch (e) {} feito(); }
    });
  }

  function mostrarPix(p, info, escolhido) {
    var html = escolhido
      ? '<p class="texto">Pague pelo app do seu banco com o QR Code ou o Pix copia e cola. Depois, mande o comprovante no WhatsApp: a equipe confirma e segue com você por lá.</p>'
      : '<p class="texto">O pagamento pelo site ainda está sendo ativado. Enquanto isso, pague pelo Pix e mande o comprovante no WhatsApp. A equipe confirma na hora.</p>';
    var txt = 'Olá! Quero pagar: ' + info.titulo + ' (' + reais(info.valor, true) + ').';
    if (w.KairosPix && info.valor > 0) {
      var codigo = w.KairosPix.payload({ chave: C.pix.chave, nome: C.pix.nome, cidade: C.pix.cidade, valor: info.valor, descricao: info.titulo.slice(0, 40), txid: 'KD' + Date.now().toString(36).toUpperCase() });
      html += '<p class="preco"><span class="rotulo">' + esc(info.titulo) + '</span><span class="valor"><strong>' + reais(info.valor, true) + '</strong></span>' + (info.detalhe ? '<span class="nota">' + esc(info.detalhe) + '</span>' : '') + '</p>' +
        '<div class="pix-qr">' + w.KairosPix.svg(codigo, { titulo: 'QR Code do Pix de ' + reais(info.valor, true) }) + '</div>' +
        '<div><p class="rotulo">Pix copia e cola</p><div class="pix-copia mt-1"><input readonly value="' + esc(codigo) + '" aria-label="Código Pix copia e cola"><button type="button" class="botao pequeno" data-copiar-pix>Copiar</button></div></div>';
      txt += '\nJá fiz o Pix, segue o comprovante.';
    }
    html += '<a class="botao limao largo" href="' + w.KD.linkWhats(txt) + '" target="_blank" rel="noopener"><span>Mandar o comprovante no WhatsApp</span>' + SETA + '</a>';
    abrirJanela('Pagar com Pix', html);
  }

  function mostrarErro(msg) {
    abrirJanela('Não deu certo agora', '<p class="texto">' + esc(msg || 'O pagamento não abriu. Tente de novo em instantes ou fale com a gente.') + '</p><a class="botao contorno largo" href="' + w.KD.linkWhats('Olá! Tentei pagar pelo site da Káiros Dynamis e não consegui.') + '" target="_blank" rel="noopener"><span>Falar no WhatsApp</span>' + SETA + '</a>');
  }

  /* ---------- checkout ---------- */
  var ocupado = false;
  function pagar(p, botao) {
    var info = descrever(p);
    if (!info) { mostrarErro('Escolha o que você quer pagar.'); return; }
    if (ocupado) return;
    ocupado = true;
    var original = botao ? botao.innerHTML : '';
    if (botao) { botao.setAttribute('aria-disabled', 'true'); botao.innerHTML = '<span>Abrindo o pagamento</span><i class="carregando" aria-hidden="true"></i>'; }
    var fim = function () { ocupado = false; if (botao) { botao.removeAttribute('aria-disabled'); botao.innerHTML = original; } };
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(p) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.status === 200 && res.j.url) { w.location.href = res.j.url; return; }
        fim();
        if (res.status === 400) mostrarErro(res.j.mensagem);
        else mostrarPix(p, info); /* pagamento automático desligado ou fora do ar: Pix na hora */
      })
      .catch(function () { fim(); mostrarPix(p, info); });
  }
  w.KD = w.KD || {};
  w.KD.pagar = pagar;

  /* botões simples: data-pagar="site:vitrine" */
  $$('[data-pagar]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var partes = b.getAttribute('data-pagar').split(':');
      var p = { tipo: partes[0], plano: partes[1] };
      if (p.tipo === 'instagram') {
        var aceite = d.getElementById('aceite-instagram');
        if (aceite && !aceite.checked) { aceite.focus(); aceite.closest('.aceite').classList.add('alerta'); mostrarErro('Para assinar, confirme que leu os termos e o contrato mínimo de ' + C.instagram.minimo_meses + ' meses.'); return; }
        p.aceite = true;
      }
      pagar(p, b);
    });
  });

  /* pagamento avulso */
  var formAvulso = $('[data-form-avulso]');
  if (formAvulso) {
    var campoValor = $('[name="valor"]', formAvulso), mostra = $('[data-avulso-total]', formAvulso);
    var lerValor = function () { return Number(String(campoValor.value || '').replace(/\./g, '').replace(',', '.')) || 0; };
    campoValor.addEventListener('input', function () { var v = lerValor(); if (mostra) mostra.textContent = v ? reais(v, true) : ''; });
    formAvulso.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = lerValor();
      if (v < C.avulso.minimo || v > C.avulso.maximo) { campoValor.focus(); mostrarErro('Digite um valor entre ' + reais(C.avulso.minimo) + ' e ' + reais(C.avulso.maximo) + '.'); return; }
      pagar({ tipo: 'avulso', valor: v, referencia: ($('[name="referencia"]', formAvulso).value || '').slice(0, 120) }, $('[type="submit"]', formAvulso));
    });
  }

  /* ---------- configurador de sistemas ---------- */
  var conf = $('[data-configurador]');
  if (conf) {
    var lista = $('[data-modulos]', conf), linhas = $('[data-linhas]', conf), totalEl = $('[data-total]', conf), entradaEl = $('[data-entrada]', conf), nomeRamo = $('[data-ramo-nome]', conf), botaoPagar = $('[data-pagar-sistema]', conf), linkWa = $('[data-whats-sistema]', conf);
    var CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
    var ramoAtual = null;
    var modulosVolta = new URLSearchParams(w.location.search).get('modulos'); /* só na primeira montagem */
    /* barra fixa do celular: dentro do configurador, mostra o total e leva ao resumo */
    var barraLink = $('[data-barra-sistema]'), barraTexto = barraLink && $('span', barraLink), totalAtual = '', dentro = false;
    function barraSistema() {
      if (!barraLink) return;
      barraTexto.textContent = dentro && totalAtual ? 'Total ' + totalAtual + ' · Ver resumo' : 'Montar meu sistema';
      barraLink.setAttribute('href', dentro ? '#resumo' : '#montar');
    }
    if (barraLink && 'IntersectionObserver' in w) {
      new IntersectionObserver(function (e) { dentro = e[0].isIntersecting; barraSistema(); }, { rootMargin: '0px 0px -30% 0px' }).observe(conf);
    }

    function desenharModulos() {
      var r = C.sistemas.ramos[ramoAtual];
      var base = C.sistemas.base;
      lista.innerHTML = '<div class="modulo base"><span class="caixinha">' + CHECK + '</span><span class="m-nome">' + esc(base.nome) + '</span><span class="m-preco">' + reais(base.preco) + '</span><span class="m-desc">' + esc(base.descricao) + ' Já vem em todo sistema.</span></div>' +
        r.modulos.map(function (m, i) {
          var marcado = modulosVolta != null ? modulosVolta.split(',').indexOf(m.id) >= 0 : i < 2;
          return '<label class="modulo"><input type="checkbox" name="modulo" value="' + esc(m.id) + '"' + (marcado ? ' checked' : '') + '><span class="caixinha">' + CHECK + '</span><span class="m-nome">' + esc(m.nome) + '</span><span class="m-preco">+ ' + reais(m.preco) + '</span><span class="m-desc">' + esc(m.descricao) + '</span></label>';
        }).join('');
      $$('input', lista).forEach(function (c) { c.addEventListener('change', somar); });
      modulosVolta = null;
      if (nomeRamo) nomeRamo.textContent = r.nome;
      somar();
    }
    function escolhidos() { return $$('input[name="modulo"]:checked', lista).map(function (c) { return c.value; }); }
    function somar() {
      var r = C.sistemas.ramos[ramoAtual], base = C.sistemas.base, total = base.preco, ids = escolhidos();
      var html = '<li><span>' + esc(base.nome) + '</span><span>' + reais(base.preco) + '</span></li>';
      r.modulos.forEach(function (m) { if (ids.indexOf(m.id) >= 0) { total += m.preco; html += '<li><span>' + esc(m.nome) + '</span><span>' + reais(m.preco) + '</span></li>'; } });
      linhas.innerHTML = html;
      totalEl.textContent = reais(total);
      totalAtual = reais(total); barraSistema();
      entradaEl.textContent = reais(meia(total), meia(total) % 1 !== 0);
      if (linkWa) {
        var nomes = r.modulos.filter(function (m) { return ids.indexOf(m.id) >= 0; }).map(function (m) { return '• ' + m.nome; });
        linkWa.href = w.KD.linkWhats('Olá! Montei um sistema para ' + r.nome.toLowerCase() + ' no site da Káiros Dynamis:\n• ' + base.nome + '\n' + nomes.join('\n') + '\nTotal: ' + reais(total) + '. Quero conversar.');
      }
    }
    $$('input[name="ramo"]', conf).forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) { ramoAtual = r.value; desenharModulos(); } });
      if (r.checked) ramoAtual = r.value;
    });
    var pedido = new URLSearchParams(w.location.search).get('ramo');
    if (pedido && C.sistemas.ramos[pedido]) { var marcar = $('input[name="ramo"][value="' + pedido + '"]', conf); if (marcar) { marcar.checked = true; ramoAtual = pedido; } }
    if (!ramoAtual) { var primeiro = $('input[name="ramo"]', conf); primeiro.checked = true; ramoAtual = primeiro.value; }
    desenharModulos();
    if (botaoPagar) botaoPagar.addEventListener('click', function () { pagar({ tipo: 'sistema', ramo: ramoAtual, modulos: escolhidos() }, botaoPagar); });
  }

  /* voltou do checkout sem pagar: mostra o aviso, refaz o pedido e oferece o Pix */
  var volta = new URLSearchParams(w.location.search);
  if (volta.get('pagamento') === 'cancelado') {
    if (formAvulso && volta.get('valor')) {
      var v0 = Number(volta.get('valor'));
      if (v0 > 0) { campoValor.value = String(v0).replace('.', ','); campoValor.dispatchEvent(new Event('input')); }
      var ref0 = $('[name="referencia"]', formAvulso); if (ref0 && volta.get('ref')) ref0.value = volta.get('ref').slice(0, 120);
    }
    var pedidoPix = function () {
      if (conf) return { tipo: 'sistema', ramo: $('input[name="ramo"]:checked', conf).value, modulos: $$('input[name="modulo"]:checked', conf).map(function (c) { return c.value; }) };
      if (formAvulso) return { tipo: 'avulso', valor: Number(String(campoValor.value || '').replace(/\./g, '').replace(',', '.')) || 0, referencia: ($('[name="referencia"]', formAvulso).value || '').slice(0, 120) };
      if (C.sites[volta.get('plano')] && $('[data-pagar^="site:"]')) return { tipo: 'site', plano: volta.get('plano') };
      return null;
    };
    $$('[data-aviso-cancelado]').forEach(function (a) {
      a.hidden = false;
      if (!pedidoPix()) return;
      var b = d.createElement('button');
      b.type = 'button'; b.className = 'link-seta';
      b.innerHTML = 'Prefere Pix? Pagar com QR Code' + SETA;
      b.addEventListener('click', function () {
        var p = pedidoPix(), info = p && descrever(p);
        if (!info || !(info.valor > 0)) { mostrarErro('Escolha o que você quer pagar.'); return; }
        if (p.tipo === 'avulso' && (info.valor < C.avulso.minimo || info.valor > C.avulso.maximo)) { mostrarErro('Digite um valor entre ' + reais(C.avulso.minimo) + ' e ' + reais(C.avulso.maximo) + '.'); return; }
        mostrarPix(p, info, true);
      });
      a.appendChild(b);
    });
  }

  /* ---------- página de obrigado ---------- */
  var obrigado = $('[data-obrigado]');
  if (obrigado) {
    var q = new URLSearchParams(w.location.search), id = q.get('session_id');
    var estado = $('[data-estado]', obrigado), titulo = $('[data-titulo]', obrigado), detalhe = $('[data-detalhe]', obrigado), wa = $('[data-whats-obrigado]', obrigado);
    if (id && /^cs_[A-Za-z0-9_]+$/.test(id)) {
      fetch('/api/checkout?session_id=' + encodeURIComponent(id), { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) {
          if (!s) return;
          var pago = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
          if (estado) estado.textContent = pago ? 'Pagamento confirmado' : 'Aguardando o pagamento';
          if (titulo) titulo.textContent = pago ? 'Pronto, recebemos.' : 'Quase lá.';
          if (detalhe) detalhe.textContent = (s.descricao ? s.descricao + ' · ' : '') + (s.valor ? reais(s.valor / 100, true) : '') + (pago ? '' : ' · O Pix aparece como pago assim que o banco confirmar.');
          if (wa) wa.href = w.KD.linkWhats('Olá! Acabei de pagar pelo site da Káiros Dynamis: ' + (s.descricao || '') + '. Código ' + id.slice(-8) + '.');
        })
        .catch(function () {});
    }
  }
})();
