// Textos da tela de entrar do Console T3jus: a mesma tela aprovada do Portal
// (docs/design/aprovadas/entrar.html), com o que muda para a equipe T3jus.
import type { TextosAcesso, TextosConvite, TextosEntrar, TextosNovaSenha } from "@t3jus/ui";

export const TEXTOS_ACESSO: TextosAcesso = {
  sistema: "Console T3jus",
  endereco: "console.t3jus.pro",
  frase: {
    sobre: "Sistema interno da equipe T3jus",
    inicial: "A",
    resto: " carteira inteira,",
    destaque: "num só lugar.",
    texto: "Cadastro, implantação e acompanhamento dos escritórios clientes, com a equipe toda olhando para a mesma coisa.",
  },
  areas: [
    { nome: "Clientes", icone: "escritorios" },
    { nome: "Comercial", icone: "maleta" },
    { nome: "Financeiro", icone: "carteira" },
    { nome: "Suporte", icone: "ajuda" },
  ],
  topo: { texto: "É de um escritório?", link: "Entre pelo Portal do advogado", href: "https://app.t3jus.pro/entrar" },
};

export const TEXTOS_ENTRAR: TextosEntrar = {
  lede: "Só a equipe T3jus entra aqui, sempre com o aplicativo autenticador.",
  exemploEmail: "voce@t3jus.pro",
  primeiroAcesso: "Abra o convite que chegou no seu e-mail para criar a senha. Depois, cadastre o autenticador.",
};

// Nova senha e convite (telas aprovadas em 18/11/2026: docs/design/aprovadas/acesso/).
export const TEXTOS_NOVA_SENHA: TextosNovaSenha = {
  exemploEmail: "voce@t3jus.pro",
  trocada: "Pronto. Para entrar, use a senha nova e o código do autenticador.",
};

export const TEXTOS_CONVITE: TextosConvite = {
  sistema: "console",
  nomeSistema: "Console T3jus",
  botao: "Criar senha e seguir",
  quemPode: "No Console, quem cuida da equipe T3jus. É essa pessoa quem manda o convite novo.",
  destino: "/",
};
