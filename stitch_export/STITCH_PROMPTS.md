# 🤖 Prompts Prontos para Stitch Beta (Google Labs)

Cole estes prompts diretamente no campo de criação do **Stitch Beta** (`stitch.withgoogle.com`) para criar ou iterar sobre cada tela do projeto.

---

### Prompt Geral do Projeto (Contexto Master)

```text
Create a high-end, modern Brazilian logistics web platform named "LOGIX BRASIL" specializing in road freight (Transporte Rodoviário) and express air cargo (Transporte Aéreo) across all Brazilian states (27 UFs).
The interface must be 100% in Brazilian Portuguese (pt-BR) with currency in Reais (BRL - R$).
Visual theme: deep navy (#0f172a), sky blue accents (#0284c7), emerald green for success (#059669), clean glassmorphism cards, and Lucide icons.
The application connects clients requesting shipping quotes with logistics operators who analyze the volumetric weight and dispatch custom pricing proposals in BRL.
```

---

### Prompt 1: Landing Page & Hero Nacional (Tela 01)

```text
Design a professional logistics landing page for "LOGIX BRASIL" covering air and road cargo across Brazil.
Top navbar with logo, links (Serviços, Cobertura Brasil, Como Funciona, Fale Conosco), notification bell, and login/register buttons.
Hero section: dark slate background with subtle glow, headline "Sua carga conectada a qualquer destino do território brasileiro", metrics badge (27 UFs, +5.500 Municípios, Aéreo / Rodo).
Hero interactive widget: quick freight estimator with radio toggle for "Rodoviário" vs "Aéreo", inputs for Origem (Cidade/UF), Destino (Cidade/UF), Quantidade de Volumes, Peso em kg, and volumetric presets (Pequeno, Médio, Grande).
Services section: two large cards comparing "Transporte Aéreo Nacional Express" (airports like GRU, VCP, GIG, BSB, MAO; 24h-48h) and "Transporte Rodoviário Dedicado & Fracionado" (highways Dutra, BR-101, BR-116; cost-effective).
4-step transparent process: 1. Cadastro da Carga -> 2. Cotação em Análise -> 3. Proposta em R$ -> 4. Sua Decisão (Aceitar, Recusar, Reanálise).
Footer with WhatsApp contact (+55 11 98765-4321), address in São Paulo / SP, and copyright.
Language: pt-BR, Currency: BRL (R$).
```

---

### Prompt 2: Modal de Cotação de Carga (Tela 02)

```text
Design a modal window for requesting a shipping quote in Brazil.
Header: gradient from sky-600 to blue-700 with package icon and title "Solicitar Cotação de Frete Nacional".
Fields:
1. Modal selector: toggle between "Rodoviário Nacional" (truck icon) and "Frete Aéreo Express" (plane icon).
2. Package count: "Quantos pacotes / volumes você está enviando?" with number stepper.
3. Dimensions: 3 inputs side-by-side for Comprimento (cm), Largura (cm), Altura (cm) with live cubagem calculation text (cm³, m³ and estimated volumetric weight in kg).
4. Total weight: Peso total em kg and Declared value in R$ (BRL).
5. Route: Origem (Endereço, Bairro, Cidade/UF, CEP) and Destino (Endereço, Bairro, Cidade/UF, CEP).
6. Content description textarea and checkbox for "Mercadoria Frágil".
Buttons: "Cancelar" and primary blue submit button "Enviar Solicitação".
Tailwind CSS, clean rounded-2xl styling, pt-BR.
```

---

### Prompt 3: Notificação "Cotação de envio sujeita a análise" (Tela 03)

```text
Design an acknowledgment modal popup displayed immediately after a client submits their package quote.
Centered clean card with animated pulse icon of search/magnifying glass.
Title: "Solicitação Recebida com Sucesso!".
Highlighted alert container with border and background in soft blue featuring the mandatory notice:
"''Cotización de envio sujeta a analisis''"
Subtitle: "(Cotação de envio sujeita a análise)".
Body text explains that tracking code COT-XXXX has been generated and the engineering/logistics team is analyzing package weight, volume and Brazilian route to calculate the best rate in R$ (BRL).
Two action buttons:
1. Primary "Acompanhar no Meu Painel" (dashboard icon)
2. Secondary "Continuar Navegando".
Language: pt-BR with exact quoted phrase.
```

---

### Prompt 4: Painel do Cliente com as 3 Ações de Decisão (Tela 04)

```text
Design a client portal dashboard for "LOGIX BRASIL" logistics.
Header showing client profile "Lucas Silveira", email "lucas@empresa.com.br", verified client badge, and "+ Nova Solicitação de Envio" button.
Tabs: "Cotações e Propostas em Aberto" (badge count) and "Histórico de Serviços Prestados".
Under active quotes: a rich card showing shipment COT-8921 (Modal Aéreo, Origem: São Paulo/SP -> Destino: Manaus/AM, 2 volumes, 8.5 kg).
Crucial feature: A highlighted proposal section with price "R$ 680,00" (estimated delivery 24 a 48 horas Aéreo Prioritário), notes from the administrator, and cost breakdown (Frete Peso: R$ 580,00, Seguro: R$ 65,00, Taxa Coleta: R$ 35,00).
3 interactive action buttons prominently displayed for the client:
1. "Aceitar Proposta" (green, checkmark icon)
2. "Recusar" (subtle red outline, x icon)
3. "Solicitar Outra Análise" (amber outline, refresh icon) allowing the client to enter counter-offer notes or budget constraints.
Language: pt-BR, Currency: BRL (R$).
```

---

### Prompt 5: Painel de Administração / Centro Operacional (Tela 05)

```text
Design an administrative logistics operations center for "LOGIX BRASIL".
Dark navy header with super admin badge, title "Centro Operacional de Logística Nacional", and "Exportar Relatório (CSV)" button.
Top KPI cards in BRL:
- Pendentes de Análise (yellow, clock icon)
- Propostas Enviadas (sky blue, send icon)
- Serviços Aceitos em Coleta (emerald, check icon)
- Faturamento Aprovado em R$ (dark, banknote icon)
Main tabs: "Análises Pendentes", "Serviços Aceitos & Em Coleta/Trânsito", "Histórico Geral Nacional".
Inside Pending tab: Card with detailed technical specs for received packages (real weight vs volumetric cubage / 5000 or / 6000 for air cargo, declared value, route).
Proposal creation form: Price input in R$ (BRL), ETA input (e.g. 24 a 48 horas Aéreo), breakdown inputs (frete base, seguro, GRIS/coleta), notes textarea, and "Enviar Proposta ao Cliente" button.
Search and filter bar by status and city.
Language: pt-BR, Currency: BRL.
```

---

### Prompt 6: Comprovante Oficial & Histórico (Tela 06)

```text
Design a printable official shipping receipt and historical order modal for LOGIX BRASIL.
Header with LOGIX BRASIL logo, document code COT-XXXX, issue date, and client details.
Technical table with volume count, weight (kg), dimensions (length x width x height cm), total volume in dm³, and fragility status.
Route section showing origin and destination with full addresses in Brazil.
Financial section with agreed price in R$ (BRL), breakdown, delivery terms, and full audit event timeline (Solicitação criada -> Proposta enviada -> Proposta aceita pelo cliente).
Footer with print button "Imprimir Comprovante" with @media print stylesheet.
```
