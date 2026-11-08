# 🎨 Top10 Cargas - Especificação de Design para Stitch Beta (Google Labs)

Documento oficial de arquitetura visual, tokens de design, identidade de marca e mapeamento de telas para importação e prototipagem no **Stitch Beta** (`stitch.withgoogle.com`).

---

## 📌 Visão Geral do Produto & Identidade de Marca

- **Nome da Empresa**: **Top10 Cargas**
- **Logotipo Oficial**:
  - **Símbolo**: Caixa de encomendas tridimensional em vermelho vinho (*rojo vino*), com a inscrição **"Top10"** em branco na face frontal, envolvida por uma **flecha amarela circular** em movimento com ponta direcional dinâmica.
  - **Tipografia**: Sans-serif geométrica moderna (`Inter`, `font-black`), combinando `Top10` em tom vinho e `Cargas` em amarelo vibrante.
- **Setor**: Logística de Cargas Fracionadas e Dedicadas, Frete Rodoviário & Aéreo Expresso Nacional.
- **Cobertura**: Todo o território brasileiro (27 UFs, capitais e interior).
- **Idioma**: 100% Português do Brasil (`pt-BR`).
- **Moeda**: Real Brasileiro (`BRL - R$`).
- **Público-Alvo**:
  - Clientes B2B/B2C que solicitam cotações de frete, anexam fotos das caixas e acompanham o envio.
  - Gestores operacionais com acesso administrativo seguro restrito.

---

## 🎨 Design Tokens & Cores Oficiais (Top10 Cargas)

| Papel no Design | Nome do Token | Valor HEX | Uso na Interface |
|---|---|---|---|
| **Primary (Rojo Vino)** | `wine-900` / `wine-800` | `#881337` / `#9f1239` | Cabeçalhos principais, botões primários, bordas de destaque, badges corporativos |
| **Dark Wine** | `wine-950` | `#4c0519` / `#5c061d` | Topbars, footers, fundos escuros de cards de destaque |
| **Soft Wine** | `wine-50` / `wine-100` | `#fff1f2` / `#ffe4e6` | Fundos de cards com propostas disponíveis, tags e avisos suaves |
| **Accent (Amarillo)** | `yellowbrand-400` / `500` | `#facc15` / `#eab308` | Flecha do logo, chamadas para ação (CTA), estrelas de avaliação, badges de destaque |
| **Highlight Yellow** | `yellowbrand-100` | `#fef9c3` | Fundos de alerta e ênfase comercial |
| **Neutral White (Blanco)**| `white` | `#ffffff` | Fundo de cartões, texto em contrastes escuros, elementos do logo |
| **Slate Neutrals** | `stone-100` a `stone-900` | Escala de cinzas suaves | Tipografia de leitura, bordas de tabelas e divisórias |
| **Success (Aprovado)** | `emerald-600` | `#059669` | Proposta Aceita, Carga Entregue, status de sucesso |
| **Warning (Em Análise)**| `amber-500` | `#f59e0b` | "Cotação de envio sujeita a análise", aguardando cálculo |

---

## 🔐 Segurança e Acesso Administrativo Restrito

O portal do administrador requer autenticação obrigatória via modal com verificação estrita de credenciais:
- **E-mail / Usuário Único**: `top10cargas@hotmail.com`
- **Senha Única**: `Caxias844$`
- Qualquer outra tentativa de login é bloqueada pelo sistema com mensagem de acesso negado.

---

## 📦 Funcionalidades Principais do Sistema

1. **Cotação Personalizada com Upload de Imagem**:
   - Medidas em centímetros: Comprimento, Largura e Altura.
   - Cálculo automático de cubagem ($dm^3$ e $m^3$) e peso cubado ($/6000$ Aéreo, $/5000$ Rodoviário).
   - Campo para **anexar foto da caixa/embalagem**, gerando preview imediato para análise técnica de cubagem e integridade.
2. **Notificação Oficial Imediata**:
   - Modal de alerta com a mensagem estrita: `''Cotización de envio sujeta a analisis''` (*Cotação de envio sujeita a análise*).
3. **Proposta Comercial em Reais (R$)**:
   - Envio de orçamento pelo operador com frete base, seguro, taxas e prazo estimado de entrega.
4. **Decisão do Cliente em 3 Vias**:
   - **Aceitar Proposta**: confirma o frete e aciona o rastreamento contínuo.
   - **Recusar**: cancela com justificativa.
   - **Solicitar Outra Análise**: envia contraproposta de orçamento e notas ao operador.
5. **Rastreamento Contínuo Pós-Aceite**:
   - Stepper em 4 fases: **1. Aprovado** ➔ **2. Coleta** ➔ **3. A Caminho (Em Trânsito)** ➔ **4. Entregue**.
   - O operador atualiza as etapas no painel administrativo e o cliente acompanha em tempo real.
6. **Histórico e Comprovante Oficial**:
   - Emissão de documento timbrado com logo da Top10 Cargas, foto da caixa, valores em R$ e exportação em CSV.

---

## 📱 Mapeamento de Telas (Screens) para o Stitch Beta

| Tela # | Nome do Arquivo | Descrição |
|---|---|---|
| **01** | `01_landing_page.html` | Portal de entrada da Top10 Cargas com navbar timbrada, logo SVG oficial da caixa com flecha amarela, hero com simulador de cubagem rápida e catálogo aéreo e rodoviário. |
| **02** | `02_quote_modal.html` | Modal de cotação completo com seleção de modalidade, medidas C x L x A cm, peso real kg, rotas no Brasil e upload de foto da caixa. |
| **03** | `03_sujeita_analise_modal.html` | Popup oficial com a notificação: *''Cotización de envio sujeta a analisis''* (*Cotação de envio sujeita a análise*). |
| **04** | `04_client_dashboard.html` | Painel do cliente com cotações ativas, foto da caixa, proposta em R$ com as 3 ações (Aceitar, Recusar, Reanálise) e rastreador de entrega contínuo pós-aprovação (*A Caminho* / *Entregue*). |
| **05** | `05_admin_dashboard.html` | Centro operacional restrito (`top10cargas@hotmail.com`), análise técnica de foto da caixa e cubagem, envio de proposta em R$ e controle de etapas de entrega. |
| **06** | `06_receipt_history.html` | Comprovante oficial com logo da Top10 Cargas, foto da embalagem, dados fiscais e histórico geral auditável. |
