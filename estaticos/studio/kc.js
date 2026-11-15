/* Catálogo de design do Káiros Studio.
   Usado pelo Studio, pela vitrine do início e pelo build. Só dados, sem acesso à página. */
var KC = {
  RAMOS: ['Confeitaria','Cafeteria','Restaurante','Hamburgueria','Pizzaria','Barbearia','Salão de beleza','Estética','Manicure','Tatuagem','Personal trainer','Academia','Loja de roupas','Pet shop','Oficina mecânica','Clínica ou consultório','Odontologia','Psicologia','Advocacia','Contabilidade','Imobiliária','Fotografia','Eventos','Serviços gerais','Outro'],

  RAMO_DIRECOES: {
    'Confeitaria':['editorial','retro','clay'], 'Cafeteria':['colagem','editorial','minimalismo'],
    'Restaurante':['editorial','retro','maximalismo'], 'Hamburgueria':['pop','grafite','retro'],
    'Pizzaria':['retro','pop','colagem'], 'Barbearia':['brutal','retro','grafite'],
    'Salão de beleza':['editorial','glass','surreal'], 'Estética':['minimalismo','glass','surreal'],
    'Manicure':['y2k','clay','editorial'], 'Tatuagem':['grafite','brutal','cyberpunk'],
    'Personal trainer':['suico','cyberpunk','brutal'], 'Academia':['suico','futurista','grafite'],
    'Loja de roupas':['editorial','maximalismo','y2k'], 'Pet shop':['clay','vetorial','pop'],
    'Oficina mecânica':['brutal','suico','futurista'], 'Clínica ou consultório':['minimalismo','neumorfismo','glass'],
    'Odontologia':['minimalismo','neumorfismo','vetorial'], 'Psicologia':['surreal','minimalismo','editorial'],
    'Advocacia':['editorial','suico','minimalismo'], 'Contabilidade':['suico','minimalismo','neumorfismo'],
    'Imobiliária':['editorial','minimalismo','liquid'], 'Fotografia':['minimalismo','editorial','brutal'],
    'Eventos':['maximalismo','surreal','liquid'], 'Serviços gerais':['vetorial','suico','bauhaus'],
    'Outro':['minimalismo','bauhaus','pop']
  },

  /* Pares de fontes. fz = fator de tamanho do título (fontes largas ou estreitas). g = família genérica. */
  FONTES: {
    manrope:   {nome:'Manrope', d:'Manrope', b:'Manrope', dw:700, g:'sans-serif', url:'Manrope:wght@400;500;600;700;800', ia:'sem serifa limpa e atual'},
    sora:      {nome:'Sora', d:'Sora', b:'Sora', dw:600, g:'sans-serif', url:'Sora:wght@300;400;600;700', ia:'geométrica tecnológica e suave'},
    nunito:    {nome:'Nunito', d:'Nunito', b:'Nunito', dw:800, g:'sans-serif', url:'Nunito:wght@400;600;800;900', ia:'arredondada e amigável'},
    fraunces:  {nome:'Fraunces + Instrument Sans', d:'Fraunces', b:'Instrument Sans', dw:600, g:'serif', url:'Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400;1,9..144,600&family=Instrument+Sans:wght@400;500;600', ia:'serifa calorosa e artesanal'},
    playfair:  {nome:'Playfair Display + Source Sans 3', d:'Playfair Display', b:'Source Sans 3', dw:700, g:'serif', url:'Playfair+Display:ital,wght@0,500;0,700;0,800;1,500;1,700&family=Source+Sans+3:wght@400;600', ia:'serifa de revista, sofisticada'},
    dmserif:   {nome:'DM Serif Display + DM Sans', d:'DM Serif Display', b:'DM Sans', dw:400, g:'serif', url:'DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700', ia:'serifa elegante de alto contraste'},
    cormorant: {nome:'Cormorant + Montserrat', d:'Cormorant Garamond', b:'Montserrat', dw:600, g:'serif', url:'Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Montserrat:wght@400;500;600', ia:'serifa fina e luxuosa'},
    lora:      {nome:'Lora + Nunito Sans', d:'Lora', b:'Nunito Sans', dw:600, g:'serif', url:'Lora:ital,wght@0,500;0,600;0,700;1,500&family=Nunito+Sans:wght@400;600;700', ia:'serifa clássica e acolhedora'},
    bricolage: {nome:'Bricolage Grotesque + DM Sans', d:'Bricolage Grotesque', b:'DM Sans', dw:800, g:'sans-serif', url:'Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;700', ia:'grotesca expressiva e moderna'},
    unbounded: {nome:'Unbounded + DM Sans', d:'Unbounded', b:'DM Sans', dw:700, g:'sans-serif', url:'Unbounded:wght@500;700;800&family=DM+Sans:wght@400;500;700', fz:.82, ia:'larga, arredondada, ousada'},
    syne:      {nome:'Syne + Manrope', d:'Syne', b:'Manrope', dw:800, g:'sans-serif', url:'Syne:wght@600;700;800&family=Manrope:wght@400;500;600', ia:'artística e excêntrica'},
    archivo:   {nome:'Archivo Black + Archivo', d:'Archivo Black', b:'Archivo', dw:400, g:'sans-serif', url:'Archivo+Black&family=Archivo:wght@400;500;700', fz:.95, ia:'sem serifa pesada, de pôster'},
    bebas:     {nome:'Bebas Neue + Barlow', d:'Bebas Neue', b:'Barlow', dw:400, g:'sans-serif', url:'Bebas+Neue&family=Barlow:wght@400;500;600', fz:1.22, ia:'condensada, esportiva e forte'},
    abril:     {nome:'Abril Fatface + Lato', d:'Abril Fatface', b:'Lato', dw:400, g:'serif', url:'Abril+Fatface&family=Lato:wght@400;700', ia:'serifa gorda de cartaz'},
    josefin:   {nome:'Josefin Sans', d:'Josefin Sans', b:'Josefin Sans', dw:700, g:'sans-serif', url:'Josefin+Sans:wght@400;600;700', ia:'geométrica dos anos 20'},
    exo:       {nome:'Orbitron + Exo 2', d:'Orbitron', b:'Exo 2', dw:700, g:'sans-serif', url:'Orbitron:wght@500;700;800&family=Exo+2:wght@400;500;600', fz:.84, ia:'futurista, ficção científica'},
    rubik:     {nome:'Rubik Mono One + Rubik', d:'Rubik Mono One', b:'Rubik', dw:400, g:'sans-serif', url:'Rubik+Mono+One&family=Rubik:wght@400;500;600', fz:.7, ia:'blocada e larga, de videogame'},
    bangers:   {nome:'Bangers + Nunito', d:'Bangers', b:'Nunito', dw:400, g:'sans-serif', url:'Bangers&family=Nunito:wght@400;600;800', fz:1.08, ia:'de história em quadrinhos'},
    shrikhand: {nome:'Shrikhand + DM Sans', d:'Shrikhand', b:'DM Sans', dw:400, g:'serif', url:'Shrikhand&family=DM+Sans:wght@400;500;700', fz:.92, ia:'retrô anos 70, gorda e curvada'},
    pixel:     {nome:'Press Start 2P + Space Mono', d:'Press Start 2P', b:'Space Mono', dw:400, g:'monospace', url:'Press+Start+2P&family=Space+Mono:wght@400;700', fz:.5, ia:'pixelada de videogame 8 bits'},
    mono:      {nome:'Space Mono', d:'Space Mono', b:'Space Mono', dw:700, g:'monospace', url:'Space+Mono:wght@400;700', fz:.9, ia:'monoespaçada crua'},
    marker:    {nome:'Permanent Marker + DM Sans', d:'Permanent Marker', b:'DM Sans', dw:400, g:'cursive', url:'Permanent+Marker&family=DM+Sans:wght@400;500;700', ia:'letra de marcador, de muro'},
    baloo:     {nome:'Baloo 2 + Nunito', d:'Baloo 2', b:'Nunito', dw:800, g:'sans-serif', url:'Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700', ia:'gordinha e divertida'},
    caveat:    {nome:'Caveat + Nunito Sans', d:'Caveat', b:'Nunito Sans', dw:700, g:'cursive', url:'Caveat:wght@600;700&family=Nunito+Sans:wght@400;600;700', fz:1.2, ia:'manuscrita, feita à mão'}
  },

  CORES: ['fundo','superficie','texto','suave','primaria','secundaria','destaque'],
  COR_NOME: {fundo:'Fundo', superficie:'Cartões', texto:'Texto', suave:'Texto leve', primaria:'Botões', secundaria:'Apoio', destaque:'Destaque'},

  CANTOS: ['reto','suave','redondo'],
  TEXTURAS: ['nenhuma','grao','pontos','grade','listras','bolhas','papel'],
  BOTOES: ['solido','contorno','sombra','pilula','vidro'],
  TITULOS: ['normal','maiusculo','italico'],
  ESCALAS: ['contida','grande','gigante'],
  NOMES: {
    cantos: {reto:'Retos', suave:'Suaves', redondo:'Redondos'},
    textura: {nenhuma:'Nenhuma', grao:'Grão', pontos:'Pontos', grade:'Grade', listras:'Listras', bolhas:'Manchas de cor', papel:'Papel'},
    botoes: {solido:'Sólido', contorno:'Contorno', sombra:'Com sombra', pilula:'Pílula', vidro:'Vidro'},
    titulos: {normal:'Normal', maiusculo:'Maiúsculo', italico:'Itálico'},
    escala: {contida:'Contido', grande:'Grande', gigante:'Gigante'}
  },

  SECOES: ['hero','destaques','sobre','servicos','galeria','faq','chamada','contato'],
  SECAO_NOME: {hero:'Abertura', destaques:'Destaques', sobre:'Sobre', servicos:'Serviços', galeria:'Galeria', faq:'Perguntas', chamada:'Chamada', contato:'Contato'},
  LAYOUTS: {
    hero: ['simples','centro','dividido','poster','foto-fundo','editorial','cartao'],
    destaques: ['faixa','colunas','chips'],
    sobre: ['texto','dividido','citacao'],
    servicos: ['cartoes','lista','cardapio','bento'],
    galeria: ['grade','mosaico','faixa'],
    faq: ['lista','colunas'],
    chamada: ['faixa','cartaz'],
    contato: ['cartoes','dividido']
  },
  LAYOUT_NOME: {simples:'Simples', centro:'Centralizado', dividido:'Dividido', poster:'Pôster', 'foto-fundo':'Foto de fundo', editorial:'Revista', cartao:'Cartão', faixa:'Faixa', colunas:'Colunas', chips:'Etiquetas', texto:'Texto', citacao:'Frase grande', cartoes:'Cartões', lista:'Lista', cardapio:'Cardápio', bento:'Blocos', grade:'Grade', mosaico:'Mosaico', cartaz:'Cartaz'},

  /* As 20 direções de estilo, cada uma com um ponto de partida completo. */
  DIRECOES: [
    {id:'minimalismo', nome:'Minimalismo', ia:'muito espaço vazio, poucas cores, tipografia limpa, nada decorativo',
     p:{cores:{fundo:'#FFFFFF',superficie:'#F4F4F2',texto:'#111111',suave:'#5E5E5E',primaria:'#111111',secundaria:'#EAE7E1',destaque:'#D4502A'}, fontes:'manrope', cantos:'reto', textura:'nenhuma', botoes:'solido', titulos:'normal', escala:'grande',
        layouts:{hero:'simples',destaques:'colunas',sobre:'texto',servicos:'lista',galeria:'grade',faq:'lista',chamada:'faixa',contato:'dividido'}, ordem:['hero','sobre','servicos','galeria','destaques','faq','contato']}},
    {id:'maximalismo', nome:'Maximalismo', ia:'muitas cores fortes, tipografia enorme, padrões, energia',
     p:{cores:{fundo:'#FFF4E0',superficie:'#FFFFFF',texto:'#1A1020',suave:'#4A3F52',primaria:'#E4366B',secundaria:'#FFD84D',destaque:'#2BB3A3'}, fontes:'bricolage', cantos:'redondo', textura:'listras', botoes:'sombra', titulos:'maiusculo', escala:'gigante',
        layouts:{hero:'poster',destaques:'faixa',sobre:'citacao',servicos:'bento',galeria:'mosaico',faq:'colunas',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'futurista', nome:'Futurista', ia:'fundo escuro, tecnologia, linhas finas, cantos cortados',
     p:{cores:{fundo:'#05070D',superficie:'#0C1222',texto:'#E8F0FF',suave:'#9AA4BA',primaria:'#4D7CFF',secundaria:'#132042',destaque:'#7DF9FF'}, fontes:'exo', cantos:'reto', textura:'grade', botoes:'solido', titulos:'maiusculo', escala:'grande',
        layouts:{hero:'dividido',destaques:'colunas',sobre:'dividido',servicos:'cartoes',galeria:'faixa',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'vetorial', nome:'Arte vetorial', ia:'formas geométricas chapadas e coloridas, amigável',
     p:{cores:{fundo:'#FFF9F0',superficie:'#FFFFFF',texto:'#1F1B2E',suave:'#55506A',primaria:'#E8553A',secundaria:'#FFC94D',destaque:'#3BB4A6'}, fontes:'bricolage', cantos:'redondo', textura:'nenhuma', botoes:'solido', titulos:'normal', escala:'grande',
        layouts:{hero:'dividido',destaques:'colunas',sobre:'dividido',servicos:'cartoes',galeria:'grade',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'colagem', nome:'Colagem', ia:'papel, recortes, fita adesiva, artesanal',
     p:{cores:{fundo:'#EFE9DD',superficie:'#FFFDF7',texto:'#221E1A',suave:'#544D45',primaria:'#C8402A',secundaria:'#2F4B3A',destaque:'#F2C94C'}, fontes:'fraunces', cantos:'reto', textura:'papel', botoes:'sombra', titulos:'normal', escala:'grande',
        layouts:{hero:'simples',destaques:'chips',sobre:'citacao',servicos:'cartoes',galeria:'mosaico',faq:'lista',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','sobre','servicos','galeria','destaques','faq','chamada','contato']}},
    {id:'retro', nome:'Retrô', ia:'anos 70, tons quentes, faixas, letras arredondadas',
     p:{cores:{fundo:'#F4E8D0',superficie:'#FBF3E2',texto:'#3B2314',suave:'#6B4C36',primaria:'#C9541F',secundaria:'#E9A23B',destaque:'#2E6E62'}, fontes:'shrikhand', cantos:'redondo', textura:'nenhuma', botoes:'pilula', titulos:'normal', escala:'grande',
        layouts:{hero:'centro',destaques:'faixa',sobre:'texto',servicos:'cardapio',galeria:'grade',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'pop', nome:'Pop art', ia:'quadrinhos, retícula de pontos, contorno preto, cores primárias',
     p:{cores:{fundo:'#FFFBEA',superficie:'#FFFFFF',texto:'#111111',suave:'#333333',primaria:'#FF2E63',secundaria:'#FFE14D',destaque:'#2EC4F1'}, fontes:'bangers', cantos:'reto', textura:'pontos', botoes:'sombra', titulos:'maiusculo', escala:'gigante',
        layouts:{hero:'poster',destaques:'faixa',sobre:'citacao',servicos:'cartoes',galeria:'grade',faq:'colunas',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'cyberpunk', nome:'Cyberpunk', ia:'noite, neon magenta e ciano, brilho',
     p:{cores:{fundo:'#07060B',superficie:'#100E1A',texto:'#EDEBFF',suave:'#A9A5C8',primaria:'#FF2BD6',secundaria:'#19F0FF',destaque:'#F9F871'}, fontes:'rubik', cantos:'reto', textura:'grade', botoes:'contorno', titulos:'maiusculo', escala:'grande',
        layouts:{hero:'foto-fundo',destaques:'chips',sobre:'dividido',servicos:'lista',galeria:'faixa',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'glass', nome:'Glassmorfismo', ia:'vidro fosco translúcido sobre manchas de cor',
     p:{cores:{fundo:'#EEF0FA',superficie:'#FFFFFF',texto:'#141526',suave:'#4A4D6B',primaria:'#6C5CE7',secundaria:'#74B9FF',destaque:'#FD79A8'}, fontes:'sora', cantos:'redondo', textura:'bolhas', botoes:'vidro', titulos:'normal', escala:'grande',
        layouts:{hero:'cartao',destaques:'chips',sobre:'texto',servicos:'cartoes',galeria:'grade',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'neumorfismo', nome:'Neumorfismo', ia:'superfícies em relevo suave, monocromático claro',
     p:{cores:{fundo:'#E4E8EF',superficie:'#E4E8EF',texto:'#2E3440',suave:'#556075',primaria:'#4C6EF5',secundaria:'#D3DAE6',destaque:'#0E9F74'}, fontes:'nunito', cantos:'redondo', textura:'nenhuma', botoes:'solido', titulos:'normal', escala:'grande',
        layouts:{hero:'cartao',destaques:'colunas',sobre:'texto',servicos:'cartoes',galeria:'grade',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'clay', nome:'Claymorfismo', ia:'formas infladas como massinha, pastel, cantos muito redondos',
     p:{cores:{fundo:'#F3ECFF',superficie:'#FFFFFF',texto:'#2B2140',suave:'#5D5174',primaria:'#7C4DEB',secundaria:'#FFB4C6',destaque:'#7DD3FC'}, fontes:'baloo', cantos:'redondo', textura:'nenhuma', botoes:'pilula', titulos:'normal', escala:'grande',
        layouts:{hero:'dividido',destaques:'chips',sobre:'dividido',servicos:'bento',galeria:'grade',faq:'lista',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'pixel', nome:'Pixel art', ia:'videogame 8 bits, fonte pixelada, bordas grossas',
     p:{cores:{fundo:'#F2F0E6',superficie:'#FFFFFF',texto:'#1B1B2F',suave:'#45455F',primaria:'#D9303A',secundaria:'#3E8948',destaque:'#FEAE34'}, fontes:'pixel', cantos:'reto', textura:'grade', botoes:'sombra', titulos:'normal', escala:'contida',
        layouts:{hero:'simples',destaques:'colunas',sobre:'texto',servicos:'cartoes',galeria:'grade',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'editorial', nome:'Editorial', ia:'revista, serifas elegantes, colunas, sofisticado',
     p:{cores:{fundo:'#FAF8F4',superficie:'#F1ECE3',texto:'#151412',suave:'#57524A',primaria:'#151412',secundaria:'#E9E1D3',destaque:'#A3243B'}, fontes:'playfair', cantos:'reto', textura:'nenhuma', botoes:'solido', titulos:'normal', escala:'gigante',
        layouts:{hero:'editorial',destaques:'colunas',sobre:'citacao',servicos:'lista',galeria:'mosaico',faq:'colunas',chamada:'faixa',contato:'dividido'}, ordem:['hero','sobre','servicos','galeria','destaques','faq','contato']}},
    {id:'y2k', nome:'Anos 2000', ia:'cromado, brilho, pastel lilás e azul, botões em pílula',
     p:{cores:{fundo:'#EEF1F8',superficie:'#FFFFFF',texto:'#1A1A2E',suave:'#4E5472',primaria:'#6A4FF5',secundaria:'#FFB8E6',destaque:'#7FDBFF'}, fontes:'unbounded', cantos:'redondo', textura:'bolhas', botoes:'pilula', titulos:'normal', escala:'grande',
        layouts:{hero:'centro',destaques:'chips',sobre:'texto',servicos:'cartoes',galeria:'faixa',faq:'lista',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'suico', nome:'Design suíço', ia:'grade rígida, tipografia enorme sem serifa, vermelho e preto',
     p:{cores:{fundo:'#FFFFFF',superficie:'#F2F2F2',texto:'#0A0A0A',suave:'#4F4F4F',primaria:'#E30613',secundaria:'#0A0A0A',destaque:'#E30613'}, fontes:'archivo', cantos:'reto', textura:'nenhuma', botoes:'solido', titulos:'normal', escala:'gigante',
        layouts:{hero:'poster',destaques:'colunas',sobre:'texto',servicos:'lista',galeria:'grade',faq:'colunas',chamada:'faixa',contato:'dividido'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','contato']}},
    {id:'surreal', nome:'Surrealista', ia:'onírico, céu em degradê suave, formas orgânicas, itálico',
     p:{cores:{fundo:'#F6EFF7',superficie:'#FFFFFF',texto:'#2A1F3D',suave:'#5C4F75',primaria:'#A63D74',secundaria:'#CFE0FF',destaque:'#FFC9B5'}, fontes:'cormorant', cantos:'redondo', textura:'nenhuma', botoes:'pilula', titulos:'italico', escala:'gigante',
        layouts:{hero:'centro',destaques:'chips',sobre:'citacao',servicos:'cartoes',galeria:'mosaico',faq:'lista',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','sobre','servicos','galeria','destaques','faq','chamada','contato']}},
    {id:'bauhaus', nome:'Bauhaus', ia:'círculo, quadrado e faixa em vermelho, azul e amarelo, geometria',
     p:{cores:{fundo:'#F1EADB',superficie:'#F8F3E8',texto:'#111111',suave:'#3F3F3F',primaria:'#D9381E',secundaria:'#1D4E9E',destaque:'#F2B705'}, fontes:'josefin', cantos:'reto', textura:'nenhuma', botoes:'solido', titulos:'maiusculo', escala:'grande',
        layouts:{hero:'dividido',destaques:'colunas',sobre:'dividido',servicos:'cartoes',galeria:'grade',faq:'colunas',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'brutal', nome:'Brutalismo', ia:'cru, bordas pretas grossas, fonte monoespaçada, sombras duras',
     p:{cores:{fundo:'#F5F5F0',superficie:'#FFFFFF',texto:'#000000',suave:'#222222',primaria:'#0047FF',secundaria:'#FFE600',destaque:'#FF3B00'}, fontes:'mono', cantos:'reto', textura:'nenhuma', botoes:'sombra', titulos:'maiusculo', escala:'grande',
        layouts:{hero:'simples',destaques:'faixa',sobre:'texto',servicos:'lista',galeria:'grade',faq:'lista',chamada:'cartaz',contato:'dividido'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'grafite', nome:'Grafite', ia:'muro, spray, letra de marcador, adesivos',
     p:{cores:{fundo:'#1A1A1A',superficie:'#242424',texto:'#F4F1EA',suave:'#C2BDB2',primaria:'#FF3D7F',secundaria:'#FFE14D',destaque:'#3DDC97'}, fontes:'marker', cantos:'suave', textura:'grao', botoes:'sombra', titulos:'normal', escala:'gigante',
        layouts:{hero:'foto-fundo',destaques:'chips',sobre:'citacao',servicos:'cartoes',galeria:'mosaico',faq:'lista',chamada:'cartaz',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}},
    {id:'liquid', nome:'Liquid glass', ia:'vidro líquido brilhante sobre fundo escuro com manchas de cor',
     p:{cores:{fundo:'#0E1220',superficie:'#1A2036',texto:'#F4F6FF',suave:'#C0C6E0',primaria:'#7C9CFF',secundaria:'#FF7AC6',destaque:'#5EEAD4'}, fontes:'sora', cantos:'redondo', textura:'bolhas', botoes:'vidro', titulos:'normal', escala:'grande',
        layouts:{hero:'cartao',destaques:'chips',sobre:'dividido',servicos:'cartoes',galeria:'faixa',faq:'lista',chamada:'faixa',contato:'cartoes'}, ordem:['hero','destaques','servicos','sobre','galeria','faq','chamada','contato']}}
  ]
};
KC.DIR = {};
KC.DIRECOES.forEach(function (d) { KC.DIR[d.id] = d; });

/* ===== v4: automação sem IA ===== */
/* Mais duas direções por ramo, para "Gerar outras 3" variar. */
KC.RAMO_EXTRAS = {
  'Confeitaria':['vetorial','surreal'], 'Cafeteria':['retro','bauhaus'], 'Restaurante':['colagem','minimalismo'],
  'Hamburgueria':['brutal','maximalismo'], 'Pizzaria':['maximalismo','grafite'], 'Barbearia':['suico','editorial'],
  'Salão de beleza':['minimalismo','y2k'], 'Estética':['neumorfismo','liquid'], 'Manicure':['pop','surreal'],
  'Tatuagem':['editorial','pixel'], 'Personal trainer':['futurista','grafite'], 'Academia':['brutal','cyberpunk'],
  'Loja de roupas':['minimalismo','colagem'], 'Pet shop':['y2k','maximalismo'], 'Oficina mecânica':['grafite','bauhaus'],
  'Clínica ou consultório':['surreal','liquid'], 'Odontologia':['glass','suico'], 'Psicologia':['neumorfismo','colagem'],
  'Advocacia':['liquid','neumorfismo'], 'Contabilidade':['editorial','futurista'], 'Imobiliária':['suico','glass'],
  'Fotografia':['suico','liquid'], 'Eventos':['pop','y2k'], 'Serviços gerais':['minimalismo','brutal'],
  'Outro':['editorial','glass']
};

/* Grupo de cada ramo (define botões, perguntas e textos) e como chamar o negócio numa frase. */
KC.RAMO_INFO = {
  'Confeitaria':{g:'comida',art:'a',nome:'confeitaria'}, 'Cafeteria':{g:'comida',art:'a',nome:'cafeteria'},
  'Restaurante':{g:'comida',art:'o',nome:'restaurante'}, 'Hamburgueria':{g:'comida',art:'a',nome:'hamburgueria'},
  'Pizzaria':{g:'comida',art:'a',nome:'pizzaria'}, 'Barbearia':{g:'beleza',art:'a',nome:'barbearia'},
  'Salão de beleza':{g:'beleza',art:'o',nome:'salão de beleza'}, 'Estética':{g:'beleza',art:'a',nome:'clínica de estética'},
  'Manicure':{g:'beleza',art:'a',nome:'manicure'}, 'Tatuagem':{g:'beleza',art:'o',nome:'estúdio de tatuagem'},
  'Personal trainer':{g:'corpo',art:'o',nome:'personal trainer'}, 'Academia':{g:'corpo',art:'a',nome:'academia'},
  'Loja de roupas':{g:'loja',art:'a',nome:'loja de roupas'}, 'Pet shop':{g:'loja',art:'o',nome:'pet shop'},
  'Oficina mecânica':{g:'servico',art:'a',nome:'oficina mecânica'}, 'Clínica ou consultório':{g:'saude',art:'o',nome:'consultório'},
  'Odontologia':{g:'saude',art:'o',nome:'dentista'}, 'Psicologia':{g:'saude',art:'',nome:''},
  'Advocacia':{g:'servico',art:'o',nome:'escritório de advocacia'}, 'Contabilidade':{g:'servico',art:'o',nome:'escritório de contabilidade'},
  'Imobiliária':{g:'servico',art:'a',nome:'imobiliária'}, 'Fotografia':{g:'servico',art:'o',nome:'estúdio de fotografia'},
  'Eventos':{g:'servico',art:'',nome:''}, 'Serviços gerais':{g:'servico',art:'',nome:''}, 'Outro':{g:'servico',art:'',nome:''}
};

/* Textos automáticos por grupo. Respostas nunca inventam fatos: o que não está nos dados vai para o WhatsApp. */
KC.GRUPO_TXT = {
  comida: {cta:['Fazer pedido','Encomendar no WhatsApp','Pedir pelo WhatsApp'], zapTitulo:'Faça seu pedido pelo WhatsApp',
    servTit:['Cardápio','Nosso cardápio','Para pedir'], servIntro:'Escolha e chame no WhatsApp para combinar o pedido.',
    chamada:['Pronto para pedir?','Vamos montar o seu pedido?','Bateu a vontade?'], chamadaTxt:'Chame no WhatsApp e combine o seu pedido.',
    faq:[['Como faço um pedido?','Chame no WhatsApp e conte o que você quer.'],['Vocês entregam?','Combine a entrega ou a retirada pelo WhatsApp.'],['Com quanto tempo de antecedência devo pedir?','Pergunte pelo WhatsApp e confira as datas disponíveis.']]},
  beleza: {cta:['Agendar horário','Marcar pelo WhatsApp','Quero agendar'], zapTitulo:'Agende seu horário pelo WhatsApp',
    servTit:['Serviços','Nossos serviços','Tabela de serviços'], servIntro:'Escolha o serviço e agende pelo WhatsApp.',
    chamada:['Vamos agendar?','Escolha o seu horário','Bora marcar?'], chamadaTxt:'Chame no WhatsApp e escolha o melhor dia e horário.',
    faq:[['Como agendo um horário?','Chame no WhatsApp e escolha o melhor dia e horário.'],['Posso remarcar?','Fale pelo WhatsApp para combinar.'],['Quais formas de pagamento vocês aceitam?','Pergunte pelo WhatsApp.']]},
  corpo: {cta:['Quero começar','Falar no WhatsApp','Chamar no WhatsApp'], zapTitulo:'Comece pelo WhatsApp',
    servTit:['Modalidades','Serviços','Como posso ajudar'], servIntro:'Escolha e chame no WhatsApp para saber mais.',
    chamada:['Vamos começar?','Pronto para começar?','Bora treinar?'], chamadaTxt:'Chame no WhatsApp e conte o seu objetivo.',
    faq:[['Como faço para começar?','Chame no WhatsApp e conte o seu objetivo.'],['Preciso ter experiência?','Fale pelo WhatsApp e conte como está hoje.'],['Quais formas de pagamento vocês aceitam?','Pergunte pelo WhatsApp.']]},
  saude: {cta:['Marcar consulta','Agendar pelo WhatsApp','Falar no WhatsApp'], zapTitulo:'Agende sua consulta pelo WhatsApp',
    servTit:['Atendimentos','Como podemos ajudar','Serviços'], servIntro:'Escolha e agende pelo WhatsApp.',
    chamada:['Vamos agendar?','Marque o seu horário','Fale com a gente'], chamadaTxt:'Chame no WhatsApp para marcar o seu atendimento.',
    faq:[['Como marco uma consulta?','Chame no WhatsApp e escolha o melhor horário.'],['Atende convênio?','Pergunte pelo WhatsApp.'],['Posso remarcar?','Fale pelo WhatsApp para combinar.']]},
  loja: {cta:['Chamar no WhatsApp','Comprar pelo WhatsApp','Ver disponibilidade'], zapTitulo:'Compre pelo WhatsApp',
    servTit:['Produtos','Destaques da loja','O que temos'], servIntro:'Gostou de algo? Chame no WhatsApp.',
    chamada:['Gostou de algo?','Vamos conversar?','Achou o que queria?'], chamadaTxt:'Chame no WhatsApp e confira a disponibilidade.',
    faq:[['Como faço para comprar?','Chame no WhatsApp e diga o que você quer.'],['Vocês entregam?','Combine a entrega ou a retirada pelo WhatsApp.'],['Quais formas de pagamento vocês aceitam?','Pergunte pelo WhatsApp.']]},
  servico: {cta:['Pedir orçamento','Falar no WhatsApp','Chamar no WhatsApp'], zapTitulo:'Peça seu orçamento pelo WhatsApp',
    servTit:['Serviços','O que fazemos','Como podemos ajudar'], servIntro:'Conte o que você precisa pelo WhatsApp.',
    chamada:['Vamos conversar?','Precisa de ajuda?','Peça seu orçamento'], chamadaTxt:'Chame no WhatsApp e conte o que você precisa.',
    faq:[['Como peço um orçamento?','Chame no WhatsApp e conte o que você precisa.'],['Quanto tempo leva?','Depende do serviço. Pergunte pelo WhatsApp.'],['Quais formas de pagamento vocês aceitam?','Pergunte pelo WhatsApp.']]}
};

/* Variações automáticas de cada estilo: fontes, aberturas e paletas que combinam com ele. */
KC.DIR_EXTRA = {
  minimalismo:{fontes:['manrope','sora','josefin'], heros:['simples','centro','editorial','dividido'], cores:['base','mono','clara','girar'], tom:'formal', txt:'Muito espaço em branco e tipografia limpa: o conteúdo fala sozinho.'},
  maximalismo:{fontes:['bricolage','unbounded','abril','syne'], heros:['poster','foto-fundo','dividido'], cores:['base','vibrante','girar'], tom:'divertido', txt:'Cores fortes, título enorme e muita energia.'},
  futurista:{fontes:['exo','syne','sora','unbounded'], heros:['dividido','foto-fundo','centro'], cores:['base','girar','escura'], tom:'neutro', txt:'Fundo escuro, linhas finas e cara de tecnologia.'},
  vetorial:{fontes:['bricolage','baloo','nunito','syne'], heros:['dividido','centro','simples'], cores:['base','girar','pastel'], tom:'divertido', txt:'Formas geométricas coloridas, amigável e leve.'},
  colagem:{fontes:['fraunces','dmserif','caveat','lora'], heros:['simples','dividido','editorial'], cores:['base','terrosa','girar'], tom:'neutro', txt:'Papel, recortes e fita adesiva: um visual artesanal.'},
  retro:{fontes:['shrikhand','abril','lora','baloo'], heros:['centro','dividido','poster'], cores:['base','terrosa','girar'], tom:'neutro', txt:'Tons quentes e faixas dos anos 70.'},
  pop:{fontes:['bangers','bricolage','baloo','rubik'], heros:['poster','dividido','centro'], cores:['base','vibrante','girar'], tom:'divertido', txt:'Quadrinhos, retícula de pontos e contorno preto.'},
  cyberpunk:{fontes:['rubik','exo','syne','mono'], heros:['foto-fundo','simples','dividido'], cores:['base','girar','contraste'], tom:'divertido', txt:'Noite, neon e brilho.'},
  glass:{fontes:['sora','manrope','syne','nunito'], heros:['cartao','centro','dividido'], cores:['base','girar','pastel'], tom:'neutro', txt:'Vidro fosco sobre manchas de cor.'},
  neumorfismo:{fontes:['nunito','manrope','sora'], heros:['cartao','centro','simples'], cores:['base','mono','girar'], tom:'formal', txt:'Superfícies em relevo suave, calmo e organizado.'},
  clay:{fontes:['baloo','nunito','bricolage'], heros:['dividido','centro','cartao'], cores:['base','pastel','girar'], tom:'divertido', txt:'Formas fofas e cores de massinha.'},
  pixel:{fontes:['pixel','mono','rubik'], heros:['simples','dividido','centro'], cores:['base','girar','vibrante'], tom:'divertido', txt:'Videogame 8 bits, divertido e diferente.'},
  editorial:{fontes:['playfair','dmserif','cormorant','fraunces'], heros:['editorial','dividido','simples','foto-fundo'], cores:['base','clara','mono','girar'], tom:'formal', txt:'Cara de revista, com serifas elegantes.'},
  y2k:{fontes:['unbounded','syne','baloo','sora'], heros:['centro','cartao','dividido'], cores:['base','pastel','girar'], tom:'divertido', txt:'Brilho, cromado e tons lilás dos anos 2000.'},
  suico:{fontes:['archivo','manrope','bebas','josefin'], heros:['poster','simples','editorial'], cores:['base','girar','contraste'], tom:'formal', txt:'Grade rígida, tipografia enorme e cor forte.'},
  surreal:{fontes:['cormorant','playfair','dmserif','lora'], heros:['centro','cartao','dividido'], cores:['base','pastel','girar'], tom:'formal', txt:'Onírico, com céu em degradê e formas orgânicas.'},
  bauhaus:{fontes:['josefin','archivo','bebas','syne'], heros:['dividido','poster','simples'], cores:['base','girar'], tom:'neutro', txt:'Círculo, quadrado e cores primárias.'},
  brutal:{fontes:['mono','archivo','bebas','rubik'], heros:['simples','poster','dividido'], cores:['base','girar','contraste'], tom:'neutro', txt:'Cru e direto, com bordas pretas grossas.'},
  grafite:{fontes:['marker','bebas','bangers','caveat'], heros:['foto-fundo','simples','poster'], cores:['base','girar','vibrante'], tom:'divertido', txt:'Muro, spray e adesivos.'},
  liquid:{fontes:['sora','manrope','syne','unbounded'], heros:['cartao','foto-fundo','centro'], cores:['base','girar','escura'], tom:'neutro', txt:'Vidro líquido brilhante sobre fundo escuro.'}
};

/* Ajustes de um clique ("clima" do site). */
KC.HUMORES = {
  elegante:{nome:'Mais elegante', dirs:['editorial','minimalismo','surreal'], fontes:['playfair','dmserif','cormorant','fraunces'], cantos:'reto', botoes:'solido', titulos:['normal','italico'], escala:'gigante', textura:'nenhuma', cores:['clara','mono']},
  moderno:{nome:'Mais moderno', dirs:['minimalismo','suico','glass','liquid','futurista'], fontes:['manrope','sora','syne','unbounded'], cantos:'suave', botoes:'pilula', titulos:['normal'], escala:'grande', textura:'', cores:['']},
  divertido:{nome:'Mais divertido', dirs:['pop','clay','vetorial','maximalismo','y2k'], fontes:['baloo','bangers','bricolage','nunito','shrikhand'], cantos:'redondo', botoes:'sombra', titulos:['normal','maiusculo'], escala:'gigante', textura:'', cores:['vibrante','pastel']},
  serio:{nome:'Mais sério', dirs:['suico','minimalismo','editorial','neumorfismo'], fontes:['archivo','manrope','lora','josefin'], cantos:'reto', botoes:'solido', titulos:['normal'], escala:'grande', textura:'nenhuma', cores:['mono','clara']},
  ousado:{nome:'Mais ousado', dirs:['maximalismo','brutal','cyberpunk','grafite','pop'], fontes:['archivo','bebas','abril','unbounded','rubik'], cantos:'reto', botoes:'sombra', titulos:['maiusculo'], escala:'gigante', textura:'', cores:['contraste','vibrante']},
  calmo:{nome:'Mais calmo', dirs:['minimalismo','neumorfismo','surreal','glass'], fontes:['lora','nunito','cormorant','sora'], cantos:'redondo', botoes:'pilula', titulos:['normal'], escala:'grande', textura:'nenhuma', cores:['pastel','clara']}
};

/* Motor de design do Káiros Studio: transforma uma especificação (tema + seções) em um site. */
