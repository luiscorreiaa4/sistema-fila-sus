# Registro de Prompt 05 — Busca Inteligente do Cidadão e Portal Médico (`/medico`)

- **Data:** 2026-11-24
- **Etapa / Assunto:** Refatoração da Busca de Vagas do Cidadão e Criação do Portal Médico (`/medico`) com Calendário Clínico e Construtor de Agenda (`grill-me`)
- **Ferramenta:** Antigravity
- **Modelo utilizado:** Gemini

---

## Prompt Literal

### Mensagem 1 — Diagnóstico e Solicitação de Plano

```text
principais problemas que estou vendo aqui nesse projeto

1. cidadao nao consegue buscar exatamente algo para marcar, nem por especialidade, nem por nome do médico, nem por data, apenas abre a tela com todas as datas disponiveis, isso está confuso.
2. esse é o principal ponto, esta feio, inusual e complicado a questao do medico criar ou ate mesmo verificar sua agenda, não sei se ele consegue ver consultas marcadas e horarios livres em uma tela bonita, está muito ruim.
quero aqui um plano bem elaborado dos dois problemas, se quiser rode um grill-me ou algo do tipo para saber como deve resolver esses problemas da maior forma, pode refatorar telas, criar mais, mas quero ver o plano de maneira que eu consiga opinar antes da implementação
```

### Mensagem 2 — Aprovação após `grill-me`

```text
concordo com todo ele entao siga pra implementação.
```

---

## Decisões Consolidadas (`grill-me`)

1. **Navegação Dedicada do Médico (`/medico`):**
   - Criada experiência dedicada em `/medico` (`MedicoPage`), direcionando automaticamente o perfil `PROFISSIONAL_SAUDE` no login e ocultando a recepção/check-in para destacar **Minha Agenda**, **Meu Consultório (Fila)** e **Minhas Escalas**.
2. **Visualização da Agenda do Médico (`AgendaClinicaView` + `GET /api/agendas/grade`):**
   - Combinação de **Mini-Calendário Mensal + Linha do Tempo Diária** (exibindo lado a lado horários livres, lotação, pacientes marcados com prioridade legal e status ao vivo na fila após check-in) + alternância para **Grade Semanal**.
3. **Construtor Inteligente de Escalas (`AgendaBuilderModal`):**
   - Dois modos: **Escala Recorrente por Período** e **Dia Específico (Avulso)**, com gerador automático de horários por turno/intervalo (`15`, `20`, `30`, `40`, `60` min), opção de horários personalizados por dia da semana, auto-vínculo obrigatório ao médico autenticado (`PROFISSIONAL_SAUDE`) e prévia ao vivo da quantidade de vagas.
4. **Busca Rica para Cidadão e Marcação Assistida (`BuscaVagasPanel`):**
   - Filtros combinados (`termo`, `especialidade`, `profissionalId`, `servicoId`, `unidadeId`, `data` e `turno`), catálogo público seguro (`GET /api/agendas/catalogo-busca` conforme LGPD), faixa horizontal de datas com vagas (evitando despejar todas as datas de uma vez) e cards agrupados por Médico + Serviço + Unidade com pílulas de horários por turno.
