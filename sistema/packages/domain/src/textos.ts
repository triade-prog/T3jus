// Textos que a pessoa lê quando algo não dá certo. Escritos para quem usa o sistema:
// dizem o que aconteceu e o que fazer, sem termo técnico.

import type { CodigoErro } from "./erros.ts";

export const TEXTOS_ERRO: Record<CodigoErro, string> = {
  VALIDATION_ERROR: "Confira os campos destacados e tente de novo.",
  UNAUTHORIZED: "Sua sessão terminou. Entre de novo para continuar.",
  INVALID_CREDENTIALS: "E-mail ou senha não conferem.",
  EMAIL_NOT_VERIFIED: "Confirme o seu e-mail pelo link que enviamos antes de entrar.",
  MFA_REQUIRED: "Digite o código do aplicativo autenticador para continuar.",
  FORBIDDEN: "Você não tem acesso a esta ação.",
  ESCRITORIO_REQUIRED: "Escolha o escritório para continuar.",
  NOT_FOUND: "Não encontramos o que você procurou.",
  VERSION_CONFLICT: "Outra pessoa alterou este registro enquanto você editava. Veja a versão nova; o que você escreveu continua aqui.",
  INVALID_TRANSITION: "Esta mudança não vale na situação atual. Atualize a página para ver como está agora.",
  TOKEN_INVALID: "Este link já foi usado ou venceu. Peça um novo.",
  MFA_INVALID: "Código do autenticador não confere. Confira o aplicativo e tente de novo.",
  PASSWORD_WEAK: "Esta senha não serve: ela aparece em listas de senhas vazadas ou é igual à anterior. Escolha outra.",
  RATE_LIMITED: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  INTERNAL_ERROR: "Algo deu errado do nosso lado. Tente de novo em instantes.",
  UPSTREAM_UNAVAILABLE: "O serviço está fora do ar agora. Tente de novo em instantes.",
};

/** Resposta da recuperação de senha: a mesma para conta que existe e para a que não existe (PT-08). */
export const TEXTO_RECUPERACAO_ENVIADA =
  "Se este e-mail tiver acesso ao T3jus, enviamos um link para criar uma senha nova. O link vale por uma hora e só pode ser usado uma vez.";

/** Resposta do pedido de link de acesso: a mesma exista a conta ou não (PT-08). */
export const TEXTO_LINK_ENVIADO =
  "Se este e-mail tiver acesso, enviamos um link para entrar. Ele vale por uma hora e só pode ser usado uma vez.";

/** Motivo de uma recusa do banco (detalhes.motivo), dito para quem usa o Console. */
export const TEXTOS_MOTIVO: Record<string, string> = {
  SEM_SOCIO: "Convide o sócio antes de concluir a implantação.",
  MESMO_ESTAGIO: "O cliente já está neste estágio.",
  JA_SOCIO: "Esta pessoa já é sócia deste escritório.",
  JA_ENTROU: "Esta pessoa já criou a senha e entrou no Portal. Não há convite a reenviar.",
  ARQUIVO_NAO_CHEGOU: "O arquivo não chegou inteiro. Envie de novo.",
  JA_NA_EQUIPE: "Esta pessoa já está na equipe.",
  JA_ATRIBUIDO: "Esta pessoa já atende o cliente com esta função.",
  FUNCAO_NAO_ATRIBUIDA: "Esta pessoa não tem esta função na equipe. Reveja as funções dela antes.",
  ULTIMA_ADMINISTRACAO: "Sempre precisa sobrar alguém com administração.",
  PROPRIA_CONTA: "Você não pode desativar a sua própria conta.",
  SEM_SENHA: "Esta pessoa ainda não criou a senha. Reenvie o convite.",
  SEM_AUTENTICADOR: "Esta pessoa não tem autenticador cadastrado.",
  PROPOSTA_RESPONDIDA: "Esta proposta já foi respondida e não muda mais. Se o cliente quer outra coisa, escreva uma proposta nova.",
  JA_ENVIADA: "Esta proposta já estava marcada como enviada.",
  PROPOSTA_INCOMPLETA: "Complete a proposta antes de marcar como enviada: falta o que está incluído, as condições ou o retorno.",
  PROPOSTA_NAO_ENVIADA: "Marque a proposta como enviada antes de registrar a resposta.",
  PROPOSTA_NAO_ACEITA: "Só a proposta aceita vira contrato. Esta já virou contrato ou ainda não foi aceita.",
  CONTRATO_NAO_ELABORACAO: "A assinatura deste contrato já foi registrada.",
  CONTRATO_ENCERRADO: "Este contrato está encerrado e não muda mais.",
  MES_JA_INFORMADO: "A base deste mês já foi informada por outra pessoa. Recarregue a página para ver o valor.",
  PARCELA_JA_PAGA: "Esta parcela já está paga. Recarregue a página para ver o recebimento.",
  PARCELA_CANCELADA: "Esta parcela foi cancelada no contrato e não recebe mais.",
  CONTA_JA_PAGA: "Esta conta já está paga. Recarregue a página para ver o pagamento.",
  JA_REEMBOLSADA: "Este valor já foi reembolsado. Recarregue a página.",
  NUMERO_JA_CADASTRADO: "Já existe um caso com este número de processo. Procure por ele na lista.",
  MESMA_ETAPA: "O caso já está nesta etapa. Escolha outra.",
  CASO_ENCERRADO: "Este caso já foi encerrado e não muda mais de etapa.",
  CLIENTE_JA_NO_CASO: "Este cliente já está no caso.",
  MOTIVO_OBRIGATORIO: "Escreva o motivo da mudança. Ele fica só para a equipe.",
  PRAZO_JA_CUMPRIDO: "Este prazo já foi marcado como cumprido. Recarregue a página.",
  TAREFA_JA_CONCLUIDA: "Esta tarefa já foi concluída. Recarregue a página.",
  TAREFA_ABERTA: "Esta tarefa já está aberta. Recarregue a página.",
  TAREFA_NAO_ESPERA: "Esta tarefa não está esperando ninguém. Recarregue a página.",
  ETAPA_NOME_REPETIDO: "Já existe uma etapa com esse nome. Escolha outro.",
  ETAPA_FINAL_FIXA: "A última etapa é sempre a final: ela não muda de lugar nem sai da lista.",
  ETAPAS_DEMAIS: "O escritório pode ter até 30 etapas.",
  ETAPAS_DE_MENOS: "O escritório precisa de pelo menos uma etapa além da final.",
  RESULTADO_OBRIGATORIO: "Diga como o caso terminou: ganho, perda ou acordo.",
  DOCUMENTO_JA_CHEGOU: "Este documento já chegou. Recarregue a página.",
};

/** Convite enviado para quem já tinha conta: nenhum e-mail novo sai, o acesso aparece no próximo login. */
export const TEXTO_CONVITE_CONTA_EXISTENTE =
  "Esta pessoa já tem conta no T3jus. O novo acesso aparece para ela na próxima vez que entrar.";
export const TEXTO_CONVITE_ENVIADO =
  "Convite enviado. A pessoa recebe um e-mail para criar a senha; o link vale por uma hora e só pode ser usado uma vez.";
