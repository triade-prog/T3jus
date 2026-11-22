"use client";
// Formulário do cliente (AP-01), o mesmo para cadastrar e editar (PT-25), como no desenho
// aprovado em docs/design/aprovadas/portal-clientes: o obrigatório é o nome e um telefone ou
// e-mail; a qualificação para procuração e contrato vem num bloco que abre; cada campo diz
// para que serve (PT-11). O possível duplicado avisa e não bloqueia. Na edição, o conflito
// (PT-19) mostra quem salvou antes e a hora, e compara só os campos que mudaram.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  CAPACIDADES, ESTADOS_CIVIS, hojeBrasilia, MODOS_CURATELA, ORIGENS, PAPEIS_CURATELA, PAPEIS_MENOR, situacaoNoDia, UFS, type Capacidade,
  type PossivelDuplicado, type TipoCliente,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro } from "../console/pecas.tsx";
import { dataLonga } from "../console/tempo.ts";
import {
  campoDoServidor, conferirCliente, dataBr, lerData, documentoConfere, errosDosCaminhos, MAX_CONTATOS_CLIENTE, novaChaveContato,
  type ErrosCliente, type RascunhoCliente,
} from "./clientes.ts";
import { chamarPortal, ROTAS_PORTAL } from "./Moldura.tsx";

type CampoTexto = Exclude<keyof RascunhoCliente, "tipo" | "contatos" | "principal" | "rlMoraJunto">;
const PROC = "procuração";

function Uso({ children }: { children: ReactNode }) {
  return <span className="cl-uso">{children}</span>;
}
function Mudou() {
  return <span className="mudou">Mudou</span>;
}

export interface Conflito {
  /** "Felipe Matos salvou esta ficha às 14h52, enquanto você editava." */
  titulo: string;
  diferencas: { chave: string; campo: string; salvo: string; meu: string }[];
}

export function FormularioCliente({ modo, inicial, comercial, versao, idCliente, conflito, aoSalvo, aoCancelar, aoConflito, aoFicarComSalva }: {
  modo: "novo" | "editar";
  inicial: RascunhoCliente;
  comercial: boolean;
  versao?: number;
  idCliente?: string;
  conflito?: Conflito | null;
  aoSalvo: (r: { id: string; versao: number; nome: string }) => void;
  aoCancelar: () => void;
  /** Editar: a versão lida ficou velha. Quem chama recarrega a ficha e compara. */
  aoConflito?: (meu: RascunhoCliente) => void;
  aoFicarComSalva?: () => void;
}) {
  const ids = useId();
  const form = useRef<HTMLFormElement>(null);
  const [r, setR] = useState<RascunhoCliente>(inicial);
  const [erros, setErros] = useState<ErrosCliente>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [qualAberta, setQualAberta] = useState(modo === "editar");
  const [duplicados, setDuplicados] = useState<{ por: "documento" | "telefone"; lista: PossivelDuplicado[] } | null>(null);
  const novo = modo === "novo";
  const pf = r.tipo === "PF";
  const mudou = (k: string) => !!conflito?.diferencas.some((d) => d.chave === k);

  // O foco começa no primeiro campo (no conflito, fica no aviso, que é lido primeiro).
  useEffect(() => {
    if (!conflito) form.current?.querySelector<HTMLElement>("[data-foco]")?.focus();
  }, [conflito]);

  // No conflito, o formulário fica com o que a pessoa escreveu (vem do rascunho de quem chama).
  useEffect(() => {
    if (conflito) void Promise.resolve().then(() => setR(inicial));
  }, [conflito, inicial]);

  const mudar = (k: CampoTexto, v: string) => {
    setR((x) => ({ ...x, [k]: v }));
    // Com os dígitos certos, o erro do documento some na hora e aparece "Dígitos conferidos".
    if (k === "documento" && erros.documento && documentoConfere(r.tipo, v)) setErros(({ documento: _d, ...resto }) => resto);
    if (k === "rlDocumento" && erros.rlDocumento && documentoConfere("PF", v)) setErros(({ rlDocumento: _d, ...resto }) => resto);
  };
  const contato0 = r.contatos[0]!;
  const mudarContato = (chave: number, k: "nome" | "papel" | "telefone" | "email", v: string) =>
    setR((x) => ({ ...x, contatos: x.contatos.map((c) => (c.chave === chave ? { ...c, [k]: v } : c)) }));

  async function procurarDuplicado(por: "documento" | "telefone", valor: string) {
    const d = valor.replace(/\D/g, "");
    if ((por === "documento" && !documentoConfere(r.tipo, valor)) || (por === "telefone" && d.length < 10)) {
      if (duplicados?.por === por) setDuplicados(null);
      return;
    }
    const q = new URLSearchParams({ [por]: valor, ...(idCliente ? { ignorar: idCliente } : {}) });
    const resp = await chamarPortal<{ duplicados: PossivelDuplicado[] }>(`/v1/escritorio/clientes/duplicados?${q}`);
    if (resp.ok) setDuplicados(resp.dados.duplicados.length ? { por, lista: resp.dados.duplicados } : duplicados?.por === por ? null : duplicados);
  }

  function prontoParaEnviar(): RascunhoCliente {
    // No cadastro, o primeiro contato da pessoa física é o próprio cliente.
    if (!novo || r.tipo === "PJ") return r;
    return { ...r, contatos: [{ ...contato0, nome: r.nome }] };
  }

  async function salvar() {
    setErro(null);
    const pronto = prontoParaEnviar();
    const v = conferirCliente(pronto);
    if (!v.ok) {
      // No cadastro da pessoa física, o nome do contato é o do cliente: o erro fica só no nome.
      if (novo && pf) delete v.erros[`contato.${contato0.chave}.nome`];
      setErros(v.erros);
      if (Object.keys(v.erros).some((k) => k in QUALIFICACAO)) setQualAberta(true);
      return focarPrimeiroErro(form.current);
    }
    setErros({});
    setSalvando(true);
    const resp = novo
      ? await chamarPortal<{ id: string; versao: number }>("/v1/escritorio/clientes", { corpo: v.corpo })
      : await chamarPortal<{ id: string; versao: number }>(`/v1/escritorio/clientes/${idCliente}`, { metodo: "PUT", corpo: { ...v.corpo, versao } });
    setSalvando(false);
    if (resp.ok) return aoSalvo({ ...resp.dados, nome: v.corpo.nome });
    if (resp.erro.codigo === "VERSION_CONFLICT" && aoConflito) return aoConflito(r);
    const campos = resp.erro.detalhes?.campos;
    if (resp.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
      const e = errosDosCaminhos(pronto, campos.map((c) => [campoDoServidor(String(c))]));
      if (Object.keys(e).length) {
        setErros(e);
        return focarPrimeiroErro(form.current);
      }
    }
    setErro(resp.erro);
  }

  const campo = (k: CampoTexto, rotulo: string, o: {
    classe: string; uso?: boolean; opcional?: boolean; ajuda?: string; modo?: "numeric" | "tel" | "email"; auto?: string; foco?: boolean;
    tipo?: string; aoSair?: () => void; depois?: ReactNode;
  }) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className={`campo ${o.classe}`} key={k}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
          {o.uso ? <Uso>{PROC}</Uso> : null}
          {mudou(k) ? <Mudou /> : null}
        </label>
        <input className="entrada" id={id} type={o.tipo ?? "text"} value={r[k]} autoComplete={o.auto ?? "off"} inputMode={o.modo}
          data-foco={o.foco ? true : undefined} onChange={(ev) => mudar(k, ev.target.value)} onBlur={o.aoSair}
          aria-invalid={e ? true : undefined} aria-describedby={descritoPor(!e && o.ajuda && `${id}-aj`, e && `${id}-er`)} />
        {!e && o.ajuda ? (
          <p className="ajuda" id={`${id}-aj`}>
            {o.ajuda}
          </p>
        ) : null}
        {o.depois}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };

  const selecao = (k: CampoTexto, rotulo: string, opcoes: Record<string, string> | readonly string[], o: { classe: string; uso?: boolean; opcional?: boolean; ajuda?: string }) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    const pares = Array.isArray(opcoes) ? opcoes.map((x) => [x, x] as const) : Object.entries(opcoes);
    return (
      <div className={`campo ${o.classe}`} key={k}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
          {o.uso ? <Uso>{PROC}</Uso> : null}
          {mudou(k) ? <Mudou /> : null}
        </label>
        <select className="entrada" id={id} value={r[k]} onChange={(ev) => mudar(k, ev.target.value)}
          aria-invalid={e ? true : undefined} aria-describedby={descritoPor(!e && o.ajuda && `${id}-aj`, e && `${id}-er`)}>
          <option value="">Escolha</option>
          {pares.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        {!e && o.ajuda ? (
          <p className="ajuda" id={`${id}-aj`}>
            {o.ajuda}
          </p>
        ) : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };

  /** Campo de um contato do formulário de cadastro (o primeiro contato). */
  const campoContato = (k: "nome" | "papel" | "telefone" | "email", rotulo: string, o: { classe: string; opcional?: boolean; ajuda?: string; tipo?: string; modo?: "tel" | "email" }) => {
    const id = `${ids}-c0-${k}`;
    const par = erros[`contato.${contato0.chave}.par`];
    const e = erros[`contato.${contato0.chave}.${k}`] ?? (k === "telefone" ? par : undefined);
    return (
      <div className={`campo ${o.classe}`}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <input className="entrada" id={id} type={o.tipo ?? "text"} inputMode={o.modo} value={contato0[k]} autoComplete="off"
          onChange={(ev) => mudarContato(contato0.chave, k, ev.target.value)}
          onBlur={k === "telefone" ? (ev) => void procurarDuplicado("telefone", ev.target.value) : undefined}
          aria-invalid={e || (par && k === "email") ? true : undefined}
          aria-describedby={descritoPor(!e && o.ajuda && `${id}-aj`, e && `${id}-er`, par && k === "email" && `${ids}-c0-telefone-er`)} />
        {!e && o.ajuda ? (
          <p className="ajuda" id={`${id}-aj`}>
            {o.ajuda}
          </p>
        ) : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };

  const docOk = r.documento.trim() && !erros.documento && documentoConfere(r.tipo, r.documento);
  const avisoDuplicado = duplicados ? (
    <div className="c6 cl-dup">
      {duplicados.lista.map((d) => (
        <Aviso key={d.id} tom="atencao" titulo={`Já existe um cliente com este ${duplicados.por === "documento" ? (r.tipo === "PJ" ? "CNPJ" : "CPF") : "telefone"}: ${d.nome}.`}
          acoes={
            <a className="btn btn-sec" href={`${ROTAS_PORTAL.clientes}/${d.id}`}>
              <Icone nome="dir" className="ico" />
              Abrir a ficha de {d.nome.split(/\s+/)[0]}
            </a>
          }>
          {`${d.situacao === "ATIVO" ? "Ativo" : "Inativo"}, cliente desde ${dataLonga(d.desde)}. Se for a mesma pessoa, abra a ficha para não ter dois cadastros. `}
          {duplicados.por === "telefone"
            ? "Se for outra pessoa (um parente que usa o mesmo número, por exemplo), pode cadastrar normalmente."
            : "Se tiver certeza de que é outro cliente, pode seguir."}
        </Aviso>
      ))}
    </div>
  ) : null;

  // Quem assina (F3.98): o cliente assina por si, é menor ou está sob curatela. A data só do menor.
  const primeiro = r.nome.trim().split(/\s+/)[0] || "o cliente";
  const cap = (pf ? r.capacidade : "PLENA") as Capacidade;
  const hoje = hojeBrasilia();
  const nascIso = lerData(r.nascimento);
  const sit = cap === "MENOR" ? situacaoNoDia("MENOR", nascIso, hoje) : null;
  const menor = cap === "MENOR" && sit?.situacao !== "FEZ_18";
  const menorDe16 = menor && (sit?.idade === null || sit?.idade === undefined || sit.idade < 16);
  const mudarCap = (v: Capacidade) => {
    setR((x) => ({ ...x, capacidade: v, rlPapel: "" }));
    setErros(({ nascimento: _n, rlNome: _r, rlPapel: _p, rlDocumento: _d, ...resto }) => resto);
  };
  const rlDocOk = r.rlDocumento.trim() && !erros.rlDocumento && documentoConfere("PF", r.rlDocumento);
  const calc = !sit || sit.idade === null ? (
    <div className="rl-calc rl-neutro c3" role="status" aria-live="polite">
      <Icone nome="ajuda" className="ico" />
      <span>Com a data, o T3jus diz se {primeiro} é representado(a) ou assistido(a), e faz a conta de novo a cada documento gerado.</span>
    </div>
  ) : (
    <div className="rl-calc c3" role="status" aria-live="polite">
      <Icone nome="pessoas" className="ico" />
      <span>
        {sit.situacao === "REPRESENTADO" ? (
          <><b>{primeiro} tem {sit.idade} anos hoje: é representado(a).</b> Só quem responde por {primeiro} assina. Aos 16 anos, em {dataBr(sit.faz16!)}, passa a ser assistido(a), e os dois assinam.</>
        ) : sit.situacao === "ASSISTIDO" ? (
          <><b>{primeiro} tem {sit.idade} anos hoje: é assistido(a).</b> {primeiro} e quem responde por {primeiro} assinam juntos. Aos 18 anos, em {dataBr(sit.faz18!)}, passa a assinar sozinho(a).</>
        ) : (
          <><b>{primeiro} já tem 18 anos e assina por si.</b> Para quem já é cliente, a ficha avisa e muda quando alguém confirmar.</>
        )}
      </span>
    </div>
  );
  const dadosDeQuemAssina = (
    <>
      {campo("rlNome", "Nome completo", { classe: "c4", uso: true, ajuda: cap === "CURATELA" ? "Como está no termo de curatela." : "Como está no documento." })}
      {campo("rlDocumento", "CPF", {
        classe: "c2", uso: true, modo: "numeric", ajuda: rlDocOk ? undefined : "Conferimos os dígitos.",
        depois: rlDocOk ? (<p className="cl-ok"><Icone nome="check" className="ico" />Dígitos conferidos</p>) : null,
      })}
      {campo("rlRg", "RG", { classe: "c2", uso: true })}
      {campo("rlRgOrgao", "Órgão emissor e UF", { classe: "c2", ajuda: "Ex.: SSP/SP" })}
      {campo("rlNacionalidade", "Nacionalidade", { classe: "c2", uso: true, ajuda: "Ex.: brasileira" })}
      {selecao("rlEstadoCivil", "Estado civil", ESTADOS_CIVIS, { classe: "c2", uso: true })}
      {campo("rlProfissao", "Profissão", { classe: "c2", uso: true })}
      <div className="rl-mora">
        <label className="opcao">
          <input className="marcar" type="checkbox" checked={r.rlMoraJunto} onChange={(ev) => setR((x) => ({ ...x, rlMoraJunto: ev.target.checked }))} />
          <span>
            Mora com {primeiro}
            <small>{r.rlMoraJunto ? "O endereço da qualificação vale para os dois (“ambos residentes na…”). Desmarque para escrever outro." : "Desmarcado: escreva abaixo o endereço de quem assina."}</small>
          </span>
        </label>
      </div>
      {r.rlMoraJunto ? null : (
        <>
          {campo("rlCep", "CEP", { classe: "c2", uso: true, modo: "numeric", auto: "postal-code" })}
          {campo("rlEndereco", "Endereço (rua, número e complemento)", { classe: "c4", uso: true })}
          {campo("rlBairro", "Bairro", { classe: "c2", uso: true })}
          {campo("rlCidade", "Cidade", { classe: "c2", uso: true })}
          {selecao("rlUf", "UF", UFS, { classe: "c2", uso: true })}
        </>
      )}
    </>
  );
  const quemAssina = (
    <>
      <div className="cl-sec">
        <h3>Quem assina</h3>
        <small>Na procuração e no contrato</small>
      </div>
      <fieldset className="rl-cap" aria-describedby={`${ids}-cap-aj`}>
        <legend>O cliente assina por si?{mudou("capacidade") ? <Mudou /> : null}</legend>
        <div className="rl-ops">
          {(Object.keys(CAPACIDADES) as Capacidade[]).map((c) => (
            <label key={c} className="opcao">
              <input className="marcar" type="radio" name={`${ids}-cap`} value={c} checked={cap === c} onChange={() => mudarCap(c)} />
              <span>
                {CAPACIDADES[c]}
                <small>{c === "PLENA" ? "Maior de 18 anos" : c === "MENOR" ? "Assina o pai, a mãe ou o tutor" : "Assina o curador nomeado pelo juiz"}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="rl-aj" id={`${ids}-cap-aj`}>Na dúvida, deixe “Sim”. Dá para mudar depois, na ficha.</p>
      </fieldset>
      {cap === "MENOR" ? (
        <div className="rl-painel" role="group" aria-label="Menor de 18 anos: data de nascimento e quem assina">
          <div className="c6 cl-lgpd">
            <Icone nome="escudo" className="ico" />
            <span>
              <b>Por que pedimos a data de nascimento.</b> Só de quem é menor, e só para saber, no dia de gerar cada documento, se é representado ou assistido.
              De quem assina por si, não pedimos (LGPD).
            </span>
          </div>
          {campo("nascimento", "Data de nascimento", { classe: "c3", uso: true, modo: "numeric", ajuda: "dd/mm/aaaa" })}
          {calc}
          <div className="rl-sub">
            <h4>Quem assina por {primeiro}</h4>
            <small>O pai, a mãe ou o tutor. Vai na procuração e no contrato.</small>
          </div>
          {selecao("rlPapel", "É", PAPEIS_MENOR, { classe: "c2", uso: true, ajuda: "Tutor é quem o juiz nomeou." })}
          {dadosDeQuemAssina}
        </div>
      ) : cap === "CURATELA" ? (
        <div className="rl-painel" role="group" aria-label="Sob curatela: quem assina e o termo">
          <div className="c6 cl-lgpd">
            <Icone nome="escudo" className="ico" />
            <span>
              <b>Só o que vai no documento.</b> Quem é o curador e os dados do termo, que vão na qualificação. Não pedimos o motivo da curatela, laudo nem data de
              nascimento (LGPD).
            </span>
          </div>
          <div className="rl-sub">
            <h4>Quem assina por {primeiro}</h4>
            <small>O curador, como está no termo de curatela</small>
          </div>
          {selecao("rlPapel", "É", PAPEIS_CURATELA, { classe: "c2", uso: true })}
          {dadosDeQuemAssina}
          <div className="rl-sub">
            <h4>O termo de curatela</h4>
            <small>Vai na qualificação e junto com a procuração</small>
          </div>
          <fieldset className="rl-termo" aria-describedby={`${ids}-modo-aj`}>
            <legend>O que diz o termo{mudou("curModo") ? <Mudou /> : null}</legend>
            <div className="rl-ops2">
              {(Object.keys(MODOS_CURATELA) as (keyof typeof MODOS_CURATELA)[]).map((m) => (
                <label key={m} className="opcao">
                  <input className="marcar" type="radio" name={`${ids}-modo`} value={m} checked={(r.curModo || "REPRESENTA") === m}
                    onChange={() => setR((x) => ({ ...x, curModo: m }))} />
                  <span>
                    {r.rlPapel === "CURADOR" ? MODOS_CURATELA[m].replace("A curadora", "O curador") : MODOS_CURATELA[m]}
                    <small>{m === "REPRESENTA" ? "Representa. É o mais comum." : `Assiste. Quando o termo pede que ${primeiro} assine junto.`}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="ajuda" id={`${ids}-modo-aj`}>Está na sentença ou no termo, nos limites da curatela.</p>
          </fieldset>
          {campo("curProcesso", "Número do processo da curatela", { classe: "c3", uso: true, opcional: true, modo: "numeric" })}
          {campo("curVara", "Vara e comarca", { classe: "c6", uso: true, opcional: true })}
        </div>
      ) : null}
    </>
  );

  const nErros = Object.keys(erros).length;
  const qualificacao = (
    <details className="cl-qualif" open={qualAberta} onToggle={(e) => setQualAberta((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="cl-ic">
          <Icone nome="pena" className="ico" />
        </span>
        <span>
          <strong>Qualificação para procuração e contrato</strong>
          <small>
            {!pf ? "Sede e representante legal. Pode completar depois."
              : menorDe16 ? `Nacionalidade, RG e endereço de ${primeiro}. Pode completar depois.`
                : "Nacionalidade, estado civil, profissão, RG e endereço. Pode completar depois."}
          </small>
        </span>
        <span className="cl-abre">
          {qualAberta ? "Recolher" : "Preencher agora"}
          <Icone nome="baixo" className="ico ico-s" />
        </span>
      </summary>
      <div className="cl-q-corpo">
        <div className="c6 cl-lgpd">
          <Icone nome="escudo" className="ico" />
          <span>
            <b>Só o que vai para a procuração e o contrato.</b>{" "}
            {!pf
              ? "Endereço da sede e quem assina pela empresa."
              : menorDe16
                ? "Para quem tem menos de 16 anos, estado civil e profissão não vão no documento, e o RG é opcional."
                : menor
                  ? "Para quem tem 16 ou 17 anos, estado civil, profissão e RG são opcionais."
                  : "Cada dado abaixo tem essa finalidade, e por isso não pedimos mais nada (nem data de nascimento, nem foto de documento)."}{" "}
            Quem guarda e responde por estes dados é o escritório (LGPD).
          </span>
        </div>
        {pf ? (
          <>
            {campo("nacionalidade", "Nacionalidade", { classe: "c2", uso: true, ajuda: "Ex.: brasileira" })}
            {menorDe16 ? null : selecao("estadoCivil", "Estado civil", ESTADOS_CIVIS, { classe: "c2", uso: true, opcional: menor })}
            {menorDe16 ? null : campo("profissao", "Profissão", { classe: "c2", uso: true, opcional: menor, ajuda: menor ? "Ex.: estudante" : undefined })}
            {campo("rg", "RG", { classe: "c2", uso: true, opcional: menor })}
            {campo("rgOrgao", "Órgão emissor e UF", { classe: "c2", ajuda: "Ex.: SSP/SP" })}
            {campo("cep", "CEP", { classe: "c2", uso: true, modo: "numeric", auto: "postal-code" })}
            {campo("endereco", "Endereço (rua, número e complemento)", { classe: "c4", uso: true, auto: "street-address" })}
            {campo("bairro", "Bairro", { classe: "c2", uso: true })}
            {campo("cidade", "Cidade", { classe: "c4", uso: true, auto: "address-level2" })}
            {selecao("uf", "UF", UFS, { classe: "c2", uso: true })}
          </>
        ) : (
          <>
            {campo("cep", "CEP da sede", { classe: "c2", uso: true, modo: "numeric", auto: "postal-code" })}
            {campo("endereco", "Endereço da sede", { classe: "c4", uso: true, auto: "street-address" })}
            {campo("bairro", "Bairro", { classe: "c2", uso: true })}
            {campo("cidade", "Cidade", { classe: "c2", uso: true })}
            {selecao("uf", "UF", UFS, { classe: "c2", uso: true })}
            <div className="cl-sec c6">
              <h3>Quem assina pela empresa</h3>
              <small>Representante legal, como no contrato social</small>
            </div>
            {campo("repNome", "Nome completo", { classe: "c4", uso: true })}
            {campo("repCargo", "Cargo", { classe: "c2", uso: true, ajuda: "Ex.: sócio-administrador" })}
            {campo("repDocumento", "CPF", { classe: "c2", uso: true, modo: "numeric", ajuda: "Conferimos os dígitos." })}
            {selecao("repEstadoCivil", "Estado civil", ESTADOS_CIVIS, { classe: "c2", uso: true })}
            {campo("repProfissao", "Profissão", { classe: "c2", uso: true })}
          </>
        )}
      </div>
    </details>
  );

  const origem = comercial ? (
    <>
      <div className="cl-sec">
        <h3>Como chegou ao escritório</h3>
        <small>Origem do contato · área Comercial</small>
      </div>
      {selecao("origem", "Origem", ORIGENS, { classe: "c3", opcional: true, ajuda: "Para saber de onde vêm os clientes. Não vai em documento." })}
      {campo("origemIndicacao", "Quem indicou", { classe: "c3", opcional: true, ajuda: "Só para indicação." })}
    </>
  ) : null;

  const contatosEdit = (
    <fieldset className="contatos-edit">
      <legend>
        Contatos{mudou("contatos") ? <Mudou /> : null}
        <small>Até 10. Cada um precisa de telefone ou e-mail. O principal é quem o escritório procura primeiro.</small>
      </legend>
      {r.contatos.map((c, i) => {
        const par = erros[`contato.${c.chave}.par`];
        const base = `${ids}-ct${c.chave}`;
        const entrada = (k: "nome" | "papel" | "telefone" | "email", rotulo: string, tipo: string) => {
          const e = erros[`contato.${c.chave}.${k}`];
          const invalido = !!e || (!!par && (k === "telefone" || k === "email"));
          return (
            <div className="campo">
              <label htmlFor={`${base}-${k}`}>
                {rotulo}
                {k === "papel" ? <span className="opcional"> (opcional)</span> : null}
              </label>
              <input className="entrada" id={`${base}-${k}`} type={tipo} value={c[k]} autoComplete="off"
                onChange={(ev) => mudarContato(c.chave, k, ev.target.value)}
                aria-invalid={invalido ? true : undefined}
                aria-describedby={descritoPor(e && `${base}-${k}-erro`, par && (k === "telefone" || k === "email") && `${base}-par`)} />
              {e ? <ErroCampo id={`${base}-${k}-erro`}>{e}</ErroCampo> : null}
            </div>
          );
        };
        return (
          <div key={c.chave} className={par ? "contato-edit com-erro" : "contato-edit"} role="group"
            aria-label={`Contato ${i + 1}${c.nome.trim() ? `: ${c.nome.trim()}` : ""}`}>
            {entrada("nome", "Nome", "text")}
            {entrada("papel", "Papel", "text")}
            {entrada("telefone", "Telefone", "tel")}
            {entrada("email", "E-mail", "email")}
            {r.contatos.length > 1 ? (
              <button className="remover" type="button" aria-label={`Remover o contato ${c.nome.trim() || i + 1}`}
                onClick={() => setR((x) => {
                  const contatos = x.contatos.filter((y) => y.chave !== c.chave);
                  return { ...x, contatos, principal: x.principal === c.chave ? contatos[0]!.chave : x.principal };
                })}>
                <Icone nome="xis" className="ico" />
              </button>
            ) : null}
            <label className="opcao" style={{ gridColumn: "1/-1", margin: "-6px -8px -8px" }}>
              <input className="marcar" type="radio" name={`${ids}-principal`} checked={r.principal === c.chave}
                onChange={() => setR((x) => ({ ...x, principal: c.chave }))} />
              <span>Contato principal</span>
            </label>
            {par ? (
              <p className="erro-msg erro-par" id={`${base}-par`}>
                <Icone nome="alerta" className="ico ico-s" />
                {par}
              </p>
            ) : null}
          </div>
        );
      })}
      {r.contatos.length < MAX_CONTATOS_CLIENTE ? (
        <div>
          <button className="btn btn-fantasma" type="button"
            onClick={() => setR((x) => ({ ...x, contatos: [...x.contatos, { chave: novaChaveContato(), nome: "", papel: "", telefone: "", email: "" }] }))}>
            <Icone nome="mais" className="ico" />
            Adicionar contato
          </button>
        </div>
      ) : null}
    </fieldset>
  );

  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>{novo ? "Dados do cliente" : "Editar ficha"}</h2>
          <p className="sub">
            {novo ? "Comece pelo nome e um contato. A qualificação pode ficar para quando for fazer a procuração." : "Os campos sem “(opcional)” são obrigatórios."}
          </p>
        </div>
      </div>
      <form ref={form} className="form-folha" noValidate onSubmit={(ev) => { ev.preventDefault(); void salvar(); }}>
        {nErros ? (
          <div className="c6">
            <Aviso tom="urgencia" titulo={faltaAcertar(nErros)}>
              {novo ? "O cliente ainda não foi cadastrado." : "A ficha não foi salva. O resto do que você escreveu continua aqui."}
            </Aviso>
          </div>
        ) : null}
        {erro ? (
          <div className="c6">
            <Aviso tom="urgencia" titulo={novo ? "O cliente não foi cadastrado." : "A ficha não foi salva."}>
              {textoDoErro(erro)} O que você escreveu continua aqui.
            </Aviso>
          </div>
        ) : null}
        {conflito ? (
          <div className="c6">
            <Aviso tom="urgencia" titulo={conflito.titulo}
              acoes={
                <>
                  {conflito.diferencas.length ? (
                    <table className="comparar">
                      <caption className="sr">Campos que mudaram</caption>
                      <thead>
                        <tr>
                          <th scope="col">Campo</th>
                          <th scope="col">Salvo agora</th>
                          <th scope="col">O que você escreveu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conflito.diferencas.map((d) => (
                          <tr key={d.chave}>
                            <th scope="row">{d.campo}</th>
                            <td>{d.salvo}</td>
                            <td>{d.meu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  <div className="aviso-acoes" style={{ width: "100%" }}>
                    <button className="btn btn-pri" type="submit" disabled={salvando}>
                      Salvar a minha versão
                    </button>
                    <button className="btn btn-sec" type="button" onClick={aoFicarComSalva}>
                      Ficar com a versão salva
                    </button>
                  </div>
                </>
              }>
              {conflito.diferencas.length
                ? `Nada do que você escreveu se perdeu. Compare ${conflito.diferencas.length === 1 ? "o campo que mudou" : `os ${conflito.diferencas.length} campos que mudaram`} e escolha qual versão fica.`
                : "Nada do que você escreveu se perdeu. A versão salva é igual à sua; salve para confirmar."}
            </Aviso>
          </div>
        ) : null}

        {novo ? (
          <fieldset className="cl-tipo">
            <legend>Tipo de cliente</legend>
            <div className="cl-ops">
              {(["PF", "PJ"] as TipoCliente[]).map((t) => (
                <label key={t} className="opcao">
                  <input className="marcar" type="radio" name={`${ids}-tipo`} value={t} checked={r.tipo === t}
                    onChange={() => { setR((x) => ({ ...x, tipo: t })); setErros({}); setDuplicados(null); }} />
                  <span>
                    {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
                    <small>{t === "PF" ? "Pede CPF" : "Empresa, associação ou condomínio; pede CNPJ"}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {novo ? (
          <div className="cl-sec cl-primeira">
            <h3>Para começar</h3>
            <small>Só isto é obrigatório</small>
          </div>
        ) : null}
        {campo("nome", pf ? "Nome completo" : "Razão social", {
          classe: novo ? "c6" : "c4", uso: true, foco: !conflito,
          ajuda: novo ? (pf ? "Como está no documento. Vai na procuração e no contrato." : "Como está no CNPJ. Vai na procuração e no contrato.") : undefined,
        })}
        {novo && !pf ? (
          <>
            {campoContato("nome", "Com quem falar", { classe: "c3", ajuda: "Pessoa da empresa que fala com o escritório." })}
            {campoContato("papel", "Papel", { classe: "c3", opcional: true, ajuda: "Ex.: sócio, gerente, financeiro" })}
          </>
        ) : null}
        {novo ? (
          <>
            {campoContato("telefone", "Telefone ou WhatsApp", { classe: "c3", tipo: "tel", modo: "tel",
              ajuda: !pf ? "Telefone ou e-mail: pelo menos um." : cap !== "PLENA" ? "Para falar com o cliente. Se ele não tem, use o de quem responde por ele." : "Para falar com o cliente." })}
            {campoContato("email", "E-mail", { classe: "c3", tipo: "email", modo: "email", opcional: true, ajuda: pf ? "Para falar com o cliente." : undefined })}
            {duplicados?.por === "telefone" ? avisoDuplicado : null}
          </>
        ) : null}
        {campo("documento", pf ? "CPF" : "CNPJ", {
          classe: novo ? "c3" : "c2", uso: true, opcional: true, modo: "numeric",
          ajuda: docOk ? undefined : novo ? `Conferimos os dígitos e avisamos se já houver cliente com este ${pf ? "CPF" : "CNPJ"}.` : "Conferimos os dígitos.",
          aoSair: () => void procurarDuplicado("documento", r.documento),
          depois: docOk ? (
            <p className="cl-ok">
              <Icone nome="check" className="ico" />
              Dígitos conferidos
            </p>
          ) : null,
        })}
        {duplicados?.por === "documento" ? avisoDuplicado : null}
        {pf ? quemAssina : null}
        {origem}
        {qualificacao}
        {novo ? null : contatosEdit}
        <div className="form-pe">
          <span className="esq-pe">
            {novo
              ? cap === "PLENA"
                ? "Os campos sem “(opcional)” são obrigatórios. O cadastro fica no histórico do escritório, com seu nome e a hora."
                : "Os campos sem “(opcional)” são obrigatórios. Para menor, também a data de nascimento e o nome de quem assina; para curatela, o nome do curador. O cadastro fica no histórico do escritório."
              : "Cada mudança vai para o histórico do escritório, com seu nome e os campos alterados."}
          </span>
          <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={salvando}>
            <Icone nome="check" className="ico" />
            {salvando ? "Salvando…" : novo ? "Cadastrar cliente" : "Salvar ficha"}
          </button>
        </div>
      </form>
    </section>
  );
}

const QUALIFICACAO = {
  nacionalidade: 1, estadoCivil: 1, profissao: 1, rg: 1, rgOrgao: 1, cep: 1, endereco: 1, bairro: 1, cidade: 1, uf: 1, repNome: 1, repCargo: 1,
  repDocumento: 1, repEstadoCivil: 1, repProfissao: 1,
};
