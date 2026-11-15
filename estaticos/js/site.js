/* Káiros Dynamis · interações do site (sem bibliotecas) */
(function () {
  'use strict';
  var d = document, w = window;
  var semMovimento = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = '5511962431350';
  var KD_ICONES = {
    som: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z"/><path d="M11 5.5a3.5 3.5 0 010 5M12.8 3.6a6 6 0 010 8.8"/></svg>',
    mudo: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z"/><path d="M11 6l3.5 4M14.5 6L11 10"/></svg>'
  };

  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function linkWhats(texto) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(texto); }
  w.KD = w.KD || {};
  w.KD.linkWhats = linkWhats;

  /* cabeçalho que muda ao rolar + barra fixa no celular */
  var cab = $('.cabecalho'), barra = $('.barra-celular');
  var limiteBarra = 520;
  function aoRolar() {
    var y = w.scrollY || 0;
    if (cab) cab.classList.toggle('rolou', y > 8);
    if (barra) {
      var perto = (d.documentElement.scrollHeight - (y + w.innerHeight)) < 380;
      barra.classList.toggle('visivel', y > limiteBarra && !perto);
    }
  }
  w.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  /* assinatura KÁIROS: a palavra ocupa a linha inteira, como no logo, com a régua e o DYNAMIS embaixo */
  function ajustarAssinaturas() {
    $$('.assinatura').forEach(function (a) {
      var p = $('.palavra', a);
      if (!p) return;
      p.style.fontSize = '';
      var atual = parseFloat(getComputedStyle(p).fontSize), largura = p.getBoundingClientRect().width, alvo = a.clientWidth;
      if (largura > 0 && alvo > 0) p.style.fontSize = Math.min(atual * (alvo / largura) * 0.998, 520) + 'px';
    });
  }
  ajustarAssinaturas();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(ajustarAssinaturas);
  var esperaAjuste;
  w.addEventListener('resize', function () { clearTimeout(esperaAjuste); esperaAjuste = setTimeout(ajustarAssinaturas, 120); });

  /* menu do celular */
  var menu = $('#menu-celular');
  $$('[data-abrir-menu]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!menu) return;
      if (typeof menu.showModal === 'function') menu.showModal(); else menu.setAttribute('open', '');
      b.setAttribute('aria-expanded', 'true');
    });
  });
  $$('[data-fechar-menu]').forEach(function (b) {
    b.addEventListener('click', function () { if (menu) menu.close ? menu.close() : menu.removeAttribute('open'); });
  });
  if (menu) {
    menu.addEventListener('close', function () { $$('[data-abrir-menu]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { if (menu.close) menu.close(); }); });
  }

  /* revelar ao rolar, régua animada */
  if ('IntersectionObserver' in w) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('regua') ? 'animar' : 'visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-revelar], .regua[data-animar]').forEach(function (el) { obs.observe(el); });
  } else {
    $$('[data-revelar]').forEach(function (el) { el.classList.add('visivel'); });
  }

  /* reels: tocam sem som quando aparecem; toque pausa; botão liga o som */
  var reels = $$('.reel video');
  if (reels.length && 'IntersectionObserver' in w) {
    var obsReel = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio > 0.55 && !semMovimento && !v.dataset.pausadoPelaPessoa) {
          if (v.preload === 'none') v.preload = 'metadata';
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) { v.pause(); }
      });
    }, { threshold: [0, 0.55, 0.9] });
    reels.forEach(function (v) { obsReel.observe(v); });
  }
  $$('.reel').forEach(function (fig) {
    var v = $('video', fig), tocar = $('.tocar', fig), som = $('.som', fig);
    if (!v) return;
    if (tocar) tocar.addEventListener('click', function () {
      if (v.paused) { delete v.dataset.pausadoPelaPessoa; v.play(); tocar.setAttribute('aria-label', 'Pausar vídeo'); }
      else { v.dataset.pausadoPelaPessoa = '1'; v.pause(); tocar.setAttribute('aria-label', 'Tocar vídeo'); }
    });
    if (som) som.addEventListener('click', function () {
      var ligar = v.muted;
      reels.forEach(function (o) { o.muted = true; var b = o.closest('.reel').querySelector('.som'); if (b) { b.setAttribute('aria-pressed', 'false'); b.innerHTML = KD_ICONES.mudo; } });
      v.muted = !ligar;
      if (ligar) { v.play(); som.setAttribute('aria-pressed', 'true'); som.innerHTML = KD_ICONES.som; }
    });
  });

  /* copiar */
  $$('[data-copiar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var valor = b.getAttribute('data-copiar'), original = b.textContent;
      function feito() { b.textContent = b.getAttribute('data-copiado') || 'Copiado'; setTimeout(function () { b.textContent = original; }, 1800); }
      if (navigator.clipboard) navigator.clipboard.writeText(valor).then(feito, feito);
      else { var t = d.createElement('textarea'); t.value = valor; d.body.appendChild(t); t.select(); try { d.execCommand('copy'); } catch (e) {} d.body.removeChild(t); feito(); }
    });
  });

  /* abas */
  $$('[data-abas]').forEach(function (grupo) {
    var botoes = $$('[role="tab"]', grupo);
    function ativar(b, foco) {
      botoes.forEach(function (o) {
        var sel = o === b;
        o.setAttribute('aria-selected', sel ? 'true' : 'false');
        o.tabIndex = sel ? 0 : -1;
        var p = d.getElementById(o.getAttribute('aria-controls'));
        if (p) p.hidden = !sel;
      });
      if (foco) b.focus();
    }
    botoes.forEach(function (b, i) {
      b.addEventListener('click', function () { ativar(b); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { e.preventDefault(); ativar(botoes[(i + n + botoes.length) % botoes.length], true); }
      });
    });
  });

  /* formulários da Netlify (enviados sem sair da página) */
  $$('form[data-netlify][data-ajax]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.mensagem-form', f), botao = $('[type="submit"]', f);
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var dados = new URLSearchParams(new FormData(f)).toString();
      if (botao) botao.setAttribute('aria-disabled', 'true');
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: dados })
        .then(function (r) { if (!r.ok) throw new Error(r.status); })
        .then(function () { f.reset(); if (msg) { msg.className = 'mensagem-form ok'; msg.textContent = f.getAttribute('data-ok') || 'Recebemos sua mensagem. A equipe responde pelo WhatsApp ou e-mail.'; } })
        .catch(function () { if (msg) { msg.className = 'mensagem-form erro'; msg.innerHTML = 'Não deu para enviar agora. Fale com a gente pelo <a href="' + linkWhats('Olá! Vim pelo site da Káiros Dynamis.') + '">WhatsApp</a>.'; } })
        .then(function () { if (botao) botao.removeAttribute('aria-disabled'); });
    });
  });

  /* formulários que montam a mensagem e abrem o WhatsApp */
  $$('form[data-whatsapp]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      var linhas = [f.getAttribute('data-whatsapp')];
      $$('[name]', f).forEach(function (c) {
        if (c.type === 'hidden' || c.classList.contains('isca') || !c.value) return;
        if ((c.type === 'checkbox' || c.type === 'radio') && !c.checked) return;
        var r = c.getAttribute('data-rotulo') || c.name;
        linhas.push('• ' + r + ': ' + c.value);
      });
      var url = linkWhats(linhas.join('\n')), nova = null;
      try { nova = w.open(url, '_blank'); } catch (erro) {}
      if (nova) { try { nova.opener = null; } catch (erro) {} return; }
      /* o navegador bloqueou a janela: mostra o link para tocar */
      var aviso = $('.mensagem-form', f);
      if (!aviso) { aviso = d.createElement('p'); aviso.className = 'mensagem-form ok'; aviso.setAttribute('role', 'status'); f.appendChild(aviso); }
      aviso.innerHTML = 'Mensagem pronta. <a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">Toque aqui para abrir no WhatsApp</a>.';
    });
  });

  /* diagnóstico do Instagram */
  $$('[data-diagnostico]').forEach(function (bloco) {
    var caixas = $$('input[type="checkbox"]', bloco), barraM = $('.medidor span', bloco), nota = $('[data-nota]', bloco), frase = $('[data-frase]', bloco), enviar = $('[data-enviar]', bloco), arroba = $('[name="arroba"]', bloco);
    function atualizar() {
      var feitos = caixas.filter(function (c) { return c.checked; });
      var n = feitos.length, total = caixas.length;
      if (barraM) barraM.style.width = (n / total * 100) + '%';
      if (nota) nota.textContent = n + ' de ' + total;
      if (frase) frase.textContent = n >= total - 1 ? 'Perfil bem cuidado. Dá para crescer com Reels e anúncios.' : n >= Math.ceil(total / 2) ? 'Bom começo. Faltam alguns ajustes para o perfil vender.' : 'O perfil precisa de uma arrumação antes de investir em anúncios.';
      if (enviar) {
        var faltam = caixas.filter(function (c) { return !c.checked; }).map(function (c) { return '• ' + c.value; });
        var texto = 'Olá! Fiz o diagnóstico do Instagram no site da Káiros Dynamis.\nResultado: ' + n + ' de ' + total + '.' + (arroba && arroba.value ? '\nPerfil: @' + arroba.value.replace(/^@/, '') : '') + (faltam.length ? '\nO que falta:\n' + faltam.join('\n') : '');
        enviar.href = linkWhats(texto);
      }
    }
    caixas.forEach(function (c) { c.addEventListener('change', atualizar); });
    if (arroba) arroba.addEventListener('input', atualizar);
    atualizar();
  });

  /* qual plano de site? */
  $$('[data-quiz]').forEach(function (q) {
    var res = $('.resultado', q), nome = $('[data-plano-nome]', q), link = $('[data-plano-link]', q);
    function calcular() {
      var r = {};
      $$('input:checked', q).forEach(function (i) { r[i.name] = i.value; });
      if (Object.keys(r).length < 3) { if (res) res.hidden = true; return; }
      var plano = r.loja === 'sim' ? 'operacao' : (r.agenda === 'sim' || r.painel === 'sim') ? 'conexao' : 'vitrine';
      var nomes = { vitrine: 'Vitrine', conexao: 'Conexão', operacao: 'Operação' };
      if (nome) nome.textContent = nomes[plano];
      if (link) { link.href = '#plano-' + plano; link.querySelector('span').textContent = 'Ver o ' + nomes[plano]; }
      if (res) res.hidden = false;
      $$('.cartao[data-plano]').forEach(function (c) { c.classList.toggle('destaque', c.getAttribute('data-plano') === plano); });
    }
    $$('input', q).forEach(function (i) { i.addEventListener('change', calcular); });
  });
})();
