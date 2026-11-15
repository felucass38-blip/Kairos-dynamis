#!/usr/bin/env python3
"""Gera o site da Káiros Dynamis em public/.

Uso: python3 ferramentas/build.py
Precisa de Python 3.10+, Jinja2 e Markdown (pip install jinja2 markdown).
Para as imagens (favicon e og.png) usa rsvg-convert, se existir.
O que está em public/ é o que a Netlify publica: não edite lá, edite em modelos/, estaticos/ e dados/.
"""
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

import markdown
from jinja2 import Environment, FileSystemLoader, select_autoescape

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / 'public'
EST = RAIZ / 'estaticos'
MODELOS = RAIZ / 'modelos'

SITE = {
    'url': os.environ.get('SITE_URL', 'https://kairos-dynamis.netlify.app').rstrip('/'),
    'nome': 'Káiros Dynamis',
    'whatsapp': '5511962431350',
    'whatsapp_texto': '(11) 96243-1350',
    'instagram': 'sejakaiross',
    'email': 'kairosoficialcontato@gmail.com',
    'cidade': 'Guarulhos, SP',
    'ano': dt.date.today().year,
    # Google Search Console: cole aqui só o código do content="..." da tag HTML de verificação
    'google_verificacao': '',
}
HOJE = dt.date.today().isoformat()

# página: rota, modelo, título (aba e Google), descrição, prioridade no sitemap, extras
PAGINAS = [
    ('/', 'inicio.html', 'Káiros Dynamis · Sites, sistemas e Instagram para negócios locais',
     'A Káiros Dynamis cria sites, sistemas sob medida e cuida do Instagram de negócios locais. Veja a prévia do seu site grátis antes de contratar.', 1.0, {}),
    ('/sites/', 'sites.html', 'Sites para negócios locais: planos Vitrine, Conexão e Operação · Káiros Dynamis',
     'Sites prontos para o Google e para o celular, com WhatsApp, agendamento ou loja online. Veja os planos e pague a entrada pelo site.', 0.9, {'nav': 'sites'}),
    ('/sistemas/', 'sistemas.html', 'Sistemas para mercado, barbearia, salão, oficina e restaurante · Káiros Dynamis',
     'Monte o sistema do seu negócio escolhendo os módulos: caixa, estoque, agenda, ordens de serviço, comandas e mais. O preço soma na hora.', 0.9, {'nav': 'sistemas'}),
    ('/instagram/', 'instagram.html', 'Gestão de Instagram para negócios locais · Káiros Dynamis',
     'Posts, Reels, stories e anúncios com a cara do seu negócio. Planos mensais a partir de R$ 690, com assinatura pelo site.', 0.8, {'nav': 'instagram'}),
    ('/nfc/', 'nfc.html', 'Cartões e placas NFC para o seu negócio · Káiros Dynamis',
     'O cliente encosta o celular e abre o seu WhatsApp, o Instagram, o cardápio ou a avaliação no Google. Cartões e placas sob orçamento.', 0.6, {'nav': 'nfc'}),
    ('/portfolio/', 'portfolio.html', 'Portfólio: sites e Reels · Káiros Dynamis',
     'Trabalhos da Káiros Dynamis: o site da SÔMA Collective, Reels e vídeos curtos e as demonstrações dos nossos sistemas.', 0.7, {'nav': 'portfolio'}),
    ('/portfolio/soma/', 'soma.html', 'SÔMA Collective: site de marca, música e comunidade · Káiros Dynamis',
     'Como a Káiros Dynamis fez o site da SÔMA Collective: loja das camisas 001 e 002, as músicas de Victor Lucass e os encontros da comunidade.', 0.6, {'nav': 'portfolio'}),
    ('/portfolio/reels/kairos-em-movimento/', 'movimento.html', 'Káiros em Movimento: o comercial da Káiros · Káiros Dynamis',
     'O comercial de 34 segundos da Káiros, feito em código: o traço do logo vira personagem e mostra como um site leva o cliente até você.', 0.5, {'nav': 'portfolio'}),
    ('/sobre/', 'sobre.html', 'Sobre a Káiros Dynamis · O momento certo e a força para agir',
     'Káiros é o momento certo. Dynamis é a força para agir. Conheça a equipe de Guarulhos que cria sites, sistemas e cuida do Instagram de negócios locais.', 0.6, {'nav': 'sobre'}),
    ('/blog/', 'blog.html', 'Blog: dicas para vender mais no digital · Káiros Dynamis',
     'Artigos curtos e práticos para donos de negócios locais: site, Google, Instagram e sistemas.', 0.7, {'nav': 'blog'}),
    ('/contratar/', 'contratar.html', 'Contratar a Káiros Dynamis · Fale com a gente',
     'Escolha o que você precisa, pague a entrada pelo site ou fale com a equipe pelo WhatsApp, e-mail ou formulário.', 0.8, {'nav': 'contratar'}),
    ('/pagar/', 'pagar.html', 'Pagar uma cobrança · Káiros Dynamis',
     'Pague um valor combinado com a equipe da Káiros Dynamis com cartão ou Pix, com confirmação automática.', 0.4, {}),
    ('/duvidas/', 'duvidas.html', 'Dúvidas frequentes · Káiros Dynamis',
     'Respostas sobre sites, sistemas, gestão de Instagram, NFC, atendimento e pagamento na Káiros Dynamis.', 0.6, {'nav': 'duvidas'}),
    ('/termos/', 'termos.html', 'Termos de contratação · Káiros Dynamis',
     'As regras de contratação dos sites, sistemas e da gestão de Instagram da Káiros Dynamis.', 0.3, {}),
    ('/privacidade/', 'privacidade.html', 'Política de privacidade · Káiros Dynamis',
     'Como a Káiros Dynamis usa os dados que você manda pelo site, conforme a LGPD.', 0.3, {}),
    ('/obrigado/', 'obrigado.html', 'Pagamento recebido · Káiros Dynamis',
     'Confirmação do seu pagamento na Káiros Dynamis.', 0, {'noindex': True}),
]

NAV = [
    ('sites', '/sites/', 'Sites'),
    ('sistemas', '/sistemas/', 'Sistemas'),
    ('instagram', '/instagram/', 'Instagram'),
    ('nfc', '/nfc/', 'NFC'),
    ('portfolio', '/portfolio/', 'Portfólio'),
    ('blog', '/blog/', 'Blog'),
    ('sobre', '/sobre/', 'Sobre'),
]


def ler_catalogo():
    bruto = json.loads((RAIZ / 'dados' / 'catalogo.json').read_text('utf-8'))

    def limpar(o):
        if isinstance(o, dict):
            return {k: limpar(v) for k, v in o.items() if not k.startswith('_')}
        if isinstance(o, list):
            return [limpar(v) for v in o]
        return o
    return limpar(bruto)


def reais(v, centavos=False):
    v = float(v)
    s = f'{v:,.2f}' if centavos or v % 1 else f'{v:,.0f}'
    return 'R$ ' + s.replace(',', 'X').replace('.', ',').replace('X', '.')


def resumo_hash(dados: bytes) -> str:
    return hashlib.sha1(dados).hexdigest()[:10]


class Ativos:
    """Copia CSS e JS com o hash do conteúdo no nome, para o cache durar um ano."""

    def __init__(self):
        self.mapa = {}

    def publicar(self, origem: Path, destino_rel: str, conteudo: bytes | None = None) -> str:
        dados = conteudo if conteudo is not None else origem.read_bytes()
        h = resumo_hash(dados)
        p = Path(destino_rel)
        final = p.with_name(f'{p.stem}.{h}{p.suffix}')
        alvo = SAIDA / final
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_bytes(dados)
        url = '/' + final.as_posix()
        self.mapa[destino_rel] = url
        return url

    def __call__(self, rel):
        return self.mapa[rel]


def ler_artigos():
    artigos = []
    for f in sorted((MODELOS / 'blog').glob('*.md')):
        texto = f.read_text('utf-8')
        m = re.match(r'^---\n(.*?)\n---\n(.*)$', texto, re.S)
        meta = dict(l.split(': ', 1) for l in m.group(1).splitlines() if ': ' in l)
        corpo = markdown.markdown(m.group(2), extensions=['extra', 'sane_lists'], output_format='html5')
        corpo = re.sub(r'<a href="(https?://)', r'<a rel="noopener" target="_blank" href="\1', corpo)
        palavras = len(re.sub(r'<[^>]+>', ' ', corpo).split())
        artigos.append({**meta, 'html': corpo, 'rota': f"/blog/{meta['slug']}/", 'minutos': max(2, round(palavras / 200))})
    artigos.sort(key=lambda a: a['data'], reverse=True)
    return artigos


def svg_logo_k(cor='#F2F2EE', limao='#C6FF3D'):
    return (f'<path fill="{cor}" d="M717 729L395 314L686 0H509L224 320V0H74V729H224V485L299 407L538 729Z"/>'
            f'<rect x="780" y="599" width="520" height="130" fill="{limao}"/>')


def gerar_icones():
    img = SAIDA / 'img'
    img.mkdir(parents=True, exist_ok=True)
    favicon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0B0B0C"/>'
               f'<g transform="translate(8 17) scale(.0387)">{svg_logo_k()}</g></svg>')
    (SAIDA / 'favicon.svg').write_text(favicon, 'utf-8')
    regua = ''.join(
        f'<rect x="{620 + i * 16}" y="{470 - (6 + (i * 0.85 if i < 21 else 0)) * 3}" width="{3 if i == 21 else 2}" height="{(6 + (i * 0.85 if i < 21 else 0)) * 3 if i != 21 else 90}" fill="{"#C6FF3D" if i == 21 else ("#5A5A5C" if i % 4 == 0 and i < 21 else "#3A3A3C")}"/>'
        for i in range(33))
    og = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0B0B0C"/>
  <g opacity=".5">{''.join(f'<circle cx="{900 + (x - 12) * 13}" cy="{170 + (y - 12) * 13}" r="{max(0.0, 2.6 - (((x - 9) ** 2 + (y - 10) ** 2) ** .5) * .2):.2f}" fill="#F2F2EE"/>' for x in range(25) for y in range(25))}</g>
  <circle cx="930" cy="185" r="118" fill="#0B0B0C"/>
  <g transform="translate(70 92) scale(.25)">{svg_logo_k()}</g>
  <text x="72" y="420" font-family="Inter, sans-serif" font-weight="800" font-size="96" letter-spacing="-4.5" fill="#F2F2EE">Káiros Dynamis</text>
  <text x="74" y="478" font-family="Inter, sans-serif" font-weight="500" font-size="30" fill="#B9B9B3">Sites, sistemas e Instagram para negócios locais.</text>
  <g transform="translate(-548 85)">{regua}</g>
  <text x="74" y="570" font-family="DejaVu Sans Mono, monospace" font-size="20" letter-spacing="5" fill="#8A8A85">KAIROS-DYNAMIS.NETLIFY.APP</text>
</svg>'''
    (img / 'og.svg').write_text(og, 'utf-8')
    if shutil.which('rsvg-convert'):
        for nome, tam, svg in (('apple-touch-icon.png', 180, favicon), ('icone-192.png', 192, favicon), ('icone-512.png', 512, favicon), ('favicon-32.png', 32, favicon)):
            tmp = img / f'_{nome}.svg'
            tmp.write_text(svg, 'utf-8')
            subprocess.run(['rsvg-convert', '-w', str(tam), '-h', str(tam), str(tmp), '-o', str(img / nome)], check=True)
            tmp.unlink()
        subprocess.run(['rsvg-convert', str(img / 'og.svg'), '-o', str(img / 'og.png')], check=True)
    (img / 'og.svg').unlink()


def copiar_arvore(origem: Path, destino: Path):
    if destino.exists():
        shutil.rmtree(destino)
    shutil.copytree(origem, destino)


def preparar_paginas_extras(env, ctx):
    """Studio (criar), demonstração de sistemas e site da SÔMA: páginas que já existiam, adaptadas."""
    # Demonstração dos sistemas
    demo = (EST / 'sistemas-demo' / 'index.html').read_text('utf-8')
    demo = demo.replace('<head>', '<head>\n<meta name="robots" content="noindex">\n<link rel="canonical" href="' + SITE['url'] + '/sistemas/">', 1)
    (SAIDA / 'sistemas' / 'demo').mkdir(parents=True, exist_ok=True)
    (SAIDA / 'sistemas' / 'demo' / 'index.html').write_text(demo, 'utf-8')

    # Site da SÔMA (cópia para o portfólio, fora do Google)
    destino = SAIDA / 'portfolio' / 'soma' / 'site'
    copiar_arvore(EST / 'portfolio' / 'soma-site', destino)
    soma = (destino / 'index.html').read_text('utf-8')
    soma = re.sub(r'<head>', '<head>\n<meta name="robots" content="noindex">', soma, count=1)
    (destino / 'index.html').write_text(soma, 'utf-8')

    # Káiros em Movimento: só o player, sem o roteiro interno
    mov = SAIDA / 'portfolio' / 'reels' / 'kairos-em-movimento'
    mov.mkdir(parents=True, exist_ok=True)
    for f in ('video.js', 'audio.js', 'video.css'):
        shutil.copyfile(EST / 'portfolio' / 'movimento' / f, mov / f)
    copiar_arvore(EST / 'portfolio' / 'movimento' / 'quadros', mov / 'quadros')

    # Studio: o app que já existia, com a marca nova e os links novos
    original = (EST / 'studio' / 'criar-original.html').read_text('utf-8')
    corpo = original[original.find('<div class="app"'):]
    corpo = corpo[:corpo.find('<script')].rstrip()
    corpo = corpo.replace('href="index.html"', 'href="/"').replace('href="contratar.html?origem=studio"', 'href="/contratar/?origem=studio"').replace('href="privacidade.html"', 'href="/privacidade/"')
    corpo = re.sub(r'assets/img/icones\.svg(\?v=[a-z0-9]+)?', ctx['asset']('assets/studio/icones.svg'), corpo)
    corpo = re.sub(r'<a class="logo"[^>]*>.*?</a>',
                   '<a class="logo kd-logo" href="/" aria-label="Káiros Dynamis, página inicial"><svg viewBox="60 0 1240 729" aria-hidden="true" focusable="false">'
                   + svg_logo_k('currentColor') + '</svg><span>Káiros <small>DYNAMIS</small></span></a>', corpo, count=1, flags=re.S)
    ctx_criar = dict(ctx, studio_app=corpo)
    html = env.get_template('paginas/criar.html').render(**ctx_criar, pagina={
        'rota': '/criar/', 'titulo': 'Criar meu site grátis no Káiros Studio · Káiros Dynamis',
        'descricao': 'Digite o nome do seu negócio e veja três propostas de site na hora, sem cadastro. Escolheu uma? A equipe da Káiros Dynamis finaliza e coloca no ar.',
        'canonica': SITE['url'] + '/criar/'})
    (SAIDA / 'criar').mkdir(parents=True, exist_ok=True)
    (SAIDA / 'criar' / 'index.html').write_text(html, 'utf-8')


def main():
    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    SAIDA.mkdir()
    C = ler_catalogo()
    artigos = ler_artigos()

    # catálogo para a função da Netlify e para a página
    (RAIZ / 'netlify' / 'functions' / 'checkout' / 'catalogo.mjs').write_text(
        '// Gerado por ferramentas/build.py a partir de dados/catalogo.json. Não edite aqui.\nexport default ' + json.dumps(C, ensure_ascii=False, indent=2) + ';\n', 'utf-8')

    ativos = Ativos()
    ativos.publicar(EST / 'css' / 'site.css', 'assets/css/site.css')
    for js in ('site.js', 'pagamento.js', 'pix.js'):
        ativos.publicar(EST / 'js' / js, f'assets/js/{js}')
    ativos.publicar(None, 'assets/js/catalogo.js', ('window.KD_CATALOGO=' + json.dumps(C, ensure_ascii=False, separators=(',', ':')) + ';').encode('utf-8'))
    for f in ('site-antigo.css', 'studio.css', 'kc.js', 'ke.js', 'studio.js', 'icones.svg'):
        ativos.publicar(EST / 'studio' / f, f'assets/studio/{f}')
    if (EST / 'img').exists():
        copiar_arvore(EST / 'img', SAIDA / 'assets' / 'img')
    gerar_icones()

    env = Environment(loader=FileSystemLoader(str(MODELOS)), autoescape=select_autoescape(['html']), trim_blocks=True, lstrip_blocks=True)
    env.filters['reais'] = reais
    env.filters['wa'] = lambda t: 'https://wa.me/' + SITE['whatsapp'] + '?text=' + __import__('urllib.parse').parse.quote(t)
    env.filters['data_br'] = lambda s: dt.date.fromisoformat(s).strftime('%d/%m/%Y')
    ctx = {'site': SITE, 'C': C, 'asset': ativos, 'nav': NAV, 'artigos': artigos, 'hoje': HOJE}

    mapa = []
    for rota, modelo, titulo, descricao, prioridade, extra in PAGINAS:
        pagina = {'rota': rota, 'titulo': titulo, 'descricao': descricao, 'canonica': SITE['url'] + rota, **extra}
        html = env.get_template('paginas/' + modelo).render(**ctx, pagina=pagina)
        alvo = SAIDA / rota.strip('/') / 'index.html' if rota != '/' else SAIDA / 'index.html'
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_text(html, 'utf-8')
        if not extra.get('noindex'):
            mapa.append((rota, prioridade))

    for a in artigos:
        pagina = {'rota': a['rota'], 'titulo': a['titulo'] + ' · Blog da Káiros Dynamis', 'descricao': a['descricao'], 'canonica': SITE['url'] + a['rota'], 'nav': 'blog', 'tipo_og': 'article'}
        html = env.get_template('paginas/artigo.html').render(**ctx, pagina=pagina, artigo=a)
        alvo = SAIDA / a['rota'].strip('/') / 'index.html'
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_text(html, 'utf-8')
        mapa.append((a['rota'], 0.6))

    html404 = env.get_template('paginas/404.html').render(**ctx, pagina={'rota': '/404', 'titulo': 'Página não encontrada · Káiros Dynamis', 'descricao': 'Esta página não existe.', 'canonica': SITE['url'] + '/', 'noindex': True})
    (SAIDA / '404.html').write_text(html404, 'utf-8')

    preparar_paginas_extras(env, ctx)
    mapa.append(('/criar/', 0.8))

    # sitemap, robots e manifesto
    itens = '\n'.join(f'  <url><loc>{SITE["url"]}{r}</loc><lastmod>{HOJE}</lastmod><priority>{p:.1f}</priority></url>' for r, p in mapa)
    (SAIDA / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{itens}\n</urlset>\n', 'utf-8')
    (SAIDA / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE["url"]}/sitemap.xml\n', 'utf-8')
    (SAIDA / 'site.webmanifest').write_text(json.dumps({
        'name': 'Káiros Dynamis', 'short_name': 'Káiros', 'lang': 'pt-BR', 'start_url': '/', 'display': 'standalone',
        'background_color': '#0B0B0C', 'theme_color': '#0B0B0C',
        'icons': [{'src': '/img/icone-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': '/img/icone-512.png', 'sizes': '512x512', 'type': 'image/png'}],
    }, ensure_ascii=False, indent=2), 'utf-8')
    print(f'ok: {len(mapa)} páginas no sitemap, {sum(1 for _ in SAIDA.rglob("*") if _.is_file())} arquivos em public/')


if __name__ == '__main__':
    main()
