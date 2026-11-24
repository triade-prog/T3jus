import { describe, expect, it } from "vitest";
import { TIPO_TERMO_CURATELA, TIPO_TERMO_TUTELA } from "@t3jus/domain";
import { rascunhoVazio, TIPOS_NO_SELETOR } from "./clientes.ts";
import { tipoDoTermoDoPainel, type TermoAoSalvar } from "./FormCliente.tsx";
import {
  casoDoTermoQueFalhou, codigoDoErroDoTermo, descricaoArquivoTermo, erroDoCodigoDoTermo, fichaMudou, fraseDoTermoQueFalhou, metaTermoNaFicha,
  tipoDoTermoNoEndereco,
} from "./termoCuratela.ts";

describe("F3.118: a linha do arquivo do termo, sem as páginas", () => {
  it("no formulário: PDF ou foto e o tamanho", () => {
    expect(descricaoArquivoTermo("termo-curatela-sebastiao.pdf", "application/pdf", 380 * 1024)).toBe("PDF · 380 KB");
    expect(descricaoArquivoTermo("termo.jpg", "image/jpeg", 1.2 * 1024 * 1024)).toBe("Foto · 1,2 MB");
    // Sem o tipo do navegador, vale a extensão.
    expect(descricaoArquivoTermo("termo.png", "", 2048)).toBe("Foto · 2 KB");
  });

  it("na ficha: o nome, quem enviou e o dia em São Paulo (na virada do dia UTC)", () => {
    expect(metaTermoNaFicha({ nome: "termo-curatela-sebastiao.pdf", enviadoPor: { id: "p", nome: "Paula Nunes" }, enviadoEm: "2026-11-06T01:30:00Z" }))
      .toBe("termo-curatela-sebastiao.pdf · enviado por Paula Nunes em 05/11");
    expect(metaTermoNaFicha({ nome: "t.pdf", enviadoPor: null, enviadoEm: "2026-11-05T15:00:00Z" })).toBe("t.pdf · enviado em 05/11");
  });
});

describe("F3.118: o código do erro do envio vai e volta pelo endereço", () => {
  it("o motivo tem prioridade; o código da API vale sem motivo", () => {
    expect(codigoDoErroDoTermo({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "ARQUIVO_NAO_CHEGOU" } })).toBe("ARQUIVO_NAO_CHEGOU");
    expect(codigoDoErroDoTermo({ codigo: "UPSTREAM_UNAVAILABLE" })).toBe("UPSTREAM_UNAVAILABLE");
    expect(erroDoCodigoDoTermo("UPSTREAM_UNAVAILABLE")).toEqual({ codigo: "UPSTREAM_UNAVAILABLE" });
    expect(erroDoCodigoDoTermo("CLIENTE_NAO_CURATELA")).toEqual({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_NAO_CURATELA" } });
  });

  it("o que não é código é ignorado", () => {
    expect(erroDoCodigoDoTermo("<script>")).toBeNull();
    expect(erroDoCodigoDoTermo(null)).toBeNull();
  });
});

describe("M7: salvar só com o termo novo não diz que a ficha mudou", () => {
  it("compara o rascunho antes e depois", () => {
    const antes = rascunhoVazio("PF");
    expect(fichaMudou(antes, { ...antes })).toBe(false);
    expect(fichaMudou(antes, { ...antes, curProcesso: "1004587-22.2025.8.26.0100" })).toBe(true);
    expect(fichaMudou(antes, { ...antes, rlMoraJunto: !antes.rlMoraJunto })).toBe(true);
  });
});

describe("M8: os seletores de Documentos pessoais não oferecem o termo", () => {
  it("TIPOS_NO_SELETOR não tem TERMO_CURATELA nem TERMO_TUTELA", () => {
    expect(TIPOS_NO_SELETOR).not.toContain(TIPO_TERMO_CURATELA);
    expect(TIPOS_NO_SELETOR).not.toContain(TIPO_TERMO_TUTELA);
    expect(TIPOS_NO_SELETOR).toContain("RG_CPF");
  });
});

describe("F3.118: o termo que não foi guardado, frase fixa por caso (NOTAS, item 1)", () => {
  const MANDE = " Mande de novo em “Mudar”, na folha Quem assina por Sebastião.";
  // A tabela caso → código → frase do desenho aprovado, código a código, ida e volta pelo endereço.
  const tabela: [string, ReturnType<typeof casoDoTermoQueFalhou>, string][] = [
    ["VALIDATION_ERROR", "ARQUIVO", `O termo de curatela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB.${MANDE}`],
    ["ARQUIVO_NAO_CHEGOU", "CONEXAO", `O termo de curatela não foi guardado: não deu para falar com o T3jus.${MANDE}`],
    ["UPSTREAM_UNAVAILABLE", "CONEXAO", `O termo de curatela não foi guardado: não deu para falar com o T3jus.${MANDE}`],
    ["CLIENTE_NAO_CURATELA", "NAO_CURATELA", "O termo de curatela não foi guardado: Sebastião não está mais sob curatela na ficha."],
    ["UNAUTHORIZED", "SESSAO", "O termo de curatela não foi guardado: sua sessão terminou. Entre de novo para enviar o termo."],
    ["FORBIDDEN", "PERMISSAO", "O termo de curatela não foi guardado: o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos."],
    ["INTERNAL_ERROR", "OUTRO", `O termo de curatela não foi guardado: algo deu errado do nosso lado.${MANDE}`],
    ["RATE_LIMITED", "OUTRO", `O termo de curatela não foi guardado: algo deu errado do nosso lado.${MANDE}`],
    ["NOT_FOUND", "OUTRO", `O termo de curatela não foi guardado: algo deu errado do nosso lado.${MANDE}`],
  ];
  it.each(tabela)("%s → %s", (codigo, caso, frase) => {
    const erro = erroDoCodigoDoTermo(codigo);
    expect(casoDoTermoQueFalhou(erro)).toBe(caso);
    expect(fraseDoTermoQueFalhou(erro, "Sebastião")).toBe(frase);
  });

  it("os erros como saem do envio, antes do endereço", () => {
    // O tipo conferido no navegador antes do envio (sem motivo) e o arquivo que não chegou inteiro.
    expect(casoDoTermoQueFalhou({ codigo: "VALIDATION_ERROR", detalhes: { campos: ["arquivoTipo"] } })).toBe("ARQUIVO");
    expect(casoDoTermoQueFalhou({ codigo: "VALIDATION_ERROR", detalhes: { campos: ["arquivo"], motivo: "ARQUIVO_NAO_CHEGOU" } })).toBe("CONEXAO");
    // Um motivo que não é do arquivo não diz que o arquivo foi recusado.
    expect(casoDoTermoQueFalhou({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_NAO_ATIVO" } })).toBe("OUTRO");
    // Sem código legível no endereço, vale "outro".
    expect(casoDoTermoQueFalhou(erroDoCodigoDoTermo("<script>"))).toBe("OUTRO");
  });

  it("a mensagem do servidor não entra na frase; o nome é o primeiro do cliente", () => {
    const f = fraseDoTermoQueFalhou({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_NAO_CURATELA" } }, "Ana");
    expect(f).toBe("O termo de curatela não foi guardado: Ana não está mais sob curatela na ficha.");
    expect(fraseDoTermoQueFalhou({ codigo: "VALIDATION_ERROR" }, "Ana")).not.toMatch(/Confira os campos/);
  });
});

describe("F3.140: o termo de tutela que não foi guardado, frase fixa por caso (NOTAS, item 3)", () => {
  const MANDE = " Mande de novo em “Mudar”, na folha Quem assina por Davi.";
  const tabela: [string, ReturnType<typeof casoDoTermoQueFalhou>, string][] = [
    ["VALIDATION_ERROR", "ARQUIVO", `O termo de tutela não foi guardado: o arquivo precisa ser PDF ou foto, até 10 MB.${MANDE}`],
    ["ARQUIVO_NAO_CHEGOU", "CONEXAO", `O termo de tutela não foi guardado: não deu para falar com o T3jus.${MANDE}`],
    ["UPSTREAM_UNAVAILABLE", "CONEXAO", `O termo de tutela não foi guardado: não deu para falar com o T3jus.${MANDE}`],
    ["CLIENTE_NAO_TUTELA", "NAO_TUTELA", "O termo de tutela não foi guardado: hoje, na ficha, ninguém assina por Davi como tutora ou tutor."],
    ["UNAUTHORIZED", "SESSAO", "O termo de tutela não foi guardado: sua sessão terminou. Entre de novo para enviar o termo."],
    ["FORBIDDEN", "PERMISSAO", "O termo de tutela não foi guardado: o seu acesso não permite enviar o termo. Fale com quem cuida dos acessos."],
    ["INTERNAL_ERROR", "OUTRO", `O termo de tutela não foi guardado: algo deu errado do nosso lado.${MANDE}`],
  ];
  it.each(tabela)("%s → %s", (codigo, caso, frase) => {
    const erro = erroDoCodigoDoTermo(codigo);
    expect(casoDoTermoQueFalhou(erro)).toBe(caso);
    expect(fraseDoTermoQueFalhou(erro, "Davi", "TUTELA")).toBe(frase);
  });

  it("as frases da curatela não mudam (o tipo padrão é a curatela)", () => {
    const e = erroDoCodigoDoTermo("UPSTREAM_UNAVAILABLE");
    expect(fraseDoTermoQueFalhou(e, "Sebastião")).toBe(fraseDoTermoQueFalhou(e, "Sebastião", "CURATELA"));
    expect(fraseDoTermoQueFalhou(e, "Sebastião")).toMatch(/^O termo de curatela não foi guardado/);
  });

  it("I4: o tipo do termo no endereço é lido por lista fechada; fora dela, a curatela", () => {
    expect(tipoDoTermoNoEndereco("TUTELA")).toBe("TUTELA");
    expect(tipoDoTermoNoEndereco("CURATELA")).toBe("CURATELA");
    expect(tipoDoTermoNoEndereco("tutela")).toBe("CURATELA");
    expect(tipoDoTermoNoEndereco("<script>")).toBe("CURATELA");
    expect(tipoDoTermoNoEndereco(null)).toBe("CURATELA");
    expect(erroDoCodigoDoTermo("CLIENTE_NAO_TUTELA")).toEqual({ codigo: "VALIDATION_ERROR", detalhes: { motivo: "CLIENTE_NAO_TUTELA" } });
  });

  it("I4: o resultado de salvar leva o tipo do termo que o formulário tentou mandar", () => {
    const caiu: TermoAoSalvar = { tipo: "TUTELA", erro: { codigo: "UPSTREAM_UNAVAILABLE" } };
    const subiu: TermoAoSalvar = { tipo: "TUTELA", enviado: true };
    expect(caiu && "erro" in caiu ? fraseDoTermoQueFalhou(caiu.erro, "Davi", caiu.tipo) : null).toMatch(/^O termo de tutela não foi guardado/);
    expect(subiu && "erro" in subiu).toBe(false);
  });
});

describe("F3.140: que termo o painel de quem assina pede", () => {
  const HOJE = "2026-11-23";
  const base = { ...rascunhoVazio("PF"), capacidade: "MENOR" as const, nascimento: "02/05/2015" };
  it("o menor com tutora ou tutor pede o de tutela; com mãe ou pai, nenhum", () => {
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "TUTORA" }, HOJE)).toBe("TUTELA");
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "TUTOR" }, HOJE)).toBe("TUTELA");
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "MAE" }, HOJE)).toBeNull();
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "PAI" }, HOJE)).toBeNull();
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "" }, HOJE)).toBeNull();
  });
  it("com 18 anos pela data, nenhum; a curatela pede o de curatela; a empresa, nenhum", () => {
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "TUTORA", nascimento: "23/11/2008" }, HOJE)).toBeNull();
    expect(tipoDoTermoDoPainel({ ...base, rlPapel: "TUTORA", nascimento: "24/11/2008" }, HOJE)).toBe("TUTELA");
    expect(tipoDoTermoDoPainel({ ...base, capacidade: "CURATELA", rlPapel: "CURADORA" }, HOJE)).toBe("CURATELA");
    expect(tipoDoTermoDoPainel({ ...base, tipo: "PJ", rlPapel: "TUTORA" }, HOJE)).toBeNull();
  });
});
