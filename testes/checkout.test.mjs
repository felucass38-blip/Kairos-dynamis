// Testes da função de pagamento. Rodar: node --test testes/checkout.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { montarPedido, parametrosStripe, codificar, urlDeVolta } from '../netlify/functions/checkout/checkout.mjs';
import C from '../netlify/functions/checkout/catalogo.mjs';

test('entrada do site é 50% do preço do servidor', () => {
  const p = montarPedido({ tipo: 'site', plano: 'conexao' });
  assert.equal(p.modo, 'payment');
  assert.equal(p.valor, C.sites.conexao.preco / 2);
});

test('sistema soma base + módulos e cobra a metade', () => {
  const p = montarPedido({ tipo: 'sistema', ramo: 'mercado', modulos: ['caixa', 'fiado'] });
  const total = C.sistemas.base.preco + 690 + 390;
  assert.equal(p.metadata.total, String(total));
  assert.equal(p.valor, total / 2);
});

test('sistema recusa módulo de outro ramo', () => {
  assert.throws(() => montarPedido({ tipo: 'sistema', ramo: 'mercado', modulos: ['agenda'] }), /não existe/);
});

test('instagram exige aceite e vira assinatura mensal', () => {
  assert.throws(() => montarPedido({ tipo: 'instagram', plano: 'essencial' }), /mínimo/);
  const p = montarPedido({ tipo: 'instagram', plano: 'essencial', aceite: true });
  const s = parametrosStripe(p, 'https://exemplo.netlify.app');
  assert.equal(s.mode, 'subscription');
  assert.equal(s.line_items[0].price_data.recurring.interval, 'month');
  assert.equal(s.line_items[0].price_data.unit_amount, C.instagram.planos.essencial.mensal * 100);
  assert.equal(s.customer_creation, undefined);
});

test('avulso respeita o mínimo e o máximo', () => {
  assert.throws(() => montarPedido({ tipo: 'avulso', valor: 5 }), /entre/);
  assert.throws(() => montarPedido({ tipo: 'avulso', valor: 99999 }), /entre/);
  assert.equal(montarPedido({ tipo: 'avulso', valor: '150,50' }).valor, 150.5);
});

test('codifica objetos no formato da Stripe', () => {
  const q = codificar({ a: 1, b: { c: 'x' }, d: [{ e: 2 }], f: undefined }).toString();
  assert.equal(decodeURIComponent(q), 'a=1&b[c]=x&d[0][e]=2');
});

test('sem chave da Stripe, a função responde 503 para o site cair no Pix', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  const r = await handler(new Request('https://exemplo.netlify.app/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tipo: 'site', plano: 'vitrine' }) }));
  assert.equal(r.status, 503);
});

test('com chave, cria o checkout com o valor do servidor e devolve a url', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_exemplo';
  const original = globalThis.fetch;
  let enviado;
  globalThis.fetch = async (url, opcoes) => {
    enviado = { url, opcoes, corpo: new URLSearchParams(opcoes.body) };
    return new Response(JSON.stringify({ id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' }), { status: 200 });
  };
  try {
    const r = await handler(new Request('https://kairos.netlify.app/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tipo: 'site', plano: 'vitrine', valor: 1 }) }));
    assert.equal(r.status, 200);
    assert.equal((await r.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_123');
    assert.equal(enviado.url, 'https://api.stripe.com/v1/checkout/sessions');
    assert.equal(enviado.opcoes.headers.authorization, 'Bearer sk_test_exemplo');
    assert.equal(enviado.corpo.get('line_items[0][price_data][unit_amount]'), String(C.sites.vitrine.preco * 50));
    assert.equal(enviado.corpo.get('line_items[0][price_data][currency]'), 'brl');
    assert.equal(enviado.corpo.get('success_url'), 'https://kairos.netlify.app/obrigado/?tipo=site&session_id={CHECKOUT_SESSION_ID}');
    assert.equal(enviado.corpo.get('locale'), 'pt-BR');
  } finally { globalThis.fetch = original; delete process.env.STRIPE_SECRET_KEY; }
});

test('pedido inválido responde 400 com mensagem', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_exemplo';
  const r = await handler(new Request('https://k.app/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tipo: 'site', plano: 'gratis' }) }));
  assert.equal(r.status, 400);
  assert.match((await r.json()).mensagem, /inválido/);
  delete process.env.STRIPE_SECRET_KEY;
});

test('a volta do checkout leva o pedido para a página refazer a escolha', () => {
  const o = 'https://exemplo.netlify.app';
  const sis = montarPedido({ tipo: 'sistema', ramo: 'oficina', modulos: ['os', 'caixa'] });
  const u = new URL(urlDeVolta(sis, o));
  assert.equal(u.pathname, '/sistemas/');
  assert.equal(u.searchParams.get('pagamento'), 'cancelado');
  assert.equal(u.searchParams.get('ramo'), 'oficina');
  assert.equal(u.searchParams.get('modulos'), 'os,caixa');
  assert.equal(u.hash, '#montar');
  assert.equal(new URL(parametrosStripe(sis, o).cancel_url).search, u.search);
  const av = new URL(urlDeVolta(montarPedido({ tipo: 'avulso', valor: '150,50', referencia: 'cartões NFC & logo' }), o));
  assert.equal(av.searchParams.get('valor'), '150.5');
  assert.equal(av.searchParams.get('ref'), 'cartões NFC & logo');
  assert.equal(new URL(urlDeVolta(montarPedido({ tipo: 'site', plano: 'vitrine' }), o)).searchParams.get('plano'), 'vitrine');
});
