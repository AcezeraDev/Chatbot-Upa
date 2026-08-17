# UPA Agora

Protótipo acadêmico mobile para apresentar tempos fictícios de espera em UPAs e responder perguntas em um chat demonstrativo.

## O que está pronto

- App React Native/Expo com telas simples de início, assistente e explicação do projeto.
- Interface propositalmente enxuta, modo claro e escuro e layout adaptável.
- Modo demonstrativo local: o APK funciona mesmo sem o backend.
- Backend FastAPI parcial com endpoints de unidades, melhor espera, chat determinístico e health check.
- Testes automatizados do contrato da API.

## Executar o app

```abrir o terminal

rode npm.cmd run web

ira mostrar algo parecido com: http://localhost:8081

Pressione Ctrl + Shift + P.

Procure por Browser: Open Integrated Browser.

Cole o endereço apresentado pelo Expo.

depois so ajustar a tela do navegador para parecer uma tela de ceular```

## Instalar o APK de demonstração

O APK Android pronto está em `output/android/upa-agora-demo.apk`. O QR Code em
`output/android/upa-agora-qr.png` aponta para um servidor local de download; por
isso, o celular e o computador precisam estar na mesma rede Wi-Fi e o servidor
precisa estar em execução.

No celular, pode ser necessário permitir temporariamente a instalação de apps
desconhecidos para o navegador usado no download.

## Executar o backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Para conectar o aplicativo ao backend, inicie o Expo com a variável apontando para o IP do computador na rede local:

```powershell
$env:EXPO_PUBLIC_API_URL='http://SEU_IP:8000'
npm start
```

Sem essa variável, o aplicativo utiliza automaticamente dados fictícios internos.

## Limites do protótipo

Não há banco PostgreSQL, geolocalização, autenticação, LLM ou dados reais de saúde nesta versão. Os tempos exibidos são exclusivamente demonstrativos.
