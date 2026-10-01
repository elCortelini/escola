# 🚀 Como Subir o Servidor Evolution API para o SIGE

Este diretório contém os arquivos necessários para rodar a **Evolution API** dedicada e isolada para o **SIGE Centro Educacional Pedro Rizzi**.

---

### Passo 1: No seu Servidor Linux (VPS)

Execute os comandos abaixo para criar a pasta e subir os containers:

```bash
# 1. Cria a pasta na VPS
mkdir -p /opt/sige-whatsapp
cd /opt/sige-whatsapp

# 2. Copie os arquivos docker-compose.yml e .env para esta pasta (ou clone este repositório)

# 3. Suba os containers em segundo plano
docker compose up -d

# 4. Verifique se os containers estão rodando
docker ps
```

Os dois containers (`postgres_sige` e `evolution_api_sige`) estarão rodando na porta local **`8086`**.

---

### Passo 2: No seu Gerenciador de Proxy Reverso (Nginx Proxy Manager ou Cloudflare Tunnel)

1. Crie o Proxy Host / Domínio:
   - **Domínio:** `api-whatsapp.sige.seudominio.com.br` (ou o subdomínio que você preferir)
   - **Forward Hostname / IP:** `127.0.0.1` (ou IP local do servidor)
   - **Forward Port:** `8086`
2. Na aba **SSL**:
   - Marque **Force SSL** (Certificado Let's Encrypt gratuito).
   - Salve.

---

### Passo 3: No SIGE (Navegador)

1. Abra o sistema da escola (`https://elcortelini.github.io/escola/sistema-gestao.html`).
2. Entre em **Configurações Gerais** (aba Desenvolvedor / Admin).
3. No campo **URL Base da Evolution API**, cole a URL gerada:
   `https://api-whatsapp.sige.seudominio.com.br`
4. O campo **Chave de Autenticação** já vem pré-preenchido com `SIGE_EVO_SECRET_KEY_98374291834_PEDRO_RIZZI`.
5. Clique em **"Conectar / Ver QR Code na Tela"**.
6. Aponte a câmera do WhatsApp do celular da escola e escaneie o código.
7. O sistema conectará automaticamente e fechará a janela!
