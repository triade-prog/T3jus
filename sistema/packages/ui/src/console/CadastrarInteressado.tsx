"use client";
// Cadastrar interessado à mão (F2.5, SC-05), tela aprovada em
// docs/design/aprovadas/console-interessado-sino (estados cadastrar, erros, salvando, repetido,
// falha e cadastrado). Quatro partes: Quem é, De onde veio o contato, Dados pessoais e Quem cuida.
// Decisões da Carol (21/11/2026): e-mail ou WhatsApp, pelo menos um; legítimo interesse com a
// origem; no repetido, juntar ao existente ou cadastrar mesmo assim; sem e-mail automático;
// data do contato até hoje.

import { useId, useRef, useState, type ReactNode } from "react";
import {
  ESTAGIOS_INTERESSADO,
  FUNCOES_CONSOLE,
  ORIGENS_INTERESSADO,
  UFS,
  type FuncaoConsole,
  type InteressadoRepetido,
  type PessoaInteressados,
  type RespostaCadastroInteressado,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { dataBrInteira, lerDataBr } from "./interessados.ts";
import { chamarConsole, INTERESSADOS } from "./Moldura.tsx";
import { Aviso, ErroCampo, faltaAcertar, Janela, useFocoDepoisDoCommit } from "./pecas.tsx";
import { dataLonga } from "./tempo.ts";

const TAMANHOS: [string, string, string][] = [["SO_EU", "Só eu", "Advogado sozinho"], ["DE_2_A_5", "2 a 5", "pessoas"], ["DE_6_A_10", "6 a 10", "pessoas"], ["MAIS_DE_10", "Mais de 10", "pessoas"]];
const ORIGENS: [string, string, string][] = [
  ["INDICACAO", "Indicação", "Alguém passou o contato"],
  ["EVENTO", "Evento", "Feira, palestra, encontro da OAB"],
  ["CONTATO", "Contato direto", "Ligou, escreveu ou veio falar com a gente"],
];
const SABE: [string, string, string][] = [["sim", "Sim, ela pediu ou aceitou", "Ela já espera o nosso contato"], ["nao", "Ainda não", "O contato veio por outra pessoa"]];

const ERROS: Record<string, string> = {
  nome: "Escreva o nome da pessoa.",
  escritorio: "Escreva o nome do escritório. Se ainda não tem, use o da pessoa, como “Tomás Lins Advocacia”.",
  email: "Confira o e-mail, como nome@escritorio.com.br.",
  whats: "O WhatsApp tem DDD e 8 ou 9 números, como (86) 99561-2087.",
  contato: "Preencha o e-mail ou o WhatsApp.",
  tamanho: "Escolha o tamanho do escritório.",
  area: "Confira a área de atuação.",
  cidade: "Confira a cidade.",
  uf: "Confira a UF.",
  origem: "Escolha como o contato chegou.",
  detalhe: "Escreva de onde veio o contato: quem indicou, qual evento ou por onde a pessoa falou.",
  quando: "Escreva uma data até hoje, como 21/11/2026.",
  mensagem: "Escreva até 1.000 caracteres.",
  sabe: "Diga se a pessoa sabe que vamos procurá-la. Isso muda o que dizer no primeiro contato.",
  responsavel: "Só quem vê Interessados pode ser responsável.",
  passo: "Escreva o próximo passo.",
  passoData: "Escreva uma data de hoje em diante, como 23/11/2026.",
};

/** O próximo dia útil (sem sábado e domingo), como no pedido do site. */
export function proximoDiaUtil(hoje: string): string {
  const d = new Date(`${hoje}T12:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

const soNumeros = (v: string) => v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

interface Form {
  nome: string; escritorio: string; email: string; whats: string; tamanho: string; area: string; cidade: string; uf: string;
  origem: string; detalhe: string; quando: string; mensagem: string; sabe: "" | "sim" | "nao"; responsavel: string; passo: string; passoData: string;
}

/** Confere o que dá para conferir na tela; o resto o banco devolve campo a campo. */
export function conferirCadastro(f: Form, hoje: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.nome.trim().length < 2) e.nome = ERROS.nome!;
  if (f.escritorio.trim().length < 2) e.escritorio = ERROS.escritorio!;
  const w = soNumeros(f.whats);
  if (!f.email.trim() && !w) {
    e.email = ERROS.contato!;
    e.whats = ERROS.contato!;
  } else {
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = ERROS.email!;
    if (w && !/^[1-9]\d{9,10}$/.test(w)) e.whats = ERROS.whats!;
  }
  if (!f.tamanho) e.tamanho = ERROS.tamanho!;
  if (!f.origem) e.origem = ERROS.origem!;
  if (f.detalhe.trim().length < 2) e.detalhe = ERROS.detalhe!;
  const q = lerDataBr(f.quando);
  if (!q || q > hoje) e.quando = ERROS.quando!;
  if (!f.sabe) e.sabe = ERROS.sabe!;
  if (!f.responsavel) e.responsavel = "Escolha quem cuida.";
  if (f.passo.trim().length < 2) e.passo = ERROS.passo!;
  const p = lerDataBr(f.passoData);
  if (!p || p < hoje) e.passoData = ERROS.passoData!;
  return e;
}

const descr = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

function Sec({ id, icone, titulo, children }: { id: string; icone: NomeIcone; titulo: string; children: ReactNode }) {
  return (
    <section className="ci-sec" aria-labelledby={id}>
      <h3 id={id}><Icone nome={icone} className="ico" />{titulo}</h3>
      {children}
    </section>
  );
}

/** Recarrega a ficha inteira (lista, contagem do mês e sino já mudaram). */
function irPara(destino: string) {
  window.location.assign(destino);
}

function Grupo({ id, legenda, itens, valor, aoMudar, erro, cls, ro, foco }: {
  id: string; legenda: string; itens: [string, string, string][]; valor: string; aoMudar: (v: string) => void; erro?: string; cls: string; ro: boolean; foco?: boolean;
}) {
  return (
    <fieldset className={`grupo-opcoes ci-grupo${erro ? " ci-erro" : ""}`} aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend>{legenda}</legend>
      <div className={`ci-cartoes ${cls}`}>
        {itens.map(([v, t, s], i) => (
          <label key={v} className="opcao">
            <input className="marcar" type="radio" name={id} value={v} checked={valor === v} disabled={ro} onChange={() => aoMudar(v)}
              data-foco={foco && i === 0 ? true : undefined} />
            <span>{t}<small>{s}</small></span>
          </label>
        ))}
      </div>
      {erro ? <ErroCampo id={`${id}-erro`}>{erro}</ErroCampo> : null}
    </fieldset>
  );
}

export function JanelaCadastrarInteressado({ aberta, hoje, eu, pessoas, aoFechar }: {
  aberta: boolean;
  hoje: string;
  eu: string;
  pessoas: PessoaInteressados[];
  aoFechar: () => void;
}) {
  const ids = useId();
  const vazio: Form = {
    nome: "", escritorio: "", email: "", whats: "", tamanho: "", area: "", cidade: "", uf: "", origem: "", detalhe: "",
    quando: dataBrInteira(hoje), mensagem: "", sabe: "", responsavel: pessoas.some((p) => p.id === eu) ? eu : "", passo: "Fazer o primeiro contato",
    passoData: dataBrInteira(proximoDiaUtil(hoje)),
  };
  const [f, setF] = useState<Form>(vazio);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [repetido, setRepetido] = useState<InteressadoRepetido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const topo = useRef<HTMLDivElement>(null);
  const focar = useFocoDepoisDoCommit();
  const mudar = (k: keyof Form) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    // Mudou o e-mail ou o WhatsApp: o repetido precisa ser conferido de novo.
    if ((k === "email" || k === "whats") && repetido) setRepetido(null);
  };
  const ro = enviando;

  function focarTopo() {
    focar(() => topo.current?.querySelector<HTMLElement>("[tabindex='-1']")?.focus());
  }

  function corpo() {
    return {
      nome: f.nome.trim(), escritorio: f.escritorio.trim(), email: f.email.trim(), whats: f.whats.trim(), tamanho: f.tamanho, area: f.area.trim(),
      cidade: f.cidade.trim(), uf: f.uf, origem: f.origem, detalhe: f.detalhe.trim(), quando: lerDataBr(f.quando) ?? "", mensagem: f.mensagem.trim(),
      sabe: f.sabe === "" ? null : f.sabe === "sim",
    };
  }

  async function cadastrar(forcar: boolean) {
    setFalha(null);
    const v = conferirCadastro(f, hoje);
    if (Object.keys(v).length) {
      setErros(v);
      return focarTopo();
    }
    setErros({});
    setEnviando(true);
    const r = await chamarConsole<RespostaCadastroInteressado>("/v1/interessados", {
      corpo: { ...corpo(), responsavel: f.responsavel, passo: f.passo.trim(), passoData: lerDataBr(f.passoData), forcar },
    });
    setEnviando(false);
    if (r.ok) {
      if ("repetido" in r.dados) {
        setRepetido(r.dados.repetido);
        return focarTopo();
      }
      irPara(`${INTERESSADOS}/${r.dados.id}?novo=1`);
      return;
    }
    const campos = r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(r.erro.detalhes?.campos) ? r.erro.detalhes.campos.map(String) : [];
    if (campos.length) {
      const dupla = campos.includes("email") && campos.includes("whats") && !f.email.trim() && !soNumeros(f.whats);
      setErros(Object.fromEntries(campos.map((c) => [c, dupla && (c === "email" || c === "whats") ? ERROS.contato! : ERROS[c] ?? "Confira este campo."])));
      return focarTopo();
    }
    setFalha(r.erro);
    focarTopo();
  }

  async function juntar() {
    if (!repetido) return;
    setFalha(null);
    setEnviando(true);
    const r = await chamarConsole(`/v1/interessados/${repetido.id}/juntar`, { corpo: corpo() });
    setEnviando(false);
    if (r.ok) {
      irPara(`${INTERESSADOS}/${repetido.id}?juntado=1`);
      return;
    }
    setFalha(r.erro);
    focarTopo();
  }

  const n = Object.keys(erros).length;
  const fechado = repetido && (repetido.estagio === "PERDIDO" || repetido.estagio === "DESCARTADO");
  const cliente = repetido?.estagio === "CLIENTE";
  const igual = (campo: "email" | "whats") =>
    repetido?.campo === campo ? <p className="ci-igual"><Icone nome="alerta" className="ico ico-s" />Igual ao de {repetido.escritorio}</p> : null;

  function campo(k: keyof Form, rotulo: string, opcoes: { opcional?: boolean; ajuda?: string; tipo?: string; modo?: "numeric" | "tel" | "email"; auto?: string; foco?: boolean; max?: number; extra?: ReactNode } = {}) {
    const id = `${ids}-${k}`;
    const erro = erros[k];
    return (
      <div className="campo">
        <label htmlFor={id}>{rotulo}{opcoes.opcional ? <span className="opc"> (opcional)</span> : null}</label>
        <input className="entrada" id={id} type={opcoes.tipo ?? "text"} inputMode={opcoes.modo} autoComplete={opcoes.auto ?? "off"} value={f[k]} readOnly={ro}
          maxLength={opcoes.max} onChange={(e) => mudar(k)(e.target.value)} data-foco={opcoes.foco || undefined}
          aria-invalid={erro ? true : undefined} aria-required={opcoes.opcional ? undefined : true}
          aria-describedby={descr(opcoes.ajuda && `${id}-ajuda`, erro && `${id}-erro`, (k === "email" || k === "whats") && `${ids}-um`)} />
        {opcoes.ajuda ? <p className="ajuda" id={`${id}-ajuda`}>{opcoes.ajuda}</p> : null}
        {erro ? <ErroCampo id={`${id}-erro`}>{erro}</ErroCampo> : null}
        {opcoes.extra}
      </div>
    );
  }

  const pe = (
    <>
      <button className="btn btn-fantasma" type="button" disabled={enviando} onClick={aoFechar}>Cancelar</button>
      {enviando ? (
        <button className="btn btn-pri" type="button" aria-busy="true" aria-disabled="true">Cadastrando…</button>
      ) : repetido ? (
        <button className="btn btn-sec" type="submit">É outro escritório: cadastrar mesmo assim</button>
      ) : (
        <button className="btn btn-pri" type="submit"><Icone nome={falha ? "reenviar" : "mais"} className="ico" />{falha ? "Tentar de novo" : "Cadastrar interessado"}</button>
      )}
    </>
  );

  return (
    <Janela id={`${ids}-j`} classe="ci-larga" aberta={aberta} aoFechar={() => { if (!enviando) aoFechar(); }} sobretitulo="Comercial" titulo="Cadastrar interessado"
      descricao={`${ids}-d`} aoEnviar={() => void cadastrar(Boolean(repetido))} pe={pe}>
      <p id={`${ids}-d`}>Para quem chegou por indicação, evento ou contato direto. O pedido do site entra sozinho e não passa por aqui.</p>
      <div ref={topo} style={{ display: "contents" }}>
        {enviando ? <p className="sr" role="status">Cadastrando o interessado…</p> : null}
        {n ? (
          <div tabIndex={-1} className="ci-resumo">
            <Aviso tom="urgencia" titulo={faltaAcertar(n)}>Nada foi cadastrado ainda.</Aviso>
          </div>
        ) : null}
        {falha ? (
          <div tabIndex={-1} className="ci-resumo">
            <Aviso tom="urgencia" titulo="Não deu para cadastrar agora.">
              {falha.codigo === "FORBIDDEN" ? textoDoErro(falha)
                : "A conexão caiu antes de o servidor responder. Nada foi cadastrado, e o que você escreveu continua aqui. Tente de novo em instantes."}
            </Aviso>
          </div>
        ) : null}
        {repetido ? (
          <div tabIndex={-1} className="ci-resumo">
            <Aviso tom="atencao" icone="alerta" titulo={`Já existe um interessado com este ${repetido.campo === "email" ? "e-mail" : "WhatsApp"}.`}
              acoes={
                <>
                  {fechado ? (
                    <a className="btn btn-pri btn-compacto" href={`${INTERESSADOS}/${repetido.id}?reabrir=1`}><Icone nome="reenviar" className="ico" />Reabrir o existente</a>
                  ) : cliente ? null : (
                    <button className="btn btn-pri btn-compacto" type="button" onClick={() => void juntar()} disabled={enviando}><Icone nome="check" className="ico" />Juntar ao existente</button>
                  )}
                  <a className="btn btn-sec btn-compacto" href={`${INTERESSADOS}/${repetido.id}`}><Icone nome="abrir" className="ico" />Abrir o existente</a>
                </>
              }>
              Nada foi cadastrado ainda. Confira se é o mesmo escritório.
            </Aviso>
            <div className="ci-rep">
              <b>{repetido.escritorio}</b>
              <span>{[repetido.nome, repetido.cidade ? `${repetido.cidade}${repetido.uf ? `, ${repetido.uf}` : ""}` : null,
                `chegou ${repetido.origem === "SITE" ? "pelo site" : `por ${ORIGENS_INTERESSADO[repetido.origem].toLowerCase()}`} em ${dataLonga(repetido.chegouEm)}`].filter(Boolean).join(" · ")}</span>
              <span>{ESTAGIOS_INTERESSADO[repetido.estagio]}{repetido.responsavel ? ` · com ${repetido.responsavel}` : " · sem responsável"}</span>
            </div>
            <p className="ci-ajuda-par" style={{ margin: 0 }}>
              {fechado ? `O existente está ${ESTAGIOS_INTERESSADO[repetido.estagio].toLowerCase()}. Reabra-o, com motivo, em vez de cadastrar outro.`
                : cliente ? "O existente já virou escritório cliente."
                : `“Juntar ao existente” guarda o que você escreveu como nota em ${repetido.escritorio}, conta como novo contato e não cria outro interessado.`}
            </p>
          </div>
        ) : null}
      </div>

      <Sec id={`${ids}-s1`} icone="pessoas" titulo="Quem é">
        <div className="ci-duas">
          {campo("nome", "Nome da pessoa", { foco: true, max: 120, auto: "name" })}
          {campo("escritorio", "Escritório", { max: 160, auto: "organization" })}
        </div>
        <div className="ci-duas">
          {campo("email", "E-mail", { opcional: true, tipo: "email", modo: "email", max: 200, auto: "email", extra: igual("email") })}
          {campo("whats", "WhatsApp", { opcional: true, tipo: "tel", modo: "tel", max: 30, auto: "tel", extra: igual("whats") })}
        </div>
        <p className="ci-ajuda-par" id={`${ids}-um`}>Preencha pelo menos um dos dois, e-mail ou WhatsApp. É por eles que o T3jus confere se o interessado já existe.</p>
        <Grupo id={`${ids}-tam`} legenda="Tamanho do escritório" itens={TAMANHOS} valor={f.tamanho} aoMudar={mudar("tamanho")} erro={erros.tamanho} cls="ci-4" ro={ro} />
        {campo("area", "Área de atuação", { opcional: true, max: 40 })}
        <div className="ci-cid">
          {campo("cidade", "Cidade", { opcional: true, max: 80, auto: "address-level2" })}
          <div className="campo">
            <label htmlFor={`${ids}-uf`}>UF</label>
            <select className="entrada" id={`${ids}-uf`} value={f.uf} disabled={ro} onChange={(e) => mudar("uf")(e.target.value)}
              aria-invalid={erros.uf ? true : undefined} aria-describedby={erros.uf ? `${ids}-uf-erro` : undefined}>
              <option value="">Escolha</option>
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
            {erros.uf ? <ErroCampo id={`${ids}-uf-erro`}>{erros.uf}</ErroCampo> : null}
          </div>
        </div>
      </Sec>

      <Sec id={`${ids}-s2`} icone="local" titulo="De onde veio o contato">
        <Grupo id={`${ids}-org`} legenda="Como chegou" itens={ORIGENS} valor={f.origem} aoMudar={mudar("origem")} erro={erros.origem} cls="ci-3" ro={ro} />
        {campo("detalhe", "De onde veio, em detalhe", { max: 200, ajuda: "Quem indicou, qual evento ou por onde a pessoa falou. Fica na ficha e explica, a qualquer tempo, por que temos este contato." })}
        <div className="ci-duas">
          {campo("quando", "Data do contato", { modo: "numeric", max: 10, ajuda: "Hoje ou antes. O prazo de guarda conta do último contato." })}
          <div />
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-msg`}>O que a pessoa quer<span className="opc"> (opcional)</span></label>
          <textarea className="entrada" id={`${ids}-msg`} rows={2} maxLength={1000} value={f.mensagem} readOnly={ro} onChange={(e) => mudar("mensagem")(e.target.value)}
            aria-invalid={erros.mensagem ? true : undefined} aria-describedby={erros.mensagem ? `${ids}-msg-erro` : undefined} />
          {erros.mensagem ? <ErroCampo id={`${ids}-msg-erro`}>{erros.mensagem}</ErroCampo> : null}
        </div>
      </Sec>

      <Sec id={`${ids}-s3`} icone="escudo" titulo="Dados pessoais">
        <Grupo id={`${ids}-sabe`} legenda="A pessoa sabe que vamos procurá-la?" itens={SABE} valor={f.sabe} aoMudar={mudar("sabe")} erro={erros.sabe} cls="ci-2" ro={ro} />
        <div className="ci-lgpd">
          <p className="ci-l-topo"><span className="selo selo-neutro"><Icone nome="escudo" className="ico" />Legítimo interesse</span><b>sem a autorização do site</b></p>
          <ul>
            <li><b>Por quê:</b> quem chega por indicação, evento ou contato direto não marcou a caixa de autorização. A base é o legítimo interesse (LGPD, art. 7º, IX), com a origem registrada.</li>
            <li><b>Para quê:</b> apresentar o T3jus e marcar uma demonstração. Nada de propaganda.</li>
            <li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li>
          </ul>
          <p className="ci-dica"><Icone nome="ajuda" className="ico" /><span>{f.sabe === "sim"
            ? "Se a pessoa pedir para não ser mais procurada, encerre como descartado: os dados saem no prazo."
            : "No primeiro contato, conte à pessoa de onde veio o contato dela e que ela pode pedir para não ser mais procurada."}</span></p>
        </div>
      </Sec>

      <Sec id={`${ids}-s4`} icone="cracha" titulo="Quem cuida">
        <div className="campo">
          <label htmlFor={`${ids}-resp`}>Responsável</label>
          <select className="entrada" id={`${ids}-resp`} value={f.responsavel} disabled={ro} onChange={(e) => mudar("responsavel")(e.target.value)}
            aria-invalid={erros.responsavel ? true : undefined} aria-describedby={descr(`${ids}-resp-ajuda`, erros.responsavel && `${ids}-resp-erro`)}>
            <option value="">Escolha</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}{p.id === eu ? " (você)" : ""} · {p.funcoes.map((x) => FUNCOES_CONSOLE[x as FuncaoConsole] ?? x).join(", ")}</option>
            ))}
          </select>
          <p className="ajuda" id={`${ids}-resp-ajuda`}>Se for outra pessoa, ela recebe um aviso no sino.</p>
          {erros.responsavel ? <ErroCampo id={`${ids}-resp-erro`}>{erros.responsavel}</ErroCampo> : null}
        </div>
        <div className="ci-duas">
          {campo("passo", "Próximo passo", { max: 160 })}
          {campo("passoData", "Até", { modo: "numeric", max: 10, ajuda: "1 dia útil, como no pedido do site." })}
        </div>
      </Sec>
    </Janela>
  );
}
