# Relógio Ponto

Aplicação de controle de ponto em Next.js com Firebase (Auth + Firestore). Registre entrada/saída, múltiplos expedientes no mesmo dia (ex.: almoço), anotações diárias e exporte relatórios em PDF.

## Pré-requisitos

- Node.js 18+
- Conta Firebase com Auth (E-mail/Senha e Google) e Firestore habilitados

## Configuração

1. Copie `.env.local.example` para `.env.local` e preencha com as credenciais do seu projeto Firebase.
2. No Firebase Console:
   - Ative **Authentication** > Sign-in method > **E-mail/Senha** e **Google** (e configure a tela de consentimento OAuth se necessário).
   - Crie um banco **Firestore**.
   - Em **Firestore** > Regras, cole o conteúdo de `firestore.rules` (ou faça o deploy com `firebase deploy --only firestore:rules`).

## Instalação e execução

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Entre com e-mail/senha ou com Google e use o dashboard para registrar entrada/saída e anotações.

## Funcionalidades

- **Dashboard**: Registrar entrada e saída; ver registros do dia; anotações do que foi feito (salvas automaticamente).
- **Relatórios**: Ver por mês totais de horas, resumo por semana e detalhamento por dia.
- **Fechar mês**: Só é possível quando não há expediente em aberto. Escolha o mês e confirme.
- **Exportar PDF**: Gera relatório do mês (resumo, por semana, por dia com batidas e anotações).

## Regras de segurança Firestore

Use o arquivo `firestore.rules` no projeto. Cada usuário só acessa seus próprios documentos em `workDays` e `monthClosures`.
