// F3.155: a linha nova de "O que é apagado" na janela de exclusão a pedido do titular, pelo desenho
// aprovado em docs/design/aprovadas/portal-exclusao-arquivos (_fonte/f155.py, linha_arquivos).
// F3.156: a despesa adiantada ao cliente, pelo desenho aprovado em
// docs/design/aprovadas/portal-exclusao-despesas (alternativa A; _fonte/f156.py).
// F3.177 (F3.184): a descrição dos lançamentos do sistema antigo, pelo desenho aprovado em
// docs/design/aprovadas/portal-exclusao-historico (alternativa A; _fonte/f177.py, linha_historico,
// guarda e nota_pe).
// F3.181, F3.186, F3.190, C9, F3.179 e F3.193: as linhas, as dicas e o aviso novos, pelo desenho aprovado
// em docs/design/aprovadas/portal-exclusao-contratos-conversas (NOTAS.md; _fonte/f181.py). O cadastro
// não guarda gênero: onde o desenho segue o gênero do cliente, fica o masculino genérico ("outro cliente").
// F3.188 (segunda entrega do mesmo desenho; NOTAS.md, itens 8 a 10): o aviso do outro cadastro com o mesmo
// CPF com a caixa da B' (C7), a mensagem de feito (M3) e a faixa do pedido aberto pelo mesmo CPF (M4).
import type {
  ArquivosParaApagar, ArquivosQueFicam, AssinaPorOutro, CanalPedido, ConversasParaApagar, HistoricoQueFica, LembretesQueSaem, MesmoDocumento, PedidoExclusao,
  PessoaRef, TipoCliente,
} from "@t3jus/domain";
import { CANAIS_PEDIDO, diaBrasilia, reais } from "@t3jus/domain";
import { rotuloSituacao } from "./clientes.ts";

export const EXPLICACAO_UM = "o arquivo é apagado do T3jus. Fica só que existiu: tipo, tamanho e datas, sem o nome do arquivo.";
export const EXPLICACAO_VARIOS = "os arquivos são apagados do T3jus. Fica só que existiram: tipo, tamanho e datas, sem o nome dos arquivos.";

const junta = (p: string[]) => (p.length === 1 ? p[0]! : `${p.slice(0, -1).join(", ")} e ${p[p.length - 1]}`);

/** A linha e a explicação; null sem arquivo ou sem o campo (quem não é a dona). */
export function linhaArquivosParaApagar(a: ArquivosParaApagar | null | undefined): { texto: string; explicacao: string } | null {
  if (!a) return null;
  const docs = Math.max(0, Math.trunc(a.documentos || 0));
  const props = Math.max(0, Math.trunc(a.propostas || 0));
  const partes: string[] = [];
  if (docs) partes.push(docs === 1 ? "o documento pessoal" : `os ${docs} documentos pessoais`);
  // Os dois termos podem coexistir (o de tutela guardado depois da passagem à curatela, ou o contrário).
  if (a.curatela && a.tutela) partes.push("os termos de curatela e de tutela");
  else if (a.curatela) partes.push("o termo de curatela");
  else if (a.tutela) partes.push("o termo de tutela");
  if (props) partes.push(props === 1 ? "o arquivo Word da proposta" : `os arquivos Word das ${props} propostas`);
  if (!partes.length) return null;
  const t = junta(partes);
  const total = docs + (a.curatela ? 1 : 0) + (a.tutela ? 1 : 0) + props;
  return { texto: t[0]!.toUpperCase() + t.slice(1), explicacao: total === 1 ? EXPLICACAO_UM : EXPLICACAO_VARIOS };
}

// ---------------------------------------------------------------------------------------
// F3.156: a despesa adiantada ao cliente e os arquivos dela, que ficam guardados pela lei fiscal.

export type Linha = { texto: string; explicacao: string };
export interface DespesasDoExcluido {
  /** A linha nova de "O que é apagado" (a descrição); null sem despesa. */
  descricao: Linha | null;
  /**
   * O quadro "O que a lei obriga a guardar"; null sem arquivo e sem lançamento do sistema antigo. A
   * linha do histórico vem no fim, depois dos arquivos e da pasta; sem arquivo, o quadro vem só com ela.
   */
  guarda: { arquivos: Linha | null; pasta: Linha | null; historico: Linha | null } | null;
  /** A frase em negrito da faixa do escudo; null mantém "Nada aqui precisa ser guardado por lei.". */
  faixa: string | null;
}

export const PE_GUARDA = "Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).";
export const SEM_DATA = "Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.";

const inteiro = (n: number | undefined) => Math.max(0, Math.trunc(n || 0));
const dma = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const SISTEMA: Record<string, string> = { ASTREA: "do Astrea", ADVBOX_PLANILHA: "do ADVBOX" };

/** F3.177: a linha do quadro com a descrição dos lançamentos do sistema antigo; null sem lançamento. */
export function linhaHistorico(h: HistoricoQueFica | null | undefined): Linha | null {
  if (!h) return null;
  const n = inteiro(h.lancamentos);
  if (!n) return null;
  const d = inteiro(h.detalhes);
  const s = inteiro(h.semData);
  const sis = (h.origem && SISTEMA[h.origem]) || "do sistema antigo";
  const texto = n === 1 ? `A descrição do lançamento ${sis}` : `A descrição dos ${n} lançamentos ${sis}`;
  let sub = "fica como veio na importação";
  if (d) sub += d === 1 ? ", com o detalhe escrito ao dispensar o lembrete de contrato" : ", com os detalhes escritos ao dispensar os lembretes de contrato";
  sub += ". ";
  if (s) {
    sub += n === 1 ? "Ele veio sem data e conta pela data da importação. "
      : s === 1 ? "Um deles veio sem data e conta pela data da importação. "
      : `${s} deles vieram sem data e contam pela data da importação. `;
  }
  // Com lançamento, o servidor sempre manda a data (o sem data conta pela importação).
  if (h.ate) sub += `O T3jus troca sozinho por um texto fixo em ${dma(h.ate)}. `;
  sub += "A data, o valor e se foi pago não mudam.";
  return { texto, explicacao: sub };
}

/** As peças da janela; tudo null sem o campo (quem não é a dona) ou sem despesa nem lançamento do sistema antigo. */
export function despesasDoExcluido(q: ArquivosQueFicam | null | undefined): DespesasDoExcluido {
  const nada = { descricao: null, guarda: null, faixa: null };
  if (!q) return nada;
  const historico = linhaHistorico(q.historico);
  const n = inteiro(q.despesas);
  const a = n ? inteiro(q.arquivos) : 0;
  const c = inteiro(q.comArquivo);
  const p = a ? inteiro(q.pastas) : 0;
  const descricao: Linha | null = !n ? null : n === 1
    ? { texto: "A descrição da despesa adiantada", explicacao: "vira “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro." }
    : { texto: `A descrição das ${n} despesas adiantadas`, explicacao: "viram “Despesa adiantada a cliente excluído”. O valor, as datas e o reembolso continuam no Financeiro." };
  if (!a && !historico) return { descricao, guarda: null, faixa: null };
  const fim = q.ate ? `O T3jus apaga sozinho em ${dma(q.ate)}.` : SEM_DATA;
  const arquivos: Linha | null = !a ? null : a === 1
    ? { texto: "O arquivo da despesa adiantada", explicacao: `a nota, guia, boleto ou comprovante, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. ${fim}` }
    : { texto: c > 1 ? `Os ${a} arquivos das ${c} despesas adiantadas` : `Os ${a} arquivos da despesa adiantada`,
        explicacao: `notas, guias, boletos ou comprovantes, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. ${fim}` };
  const pasta: Linha | null = !p ? null : p === 1
    ? { texto: "A pasta mandada ao contador",
        explicacao: "fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus." }
    : { texto: `As ${p} pastas mandadas ao contador`,
        explicacao: "ficam como foram montadas, com a descrição antiga no nome dos arquivos. As cópias do T3jus saem pela regra do mês de cada pasta; as que o contador recebeu ficam fora do T3jus." };
  const arq = a > 1 || p ? "esses arquivos" : "esse arquivo";
  let faixa: string;
  if (!historico) faixa = `Fora ${arq}, nada aqui precisa ser guardado por lei.`;
  else {
    const desc = inteiro(q.historico?.lancamentos) === 1 && !inteiro(q.historico?.detalhes) ? "essa descrição" : "essas descrições";
    faixa = a ? `Fora ${arq} e ${desc}, nada aqui precisa ser guardado por lei.` : `Fora ${desc}, nada aqui precisa ser guardado por lei.`;
  }
  return { descricao, guarda: { arquivos, pasta, historico }, faixa };
}

// ---------------------------------------------------------------------------------------
// F3.190, C6, C9, F3.179, F3.193, F3.181 e F3.186.

/** Um pedaço de texto da dica; negrito nos nomes. */
export type Pedaco = { texto: string; negrito?: boolean };

/** F3.190: a linha das conversas, logo depois dos contatos; null sem conversa que sai. */
export function linhaConversas(c: ConversasParaApagar | null | undefined): Linha | null {
  const n = inteiro(c?.conversas);
  if (!c || !n) return null;
  let sub = n === 1
    ? "o número, os nomes de quem escreveu e todas as mensagens e arquivos saem, e ela some de Conversas."
    : "os números, os nomes de quem escreveu e todas as mensagens e arquivos saem, e elas somem de Conversas.";
  sub += " Ficam só as datas, quem da equipe atendeu e os momentos (passou, assumiu, devolveu).";
  const f = inteiro(c.naFila);
  if (f) sub += f === 1 ? " A mensagem que ainda ia sair não sai mais." : ` As ${f} mensagens que ainda iam sair não saem mais.`;
  const a = inteiro(c.automacoes);
  if (a) sub += a === 1 ? " A automação em andamento para." : ` As ${a} automações em andamento param.`;
  return { texto: n === 1 ? "A conversa do WhatsApp" : `As ${n} conversas do WhatsApp`, explicacao: sub };
}

/**
 * C6: a dica da conversa que fica, porque guarda o registro de outro cliente. Vai dentro da linha das
 * conversas; sem conversa que sai, dentro da linha dos contatos. null sem conversa que fica.
 */
export function dicaConversasQueFicam(c: ConversasParaApagar | null | undefined, nome: string): Pedaco[] | null {
  const k = inteiro(c?.ficam);
  if (!c || !k) return null;
  const nomes = (c.ficamCom ?? []).map((x) => x.nome);
  const mais = inteiro(c.ficamComMais);
  if (mais) nomes.push(`mais ${mais} ${mais === 1 ? "cliente" : "clientes"}`);
  // Sem o nome (não deveria acontecer: a conversa fica justamente por causa de outro cliente).
  if (!nomes.length) nomes.push("outro cliente");
  const outro = nomes.length === 1 && !mais ? "outro cliente" : "outros clientes";
  return k === 1
    ? [{ texto: "1 conversa fica como está, com as mensagens, porque guarda o registro de " }, { texto: junta(nomes), negrito: true },
       { texto: `, ${outro}. As mensagens de ${nome} nessa conversa também ficam.` }]
    : [{ texto: `${k} conversas ficam como estão, com as mensagens, porque guardam o registro de ` }, { texto: junta(nomes), negrito: true },
       { texto: `, ${outro}. As mensagens de ${nome} nessas conversas também ficam.` }];
}

/** C9: a dica dentro da linha da qualificação; null sem ninguém. */
export function dicaAssinaPorOutro(lista: AssinaPorOutro[] | null | undefined, nome: string): Pedaco[] | null {
  if (!lista?.length) return null;
  // O gênero de quem assina vem do papel (mãe, tutora); pela empresa não diz, e aí vai o nome.
  const fem = [...new Set(lista.map((x) => x.feminino).filter((x): x is boolean => x !== null))];
  const dela = fem.length === 1 && lista.every((x) => x.feminino !== null) ? (fem[0] ? "dela" : "dele") : `de ${nome}`;
  const p: Pedaco[] = [{ texto: `${nome} também assina por ` }];
  if (lista.length === 1) {
    const o = lista[0]!;
    const dele = o.tipo === "PJ" ? "dela" : "dele";
    p.push({ texto: o.nome, negrito: true },
      { texto: `, ${o.papel}. O nome e o CPF ${dela} continuam na ficha ${dele}, porque servem ao contrato e à procuração ${dele}.` });
    return p;
  }
  lista.forEach((o, i) => {
    if (i) p.push({ texto: i === lista.length - 1 ? " e " : ", " });
    p.push({ texto: o.nome, negrito: true }, { texto: ` (${o.papel})` });
  });
  p.push({ texto: `. O nome e o CPF ${dela} continuam nessas fichas, porque servem aos contratos e às procurações delas.` });
  return p;
}

/** F3.179: a linha do "sobre" do êxito; null sem proposta com ele. */
export function linhaSobre(numeros: string[] | null | undefined): Linha | null {
  if (!numeros?.length) return null;
  return {
    texto: numeros.length === 1 ? `Sobre o que se cobra o êxito, na proposta ${numeros[0]}` : `Sobre o que se cobra o êxito, nas propostas ${junta(numeros)}`,
    explicacao: "o texto livre, como “dos atrasados que a cliente receber”, vira “Base apagada a pedido do titular”. O percentual e as outras condições ficam como estão.",
  };
}

/** F3.193: a linha da explicação da baixa sem receber; null sem baixa. */
export function linhaBaixas(n: number | null | undefined): Linha | null {
  const k = inteiro(n ?? 0);
  if (!k) return null;
  return k === 1
    ? { texto: "A explicação da baixa sem receber", explicacao: "vira “Explicação apagada a pedido do titular”. A parcela, o valor e a data da baixa continuam no Financeiro." }
    : { texto: `As explicações das ${k} baixas sem receber`, explicacao: "viram “Explicação apagada a pedido do titular”. A parcela, o valor e a data da baixa continuam no Financeiro." };
}

/**
 * F3.181: o pedido de contrato que sai de Contratos. Na janela de excluir, em "O que fica, sem dado
 * pessoal" (antes da origem); na de arquivar, em "O que acontece" (antes de "O pedido fica registrado").
 */
export function linhaPedidosContrato(numeros: string[] | null | undefined, onde: "fica" | "arquivar"): Linha | null {
  if (!numeros?.length) return null;
  const n = numeros.length;
  if (onde === "arquivar") {
    const fim = "Cliente arquivado não ganha contrato novo, e ninguém consegue pedir de novo.";
    return n === 1
      ? { texto: `O pedido de contrato da proposta ${numeros[0]} sai de Contratos`, explicacao: `a proposta fica no Comercial, aceita, como registro. ${fim}` }
      : { texto: `Os ${n} pedidos de contrato (${junta(numeros)}) saem de Contratos`, explicacao: `as propostas ficam no Comercial, aceitas, como registro. ${fim}` };
  }
  const marcas = "com “Cliente excluído” e “Serviço apagado a pedido do titular”.";
  return n === 1
    ? { texto: `A proposta ${numeros[0]}, sem o pedido de contrato`,
        explicacao: `fica no Comercial como registro, ${marcas} O pedido sai de Contratos, porque cliente excluído não ganha contrato.` }
    : { texto: `As propostas ${junta(numeros)}, sem os pedidos de contrato`,
        explicacao: `ficam no Comercial como registro, ${marcas} Os pedidos saem de Contratos, porque cliente excluído não ganha contrato.` };
}

const NO_SISTEMA: Record<string, string> = { ASTREA: "no Astrea", ADVBOX_PLANILHA: "no ADVBOX" };
const DO_SISTEMA_LEMBRETE: Record<string, string> = { ASTREA: "do Astrea", ADVBOX_PLANILHA: "do ADVBOX" };

/** F3.186 (C10 a): o aviso do valor em aberto, no topo da janela de excluir; null sem lembrete aberto. */
export function avisoLembrete(l: LembretesQueSaem | null | undefined, nome: string): { titulo: string; texto: string } | null {
  const n = inteiro(l?.n);
  if (!l || !n) return null;
  const valor = inteiro(l.valor);
  const no = (l.origem && NO_SISTEMA[l.origem]) || "no sistema antigo";
  const titulo = !valor
    ? n === 1 ? `Há um lembrete de contrato ${(l.origem && DO_SISTEMA_LEMBRETE[l.origem]) || "do sistema antigo"}, sem valor.`
      : `Há ${n} lembretes de contrato ${(l.origem && DO_SISTEMA_LEMBRETE[l.origem]) || "do sistema antigo"}, sem valor.`
    : n === 1 ? `Há ${reais(valor)} em aberto ${no}.` : `Há ${reais(valor)} em aberto ${no}, em ${n} lembretes de contrato.`;
  const lanc = inteiro(l.lancamentos);
  const qual = n === 1 ? `É o lembrete de contrato de ${nome}, com ${lanc === 1 ? "1 lançamento" : `${lanc} lançamentos`}. ` : "";
  return {
    titulo,
    texto: `${qual}Depois da exclusão, não dá mais para saber de quem é esse valor, e o lembrete sai de Contratos › Lembretes. Se o escritório vai cobrar, crie o contrato antes: aí o pedido se atende arquivando, sem apagar.`,
  };
}

// ---------------------------------------------------------------------------------------
// F3.188: o outro cadastro com o mesmo CPF (C7 na B', C8, M3 e M4).

const ddmmaaaa = (iso: string) => dma(diaBrasilia(iso));
const ddmm = (iso: string) => dma(diaBrasilia(iso)).slice(0, 5);
const doc = (tipo: TipoCliente) => (tipo === "PJ" ? "CNPJ" : "CPF");

/** O texto da caixa da B' e a explicação dela. */
export const CAIXA_MESMO_DOCUMENTO = "Com a mesma data e o mesmo canal. Depois você confere se é a mesma pessoa e atende ou recusa. Desmarque só se tiver certeza de que é outra pessoa.";

/** A situação do outro cadastro: "Ativo, cliente desde 03/02/2025, sem contrato nem processo." */
export function situacaoMesmoDocumento(o: MesmoDocumento): string {
  let t = `${rotuloSituacao(o.situacao)}, cliente desde ${ddmmaaaa(o.desde)}`;
  if (o.contratoOuProcesso) t += ". Tem contrato ou processo: o pedido dele vira arquivamento";
  else if (o.situacao !== "ARQUIVADO") t += ", sem contrato nem processo";
  return `${t}.`;
}

/** O outro cadastro pode ganhar o pedido (a caixa aparece): ativo ou inativo, sem pedido aberto. */
export const temCaixa = (o: MesmoDocumento) => !o.pedidoAberto && o.situacao !== "ARQUIVADO";

/** Os ids que vêm marcados ao abrir a janela (a B': a caixa já vem marcada). */
export const marcadosAoAbrir = (lista: MesmoDocumento[] | null | undefined): string[] => (lista ?? []).filter(temCaixa).map((o) => o.id);

export interface AvisoMesmoDocumento {
  titulo: string;
  texto: string;
  /** Um cadastro só: a caixa no próprio aviso; dois ou mais: um cartão por cadastro. */
  varios: boolean;
  cadastros: { o: MesmoDocumento; situacao: string; caixa: string | null; sem: string; ja: string | null }[];
}

/** F3.188 (C7 na B', C8): o aviso do topo das janelas de excluir e de arquivar; null sem outro cadastro. */
export function avisoMesmoDocumento(lista: MesmoDocumento[] | null | undefined, mais: number | null | undefined, tipo: TipoCliente,
                                    modo: "excluir" | "arquivar"): AvisoMesmoDocumento | null {
  if (!lista?.length) return null;
  const d = doc(tipo);
  const acao = modo === "excluir" ? "Esta exclusão" : "Este arquivamento";
  const k = inteiro(mais ?? 0);
  if (lista.length === 1 && !k) {
    const o = lista[0]!;
    return {
      titulo: `Há outro cadastro com o mesmo ${d}: ${o.nome}.`,
      texto: `${situacaoMesmoDocumento(o)} ${acao} não mexe nele. Quase sempre é a mesma pessoa cadastrada duas vezes, mas pode ser outra pessoa com o ${d} errado.`,
      varios: false,
      cadastros: [{
        o, situacao: situacaoMesmoDocumento(o),
        caixa: temCaixa(o) ? `Abrir também um pedido de exclusão no cadastro de ${o.nome}` : null,
        sem: `Sem o pedido, o cadastro de ${o.nome} fica como está. Se for outra pessoa, o ${d} de um dos dois está errado: corrija na ficha certa.`,
        ja: o.pedidoAberto ? "Ele já tem um pedido de exclusão aberto." : null,
      }],
    };
  }
  const nomes = lista.map((o) => o.nome);
  if (k) nomes.push(`mais ${k} ${k === 1 ? "cadastro" : "cadastros"}`);
  return {
    titulo: `Há ${lista.length + k} outros cadastros com o mesmo ${d}: ${junta(nomes)}.`,
    texto: `${acao} não mexe neles. Confira cada um: quase sempre é a mesma pessoa cadastrada mais de uma vez, mas pode ser outra pessoa com o ${d} errado.`,
    varios: true,
    cadastros: lista.map((o) => ({
      o, situacao: situacaoMesmoDocumento(o),
      caixa: temCaixa(o) ? "Abrir também um pedido de exclusão neste cadastro" : null,
      sem: `Sem o pedido, este cadastro fica como está. Se for outra pessoa, o ${d} de um dos dois está errado: corrija na ficha certa.`,
      ja: o.pedidoAberto ? "Já tem um pedido de exclusão aberto." : null,
    })),
  };
}

/**
 * F3.188 (M3): o texto de feito. Com outro cadastro com pedido aberto, não manda mais dizer ao cliente que
 * o pedido foi atendido; sem ele, é o texto de antes.
 */
export function textoFeitoExclusao(protocolo: string, outros: PessoaRef[] | null | undefined, modo: "excluir" | "arquivar"): string {
  if (!outros?.length) {
    return modo === "excluir"
      ? `Protocolo ${protocolo}. Informe ao cliente que o pedido foi atendido. O registro ficou no histórico do escritório.`
      : `Protocolo ${protocolo}. Informe ao cliente que o pedido foi atendido arquivando, e por quê. Nada foi apagado.`;
  }
  const um = outros.length === 1;
  const t = um
    ? `Protocolo ${protocolo}. Antes de responder ao cliente, confira o cadastro de ${outros[0]!.nome}, que ficou com um pedido de exclusão aberto. O pedido só está atendido por inteiro quando ele também for resolvido.`
    : `Protocolo ${protocolo}. Antes de responder ao cliente, confira os cadastros de ${junta(outros.map((o) => o.nome))}, que ficaram com um pedido de exclusão aberto. O pedido só está atendido por inteiro quando eles também forem resolvidos.`;
  return modo === "excluir" ? t : `${t} Nada foi apagado.`;
}

/**
 * F3.188 (M4): a faixa do pedido aberto pelo mesmo CPF na ficha do outro cadastro. Sem protocolo, sem o
 * cadastro excluído e sem a observação (A1). Para a equipe, neutra. null no pedido comum.
 */
export function faixaPedidoMesmoDocumento(p: PedidoExclusao | null | undefined, opcoes: {
  tipo: TipoCliente; dona: boolean; eu: string | null; nomeDona: string | null; arquivar: boolean;
}): { titulo: string; texto: string } | null {
  if (!p || p.origem !== "MESMO_DOCUMENTO") return null;
  const d = doc(opcoes.tipo);
  const em = ddmm(p.registradoEm);
  if (!opcoes.dona) {
    return {
      titulo: `Pedido de exclusão aberto em ${em}, aguardando a sócia dona.`,
      texto: `${opcoes.nomeDona ? `${opcoes.nomeDona}, a sócia dona, vai` : "A sócia dona vai"} conferir este cadastro e decidir. Até lá, nada muda na ficha.`,
    };
  }
  const quem = opcoes.eu && p.registradoPor.nome === opcoes.eu ? "Você" : p.registradoPor.nome;
  const canal = CANAIS_PEDIDO[p.canal as CanalPedido] ?? p.canal;
  const se = opcoes.arquivar ? "Se for, arquive a pedido, porque há contrato ou processo." : "Se for, exclua os dados.";
  return {
    titulo: `Pedido de exclusão aberto em ${em}, ao atender outro cadastro com o mesmo ${d}.`,
    texto: `${quem} atendeu o pedido de exclusão de outro cadastro com o mesmo ${d}, e este ficou com um pedido aberto, com a mesma data e o mesmo canal (${canal}). Confira se é a mesma pessoa. ${se} Se não for, recuse o pedido e corrija o ${d} na ficha certa.`,
  };
}
