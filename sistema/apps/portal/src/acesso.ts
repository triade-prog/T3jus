// Textos da tela de entrar do Portal do advogado (tela aprovada: docs/design/aprovadas/entrar.html).
import type { TextosAcesso, TextosConvite, TextosEntrar, TextosNovaSenha } from "@t3jus/ui";

export const TEXTOS_ACESSO: TextosAcesso = {
  sistema: "Portal do advogado",
  endereco: "app.t3jus.pro",
  frase: {
    sobre: "Gestão para escritórios de advocacia",
    inicial: "O",
    resto: " escritório inteiro,",
    destaque: "num só lugar.",
    texto: "Do primeiro contato ao honorário recebido: conversas, contratos, prazos e financeiro, com a equipe toda olhando para a mesma coisa.",
  },
  areas: [
    { nome: "Comercial", icone: "maleta" },
    { nome: "Contratos", icone: "pena" },
    { nome: "Financeiro", icone: "carteira" },
    { nome: "Jurídico", icone: "balanca" },
  ],
  topo: { texto: "Não é do escritório?", link: "Conheça o T3jus", href: "https://t3jus.pro" },
};

export const TEXTOS_ENTRAR: TextosEntrar = {
  lede: "Use o e-mail cadastrado pelo seu escritório.",
  exemploEmail: "voce@escritorio.adv.br",
  primeiroAcesso: "Abra o convite que chegou no seu e-mail para criar a senha.",
};

// Nova senha e convite (telas aprovadas em 18/11/2026: docs/design/aprovadas/acesso/).
export const TEXTOS_NOVA_SENHA: TextosNovaSenha = {
  exemploEmail: "voce@escritorio.adv.br",
  trocada: "Pronto. A partir de agora, entre com a senha nova.",
};

export const TEXTOS_CONVITE: TextosConvite = {
  sistema: "portal",
  nomeSistema: "Portal do advogado",
  botao: "Criar senha e entrar",
  quemPode: "No Portal, o sócio dono do escritório. É ele quem manda o convite novo.",
  destino: "/escritorio",
};
