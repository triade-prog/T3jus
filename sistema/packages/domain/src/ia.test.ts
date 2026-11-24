import { describe, expect, it } from "vitest";
import {
  conferirResposta, decidirAntes, horarioDeAtendimento, dentroDoHorario, finalizarResposta, instrucoesIa, mensagensParaIa, palavraDoEscritorio,
  pedeSemAvisos, planoSemModelo, precisaApresentar, proximoAtendimento, type AtendimentoIa, type ContextoIa, type MensagemIa, type SaidaIa,
} from "./ia.ts";

const config: ContextoIa["config"] = {
  nome: "Assistente virtual do Ribeiro & Matos",
  apresentacao: "Olá! Sou a assistente virtual do escritório Ribeiro & Matos.",
  tom: "CORDIAL",
  assuntos: ["ANDAMENTO_CASO", "COMPROMISSOS"],
  palavras: ["liminar", "busca e apreensão"],
  dias: [1, 2, 3, 4, 5],
  horaInicio: "09:00",
  horaFim: "18:00",
  msgForaHorario: "Nossa equipe atende de segunda a sexta. Uma pessoa vai ver {próximo atendimento}.",
  telefoneUrgencia: null,
  situacao: "LIGADA",
};

const ctx = (extra: Partial<ContextoIa> = {}): ContextoIa => ({
  escritorio: "Ribeiro & Matos",
  config,
  agora: "2026-11-18T10:12",
  feriados: ["2026-11-20"],
  cliente: { nome: "Hélio Batista Corrêa" },
  contato: { nome: "Marta Corrêa", papel: "esposa", principal: false },
  quemResponde: { nome: "Larissa Costa", razao: "CASO" },
  comercial: "Diego Almeida",
  respostas: [{ pergunta: "Endereço", resposta: "Rua Augusta, 1200, sala 4." }],
  dados: { casos: [{ nome: "Corrêa x Rota Sul", etapa: "Instrução", desde: "2026-11-10", texto: "A audiência foi marcada.", quemEscreveu: "Larissa Costa", responsavel: "Larissa Costa" }] },
  ...extra,
});

const cliente = (texto: string): MensagemIa => ({ autor: "CLIENTE", texto });
const saida = (s: Partial<SaidaIa>): SaidaIa => ({ acao: "RESPONDER", texto: "", motivo: null, fonte: null, resolvida: false, naoSoube: null, ...s });

describe("PA-04 horário da equipe", () => {
  it("dentro e fora do horário, com feriado", () => {
    expect(dentroDoHorario(config, "2026-11-18T10:12", [])).toBe(true);
    expect(dentroDoHorario(config, "2026-11-18T18:00", [])).toBe(false);
    expect(dentroDoHorario(config, "2026-11-21T10:00", [])).toBe(false); // sábado
    expect(dentroDoHorario(config, "2026-11-20T10:00", ["2026-11-20"])).toBe(false);
  });
  it("diz quando uma pessoa vai ver", () => {
    expect(proximoAtendimento(config, "2026-11-18T07:30", [])).toBe("hoje, a partir das 9h");
    expect(proximoAtendimento(config, "2026-11-18T21:30", [])).toBe("amanhã, a partir das 9h");
    // Quinta à noite, com o feriado da sexta: segunda.
    expect(proximoAtendimento(config, "2026-11-19T21:30", ["2026-11-20"])).toBe("segunda, 23/11, a partir das 9h");
    expect(proximoAtendimento({ ...config, horaInicio: "08:30" }, "2026-11-21T09:00", [])).toBe("segunda, 23/11, a partir das 8h30");
  });
});

describe("PA-05 antes de chamar a IA", () => {
  const base: Pick<AtendimentoIa, "conversa" | "iaSituacao" | "mensagens" | "contexto"> = {
    conversa: { id: "c", situacao: "IA", versao: 1, nome: null, notaIa: null, pessoaRespondeu: false },
    iaSituacao: "LIGADA",
    mensagens: [cliente("Quando é a audiência?")],
    contexto: ctx(),
  };
  it("fica quieta em conversa com a equipe ou já respondida por uma pessoa", () => {
    expect(decidirAntes({ ...base, conversa: { ...base.conversa, situacao: "EQUIPE" } })).toEqual({ acao: "SILENCIO", razao: "COM_EQUIPE" });
    expect(decidirAntes({ ...base, conversa: { ...base.conversa, pessoaRespondeu: true } })).toEqual({ acao: "SILENCIO", razao: "PESSOA_RESPONDEU" });
    expect(decidirAntes({ ...base, mensagens: [cliente("Oi"), { autor: "IA", texto: "Olá" }] }).acao).toBe("SILENCIO");
  });
  it("desligada ou pausada, passa direto para a equipe", () => {
    expect(decidirAntes({ ...base, iaSituacao: "DESLIGADA" })).toEqual({ acao: "PASSAR", motivo: "IA_DESLIGADA" });
    expect(decidirAntes({ ...base, iaSituacao: "PAUSADA" })).toEqual({ acao: "PASSAR", motivo: "IA_DESLIGADA" });
  });
  it("palavra do escritório passa, sem acento nem maiúscula", () => {
    expect(palavraDoEscritorio("Saiu a LIMINAR!", config.palavras)).toBe("liminar");
    expect(palavraDoEscritorio("teve busca e apreensao hoje", config.palavras)).toBe("busca e apreensão");
    expect(palavraDoEscritorio("eliminar", config.palavras)).toBeNull();
    expect(decidirAntes({ ...base, mensagens: [cliente("e a liminar?")] })).toEqual({ acao: "PASSAR", motivo: "PALAVRA", palavra: "liminar" });
  });
  it("com a IA ligada, atende", () => {
    expect(decidirAntes(base)).toEqual({ acao: "ATENDER" });
  });
});

describe("PT-11 o que a IA recebe", () => {
  it("só os dados de quem escreve e as regras fixas", () => {
    const t = instrucoesIa(ctx());
    expect(t).toContain("Nunca dá opinião jurídica");
    expect(t).toContain("Corrêa x Rota Sul");
    expect(t).toContain("contato autorizado da ficha do cliente Hélio Batista Corrêa");
    expect(t).not.toContain("Compromissos");
  });
  it("F3.139: a parcela com baixa sem receber é assunto da equipe, sem valor e sem dizer que nada está em aberto", () => {
    const parcelas = [{ descricao: "Parcela 3/6", vencimento: "2026-12-10", valor: 50000, falta: 50000, situacao: "A_VENCER" }];
    const t = instrucoesIa(ctx({ dados: { parcelas, parcelasComEquipe: 1 } }));
    expect(t).toContain("uma parcela que é assunto da equipe");
    expect(t).toContain("passe para uma pessoa com o motivo NAO_SOUBE");
    const so = instrucoesIa(ctx({ dados: { parcelas: [], parcelasComEquipe: 2 } }));
    expect(so).toContain("2 parcelas que são assunto da equipe");
    expect(so).not.toContain("Parcelas em aberto: nenhuma.");
    expect(instrucoesIa(ctx({ dados: { parcelas: [] } }))).toContain("Parcelas em aberto: nenhuma.");
    expect(instrucoesIa(ctx({ dados: { parcelas: [], parcelasComEquipe: 0 } }))).not.toContain("assunto da equipe");
  });
  it("número desconhecido não recebe caso e vai para o Comercial", () => {
    const t = instrucoesIa(ctx({ cliente: null, contato: null, dados: {} }));
    expect(t).toContain("número desconhecido");
    expect(t).toContain("passou para Diego Almeida");
    expect(t).not.toContain("Corrêa x Rota Sul");
  });
  it("a conversa vira turnos: cliente é usuário, o resto é assistente", () => {
    const m = mensagensParaIa([
      { autor: "AVISO", texto: "Sua parcela vence amanhã." },
      cliente("Oi"), cliente("Tudo bem?"),
      { autor: "APP", texto: "Oi, aqui é a Larissa" },
      cliente("Ok"),
    ]);
    expect(m.map((x) => x.role)).toEqual(["user", "assistant", "user"]);
    expect(m[0]!.content).toBe("Oi\nTudo bem?");
    expect(m[1]!.content).toContain("[escrito por uma pessoa da equipe]");
  });
});

describe("PA-05 depois da IA", () => {
  it("barra o que vai contra as regras fixas e passa para uma pessoa", () => {
    expect(conferirResposta("Acho que você vai ganhar, as chances são boas.")).toBe("OPINIAO");
    expect(conferirResposta("Posso fazer um desconto de 10%.")).toBe("NEGOCIAR");
    expect(conferirResposta("Garanto que sai até sexta.")).toBe("PROMETER");
    expect(conferirResposta("Sou a advogada do seu caso.")).toBe("FINGIR_PESSOA");
    expect(conferirResposta("A audiência é dia 25, às 14h.")).toBeNull();
    const p = finalizarResposta(saida({ texto: "Garanto que você ganha." }), ctx(), [cliente("Vou ganhar?"), { autor: "IA", texto: "Olá" }]);
    expect(p.passar).toBe("REGRA_FIXA");
    expect(p.barrada).toBe("PROMETER");
    expect(p.enviar).toBe("Vou passar a sua mensagem para Larissa, da equipe do escritório Ribeiro & Matos. A resposta chega por aqui.");
  });
  it("a primeira resposta e a pergunta se é robô dizem que é assistente virtual", () => {
    expect(precisaApresentar([cliente("Oi")])).toBe(true);
    expect(precisaApresentar([cliente("Oi"), { autor: "IA", texto: "Olá" }, cliente("Você é um robô?")])).toBe(true);
    expect(precisaApresentar([cliente("Oi"), { autor: "IA", texto: "Olá" }, cliente("Obrigada")])).toBe(false);
    const p = finalizarResposta(saida({ texto: "A audiência é dia 25, às 14h." }), ctx(), [cliente("Quando é a audiência?")]);
    expect(p.enviar).toBe(`${config.apresentacao}\n\nA audiência é dia 25, às 14h.`);
  });
  it("fora do horário, ao passar, diz quando uma pessoa vai ver", () => {
    const p = finalizarResposta(saida({ acao: "PASSAR", motivo: "PROPOSTA_ACORDO", texto: "Passei para a Dra. Larissa." }),
      ctx({ agora: "2026-11-19T21:30" }), [cliente("Recebi uma proposta"), { autor: "IA", texto: "Olá" }]);
    expect(p.passar).toBe("PROPOSTA_ACORDO");
    expect(p.enviar).toBe("Passei para a Dra. Larissa.\n\nNossa equipe atende de segunda a sexta. Uma pessoa vai ver segunda, 23/11, a partir das 9h.");
    expect(p.foraDoHorario).toBe(true);
  });
  it("o que não soube fica para virar resposta do escritório", () => {
    const p = finalizarResposta(saida({ acao: "PASSAR", motivo: "NAO_SOUBE", texto: "", naoSoube: "Vocês atendem no sábado?" }), ctx(),
      [cliente("Vocês atendem no sábado?"), { autor: "IA", texto: "Olá" }]);
    expect(p.naoSoube).toBe("Vocês atendem no sábado?");
    expect(p.passariaPara).toBe("Larissa Costa");
    expect(p.enviar).toContain("Vou passar a sua mensagem para Larissa");
  });
  it("contato novo vai para o Comercial", () => {
    const p = finalizarResposta(saida({ acao: "PASSAR", motivo: "NAO_SOUBE", texto: "Obrigada, Rafael. Já passei para a equipe." }),
      ctx({ cliente: null, contato: null, dados: {} }), [cliente("Quero entrar com uma ação"), { autor: "IA", texto: "Olá" }, cliente("Rafael, trabalhista")]);
    expect(p.passar).toBe("CLIENTE_NOVO");
    expect(p.passariaPara).toBe("Diego Almeida");
  });
  it("desligada, nada sai: só vai para a equipe", () => {
    const p = planoSemModelo("IA_DESLIGADA", ctx(), [cliente("Oi")]);
    expect(p.enviar).toBeNull();
    expect(p.passar).toBe("IA_DESLIGADA");
  });
});

describe("D5 fora do horário", () => {
  it("preenche {horário de atendimento} com os dias e as horas da IA", () => {
    expect(horarioDeAtendimento({ dias: [1, 2, 3, 4, 5], horaInicio: "09:00", horaFim: "18:00" })).toBe("de segunda a sexta, das 9h às 18h");
    expect(horarioDeAtendimento({ dias: [1, 3], horaInicio: "08:30", horaFim: "12:00" })).toBe("segunda e quarta, das 8h30 às 12h");
    expect(horarioDeAtendimento({ dias: [1, 2, 3, 4, 5, 6, 7], horaInicio: "09:00", horaFim: "18:00" })).toBe("todos os dias, das 9h às 18h");
  });
});

describe("F3.83 pedido de não receber avisos", () => {
  it("reconhece as frases claras, sem diferença de acento", () => {
    for (const t of ["Parem de me mandar cobrança", "não quero mais receber essas mensagens", "Nao me mandem mais aviso", "quero sair dessa lista",
      "pode tirar o meu número?", "Não quero mais esses lembretes", "me descadastra por favor"]) expect(pedeSemAvisos(t), t).toBe(true);
    for (const t of ["Quando é a audiência?", "não recebi o boleto", "pode mandar o carnê?", "não quero perder o prazo", null]) expect(pedeSemAvisos(t), String(t)).toBe(false);
  });
  it("o modelo também conhece o motivo, só para quem é cliente", () => {
    expect(instrucoesIa(ctx())).toContain("(SEM_AVISOS)");
    expect(instrucoesIa(ctx({ cliente: null }))).not.toContain("SEM_AVISOS");
  });
  it("ao passar, não diz que o pedido foi registrado e aponta o atalho à equipe", () => {
    const p = planoSemModelo("SEM_AVISOS", ctx(), [cliente("Oi"), { autor: "IA", texto: "Olá" }, cliente("parem de me mandar mensagem")]);
    expect(p.enviar).toBe("Entendi. Vou passar o seu pedido para Larissa, da equipe do escritório Ribeiro & Matos. A resposta chega por aqui.");
    expect(p.motivoTexto).toContain("Não receber avisos");
    expect(p.passar).toBe("SEM_AVISOS");
  });
});
