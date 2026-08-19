# UPA Agora

Aplicativo que localiza **unidades de pronto atendimento reais** e as ordena pela
distância até você. Os dados vêm do CNES (Cadastro Nacional de Estabelecimentos
de Saúde), pela API pública de dados abertos do Ministério da Saúde.

## O que o app faz

- Pede sua localização e lista as unidades de pronto atendimento mais próximas.
- Mostra nome, endereço, bairro, horário de funcionamento e telefone reais.
- Abre a rota no mapa e liga para a unidade com um toque.
- Assistente determinístico que responde qual é a unidade mais próxima.
- Triagem de emergência: diante de sinais de risco, orienta ligar 192 (SAMU) em
  vez de comparar unidades.

## O que o app não faz — e por quê

**Não exibe tempo de fila.** Não existe fonte pública nacional de fila em tempo
real. Algumas prefeituras publicam painéis próprios (DF, Londrina, Lajeado,
entre outras), mas não há padrão nacional. Exibir um número estimado como se
fosse real levaria alguém à unidade errada numa urgência, então o campo fica
vazio e o motivo é explicado na tela Projeto.

O modelo de dados já tem `waitMinutes` e `waitSource` reservados para quando uma
integração municipal for feita.

## Qualidade dos dados do CNES

Duas limitações reais, medidas sobre o estado de São Paulo (537 registros):

- **~5% das unidades não têm coordenada** no cadastro. Elas são omitidas: sem
  latitude e longitude não há como calcular distância.
- **~1,5% têm a coordenada do centro do município**, não a do endereço. O
  sintoma é um amontoado de unidades no mesmo ponto com CEPs de distritos
  diferentes. O app detecta esses casos, marca a unidade com um aviso e a
  rebaixa no fim da lista, em vez de afirmar uma distância errada.

A heurística está em `backend/app/cnes.py` (`detect_unreliable_coordinates`) e
pode gerar falso positivo em região central densa — o aviso à toa é preferível
ao erro silencioso.

## Rodar o backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A primeira consulta a um estado baixa o cadastro do CNES (paginado de 20 em 20,
em ondas concorrentes) e guarda em `backend/.cache/` por 24 horas. As consultas
seguintes respondem em milissegundos.

Endpoints:

| Rota | O que faz |
|------|-----------|
| `GET /health` | Verificação de saúde |
| `GET /api/ufs` | Estados, para o seletor manual |
| `GET /api/upas?uf=SP` | Unidades do estado, em ordem alfabética |
| `GET /api/upas/nearby?lat=&lon=&uf=SP` | Unidades mais próximas, com distância |
| `POST /api/chat` | Assistente determinístico |

## Rodar o app

O endereço do backend vem do arquivo `.env` (copie de `.env.example`):

```bash
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

Para testar no celular, troque `127.0.0.1` pelo IP do computador na rede local.
Depois de alterar o `.env`, rode com `--clear` — o Metro embute o valor em tempo
de build e mantém cache:

```bash
npm run web -- --clear
```

No navegador, o app pede a permissão de localização mas não consegue descobrir o
estado (o geocoding reverso não existe na web). Ele mostra o seletor de estado, e
a distância passa a ser calculada normalmente depois da escolha.

## Testes

```bash
cd backend && .venv\Scripts\python -m pytest
```

22 testes cobrem a paginação do CNES, o descarte de unidades sem coordenada, a
detecção de coordenadas não confiáveis, a ordenação por distância, a triagem de
emergência e a garantia de que nenhum tempo de fila é inventado.

Verificação de tipos do app:

```bash
npm run typecheck
```

## Privacidade

A localização é usada apenas para calcular distâncias e não é armazenada. O
estado é resolvido pelo próprio aparelho; ao backend seguem apenas a coordenada
e a sigla do estado, necessárias para o cálculo.

## Limites do protótipo

Sem banco de dados, autenticação, LLM ou integração com fila municipal. A
distância é em linha reta, não pelo trajeto de carro. O assistente responde por
regras determinísticas, o que mantém o comportamento auditável.
