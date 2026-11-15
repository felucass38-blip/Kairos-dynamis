# Káiros Dynamis · site

Site da Káiros Dynamis: sites, sistemas por ramo e gestão de Instagram, com pagamento automático pela Stripe e Pix de reserva.

Endereço previsto: https://kairos-dynamis.netlify.app

## Como está organizado

| Pasta | O que tem |
|---|---|
| `dados/catalogo.json` | **Todos os preços** (sites, Instagram, sistemas e módulos, limites da cobrança avulsa, chave Pix). Mude aqui e o site e o pagamento mudam juntos. |
| `modelos/` | As páginas (HTML com Jinja2). `modelos/paginas/` tem uma por aba; `modelos/blog/` tem os artigos em Markdown. |
| `estaticos/` | CSS, JS, imagens, Káiros Studio, demo de sistemas e o portfólio da SÔMA. |
| `netlify/functions/checkout/` | Cria o pagamento na Stripe. O valor é sempre calculado aqui, no servidor, a partir do catálogo. |
| `ferramentas/build.py` | Gera o site pronto em `public/`. |
| `public/` | O site gerado. É isso que a Netlify publica. |
| `testes/` | Testes do pagamento. |

## Mudar alguma coisa

1. Edite o arquivo (preço no `dados/catalogo.json`, texto em `modelos/paginas/…`, artigo novo em `modelos/blog/`).
2. Gere o site de novo:
   ```sh
   pip install jinja2 markdown   # só na primeira vez
   python3 ferramentas/build.py
   ```
3. Confira os testes do pagamento:
   ```sh
   node --test testes/checkout.test.mjs
   ```
4. Faça commit e envie para o GitHub. A Netlify publica sozinha.

> Cada publicação gasta créditos do plano grátis da Netlify (300 por mês; uma publicação custa 15 e cada GB de visitas custa 20). Junte várias mudanças num envio só. Se os créditos acabarem, o site fica pausado até o mês virar.

### Artigo novo no blog

Crie `modelos/blog/nome-do-artigo.md` copiando o cabeçalho de um artigo que já existe (título, descrição, data, slug) e escreva o texto embaixo. O build coloca o artigo na lista, no sitemap e com os dados para o Google.

## Pagamento automático (Stripe)

O pagamento só liga quando existe a variável `STRIPE_SECRET_KEY` na Netlify. Sem ela, os botões continuam funcionando e mostram o **Pix com QR Code** (chave do catálogo).

Se o cliente sair do checkout sem pagar, a página volta com a escolha dele refeita e oferece **pagar com Pix** (QR Code da chave do catálogo, com confirmação pelo WhatsApp). Assim ninguém fica sem Pix enquanto a Stripe não libera o Pix automático na sua conta.

| Botão | Como cobra |
|---|---|
| Planos de site | Entrada de 50% do plano, pagamento único |
| Sistemas | Base + módulos escolhidos; entrada de 50% |
| Instagram | Assinatura mensal no cartão, depois do aceite do contrato mínimo de 3 meses |
| Pagar (avulso) | Valor digitado pelo cliente, entre o mínimo e o máximo do catálogo |

### Ligar

1. Na Stripe, ative a conta (dados da empresa e conta bancária).
2. Em **Configurações → Dados públicos**, troque o nome público e a descrição na fatura do cartão para Káiros Dynamis.
3. Em **Configurações → Formas de pagamento**, ative o Pix se aparecer para a sua conta. O checkout passa a mostrar o Pix sozinho, sem mudar código.
4. Crie uma **chave restrita** com permissão de escrita em *Checkout Sessions* (e nada mais).
5. Na Netlify: **Project configuration → Environment variables → Add a variable**: nome `STRIPE_SECRET_KEY`, valor = a chave. Marque como secreta.
6. Faça uma nova publicação (Deploys → Trigger deploy).

Para testar antes de cobrar de verdade, use primeiro uma chave de **teste** (`rk_test_…` ou `sk_test_…`) e o cartão `4242 4242 4242 4242`. Depois troque pela chave real (`rk_live_…`).

Nunca coloque a chave no código, no GitHub ou em mensagem.

### Onde ver os pagamentos

No painel da Stripe, em Pagamentos e em Assinaturas. Cada pagamento tem o tipo, o plano ou os módulos escolhidos e o nome do negócio que o cliente digitou.

## Formulário de contato

Usa o Netlify Forms (formulário `contato`). Para receber por e-mail: **Project configuration → Notifications → Emails and webhooks → Form submission notifications**.

## Google

1. Entre no [Google Search Console](https://search.google.com/search-console) e adicione uma propriedade do tipo **Prefixo do URL** com o endereço do site.
2. Escolha verificar pela **tag HTML**. Copie só o código do `content="…"`.
3. Cole o código em `ferramentas/build.py`, no campo `google_verificacao`, gere o site e publique. Depois clique em Verificar.
4. Em **Sitemaps**, envie `sitemap.xml`.

O site já tem título e descrição por página, dados estruturados (empresa, perguntas frequentes e artigos), sitemap, robots.txt, imagem de compartilhamento e redirecionamento dos endereços do site antigo.

## Domínio próprio

Quando comprar um domínio, adicione em **Domain management** na Netlify e gere o site com o endereço novo:

```sh
SITE_URL=https://seudominio.com.br python3 ferramentas/build.py
```
