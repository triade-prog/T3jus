// Passo 1 no Console T3jus: as rotas validam a entrada, deixam a permissão para o banco
// (PT-24) e só convidam pelo Auth depois de o banco confirmar quem pode (PT-20).
import { assert, assertEquals } from "@std/assert";
import { FUNCOES_CONSOLE, SITUACOES, UFS } from "@t3jus/domain";
import { criarApiConsole } from "./app.ts";
import { adminFalso, arquivosFalsos, authFalso, bancoFalso, CODIGO_CERTO, cookieChamado, cookieDe, erro, erroBanco, limitesFalsos, pedido, TOKEN_CONVITE } from "../_shared/teste_util.ts";

const CAROLINA = "0b7c3f0e-5d1a-4c2b-9e8f-1a2b3c4d5e6f";
const IPE = "2d9e5b20-7f3c-4e4d-9a0b-3c4d5e6f7a8b";
const RENATA = "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e";
const VINCULO = "5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9";
const ENTRAR = { email: "carol@t3jus.exemplo", senha: "senha-forte-da-equipe" };

function montar(opcoes: { permissoes?: string[]; contas?: Record<string, string>; handlers?: Record<string, (a: Record<string, unknown>) => unknown> } = {}) {
  const falso = authFalso([
    { id: CAROLINA, email: ENTRAR.email, senha: ENTRAR.senha },
    { id: "9f0a1b2c-3d4e-4f50-8a6b-7c8d9e0f1a2b", email: "convidada@exemplo.invalid", senha: "x", emailVerificado: false },
  ]);
  const convites = adminFalso(opcoes.contas);
  const storage = arquivosFalsos();
  const db = bancoFalso({
    acesso_console: () => true,
    registrar_acesso: () => 1,
    ...limitesFalsos({ login: 5, autenticador: 10, recuperacao: 3, convite: 2 }),
    console_ficha: () => ({ escritorio: { id: IPE }, socios: [], permissoes: opcoes.permissoes ?? ["console.ficha.ver", "console.socios.convidar"] }),
    console_vincular_socio: () => "5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9",
    console_criar_escritorio: () => IPE,
    console_carteira_cobranca: () => [],
    console_carteira_teste: () => [],
    console_carteira: () => [{
      escritorio_id: IPE, nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", estagio: "IMPLANTACAO",
      funcoes: ["ADMINISTRACAO"], situacoes: ["SEM_SOCIO"], criado_em: "2026-10-16T10:00:00Z",
    }],
    console_editar_ficha: (a) => Number(a.p_versao) + 1,
    console_ficha_salvar: (a) => Number(a.p_versao) + 1,
    console_equipe: () => [],
    console_cadastrar_membro: () => null,
    dados_convite: () => ({ nome: "Inês" }),
    aceitar_convite: () => null,
    ...opcoes.handlers,
  });
  const app = criarApiConsole("segredo-de-repasse-de-teste", {
    banco: db.banco, auth: falso.auth, admin: convites.admin, urlApp: "https://console.exemplo", urlPortal: "https://portal.exemplo", arquivos: storage.arquivos,
  });
  return { pedir: pedido(app, "api-console"), ...falso, ...db, ...convites, ...storage };
}

async function entrar(m: ReturnType<typeof montar>): Promise<string> {
  const aal1 = cookieDe(await m.pedir("/v1/auth/entrar", { corpo: ENTRAR }));
  const { factorId } = await (await m.pedir("/v1/auth/autenticador/cadastrar", { corpo: {}, cookie: aal1 })).json();
  return cookieDe(await m.pedir("/v1/auth/autenticador/verificar", { corpo: { codigo: CODIGO_CERTO, factorId }, cookie: aal1 }));
}

Deno.test("nenhuma rota do passo 1 responde sem a sessão completa", async () => {
  const m = montar();
  for (const rota of ["/v1/clientes", `/v1/clientes/${IPE}`, "/v1/equipe", "/v1/equipe/historico"]) {
    assertEquals((await erro(await m.pedir(rota))).codigo, "UNAUTHORIZED", rota);
  }
  assertEquals(m.chamadas.filter((c) => c.funcao.startsWith("console_")).length, 0);
});

Deno.test("CO-01: a carteira vem do banco, com estágio e situações a tratar", async () => {
  const m = montar();
  const r = await m.pedir("/v1/clientes", { cookie: await entrar(m) });
  const { clientes } = await r.json();
  assertEquals(clientes[0], {
    id: IPE, nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", estagio: "IMPLANTACAO",
    funcoes: ["ADMINISTRACAO"], situacoes: ["SEM_SOCIO"], criadoEm: "2026-10-16T10:00:00Z", cobranca: null, teste: null,
  });
  assertEquals(m.chamadas.find((c) => c.funcao === "console_carteira")?.args, { p_pessoa: CAROLINA });
});

Deno.test("cadastrar escritório: entrada validada antes do banco", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const ruim = await m.pedir("/v1/clientes", { corpo: { nome: "Ipê Advocacia", cidade: "Brasília", uf: "XX" }, cookie });
  assertEquals(await erro(ruim), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["uf"] } });
  assertEquals(m.chamadas.filter((c) => c.funcao === "console_criar_escritorio").length, 0);
  const ok = await m.pedir("/v1/clientes", { corpo: { nome: " Ipê Advocacia ", cidade: "Brasília", uf: "DF" }, cookie });
  assertEquals(ok.status, 201);
  assertEquals(m.chamadas.find((c) => c.funcao === "console_criar_escritorio")?.args, {
    p_pessoa: CAROLINA, p_nome: "Ipê Advocacia", p_cidade: "Brasília", p_uf: "DF",
  });
});

Deno.test("id de cliente fora do formato responde como não encontrado", async () => {
  const m = montar();
  const r = await m.pedir("/v1/clientes/nao-e-um-id", { cookie: await entrar(m) });
  assertEquals(r.status, 404);
});

Deno.test("CO-02: a ficha vai com o CNPJ só em dígitos e o telefone no formato internacional", async () => {
  const m = montar();
  const r = await m.pedir(`/v1/clientes/${IPE}/ficha`, {
    metodo: "PUT",
    cookie: await entrar(m),
    corpo: { versao: 1, nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", cnpj: "11.222.333/0001-81",
             contatos: [{ nome: "Ana", papel: "Sócia", telefone: "61 98888 0000" }] },
  });
  assertEquals(await r.json(), { versao: 2 });
  const args = m.chamadas.find((c) => c.funcao === "console_editar_ficha")!.args;
  assertEquals(args.p_cnpj, "11222333000181");
  assertEquals(args.p_contatos, [{ nome: "Ana", papel: "Sócia", telefone: "+5561988880000" }]);
  assertEquals(args.p_endereco, null);
});

Deno.test("PA-07: a ficha nova manda os dados para os documentos junto, numa chamada só", async () => {
  const m = montar();
  const r = await m.pedir(`/v1/clientes/${IPE}/ficha`, {
    metodo: "PUT",
    cookie: await entrar(m),
    corpo: { versao: 3, nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", cnpj: "11.222.333/0001-81", contatos: [],
             documentos: { tipo: "SOCIEDADE", razaoSocial: "Ipê Sociedade de Advogados", cep: "70000-000", logradouro: "SCS", numero: "10" } },
  });
  assertEquals(await r.json(), { versao: 4 });
  assertEquals(m.chamadas.some((c) => c.funcao === "console_editar_ficha"), false);
  const args = m.chamadas.find((c) => c.funcao === "console_ficha_salvar")!.args;
  const d = args.p_dados as Record<string, unknown>;
  assertEquals([d.razaoSocial, d.cnpj, d.cidade, d.numero], ["Ipê Sociedade de Advogados", "11222333000181", "Brasília", "10"]);
});

Deno.test("PT-19 e CO-02: conflito e CNPJ repetido chegam com os detalhes do banco", async () => {
  const m = montar({
    handlers: {
      console_editar_ficha: (a) => a.p_versao === 1
        ? erroBanco("TC409", { versao: 3, atual: { nome: "Outro" } })
        : erroBanco("TC422", { campos: ["cnpj"] }),
    },
  });
  const cookie = await entrar(m);
  const corpo = { nome: "Ipê Advocacia", cidade: "Brasília", uf: "DF", contatos: [] };
  const conflito = await m.pedir(`/v1/clientes/${IPE}/ficha`, { metodo: "PUT", cookie, corpo: { ...corpo, versao: 1 } });
  assertEquals(conflito.status, 409);
  assertEquals(await erro(conflito), { codigo: "VERSION_CONFLICT", detalhes: { versao: 3, atual: { nome: "Outro" } } });
  const repetido = await m.pedir(`/v1/clientes/${IPE}/ficha`, { metodo: "PUT", cookie, corpo: { ...corpo, versao: 2 } });
  assertEquals(await erro(repetido), { codigo: "VALIDATION_ERROR", detalhes: { campos: ["cnpj"] } });
});

Deno.test("CO-01: ativo não volta para implantação (transição proibida)", async () => {
  const m = montar({ handlers: { console_mudar_estagio: () => erroBanco("TC023") } });
  const r = await m.pedir(`/v1/clientes/${IPE}/estagio`, { metodo: "PUT", cookie: await entrar(m), corpo: { versao: 3, estagio: "IMPLANTACAO", motivo: "Voltar" } });
  assertEquals(r.status, 409);
  assertEquals((await erro(r)).codigo, "INVALID_TRANSITION");
});

Deno.test("CO-01: sem motivo, o estágio não muda", async () => {
  const m = montar();
  const r = await m.pedir(`/v1/clientes/${IPE}/estagio`, { metodo: "PUT", cookie: await entrar(m), corpo: { versao: 3, estagio: "ATIVO", motivo: " " } });
  assertEquals(r.status, 400);
  assertEquals(m.chamadas.some((c) => c.funcao === "console_mudar_estagio"), false);
});

Deno.test("F0.14: encerrar leva a data, o motivo e o nome ao banco; sem motivo, nem chega", async () => {
  const m = montar({ handlers: { console_encerrar_contrato: () => ({ versao: 4, encerramento: { situacao: "CONSULTA" } }) } });
  const cookie = await entrar(m);
  const sem = await m.pedir(`/v1/clientes/${IPE}/encerrar`, { metodo: "POST", cookie, corpo: { versao: 3, fimEm: "2026-11-19", motivo: " ", nomeConfirmado: "Ipê" } });
  assertEquals(sem.status, 400);
  const r = await m.pedir(`/v1/clientes/${IPE}/encerrar`, { metodo: "POST", cookie, corpo: { versao: 3, fimEm: "2026-11-19", motivo: "Distrato", nomeConfirmado: "Ipê" } });
  assertEquals(r.status, 200);
  const ch = m.chamadas.find((c) => c.funcao === "console_encerrar_contrato")!;
  assertEquals(ch.args.p_dados, { fimEm: "2026-11-19", motivo: "Distrato", nomeConfirmado: "Ipê" });
  assertEquals(ch.args.p_versao, 3);
});

Deno.test("F0.14: reabrir pede o motivo e devolve o estágio", async () => {
  const m = montar({ handlers: { console_reabrir_contrato: () => ({ versao: 5, estagio: "ATIVO" }) } });
  const r = await m.pedir(`/v1/clientes/${IPE}/reabrir`, { metodo: "POST", cookie: await entrar(m), corpo: { versao: 4, motivo: "Voltou" } });
  assertEquals(await r.json(), { versao: 5, estagio: "ATIVO" });
});

Deno.test("PT-20: convite do sócio cria a conta e manda o link para o Portal", async () => {
  const m = montar();
  const r = await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie: await entrar(m), corpo: { nome: "Ana Souza", email: "Ana@Exemplo.invalid" } });
  assertEquals(r.status, 201);
  assertEquals((await r.json()).contaNova, true);
  assertEquals(m.enviados, [{ email: "ana@exemplo.invalid", voltarPara: "https://portal.exemplo/criar-senha" }]);
  const args = m.chamadas.find((c) => c.funcao === "console_vincular_socio")!.args;
  assertEquals(args.p_convidado, m.contas["ana@exemplo.invalid"]);
  assertEquals(args.p_nome, "Ana Souza");
  assert(!JSON.stringify(m.chamadas.map((c) => c.args)).includes("ana@exemplo.invalid"), "o e-mail não vai para o banco");
});

Deno.test("PT-22: sócio que já tem conta não recebe e-mail novo, só o vínculo", async () => {
  const m = montar({ contas: { "ana@exemplo.invalid": "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d" } });
  const r = await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie: await entrar(m), corpo: { nome: "Ana", email: "ana@exemplo.invalid" } });
  assertEquals((await r.json()).contaNova, false);
  assertEquals(m.enviados, []);
});

Deno.test("PT-24: sem a permissão de convidar, nenhum convite sai", async () => {
  const m = montar({ permissoes: ["console.ficha.ver"] });
  const r = await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie: await entrar(m), corpo: { nome: "Ana", email: "ana@exemplo.invalid" } });
  assertEquals(r.status, 403);
  assertEquals(m.enviados, []);
});

Deno.test("PT-24: cliente não atribuído não chega nem ao convite", async () => {
  const m = montar({ handlers: { console_ficha: () => erroBanco("TC401") } });
  const r = await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie: await entrar(m), corpo: { nome: "Ana", email: "ana@exemplo.invalid" } });
  assertEquals((await erro(r)).codigo, "FORBIDDEN");
  assertEquals(m.enviados, []);
});

Deno.test("PT-20: reenviar o convite manda o link de novo para o e-mail da conta", async () => {
  const m = montar({ contas: { "ana@exemplo.invalid": RENATA }, handlers: { console_reenviar_convite: () => RENATA } });
  const r = await m.pedir(`/v1/clientes/${IPE}/socios/${VINCULO}/reenviar`, { cookie: await entrar(m), corpo: {} });
  assertEquals(await r.json(), { enviado: true });
  assertEquals(m.enviados, [{ email: "ana@exemplo.invalid", voltarPara: "https://portal.exemplo/criar-senha" }]);
  const args = m.chamadas.find((c) => c.funcao === "console_reenviar_convite")!.args;
  assertEquals(args.p_vinculo, VINCULO);
});

Deno.test("PT-20: sem a permissão (o banco recusa), nenhum convite é reenviado", async () => {
  const m = montar({ contas: { "ana@exemplo.invalid": RENATA }, handlers: { console_reenviar_convite: () => erroBanco("TC401") } });
  const r = await m.pedir(`/v1/clientes/${IPE}/socios/${VINCULO}/reenviar`, { cookie: await entrar(m), corpo: {} });
  assertEquals((await erro(r)).codigo, "FORBIDDEN");
  assertEquals(m.enviados, []);
});

Deno.test("CO-02: a ficha traz o e-mail dos sócios, pego no Auth", async () => {
  const m = montar({
    contas: { "ana@exemplo.invalid": RENATA },
    handlers: { console_ficha: () => ({ escritorio: { id: IPE }, permissoes: [], socios: [{ vinculoId: VINCULO, pessoaId: RENATA, nome: "Ana" }] }) },
  });
  const r = await m.pedir(`/v1/clientes/${IPE}`, { cookie: await entrar(m) });
  assertEquals((await r.json()).socios[0].email, "ana@exemplo.invalid");
});

const DOC = "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f";

Deno.test("CO-05: anexar documento: registra, devolve o endereço de envio e só conclui com o arquivo certo no Storage", async () => {
  const m = montar({ handlers: {
    console_documento_iniciar: () => DOC,
    console_documento_para_concluir: () => [{ tipo: "application/pdf", tamanho: 2048 }],
    console_documento_concluir: () => null,
  } });
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${IPE}/documentos`, { cookie, corpo: { categoria: "CONTRATO_ASSINADO", nome: "contrato.pdf", tipo: "application/pdf", tamanho: 2048 } });
  assertEquals(r.status, 201);
  assertEquals((await r.json()).enderecoDeEnvio, `https://storage.exemplo/envio/${IPE}/${DOC}?token=uso-unico`);
  assertEquals(m.pedidosDeEnvio, [`${IPE}/${DOC}`]);

  // Ainda não chegou: não conclui.
  const antes = await m.pedir(`/v1/clientes/${IPE}/documentos/${DOC}/concluir`, { cookie, corpo: {} });
  assertEquals((await erro(antes)).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  // Chegou com outro tamanho: não conclui.
  m.guardados.set(`${IPE}/${DOC}`, { tamanho: 999, tipo: "application/pdf" });
  assertEquals((await erro(await m.pedir(`/v1/clientes/${IPE}/documentos/${DOC}/concluir`, { cookie, corpo: {} }))).detalhes?.motivo, "ARQUIVO_NAO_CHEGOU");
  m.guardados.set(`${IPE}/${DOC}`, { tamanho: 2048, tipo: "application/pdf" });
  assertEquals((await m.pedir(`/v1/clientes/${IPE}/documentos/${DOC}/concluir`, { cookie, corpo: {} })).status, 200);
  assertEquals(m.chamadas.filter((c) => c.funcao === "console_documento_concluir").length, 1);
});

Deno.test("CO-05: tipo fora de PDF, JPG e PNG ou acima de 10 MB nem chega ao banco", async () => {
  const m = montar();
  const cookie = await entrar(m);
  for (const corpo of [
    { categoria: "OUTRO", nome: "a.exe", tipo: "application/x-msdownload", tamanho: 10 },
    { categoria: "OUTRO", nome: "a.pdf", tipo: "application/pdf", tamanho: 10 * 1024 * 1024 + 1 },
    { categoria: "OUTRO", nome: "../a.pdf", tipo: "application/pdf", tamanho: 10 },
  ]) {
    assertEquals((await erro(await m.pedir(`/v1/clientes/${IPE}/documentos`, { cookie, corpo }))).codigo, "VALIDATION_ERROR");
  }
  assertEquals(m.chamadas.filter((c) => c.funcao === "console_documento_iniciar").length, 0);
  assertEquals(m.pedidosDeEnvio, []);
});

Deno.test("CO-05: abrir dá um link de 60 segundos com o nome do arquivo; sem permissão, nada", async () => {
  const m = montar({ handlers: { console_documento_abrir: () => "contrato.pdf" } });
  const cookie = await entrar(m);
  const r = await m.pedir(`/v1/clientes/${IPE}/documentos/${DOC}/abrir`, { cookie, corpo: {} });
  assertEquals(await r.json(), { url: `https://storage.exemplo/ler/${IPE}/${DOC}?token=curto`, validadeSegundos: 60 });
  assertEquals(m.leituras, [{ caminho: `${IPE}/${DOC}`, segundos: 60, nome: "contrato.pdf" }]);

  const sem = montar({ handlers: { console_documento_abrir: () => erroBanco("TC401") } });
  const r2 = await sem.pedir(`/v1/clientes/${IPE}/documentos/${DOC}/abrir`, { cookie: await entrar(sem), corpo: {} });
  assertEquals((await erro(r2)).codigo, "FORBIDDEN");
  assertEquals(sem.leituras, []);
});

Deno.test("convites têm limite por pessoa da equipe", async () => {
  const m = montar();
  const cookie = await entrar(m);
  for (const n of [1, 2]) {
    assertEquals((await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie, corpo: { nome: "P", email: `p${n}@exemplo.invalid` } })).status, 201);
  }
  const r = await m.pedir(`/v1/clientes/${IPE}/socios`, { cookie, corpo: { nome: "P", email: "p3@exemplo.invalid" } });
  assertEquals((await erro(r)).codigo, "RATE_LIMITED");
  assertEquals(m.enviados.length, 2);
});

Deno.test("PT-24: equipe nova recebe o convite para o Console, depois de o banco conferir a administração", async () => {
  const m = montar();
  const cookie = await entrar(m);
  const r = await m.pedir("/v1/equipe", { cookie, corpo: { nome: "Inês", email: "ines@triade.exemplo", funcoes: ["IMPLANTACAO"] } });
  assertEquals(r.status, 201);
  assertEquals(m.enviados, [{ email: "ines@triade.exemplo", voltarPara: "https://console.exemplo/criar-senha" }]);
  const ordem = m.chamadas.map((c) => c.funcao).filter((f) => f.startsWith("console_"));
  assertEquals(ordem, ["console_equipe", "console_cadastrar_membro"]);

  const sem = montar({ handlers: { console_equipe: () => erroBanco("TC401") } });
  const negado = await sem.pedir("/v1/equipe", { cookie: await entrar(sem), corpo: { nome: "X", email: "x@triade.exemplo", funcoes: ["SUPORTE"] } });
  assertEquals((await erro(negado)).codigo, "FORBIDDEN");
  assertEquals(sem.enviados, []);
});

Deno.test("PT-20: quem foi convidado cria a senha pelo link de uso único e segue para o autenticador", async () => {
  const m = montar();
  const aberto = await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } });
  assertEquals(await aberto.json(), { email: "convidada@exemplo.invalid", nome: "Inês" });
  const link = cookieChamado(aberto, "__Host-console-link")!;
  const r = await m.pedir("/v1/auth/criar-senha", { cookie: link, corpo: { novaSenha: "senha-nova-bem-forte", nome: "Inês", aceiteTermos: true } });
  assertEquals(await r.json(), { etapa: "CADASTRAR_AUTENTICADOR" });
  assertEquals(m.chamadas.find((c) => c.funcao === "aceitar_convite")?.args.p_sistema, "CONSOLE");
  // Sem o autenticador, a sessão ainda não abre o Console.
  assertEquals((await erro(await m.pedir("/v1/sessao", { cookie: cookieChamado(r, "__Host-console")! }))).codigo, "MFA_REQUIRED");
  const deNovo = await m.pedir("/v1/auth/criar-senha/abrir", { corpo: { tokenHash: TOKEN_CONVITE } });
  assertEquals((await erro(deNovo)).codigo, "TOKEN_INVALID");
});

Deno.test("as listas do domínio (funções, situações, UFs) são as mesmas do banco", async () => {
  const migration = await Deno.readTextFile(new URL("../../migrations/0060_console_clientes.sql", import.meta.url));
  for (const f of Object.keys(FUNCOES_CONSOLE)) assert(migration.includes(`('${f}', '`), f);
  for (const s of Object.keys(SITUACOES)) assert(migration.includes(`'${s}'`), s);
  for (const uf of UFS) assert(migration.includes(`'${uf}'`), uf);
});

Deno.test("PT-24: a Equipe T3jus traz o e-mail do Auth e o convite pendente", async () => {
  const m = montar({
    contas: { "helena@triade.exemplo": RENATA },
    handlers: {
      console_equipe: () => [{ pessoa_id: RENATA, nome: "Helena Prado", ativa: true, funcoes: ["SUPORTE"], desde: "2026-11-18T10:00:00Z", senha_criada_em: null }],
    },
  });
  const r = await m.pedir("/v1/equipe", { cookie: await entrar(m) });
  assertEquals(await r.json(), {
    pessoas: [{ id: RENATA, nome: "Helena Prado", ativa: true, funcoes: ["SUPORTE"], desde: "2026-11-18T10:00:00Z", email: "helena@triade.exemplo", convitePendente: true }],
  });
});
