# UPA Agora

O **UPA Agora** é um aplicativo que encontra unidades de pronto atendimento reais e ajuda a pessoa a decidir para onde ir com informações do **CNES (Cadastro Nacional de Estabelecimentos de Saúde)**.

O app pode ser executado no navegador, em um celular com Expo Go ou como aplicativo Android. Para começar a desenvolver, a forma mais simples é usar a versão web e o navegador integrado do VS Code.

## O que o aplicativo faz

- Solicita a localização do usuário.
- Consulta unidades de pronto atendimento reais cadastradas no CNES.
- Ordena as unidades pela distância em linha reta.
- Mostra endereço, bairro, telefone e horário informado no cadastro.
- Informa se a unidade está aberta, fechada ou com horário a confirmar.
- Abre a rota no aplicativo de mapas.
- Abre o telefone para ligar para a unidade.
- Permite escolher o estado manualmente quando a localização não está disponível.
- Aceita um CEP no lugar do GPS e continua ordenando as unidades por proximidade.
- Oferece um assistente para encontrar unidades por conversa.
- Quando a integração de mapas está ativa, compara tempo e distância pelas ruas.
- Detecta mensagens de emergência e orienta ligar para o SAMU no número 192.

## Limites importantes

O UPA Agora procura ser honesto sobre o que os dados permitem afirmar:

- **Não mostra tempo de fila.** Não existe uma fonte pública nacional de filas em tempo real.
- **A lista principal usa distância em linha reta.** O assistente só informa
  trajeto por ruas quando recebe um resultado da integração de mapas.
- **Origem por CEP é aproximada.** O ponto é do trecho da rua, ou do centro do
  município num CEP geral. Serve para ordenar unidades, não para afirmar
  distância exata.
- **Algumas coordenadas do CNES podem ser imprecisas.** O app mostra um aviso quando identifica esse caso.
- **Alguns horários são estimados.** Quando não há certeza, o app pede que a pessoa ligue antes de sair.
- Em caso de risco de vida, a orientação é ligar para o **192 (SAMU)**, e não escolher uma unidade apenas pela distância.

## Tecnologias utilizadas

### Aplicativo

- React Native
- Expo
- TypeScript
- React Native Web

### Backend

- Python 3.11 ou superior
- FastAPI
- Pydantic
- HTTPX
- SDK oficial da OpenAI e GPT-5.6 Luna opcional
- OpenRouteService opcional para geocodificação e rotas
- BrasilAPI para resolver CEP, sem chave e sem cadastro
- Google Maps URLs para abrir a navegação sem chave do Google

### Dados

- API de Dados Abertos do Ministério da Saúde
- Cadastro Nacional de Estabelecimentos de Saúde (CNES)

## Estrutura do projeto

```text
upa-agora/
├── App.tsx                 # Estado principal e navegação do aplicativo
├── app.json                # Configuração do Expo
├── package.json            # Dependências e comandos do aplicativo
├── src/
│   ├── components/         # Cartões, navegação e seletor de estado
│   ├── screens/            # Início, Chat e Sobre
│   ├── services/           # Comunicação com a API e localização
│   ├── theme.ts            # Cores, tipografia e espaçamentos
│   └── types.ts            # Tipos TypeScript
├── backend/
│   ├── app/                # API FastAPI e regras do domínio
│   ├── data/cnes/          # Cadastro do CNES incluído no projeto
│   ├── scripts/            # Cadastro embarcado e verificação das integrações
│   └── tests/              # Testes automatizados do backend
├── android/                # Projeto Android gerado pelo Expo
└── design-system/          # Decisões e referências visuais
```

## Mapa detalhado dos arquivos

Esta seção serve como guia para quem precisa descobrir **onde fazer uma alteração**. Os arquivos estão agrupados pela parte do sistema a que pertencem.

### Arquivos da raiz

| Arquivo | O que faz e por que existe |
|---|---|
| `.env.example` | Modelo das variáveis públicas do aplicativo. Mostra qual endereço de API deve ser colocado no `.env` local. |
| `.gitignore` | Impede que dependências, ambientes locais, caches, APKs e arquivos com configuração pessoal sejam enviados ao Git. |
| `app.json` | Configuração principal do Expo: nome do app, identificadores Android/iOS, orientação, tema e permissões de localização. |
| `eas.json` | Configura os builds do Expo Application Services. O perfil `apk` gera um arquivo Android instalável e aponta o app para o backend publicado. |
| `App.tsx` | Ponto central do aplicativo. Mantém a aba ativa, localização, UF, unidades, estados de carregamento e histórico do chat; também conecta as telas e o seletor de estado. |
| `package.json` | Declara as dependências JavaScript e os comandos `start`, `web`, `android`, `typecheck` e `export:web`. |
| `package-lock.json` | Registra as versões exatas instaladas pelo npm para que todos os colegas recebam a mesma árvore de dependências. É atualizado pelo npm e não deve ser editado manualmente. |
| `tsconfig.json` | Ativa e configura a verificação TypeScript. O projeto usa modo estrito e alerta sobre acesso inseguro a posições de arrays. |
| `README.md` | Manual de produto, instalação, execução, testes e arquitetura para a equipe. |

### Aplicativo: `src`

| Arquivo | O que faz e por que existe |
|---|---|
| `src/types.ts` | Define os contratos TypeScript compartilhados: unidade, UF, coordenadas, mensagens, status de carregamento e precisão dos dados. |
| `src/theme.ts` | Fonte única de cores, tipografia, espaçamentos e raios. Mantém o visual consistente e oferece temas claro e escuro. |
| `src/env.d.ts` | Informa ao TypeScript que a variável `EXPO_PUBLIC_API_URL` pode ser lida por `process.env`. |
| `src/services/api.ts` | Centraliza todas as chamadas ao backend, aplica timeout, monta os parâmetros e reduz a precisão da coordenada enviada. Valida as respostas de unidades e a do assistente, e só aceita link de rota que aponte para o Google Maps. |
| `src/services/location.ts` | Solicita permissão, obtém a posição do aparelho e tenta descobrir cidade e estado com geocoding reverso local. |
| `src/screens/HomeScreen.tsx` | Tela inicial. Apresenta o produto, estados de localização/erro, aviso do SAMU, o campo de CEP quando a localização falha e a lista de unidades. |
| `src/screens/ChatScreen.tsx` | Interface do assistente. Guarda o texto sendo digitado, envia mensagens, mostra respostas, sugestões, carregamento e destaque de emergência. Exibe o botão de rota quando o backend devolve um link. |
| `src/screens/AboutScreen.tsx` | Tela Sobre. Explica a fonte dos dados, limites, privacidade e decisões responsáveis do aplicativo. |
| `src/components/UpaCard.tsx` | Cartão de uma unidade. Formata distância e horário, mostra precisão, abre rota no mapa e inicia ligação telefônica. |
| `src/components/CepPrompt.tsx` | Campo de CEP oferecido quando a localização falha. Formata enquanto se digita e mostra o erro do próprio CEP separado do erro de rede. |
| `src/components/UfPicker.tsx` | Modal inferior com os 27 estados. É usado quando a UF precisa ser escolhida ou trocada manualmente. |
| `src/components/BottomNav.tsx` | Navegação inferior entre Início, Chat e Sobre, com papéis e rótulos de acessibilidade. |

### Backend: configuração e entrada

| Arquivo | O que faz e por que existe |
|---|---|
| `backend/pyproject.toml` | Define o pacote Python, a versão mínima do Python, dependências do backend, dependências de teste e a configuração do pytest e do ruff. |
| `backend/requirements.txt` | Lista simples das dependências usadas no deploy da Vercel. |
| `backend/.env.example` | Referência dos nomes de configuração privada usados pelo backend. Não contém credenciais reais. |
| `backend/.gitignore` | Ignora restos locais dentro de `backend`. O link da CLI da Vercel agora fica na raiz, ignorado pelo `.gitignore` de lá. |
| `backend/.vercelignore` | Exclui testes, scripts, caches e ambiente virtual do pacote enviado para a Vercel. |
| `backend/vercel.json` | Encaminha todas as rotas recebidas pela Vercel para a função Python. |
| `backend/api/index.py` | Entrypoint serverless esperado pela Vercel. Apenas importa e expõe o aplicativo FastAPI real. |

### Backend: regras e serviços em `backend/app`

| Arquivo | O que faz e por que existe |
|---|---|
| `backend/app/__init__.py` | Marca `app` como pacote Python. |
| `backend/app/main.py` | Cria o FastAPI, configura CORS e cabeçalhos, trata validações e declara todos os endpoints HTTP. |
| `backend/app/models.py` | Define os modelos Pydantic de unidades, estados, requisições e respostas. É o contrato oficial da API. |
| `backend/app/cnes.py` | Cliente e adaptador do CNES. Lê seed/cache, busca páginas da API, converte registros, remove unidades inválidas e detecta coordenadas suspeitas. |
| `backend/app/brasilapi.py` | Resolve CEP em cidade, estado e coordenada aproximada. Cache em memória, timeout próprio e erros que não vazam detalhe interno. Não usa chave. |
| `backend/app/openrouteservice.py` | Cliente server-side do OpenRouteService. Valida endereços, limita destinos, calcula trajetos e cria links seguros do Google Maps sem usar uma chave do Google. |
| `backend/app/repository.py` | Implementa as consultas usadas pelo produto: lista por UF, proximidade, limite de 60 km, ordenação, horário atual e filtro de unidades abertas. |
| `backend/app/geo.py` | Contém o cálculo de Haversine para medir a distância em linha reta entre duas coordenadas. |
| `backend/app/schedule.py` | Interpreta as descrições de turno do CNES e determina `openNow` no fuso horário de cada estado. |
| `backend/app/ufs.py` | Mantém os 27 estados, siglas e códigos IBGE; também resolve uma UF recebida por sigla ou nome. |
| `backend/app/domain.py` | Regras determinísticas do assistente, incluindo detecção de emergência, resposta do SAMU e textos sobre unidades e fila. |
| `backend/app/assistant.py` | Coordena a OpenAI Responses API, a busca CNES, a ferramenta opcional de rotas e o fallback determinístico. Limita rodadas e impede que o modelo invente unidades ou trajetos. |
| `backend/app/ratelimit.py` | Limita requisições por IP e por janela de tempo, com teto menor no endpoint de chat. |
| `backend/app/static/home.html` | Página HTML apresentada na raiz do backend. Permite demonstrar a API, consultar unidades por localização ou por CEP e testar o assistente sem o app React Native. |

### Dados do CNES

| Arquivo ou padrão | O que faz e por que existe |
|---|---|
| `backend/data/cnes/gerado-em.json` | Registra quando o seed foi gerado, quantos registros foram obtidos e se alguma UF falhou na atualização. |
| `backend/data/cnes/upas-uf-XX.json` | Um arquivo por estado, usando o código IBGE no nome. Guarda os registros brutos do CNES que acompanham o deploy. Os 27 arquivos têm a mesma finalidade. |
| `backend/scripts/build_cnes_seed.py` | Baixa novamente os dados de todas as UFs e atualiza os JSONs. Preserva o arquivo anterior quando uma resposta estadual falha ou vem vazia. |
| `backend/scripts/smoke_openrouteservice.py` | Confere a integração de rotas contra a API real, coisa que os testes com transporte mockado não alcançam. Lê a chave do ambiente e nunca a imprime. |

Os JSONs do CNES são dados gerados. Mudanças neles devem ser feitas pelo script, não manualmente.

### Testes do backend

| Arquivo | O que verifica |
|---|---|
| `backend/tests/conftest.py` | Cria fixtures compartilhadas, ajusta imports e prepara o cliente de testes. |
| `backend/tests/test_api.py` | Testa endpoints, validações, distâncias, erros, CORS, cabeçalhos, horário e ausência de tempo de fila inventado. |
| `backend/tests/test_assistant.py` | Confirma a integração OpenAI sem tocar na rede, as travas do modelo, o uso de unidades reais, os limites das ferramentas e o fallback para regras fixas. Também fixa o orçamento de tokens por esforço e a regra do link de rota. |
| `backend/tests/test_brasilapi.py` | Testa coordenada em texto, CEP sem ponto na base, 404 sem vazar provedor, cache e extração de CEP em texto livre, sem tocar na rede. |
| `backend/tests/test_openrouteservice.py` | Testa geocodificação, matriz de rotas, limites de endereço e de destinos, timeout, links do Google Maps e proteção da credencial sem tocar na rede. |
| `backend/tests/test_cnes_client.py` | Testa paginação, conversão, descarte de registros, seed, falhas externas e detecção de coordenadas imprecisas. |
| `backend/tests/test_domain.py` | Testa detecção de emergência e evita que mensagens comuns sejam classificadas incorretamente. |
| `backend/tests/test_ratelimit.py` | Testa limites por cliente, teto específico do chat e controle da memória usada pelo limitador. |
| `backend/tests/test_schedule.py` | Testa vocabulário de turnos, faixas de horário, fim de semana e fusos brasileiros. |

### Design e arquivos de apoio

| Arquivo | O que faz e por que existe |
|---|---|
| `design-system/upa-agora/MASTER.md` | Registra a direção visual geral, paleta, tipografia, espaçamento e regras de acessibilidade. |
| `design-system/upa-agora/pages/simple-mvp.md` | Substitui partes do design geral para a versão enxuta de demonstração do aplicativo. |
| `output/android/qr-upa-agora.png` | Imagem de QR code mantida como material de apoio Android. Não participa da execução do app. |

### Pastas e arquivos gerados localmente

Estes itens podem aparecer depois que os comandos são executados, mas não fazem parte do código que a equipe deve editar:

| Caminho | Como é criado e para que serve |
|---|---|
| `node_modules/` | Criado por `npm install`; contém as dependências JavaScript. |
| `.expo/` | Criado por `npx expo start`; guarda estado local do servidor Expo. |
| `.env` | Criado pelo desenvolvedor a partir de `.env.example`; guarda a configuração local do app. |
| `dist/` | Criado por `npm run export:web`; contém a exportação web de produção. |
| `backend/.venv/` | Criado por `python -m venv`; contém o ambiente Python local. |
| `backend/.cache/` | Cache gravável dos dados CNES durante o desenvolvimento. |
| `backend/__pycache__/` | Bytecode temporário gerado pelo Python. |
| `android/` | Projeto nativo gerado pelo Expo para compilar Android. Nesta base ele pode existir localmente, mas está ignorado pelo Git da raiz. |
| `build.log` | Registro local de uma compilação Android. Serve para diagnóstico e não deve ser versionado. |

---

# Como rodar o aplicativo pela primeira vez

Este é o caminho recomendado para quem acabou de baixar o projeto. Ele executa o aplicativo localmente, mas utiliza o backend já publicado.

## 1. Instale os programas necessários

Você precisa ter:

- [Git](https://git-scm.com/downloads)
- [Node.js 22 LTS](https://nodejs.org/)
- [Visual Studio Code](https://code.visualstudio.com/)

Python só é necessário se você também quiser executar o backend localmente.

Confirme a instalação no terminal:

```powershell
git --version
node --version
npm --version
```

## 2. Baixe e abra o projeto

Se você recebeu o endereço do repositório Git:

```powershell
git clone <URL_DO_REPOSITORIO>
cd upa-agora
code .
```

Se a pasta já está no computador, abra o VS Code, selecione **File > Open Folder** e escolha a pasta `upa-agora`.

Todos os comandos do aplicativo devem ser executados na pasta raiz, onde estão `package.json` e `App.tsx`.

## 3. Instale as dependências

Abra o terminal integrado do VS Code com **Terminal > New Terminal** ou com `Ctrl + `` e execute:

```powershell
npm install
```

Esse comando cria a pasta `node_modules`, que não é enviada para o Git porque pode ser reconstruída em qualquer máquina.

## 4. Crie o arquivo de ambiente

Na raiz do projeto, copie `.env.example` para `.env`:

```powershell
Copy-Item .env.example .env
```

O arquivo de exemplo já aponta para o backend publicado:

```env
EXPO_PUBLIC_API_URL=https://backend-roan-five-70.vercel.app
```

O prefixo `EXPO_PUBLIC_` significa que esse valor faz parte do aplicativo. Nunca coloque senhas ou chaves privadas em variáveis com esse prefixo.

## 5. Inicie a versão web

Execute:

```powershell
npm run web -- --clear
```

Na primeira execução o Expo pode levar um pouco mais de tempo para montar o bundle. Aguarde até aparecer no terminal uma linha parecida com:

```text
Web: http://localhost:8081
```

Mantenha esse terminal aberto enquanto estiver trabalhando.

## 6. Abra no navegador integrado do VS Code

O VS Code atual possui um navegador integrado e não precisa de extensão para abrir o app.

1. Pressione `Ctrl + Shift + P` para abrir a Command Palette.
2. Procure por **Browser: Open Integrated Browser**.
3. Digite `http://localhost:8081` na barra de endereço.

Também é possível usar:

- O menu **View > Browser**.
- O atalho `Ctrl + Alt + /` no Windows e Linux.
- O link `http://localhost:8081` exibido no terminal, quando o VS Code estiver configurado para abrir links locais no navegador integrado.

Em versões antigas do VS Code, o comando pode aparecer como **Simple Browser: Show**.

### Localização no navegador

No navegador, a localização ou o geocoding reverso podem não estar disponíveis. Isso não impede o desenvolvimento:

1. Clique no botão **Estado** no topo do aplicativo.
2. Escolha uma UF.
3. O app carregará as unidades cadastradas daquele estado.

Quando existem coordenadas disponíveis, as unidades são ordenadas por distância. Sem coordenadas, o app apresenta a lista do estado sem afirmar qual é a mais próxima.

---

# A pasta `.expo` não existe. O que fazer?

Isso é **normal em um projeto recém-clonado**.

A pasta `.expo` contém informações temporárias da máquina de cada desenvolvedor. Por esse motivo, ela está no `.gitignore` e não deve ser enviada para o repositório.

Você não precisa criar `.expo` manualmente. O Expo cria a pasta automaticamente quando o servidor de desenvolvimento é iniciado.

Na raiz do projeto, execute:

```powershell
npm install
npm run web -- --clear
```

Ou, para iniciar o Expo sem escolher uma plataforma imediatamente:

```powershell
npx expo start --clear
```

Depois que o Metro iniciar, a pasta `.expo` será criada automaticamente.

Se ela ainda não aparecer:

1. Confirme que o terminal está na pasta que contém `package.json`.
2. Confirme que `npm install` terminou sem erros.
3. Feche outros processos usando a porta 8081.
4. Execute `npx expo start --clear` novamente.
5. Verifique se o antivírus ou as permissões da pasta estão impedindo a criação de arquivos.

Não copie a pasta `.expo` de outro colega: ela contém estado específico da máquina dele e não é uma dependência do projeto.

---

# Como rodar o backend localmente

Esta parte é necessária apenas para quem vai alterar a API, o processamento do CNES, os horários ou o assistente.

Você precisará de **Python 3.11 ou superior**.

## 1. Crie o ambiente Python

Abra um novo terminal do VS Code:

```powershell
cd backend
python -m venv .venv
```

Não é obrigatório ativar o ambiente virtual. Os comandos abaixo chamam o Python correto diretamente.

## 2. Instale o backend e as dependências de desenvolvimento

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

## 3. Libere o frontend local no CORS

O backend fecha o CORS por padrão. Antes de iniciá-lo, informe quais endereços locais podem fazer requisições:

```powershell
$env:CORS_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"
```

Essa variável vale apenas para o terminal atual.

## 4. Ative as integrações privadas (opcional)

O assistente responde por regras fixas mesmo sem nenhuma chave, e a lista de
unidades funciona só com o cadastro do CNES. As duas integrações abaixo são
opcionais e **ficam apenas no ambiente do backend**.

Para as respostas redigidas pelo GPT-5.6 Luna, crie uma chave em
[OpenAI API keys](https://platform.openai.com/api-keys):

```powershell
$env:OPENAI_API_KEY = "SUA_CHAVE_PRIVADA"
$env:OPENAI_MODEL = "gpt-5.6-luna"
$env:OPENAI_REASONING_EFFORT = "low"
```

`low` prioriza uma resposta rápida e econômica para o chat. Também são aceitos
`none`, `medium`, `high`, `xhigh` e `max`. Esforços maiores gastam mais tokens
por resposta, porque o teto de saída acompanha o esforço configurado.

Para o cálculo de trajeto por ruas, crie uma chave gratuita em
[OpenRouteService](https://openrouteservice.org/dev/#/signup):

```powershell
$env:OPENROUTESERVICE_API_KEY = "SUA_CHAVE_PRIVADA"
$env:OPENROUTESERVICE_TIMEOUT = "8"
```

Sem essa chave, o assistente simplesmente não oferece a ferramenta de rotas ao
modelo e continua respondendo com a distância em linha reta. O plano gratuito
tem cota diária; ao estourá-la o app volta sozinho para a linha reta.

O arquivo `backend/.env.example` serve como referência dos nomes, mas o projeto
não lê um `.env` do backend automaticamente. As variáveis precisam estar no
terminal ou configuradas no serviço de hospedagem.

Nunca envie essas chaves ao Git e nunca use um prefixo `EXPO_PUBLIC_` com elas:
qualquer variável `EXPO_PUBLIC_` fica exposta dentro do aplicativo.

**A resolução de CEP não entra nessa lista.** A BrasilAPI não pede chave nem
cadastro, então `/api/cep/{cep}` funciona sem nenhuma configuração. A única
variável opcional é o timeout:

```powershell
$env:BRASILAPI_TIMEOUT = "6"
```

## 5. Inicie a API

Ainda dentro de `backend`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verifique no navegador:

- Página do serviço: `http://127.0.0.1:8000`
- Documentação da API: `http://127.0.0.1:8000/docs`
- Saúde do serviço: `http://127.0.0.1:8000/health`

## 6. Aponte o aplicativo para o backend local

Volte à raiz do projeto e altere o `.env`:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

Depois reinicie o Expo, pois as variáveis `EXPO_PUBLIC_` são incorporadas ao bundle:

```powershell
npm run web -- --clear
```

Agora o fluxo local fica assim:

```text
Navegador do VS Code
        │
        ▼
Expo Web em localhost:8081
        │
        ▼
FastAPI em 127.0.0.1:8000
        │
        ▼
Cadastro CNES em backend/data/cnes
```

## macOS e Linux

Os comandos equivalentes para o backend são:

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e ".[dev]"
CORS_ORIGINS="http://localhost:8081,http://127.0.0.1:8081" \
  .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

# Como abrir no celular durante o desenvolvimento

Para testar em um celular sem gerar APK, instale o **Expo Go** no aparelho.

Na raiz do projeto, execute:

```powershell
npm run start
```

O terminal mostrará um QR code.

1. Conecte o computador e o celular à mesma rede Wi-Fi.
2. Abra o Expo Go no Android e use **Scan QR code**.
3. No iPhone, leia o QR code com a câmera.

Se a rede bloquear a conexão, tente o modo tunnel:

```powershell
npx expo start --tunnel
```

O tunnel costuma ser mais lento e deve ser usado apenas quando a conexão pela rede local não funcionar.

Se o aplicativo estiver usando um backend local, `127.0.0.1` não funcionará no celular: esse endereço apontaria para o próprio telefone. Nesse caso, use o IP do computador no `.env`, por exemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000
```

Ao iniciar o backend para acesso pelo celular, use:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Talvez seja necessário permitir o Python no Firewall do Windows.

---

# Como gerar um APK para instalar no Android

O caminho mais simples para a equipe é usar o **EAS Build**, que compila o aplicativo nos servidores do Expo. Não é necessário instalar Android Studio ou JDK para esse processo.

> O APK serve para instalar o aplicativo diretamente em um celular ou emulador. Para publicar na Google Play, o formato normalmente utilizado é `.aab`.

## 1. Confirme a configuração

Na raiz do projeto, confira o arquivo `eas.json`. O perfil já preparado para instalação direta é:

```json
{
  "build": {
    "apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://backend-roan-five-70.vercel.app"
      }
    }
  }
}
```

Se o endereço do backend mudar, atualize `EXPO_PUBLIC_API_URL` nesse arquivo antes de gerar o APK. Essa URL é pública; nunca coloque credenciais privadas no `eas.json`.

## 2. Entre na conta Expo

Crie uma conta gratuita em [expo.dev](https://expo.dev/) caso ainda não tenha. Depois, na raiz do projeto, execute:

```powershell
npx eas-cli@latest login
```

Informe o e-mail e a senha da conta Expo.

## 3. Gere o APK

```powershell
npx eas-cli@latest build --platform android --profile apk
```

Na primeira compilação:

1. O EAS pode pedir para vincular ou criar um projeto no Expo. Confirme.
2. Quando perguntar sobre as credenciais Android, escolha gerar uma nova **keystore**.
3. Aguarde o upload e a compilação.

Não feche o terminal antes de o upload terminar. A compilação continuará nos servidores do Expo mesmo que o computador seja desligado depois dessa etapa.

## 4. Baixe e instale no celular

Quando a compilação terminar, o terminal mostrará um link:

1. Abra o link para acessar os detalhes do build.
2. Clique em **Download** ou **Install**.
3. Abra o mesmo link no celular ou leia o QR code mostrado pelo Expo.
4. Baixe o arquivo `.apk`.
5. Abra o arquivo no Android e autorize a instalação de aplicativos dessa fonte, se o sistema solicitar.

O APK gerado com o perfil `apk` é independente do Expo Go e não precisa do Metro aberto.

## Gerar uma nova versão

Antes de distribuir uma atualização, aumente estes valores em `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

- `version` é a versão exibida para as pessoas.
- `versionCode` precisa ser um número inteiro maior a cada nova versão Android.

Depois execute novamente:

```powershell
npx eas-cli@latest build --platform android --profile apk
```

Guia oficial: [gerar APKs com EAS Build](https://docs.expo.dev/build-reference/apk/).

---

# Comandos usados no dia a dia

Execute os comandos do app na raiz do projeto:

| Comando | Para que serve |
|---|---|
| `npm install` | Instala ou atualiza as dependências do projeto |
| `npm run start` | Inicia o Metro e mostra o QR code |
| `npm run web` | Inicia diretamente a versão web |
| `npm run web -- --clear` | Inicia a versão web limpando o cache |
| `npm run android` | Compila e abre a versão Android de desenvolvimento |
| `npm run typecheck` | Verifica os tipos TypeScript |
| `npm run export:web` | Gera a versão web de produção em `dist` |
| `npx eas-cli@latest build --platform android --profile apk` | Gera um APK instalável nos servidores do Expo |

Comandos do backend, executados dentro de `backend`:

| Comando | Para que serve |
|---|---|
| `.venv\Scripts\python.exe -m uvicorn app.main:app --reload` | Inicia a API local |
| `.venv\Scripts\python.exe -m pytest` | Executa os testes do backend |
| `.venv\Scripts\python.exe -m ruff check .` | Verifica o backend em busca de erros e código desatualizado |
| `.venv\Scripts\python.exe scripts/build_cnes_seed.py` | Atualiza o cadastro CNES embarcado |
| `.venv\Scripts\python.exe scripts/smoke_openrouteservice.py` | Verifica a integração de rotas contra a API real |

---

# Testes antes de enviar uma alteração

## Aplicativo

Na raiz:

```powershell
npm run typecheck
```

## Backend

Dentro de `backend`, os testes e o lint:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

```powershell
.\.venv\Scripts\python.exe -m ruff check .
```

O ruff está configurado no `pyproject.toml` com as regras que apontam erro de
verdade — o padrão dele, mais `pyupgrade` e `bugbear`. As regras de estilo puro,
como ordenação de import, ficam de fora de propósito: elas reescreveriam
arquivos que ninguém está tocando e afogariam num diff de formatação o achado
que realmente importa.

Antes de abrir um pull request ou entregar mudanças para outro colega, execute
pelo menos essas três verificações.

## Integrações externas

Os testes acima usam transporte mockado: provam que o nosso código trata bem as
respostas que **assumimos** que cada serviço dá. A BrasilAPI não precisa de
verificação à parte, porque não usa chave e o próprio endpoint `/api/cep/{cep}`
já sai batendo nela.

O OpenRouteService precisa, e só dá para conferir com uma chave real:

```powershell
$env:OPENROUTESERVICE_API_KEY = "SUA_CHAVE_PRIVADA"
.\.venv\Scripts\python.exe scripts\smoke_openrouteservice.py
```

Ele gasta duas chamadas da cota gratuita e verifica geocodificação, matriz de
carro e matriz a pé. A chave é lida do ambiente e nunca aparece na saída.

---

# Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Página de apresentação do backend |
| `GET` | `/health` | Verifica se o serviço está funcionando |
| `GET` | `/api/meta` | Metadados do cadastro e hora do servidor |
| `GET` | `/api/ufs` | Lista os estados disponíveis |
| `GET` | `/api/upas?uf=SP` | Lista unidades de um estado |
| `GET` | `/api/upas/nearby?lat=&lon=&uf=SP` | Lista unidades por proximidade |
| `GET` | `/api/cep/01310100` | Resolve um CEP em origem aproximada |
| `POST` | `/api/chat` | Responde mensagens do assistente |

## Como os dados são carregados

O backend procura os dados nesta ordem:

1. Cache em memória.
2. Cache gravável em disco.
3. Cadastro CNES incluído em `backend/data/cnes`.
4. API pública do CNES, se nenhum dado local estiver disponível.

O cadastro embarcado permite que a API serverless responda rapidamente sem baixar um estado inteiro durante uma requisição.

## Assistente

O assistente sempre possui um modo determinístico, independente de serviços
externos. Quando as integrações privadas estão habilitadas no ambiente do
backend, o GPT-5.6 Luna pode redigir respostas e solicitar cálculos de rota.
Mesmo nesse modo:

- A triagem de emergência acontece antes do modelo.
- O modelo não escolhe coordenadas.
- O modelo também não escolhe o CEP. Ele pode pedir o CEP em texto, mas quem
  extrai e resolve é o backend, a partir da mensagem original. Um CEP inventado
  resolveria para uma cidade real e mandaria alguém ao lugar errado.
- Nomes de unidades só podem vir da ferramenta que consulta o CNES.
- O OpenRouteService recebe apenas a origem e até cinco destinos selecionados pelo backend.
- O modelo recebe o resultado da rota, nunca credenciais privadas.
- O botão “Abrir no Google Maps” usa uma URL universal, sem chave do Google.
- O botão só aparece quando a resposta cita **uma** unidade. Com duas citadas,
  ou nenhuma, não há como saber qual foi a recomendação, e um botão apontando
  para o endereço errado é pior do que botão nenhum.
- O Google só recebe origem e destino quando a pessoa decide abrir esse botão.
- Falhas do OpenRouteService mantêm disponível a distância em linha reta do CNES.
- Falhas da BrasilAPI devolvem o comportamento anterior, sem erro para a pessoa.
- Falhas do modelo voltam para a resposta determinística.
- As requisições usam `store=False`, portanto o backend não pede à API que armazene as respostas.

---

# Como o backend é publicado

O projeto na Vercel se chama `backend` e está ligado a este repositório. Duas
configurações fazem isso funcionar e vale saber delas antes de mexer:

- **Root Directory é `backend`.** O repositório tem o app Expo na raiz e a API
  numa subpasta. Sem esse ajuste, um deploy vindo do GitHub tentaria buildar o
  app Expo como se fosse FastAPI.
- **Por causa disso, o `vercel` roda a partir da raiz do repositório**, não de
  dentro de `backend`. O link fica em `.vercel/` na raiz.

Todo push na `main` publica em produção automaticamente. Para publicar à mão,
da raiz do projeto:

```powershell
vercel deploy --prod
```

Um deploy de preview, que não toca a produção, é o mesmo comando sem `--prod`.
Previews ficam protegidos por login; para consultá-los use `vercel curl <url>`,
que passa pela proteção.

## Variáveis de ambiente

Elas **não** vêm do `.env`: precisam estar cadastradas na Vercel.

```powershell
vercel env ls
vercel env add OPENROUTESERVICE_API_KEY production
```

Depois de adicionar ou mudar qualquer variável é preciso um novo deploy — a
função só lê o valor no momento em que é publicada.

---

# Solução de problemas

## `http://localhost:8081` não abre

- Aguarde o Metro terminar o primeiro bundle.
- Confirme no terminal qual porta foi usada.
- Execute novamente com `npm run web -- --clear`.
- Verifique se outro programa já está usando a porta 8081.

## A pasta `.expo` não aparece

- Execute os comandos na raiz do projeto.
- Rode `npm install` antes do Expo.
- Inicie com `npx expo start --clear`.
- Não crie nem copie `.expo` manualmente.

## O app abre, mas não carrega unidades

- Confira o valor de `EXPO_PUBLIC_API_URL` no `.env`.
- Abra `/health` no endereço do backend.
- Se alterou `.env`, reinicie o Expo com `--clear`.
- Se o backend é local, configure `CORS_ORIGINS` antes de iniciar o Uvicorn.

## O navegador não encontra a localização

Isso pode acontecer na versão web. Escolha o estado manualmente pelo botão no topo da tela.

## O celular não encontra o backend local

- Não use `127.0.0.1` no `.env` do celular.
- Use o IP do computador na rede local.
- Inicie o Uvicorn com `--host 0.0.0.0`.
- Verifique o Firewall do Windows.

## Digitei o CEP e a lista veio sem distância

O CEP foi reconhecido, mas não tem coordenada na base — acontece com parte
deles. O app ainda descobre a UF e a cidade, então a lista aparece; só não há
de onde medir. Escolher outro CEP próximo, ou ativar a localização, resolve.

## O botão “Abrir no Google Maps” não aparece no chat

São três causas possíveis, nesta ordem:

1. `OPENROUTESERVICE_API_KEY` não está no ambiente do backend. Sem ela o
   assistente nem oferece a ferramenta de rotas ao modelo — as respostas
   continuam corretas, só que com distância em linha reta.
2. A resposta citou duas unidades, ou nenhuma. O botão só aparece quando há
   uma única unidade nomeada; com duas, não há como saber qual seria o destino.
3. A cota diária gratuita do OpenRouteService acabou. O app volta sozinho para
   a linha reta e o botão reaparece no dia seguinte.

## O app continua usando o endereço antigo da API

O Expo guarda variáveis públicas no bundle. Pare o servidor e execute:

```powershell
npm run web -- --clear
```

---

# Regras para trabalhar em equipe

- Não envie `.env`, `.expo`, `node_modules`, `.venv`, caches ou arquivos de build para o Git.
- Nunca coloque chaves ou senhas no código.
- Preserve o princípio de não inventar tempo de fila.
- Não apresente uma coordenada imprecisa como exata.
- Mantenha a orientação de emergência independente da IA generativa.
- Execute o typecheck e os testes antes de compartilhar mudanças.
- Atualize este README quando o processo de instalação ou execução mudar.

## Documentação oficial útil

- [Começar o desenvolvimento com Expo](https://docs.expo.dev/get-started/start-developing/)
- [Executar projetos Expo na web](https://docs.expo.dev/workflow/web/)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [Navegador integrado do VS Code](https://code.visualstudio.com/docs/debugtest/integrated-browser)
- [Guia oficial do GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6)
- [Function calling na OpenAI Responses API](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenRouteService API](https://openrouteservice.org/dev/)
- [Google Maps URLs sem chave](https://developers.google.com/maps/documentation/urls/get-started?hl=pt-BR)
