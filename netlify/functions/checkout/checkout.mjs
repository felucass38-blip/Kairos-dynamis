// Káiros Dynamis · pagamento automático com a Stripe (Checkout).
// POST /api/checkout            cria a sessão de pagamento e devolve { url }
// GET  /api/checkout?session_id  devolve a situação de um pagamento (página de obrigado)
// GET  /api/checkout?status=1    diz se o pagamento automático está ligado
//
// Os preços vêm de catalogo.mjs, gerado a partir de dados/catalogo.json pelo build.
// A chave fica na variável de ambiente STRIPE_SECRET_KEY da Netlify (sk_test_... para testar, sk_live_... para valer).
import CATALOGO from './catalogo.mjs';

export const config = { path: '/api/checkout' };

const STRIPE = 'https://api.stripe.com/v1';
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function chave() {
  try { if (globalThis.Netlify?.env?.get) { const k = globalThis.Netlify.env.get('STRIPE_SECRET_KEY'); if (k) return k; } } catch {}
  return process.env.STRIPE_SECRET_KEY || '';
}

// Transforma objetos aninhados no formato de formulário que a API da Stripe espera.
export function codificar(obj, prefixo = '', saida = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const nome = prefixo ? `${prefixo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? codificar(item, `${nome}[${i}]`, saida) : saida.append(`${nome}[${i}]`, String(item))));
    else if (typeof v === 'object') codificar(v, nome, saida);
    else saida.append(nome, String(v));
  }
  return saida;
}

const centavos = (reais) => Math.round(Number(reais) * 100);
const texto = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const reais = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Monta o pedido a partir do que a página mandou. Lança Error com .publico = mensagem para o cliente.
export function montarPedido(p, C = CATALOGO) {
  const erro = (m) => Object.assign(new Error(m), { publico: m });
  const entrada = (C.entrada_percentual || 50) / 100;
  const tipo = texto(p?.tipo, 20);

  if (tipo === 'site') {
    const s = C.sites[texto(p.plano, 20)];
    if (!s) throw erro('Plano de site inválido.');
    const valor = Math.round(s.preco * entrada * 100) / 100;
    return {
      modo: 'payment', tipo, valor,
      nome: `Entrada de ${C.entrada_percentual}% · Site ${s.nome}`,
      descricao: `Site ${s.nome}: entrada de ${reais(valor)} (${C.entrada_percentual}% de ${reais(s.preco)}). O restante é pago na entrega.`,
      metadata: { tipo, plano: texto(p.plano, 20), preco_base: String(s.preco) },
    };
  }

  if (tipo === 'instagram') {
    const plano = C.instagram.planos[texto(p.plano, 20)];
    if (!plano) throw erro('Plano de Instagram inválido.');
    if (p.aceite !== true && p.aceite !== 'true' && p.aceite !== 'on') throw erro(`Confirme que leu os termos e o contrato mínimo de ${C.instagram.minimo_meses} meses.`);
    return {
      modo: 'subscription', tipo, valor: plano.mensal,
      nome: `Gestão de Instagram · ${plano.nome}`,
      descricao: `Gestão de Instagram ${plano.nome}: ${reais(plano.mensal)} por mês. Contrato mínimo de ${C.instagram.minimo_meses} meses.`,
      metadata: { tipo, plano: texto(p.plano, 20), minimo_meses: String(C.instagram.minimo_meses) },
    };
  }

  if (tipo === 'sistema') {
    const ramoId = texto(p.ramo, 20);
    const ramo = C.sistemas.ramos[ramoId];
    if (!ramo) throw erro('Escolha o ramo do seu negócio.');
    const pedidos = Array.isArray(p.modulos) ? [...new Set(p.modulos.map((m) => texto(m, 20)))] : [];
    const modulos = ramo.modulos.filter((m) => pedidos.includes(m.id));
    if (pedidos.length !== modulos.length) throw erro('Um dos módulos escolhidos não existe para esse ramo.');
    const total = C.sistemas.base.preco + modulos.reduce((s, m) => s + m.preco, 0);
    const valor = Math.round(total * entrada * 100) / 100;
    const lista = [C.sistemas.base.nome, ...modulos.map((m) => m.nome)].join(', ');
    return {
      modo: 'payment', tipo, valor,
      nome: `Entrada de ${C.entrada_percentual}% · Sistema para ${ramo.nome.toLowerCase()}`,
      descricao: texto(`Sistema para ${ramo.nome.toLowerCase()} (${lista}). Total ${reais(total)}; entrada de ${reais(valor)}, o restante na entrega.`, 480),
      metadata: { tipo, ramo: ramoId, modulos: modulos.map((m) => m.id).join(',') || 'nenhum', total: String(total) },
    };
  }

  if (tipo === 'avulso') {
    const valor = Math.round(Number(String(p.valor).replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(valor) || valor < C.avulso.minimo || valor > C.avulso.maximo) throw erro(`Digite um valor entre ${reais(C.avulso.minimo)} e ${reais(C.avulso.maximo)}.`);
    const ref = texto(p.referencia, 120);
    return {
      modo: 'payment', tipo, valor,
      nome: 'Pagamento avulso · Káiros Dynamis',
      descricao: ref ? `Pagamento avulso: ${ref}` : 'Pagamento avulso combinado com a equipe.',
      metadata: { tipo, referencia: ref || '-' },
    };
  }

  throw erro('Pedido inválido.');
}

// Volta do checkout sem pagar: leva o pedido na URL para a página refazer a escolha e oferecer o Pix.
export function urlDeVolta(pedido, origem) {
  const m = pedido.metadata || {};
  const q = new URLSearchParams({ pagamento: 'cancelado' });
  if (pedido.tipo === 'site' || pedido.tipo === 'instagram') q.set('plano', m.plano);
  if (pedido.tipo === 'sistema') { q.set('ramo', m.ramo); q.set('modulos', m.modulos); }
  if (pedido.tipo === 'avulso') { q.set('valor', String(pedido.valor)); if (m.referencia && m.referencia !== '-') q.set('ref', m.referencia); }
  const caminho = { site: '/sites/', instagram: '/instagram/', sistema: '/sistemas/', avulso: '/pagar/' }[pedido.tipo];
  return `${origem}${caminho}?${q.toString()}${pedido.tipo === 'sistema' ? '#montar' : ''}`;
}

export function parametrosStripe(pedido, origem) {
  const metadata = { ...pedido.metadata, descricao: texto(pedido.descricao, 480), origem: 'site' };
  const base = {
    mode: pedido.modo,
    locale: 'pt-BR',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'brl',
        unit_amount: centavos(pedido.valor),
        ...(pedido.modo === 'subscription' ? { recurring: { interval: 'month' } } : {}),
        product_data: { name: pedido.nome, description: texto(pedido.descricao, 480) },
      },
    }],
    success_url: `${origem}/obrigado/?tipo=${pedido.tipo}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: urlDeVolta(pedido, origem),
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    custom_fields: [{ key: 'negocio', label: { type: 'custom', custom: 'Nome do seu negócio' }, type: 'text', optional: pedido.tipo === 'avulso' }],
    metadata,
  };
  if (pedido.modo === 'payment') {
    base.customer_creation = 'always';
    base.payment_intent_data = { description: texto(pedido.descricao, 480), metadata };
  } else {
    base.subscription_data = { description: texto(pedido.descricao, 480), metadata };
  }
  return base;
}

async function stripe(caminho, k, corpo) {
  const r = await fetch(`${STRIPE}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${k}`, ...(corpo ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: corpo ? codificar(corpo).toString() : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(dados?.error?.message || `Stripe ${r.status}`), { status: r.status });
  return dados;
}

async function lerCorpo(req) {
  const tipo = req.headers.get('content-type') || '';
  if (tipo.includes('application/json')) return req.json();
  const f = new URLSearchParams(await req.text());
  const o = Object.fromEntries(f);
  if (f.getAll('modulos').length) o.modulos = f.getAll('modulos');
  return o;
}

export default async (req) => {
  const url = new URL(req.url);
  const k = chave();

  if (req.method === 'GET') {
    if (url.searchParams.has('status')) return json({ ligado: Boolean(k), modo: k ? (k.includes('_test_') ? 'teste' : 'real') : null });
    const id = url.searchParams.get('session_id') || '';
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(id)) return json({ mensagem: 'Pagamento não encontrado.' }, 400);
    if (!k) return json({ erro: 'pagamento_desligado' }, 503);
    try {
      const s = await stripe(`/checkout/sessions/${id}`, k);
      return json({ status: s.status, payment_status: s.payment_status, valor: s.amount_total, moeda: s.currency, descricao: s.metadata?.descricao || '', tipo: s.metadata?.tipo || '' });
    } catch (e) {
      return json({ mensagem: 'Pagamento não encontrado.' }, e.status === 404 ? 404 : 502);
    }
  }

  if (req.method !== 'POST') return json({ mensagem: 'Método não permitido.' }, 405);
  if (!k) return json({ erro: 'pagamento_desligado', mensagem: 'O pagamento automático ainda não foi ligado.' }, 503);

  let pedido;
  try { pedido = montarPedido(await lerCorpo(req)); }
  catch (e) { return json({ mensagem: e.publico || 'Pedido inválido.' }, 400); }

  try {
    const sessao = await stripe('/checkout/sessions', k, parametrosStripe(pedido, url.origin));
    const aceitaHtml = (req.headers.get('accept') || '').includes('text/html');
    if (aceitaHtml) return new Response(null, { status: 303, headers: { location: sessao.url } });
    return json({ url: sessao.url });
  } catch (e) {
    console.error('Stripe recusou o checkout:', e.message);
    return json({ mensagem: 'O pagamento não abriu agora. Tente de novo em instantes ou fale com a gente no WhatsApp.' }, 502);
  }
};
