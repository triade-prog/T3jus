"use client";
// Formulário do cliente (AP-01), o mesmo para cadastrar e editar (PT-25), como no desenho
// aprovado em docs/design/aprovadas/portal-clientes: o obrigatório é o nome e um telefone ou
// e-mail; a qualificação para procuração e contrato vem num bloco que abre; cada campo diz
// para que serve (PT-11). O possível duplicado avisa e não bloqueia. Na edição, o conflito
// (PT-19) mostra quem salvou antes e a hora, e compara só os campos que mudaram.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ESTADOS_CIVIS, ORIGENS, UFS, type PossivelDuplicado, type TipoCliente } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro } from "../console/pecas.tsx";
import { dataLonga } from "../console/tempo.ts";
import {
  campoDoServidor, conferirCliente, documentoConfere, errosDosCaminhos, MAX_CONTATOS_CLIENTE, novaChaveContato,
  type ErrosCliente, type RascunhoCliente,
} from "./clientes.ts";
import { chamarPortal, ROTAS_PORTAL } from "./Moldura.tsx";

type CampoTexto = Exclude<keyof RascunhoCliente, "tipo" | "contatos" | "principal">;
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

  const nErros = Object.keys(erros).length;
  const qualificacao = (
    <details className="cl-qualif" open={qualAberta} onToggle={(e) => setQualAberta((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="cl-ic">
          <Icone nome="pena" className="ico" />
        </span>
        <span>
          <strong>Qualificação para procuração e contrato</strong>
          <small>{pf ? "Nacionalidade, estado civil, profissão, RG e endereço. Pode completar depois." : "Sede e representante legal. Pode completar depois."}</small>
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
            {pf
              ? "Cada dado abaixo tem essa finalidade, e por isso não pedimos mais nada (nem data de nascimento, nem foto de documento)."
              : "Endereço da sede e quem assina pela empresa."}{" "}
            Quem guarda e responde por estes dados é o escritório (LGPD).
          </span>
        </div>
        {pf ? (
          <>
            {campo("nacionalidade", "Nacionalidade", { classe: "c2", uso: true, ajuda: "Ex.: brasileira" })}
            {selecao("estadoCivil", "Estado civil", ESTADOS_CIVIS, { classe: "c2", uso: true })}
            {campo("profissao", "Profissão", { classe: "c2", uso: true })}
            {campo("rg", "RG", { classe: "c2", uso: true })}
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
            {campoContato("telefone", "Telefone ou WhatsApp", { classe: "c3", tipo: "tel", modo: "tel", ajuda: pf ? "Para falar com o cliente." : "Telefone ou e-mail: pelo menos um." })}
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
        {origem}
        {qualificacao}
        {novo ? null : contatosEdit}
        <div className="form-pe">
          <span className="esq-pe">
            {novo
              ? "Os campos sem “(opcional)” são obrigatórios. O cadastro fica no histórico do escritório, com seu nome e a hora."
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
