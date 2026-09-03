# 🏫 Centro Educacional Pedro Rizzi — Portal de Sistemas & Dashboard de Avaliação

Bem-vindo ao repositório oficial do **Portal de Sistemas e Dashboard Analítico** do Centro Educacional Pedro Rizzi.

---

## 📌 Estrutura do Repositório

* **`index.html`**: Página Inicial do Portal da Escola. Centraliza os links dos sistemas escolares e do dashboard de pesquisa.
* **`dashboard.html`**: Dashboard Analítico em Tempo Real do Questionário de Avaliação (6º ao 8º Ano).
* **`css/style.css`**: Estilização moderna e responsiva em CSS (Navy & Gold).
* **`js/main.js`**: Gerenciador de links dinâmicos dos sistemas escolares.
* **`js/dashboard.js`**: Motor de sincronização em tempo real via CSV/Google Sheets e renderização dos gráficos (Chart.js).
* **`js/data-fallback.js`**: Base de dados estatística inicial de 280 estudantes.
* **`config.json`**: Configurações padrão dos sistemas.

---

## 🚀 Sistemas Escolares Integrados

1. 📊 **Dashboard de Avaliação Escolar**: [Acessar `dashboard.html`](dashboard.html)
2. 💰 **Sistema Contábil**: (Configurável via portal)
3. 📅 **Sistema de Agendamento de Recursos**: (Configurável via portal)
4. 📚 **Sistema da Biblioteca**: (Configurável via portal)
5. 🏛️ **Sistema de Patrimônio**: (Configurável via portal)

---

## 🔄 Como Conectar as Respostas do Google Forms em Tempo Real (Zero Backend / Zero Banco)

Não é necessário configurar banco de dados ou servidor backend complexo! O Dashboard sincroniza automaticamente com as respostas do seu **Google Forms / Google Sheets**:

1. Abra a planilha do Google Sheets vinculada ao seu Formulário de Respostas.
2. Vá no menu **Arquivo > Compartilhar > Publicar na Web**.
3. Selecione a aba de respostas e escolha o formato **Valores separados por vírgulas (.csv)**.
4. Clique em **Publicar** e copie o link gerado.
5. Abra o `dashboard.html` e cole o link na barra de sincronização **"Link da Planilha do Google"**.
6. **Pronto!** A cada nova resposta enviada pelo formulário, o dashboard atualizará os gráficos, tabelas e médias automaticamente!

---

## 🌐 Publicação no GitHub Pages

Para disponibilizar o portal online com acesso gratuito:

1. Este repositório está publicado em `https://github.com/elCortelini/escola`.
2. O site fica visível em: `https://elcortelini.github.io/escola/`.
