# Metas JL

Aplicativo web progressivo (PWA) para **acompanhamento diário de metas e vendas** de vendedores de uma distribuidora. Pensado para uso no celular, permite lançar pedidos, controlar a positivação de clientes e marcas e enxergar em tempo real quanto falta para bater a meta do mês.

> Projeto independente, desenvolvido por André Guirro, sem relação oficial com a JL Distribuidora.

## Funcionalidades

### Dashboard de metas
- Meta mensal de faturamento por vendedor, editável a qualquer momento.
- Faturamento realizado, percentual da meta atingido e barra de progresso.
- Cálculo automático da **lacuna**: quanto falta no total, por semana e por dia útil restante.
- Dias úteis restantes do mês (considera de segunda a sexta).
- Lista de clientes positivados e dos que ainda faltam positivar.

### Fechamento mensal automático
- Pedidos e positivações são separados por mês de referência (`AAAA-MM`).
- Na virada do mês, o faturado e as positivações começam zerados, inclusive com o app aberto ou ao voltar do segundo plano.
- Clientes, marcas e a meta de faturamento são mantidos, e o histórico dos meses anteriores continua guardado no banco.

### Clientes e pedidos
- Cadastro, edição e exclusão de clientes (nome e endereço).
- Busca por nome ou endereço.
- Vários pedidos por cliente no mesmo mês, cada um com opção de editar ou excluir, e o total do cliente em destaque.

### Positivação de marcas
- Cadastro de marcas com meta de positivações.
- Marcação rápida das marcas positivadas em cada cliente, com atualização instantânea na tela.
- Acompanhamento por marca: meta, realizado e quanto falta, com a lista de clientes positivados e não positivados.

### Levantamento de estoque e sugestão de pedido
- Catálogo com centenas de produtos, organizado por fabricante.
- Filtro por grupo, busca por nome e visualização apenas dos itens preenchidos.
- Lançamento de estoque e sugestão de pedido por produto.
- Compartilhamento do levantamento por WhatsApp.
- Os dados são salvos no próprio aparelho (`localStorage`).

### Experiência mobile
- Instalável na tela inicial (PWA), em modo tela cheia e com orientação vertical.
- Interface responsiva, com botões de bom tamanho para toque e teclado numérico nos campos de valor.
- Atualização automática do app quando uma nova versão é publicada.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | [React 19](https://react.dev/) |
| Build e dev server | [Vite](https://vite.dev/) |
| Estilização | [Tailwind CSS 3](https://tailwindcss.com/) e PostCSS |
| Ícones | [Lucide React](https://lucide.dev/) |
| Banco de dados | PostgreSQL |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (service worker e manifesto) |
| Qualidade de código | [Oxlint](https://oxc.rs/docs/guide/usage/linter) |
| Hospedagem | [Vercel](https://vercel.com/) |

## Estrutura do projeto

```
.
├── public/                     # Ícones e logos do PWA
├── src/
│   ├── App.jsx                 # Login, dashboard, clientes, pedidos e marcas
│   ├── LevantamentoEstoque.jsx # Levantamento de estoque e sugestão de pedido
│   ├── mesReferencia.js        # Utilitários do mês de referência (AAAA-MM)
│   ├── supabaseClient.js       # Cliente do Supabase
│   ├── main.jsx                # Ponto de entrada
│   └── index.css               # Estilos globais (Tailwind)
├── supabase/
│   └── migracao_mes_ref.sql    # Migração que adiciona o mês de referência
├── vite.config.js              # Configuração do Vite e do PWA
├── tailwind.config.js
├── vercel.json                 # Reescrita de rotas para SPA
└── .env.example                # Modelo das variáveis de ambiente
```

## Modelo de dados

O app usa as seguintes tabelas no banco de dados:

| Tabela | Finalidade |
| --- | --- |
| `vendedores` | Contas de acesso dos vendedores |
| `app_settings` | Meta de faturamento de cada vendedor |
| `clientes` | Clientes de cada vendedor (nome e endereço) |
| `marcas` | Marcas e suas metas de positivação |
| `pedidos` | Pedidos lançados por cliente, com valor e mês de referência |
| `positivacoes` | Marcas positivadas por cliente, com mês de referência |



## Autor

**André Guirro**

- GitHub: [@AndrefGuirro](https://github.com/AndrefGuirro)
- Portfólio: [andrefguirro.github.io/portifolio-main](https://andrefguirro.github.io/portifolio-main/)
