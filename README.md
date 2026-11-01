# 🇧🇷 LOGIX BRASIL - Plataforma Web de Logística Rodoviária e Aérea Nacional

Plataforma web profissional e responsiva desenvolvida para a promoção de serviços de transporte de cargas e encomendas por todo o Brasil (tanto rodoviário quanto aéreo), 100% em **Português do Brasil (pt-BR)** e com precificação em **Reais (BRL - R$)**.

---

## 🌟 Funcionalidades e Escopo Nacional

### 1. 🌐 Landing Page Comercial (Todo o Brasil)
- **Cobertura em 27 UFs**: Atendimento em todas as capitais e cidades do interior do país.
- **Modalidades de Frete**:
  - **Transporte Rodoviário Expresso & Fracionado**: Integração pelas principais rodovias nacionais com rastreamento via satélite.
  - **Transporte Aéreo Nacional Express**: Conexões diretas através dos maiores hubs aeroportuários (GRU, VCP, GIG, BSB, CNF, MAO, SSA, POA, REC).
- **Simulador Rápido de Carga**: Entrada rápida com seleção de modal (Aéreo / Rodoviário) e cálculo de cubagem.
- **Canais de Contato no Brasil**: Botão direto para WhatsApp com DDD brasileiro, telefone central e e-mail.

### 2. 📦 Portal do Cliente (Cotação com Análise)
- **Cadastro e Acesso de Clientes**: Dados com nome, telefone/WhatsApp corporativo ou pessoal e empresa.
- **Formulário de Cotação Completo**:
  - **Modalidade do Envio**: Seleção entre Rodoviário Nacional ou Aéreo Express.
  - **Quantidade de Volumes / Pacotes**: Quantos bultos estão sendo despachados.
  - **Dimensões em centímetros (cm)**: Comprimento, Largura e Altura por volume com cálculo automático de cubagem (cm³ / m³) e estimativa de peso cubado.
  - **Peso Total (kg)**: Peso real aferido.
  - **Origem e Destino no Brasil**: Endereço completo, bairro, cidade, UF e CEP.
  - **Conteúdo e Fragilidade**: Descrição da mercadoria, valor da nota fiscal / declarado (R$) e opção de carga frágil.
- **Notificação Oficial Obrigatória**:
  - Ao clicar em enviar, o cliente recebe o modal e aviso de destaque:
    > **''Cotización de envio sujeta a analisis''** / **''Cotação de envio sujeita a análise''**
    > Com código único de rastreio (ex: `COT-8921`).
- **Módulo de Decisão do Cliente**:
  - Quando a proposta em Reais (R$) é emitida, o cliente visualiza o detalhamento e possui 3 ações imediatas:
    1. **Aceitar Proposta**: Confirma o serviço e agenda a coleta.
    2. **Recusar**: Cancela a proposta com opção de justificativa.
    3. **Solicitar Outra Análise**: Envia observações de contraproposta de orçamento ou prazo ao administrador.
- **Histórico do Cliente**:
  - Registro de todas as entregas aceitas, concluídas ou recusadas, com emissão de comprovante oficial imprimível.

### 3. 🛡️ Painel de Gestão (Administrador)
- **Indicadores Gerenciais (KPIs em BRL)**:
  - Cotações pendentes de análise técnica.
  - Propostas aguardando retorno do cliente.
  - Serviços aprovados em trânsito/coleta.
  - Faturamento total aprovado em **Reais (R$)**.
- **Analisador de Frete**:
  - Ficha técnica com peso real, cubagem e modal escolhido.
  - Formulário para precificar em R$ com detalhamento (frete base, seguro de carga e taxa de coleta/GRIS).
  - Envio da proposta formal ao cliente.
- **Histórico Geral Nacional**:
  - Filtro por status e busca por cliente, código, cidade ou CEP.
  - Exportação de dados para planilha `.CSV` (Excel).

---

## 🎯 Acessos de Demonstração

Use a **Barra Superior de Demonstração** para navegar instantaneamente entre os perfis:

| Perfil | E-mail | Senha | Descrição |
|---|---|---|---|
| **Cliente Teste** | `lucas@empresa.com.br` | `demo` | Teste de solicitações de frete, resposta às propostas e histórico. |
| **Administrador** | `admin@logixbrasil.com.br` | `admin` | Análise de cargas, envio de propostas em R$ e controle de entregas. |
| **Visitante** | — | — | Visualização pública da Landing Page. |

---

## 💻 Como Abrir no Navegador

1. No explorador de arquivos, acesse:
   `C:\Users\Win 11 Pro\.gemini\antigravity\scratch\logistica-envios\`
2. Dê um duplo clique no arquivo **`index.html`**.
3. O aplicativo abre instantaneamente no Google Chrome, Microsoft Edge ou Firefox.
4. Todos os dados são salvos localmente no seu computador (`localStorage`).
