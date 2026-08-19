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

## O backend em produção

**https://backend-roan-five-70.vercel.app**

Não é preciso instalar nada para usá-lo: o aplicativo aponta para esse endereço
e funciona em qualquer rede. A página inicial explica o serviço em português e
permite consultá-lo ao vivo; `/docs` traz a referência técnica.

Endpoints:

| Rota | O que faz |
|------|-----------|
| `GET /` | Página inicial, em português, com consulta ao vivo |
| `GET /health` | Verificação de saúde |
| `GET /api/meta` | Quantos estados e unidades o cadastro tem, e quando foi gerado |
| `GET /api/ufs` | Estados, para o seletor manual |
| `GET /api/upas?uf=SP` | Unidades do estado, em ordem alfabética |
| `GET /api/upas/nearby?lat=&lon=&uf=SP` | Unidades mais próximas, com distância |
| `POST /api/chat` | Assistente determinístico |

## Rodar o backend na sua máquina

Só é necessário para desenvolver. Requer Python 3.11+.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Não há download de dados na primeira execução: o cadastro do CNES vem no
repositório, em `backend/data/cnes/` (27 estados, 2061 unidades). Isso existe
porque em ambiente serverless não há disco persistente — o cache gravável nasce
vazio a cada partida e baixar um estado inteiro dentro da requisição seria lento
demais. A ordem de leitura é memória, cache gravável, cadastro embarcado e, só
então, busca ao vivo no CNES.

Para atualizar o cadastro (o CNES publica mensalmente), rode antes do deploy:

```powershell
cd backend
.venv\Scripts\python scripts/build_cnes_seed.py
```

## Rodar o app

O endereço do backend vem do arquivo `.env` (copie de `.env.example`, que já
aponta para produção — assim o app funciona sem subir nada localmente):

```bash
EXPO_PUBLIC_API_URL=https://backend-roan-five-70.vercel.app
```

Para falar com um backend local, troque pelo endereço da sua máquina. Depois de
alterar o `.env`, rode com `--clear` — o Metro embute o valor em tempo de build
e mantém cache:

```bash
npm run web -- --clear
```

No navegador, o app pede a permissão de localização mas não consegue descobrir o
estado (o geocoding reverso não existe na web). Ele mostra o seletor de estado, e
a distância passa a ser calculada normalmente depois da escolha.

## Ligar o assistente com modelo de linguagem

O assistente funciona sem nenhuma configuração, respondendo por regras fixas.
Para que ele converse, defina uma chave do Google Gemini
([obtenha em aistudio.google.com/apikey](https://aistudio.google.com/apikey)):

```powershell
$env:GEMINI_API_KEY = "sua-chave"
```

Em produção, no Vercel, adicione a variável em Settings → Environment Variables
e faça um novo deploy. O modelo padrão é `gemini-3.7-flash`; para trocar, defina
`GEMINI_MODEL`.

Três garantias estruturam `app/assistant.py`, e vale conhecê-las antes de mexer:

**A triagem de emergência nunca passa pelo modelo.** Diante de sinal de risco à
vida, a resposta é 192/SAMU, vinda de `domain.py`, por regra fixa e auditável.
Um modelo pode suavizar o alerta ou falhar em reconhecê-lo, e numa urgência a
demora é o dano.

**O modelo não conhece nenhuma unidade.** Ele só obtém unidades chamando a
ferramenta `buscar_unidades_proximas`, que consulta o cadastro real, e redige em
cima do que voltou. As coordenadas vêm da requisição, nunca do modelo. Sem essa
amarra, um modelo de linguagem inventa nome, endereço e telefone plausíveis — o
pior erro possível neste aplicativo.

**Falha do modelo não derruba o serviço.** Chave inválida, cota esgotada, rede
fora ou formato inesperado caem na resposta determinística. Quem perguntou
recebe algo correto em vez de um erro.

Custo, para dimensionar: o `gemini-3.7-flash` custa US$ 0,75 por milhão de
tokens de entrada e US$ 3,75 de saída até 31/12/2026, dobrando depois. Há também
um nível gratuito, com limite de requisições.

## Aberto agora

Cada unidade traz `openNow` (`true`, `false` ou `null`) e `openingPrecision`.
O parâmetro `abertas=true` em `/api/upas/nearby` descarta as sabidamente
fechadas; as de horário indeterminado permanecem, porque escondê-las tiraria da
lista unidades que podem estar abertas.

Às três da manhã isso importa mais que distância: **16% das unidades não
funcionam 24 horas**, e apresentar uma delas como "a mais próxima" na
madrugada é o mesmo erro do tempo de fila inventado.

O campo `descricao_turno_atendimento` do CNES parece texto livre, mas só tem 7
valores distintos em 2061 unidades — vocabulário fechado, classificável com
segurança. A precisão da resposta reflete o que dá para saber:

| `openingPrecision` | Quando | O que significa |
|---|---|---|
| `exata` | Atendimento contínuo de 24 horas (84%) | Certeza, não há o que estimar |
| `estimada` | Atende por turnos, em dia de semana | Faixas derivadas de horários oficiais: manhã 07h–12h, tarde 12h–19h, noite 19h–22h |
| `desconhecida` | Turnos intermitentes, campo vazio, ou dentro do horário num fim de semana | `openNow` vem `null`; não afirmamos nada |

As faixas não são convenção nossa. Somadas, reproduzem os horários publicados:
manhã+tarde dá **07h–19h**, o padrão de 12 horas contínuas do [Programa Saúde na
Hora](https://www.gov.br/saude/pt-br/composicao/saps/saude-na-hora) ([Portaria nº
397/GM/MS de 2020](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2020/prt0397_16_03_2020.html))
e das [AMAs de São Paulo](https://prefeitura.sp.gov.br/web/saude/w/atencao_basica/ama/1911);
somando a noite dá **07h–22h**, o formato praticado no Distrito Federal.

Sobre os dias da semana: a descrição do CNES para atendimento contínuo diz
"inclui sábados, domingos e feriados", e só ela diz isso. O Saúde na Hora exige
segunda a sexta, com fim de semana só em parte dos formatos, e as AMAs abrem de
segunda a sábado. Dia de semana é garantido, fim de semana varia por unidade e o
cadastro não distingue — então, dentro do horário e em fim de semana, a resposta
é `null`. Fora do horário a unidade está fechada em qualquer dia, porque nenhum
formato de turno abre de madrugada.

O cálculo usa o fuso do estado da unidade, não um fuso único: o Brasil tem
quatro, e o Acre está três horas atrás de São Paulo — justamente onde há menos
unidades para escolher. Por isso o `tzdata` é dependência.

A marcação é feita na consulta, nunca no cache. As unidades ficam em memória
por 24 horas, e gravar o `openNow` no objeto cacheado faria o app responder
"aberta" de madrugada porque alguém consultou à tarde.

## Limite de requisições

A API é pública e sem autenticação. Cada IP tem, por minuto, 120 requisições
nos endpoints de leitura e 10 no `/api/chat` — o assistente é o caro, porque
cada mensagem pode virar uma chamada paga ao modelo. Passado o teto a resposta
é `429` com `Retry-After`. O `/health` e a página inicial não são limitados,
para não bloquear monitoramento nem a própria página.

Os tetos são ajustáveis por variável de ambiente: `RATE_LIMIT_READ`,
`RATE_LIMIT_CHAT` e `RATE_LIMIT_WINDOW`.

**O que este limite não é.** A contagem vive na memória do processo, e em
serverless há várias instâncias que não se conversam — então o teto real é por
instância e zera a cada partida fria. Isso barra laço acidental e abuso
ingênuo, que é o risco concreto aqui, mas não é defesa contra ataque
distribuído. Para um teto global seria preciso armazenamento compartilhado
(Redis, Vercel KV) ou o firewall da plataforma.

## Gerar o APK Android

```powershell
cd android
.\gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

O APK sai em `android/app/build/outputs/apk/release/`, com cerca de 29 MB.

Duas exigências do ambiente, ambas descobertas do jeito difícil:

**Use JDK 17 ou 21, não a JBR do Android Studio.** A JBR atual é JDK 25, e a
partir do JDK 24 a JVM imprime `WARNING: A restricted method in
java.lang.System has been called` no stderr. O plugin Android trata isso como
erro fatal no passo do Prefab e o build morre com uma mensagem que não explica
nada.

**Não construa dentro de pasta sincronizada (OneDrive, Dropbox).** O
sincronizador transforma arquivos de build em placeholders de nuvem e mantém
handles abertos, o que produz `not a regular file`, `Unable to delete
directory` e `AccessDeniedException` em pontos aleatórios. Redirecionar o
diretório de build por init script do Gradle não resolve: os `CMakeLists.txt`
dos módulos nativos do React Native têm `../../../build/generated/...` escrito
na mão e o codegen deixa de ser encontrado. A única saída é construir fora da
pasta sincronizada.

O `-PreactNativeArchitectures=arm64-v8a` restringe a compilação nativa a uma
arquitetura em vez de quatro, o que corta o tempo de build em cerca de 4x. Cobre
qualquer aparelho de 2016 em diante, mas não roda em emulador x86 — remova o
parâmetro se precisar de um APK universal.

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
