"use client";
// Aba Ficha (CO-02), tela aprovada em docs/design/aprovadas/console-v1 (ficha.html?aba=ficha):
// ver e editar são dois estados da mesma aba. Ao salvar, os erros ficam presos aos campos,
// com um resumo no topo; se outra pessoa salvou antes, a tela diz quem e quando, compara e
// deixa escolher a versão (PT-19).

import { useId, useRef, useState, type ReactNode } from "react";
import { UFS } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  camposDiferentes,
  conferirFicha,
  formatarCnpj,
  formatarTelefone,
  novaChave,
  rascunhoDe,
  type ErrosFicha,
  type FichaDoCliente,
  type Nota,
  type RascunhoFicha,
} from "./ficha.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro } from "./pecas.tsx";
import { LateralResumo, LateralTratar, UltimaNota } from "./Laterais.tsx";
import { hora } from "./tempo.ts";

const MAX_CONTATOS = 10;

function Grade({ principal, lateral }: { principal: ReactNode; lateral: ReactNode }) {
  return (
    <div className="grade">
      <div className="col">{principal}</div>
      <aside className="col" aria-label="Contexto do escritório">
        {lateral}
      </aside>
    </div>
  );
}

function Ver({ f, nota, aoEditar }: { f: FichaDoCliente; nota: Nota | null; aoEditar: () => void }) {
  const ids = useId();
  const e = f.escritorio;
  const pode = f.permissoes.includes("console.ficha.editar");
  const contatos = e.contatos ?? [];
  return (
    <Grade
      principal={
        <>
          <section className="folha" aria-labelledby={`${ids}-dados`} style={{ overflow: "hidden" }}>
            <div className="folha-cab">
              <h2 id={`${ids}-dados`}>Dados do escritório</h2>
              {pode ? (
                <div className="acoes">
                  <button className="btn btn-sec" type="button" onClick={aoEditar}>
                    <Icone nome="lapis" className="ico" />
                    Editar ficha
                  </button>
                </div>
              ) : null}
            </div>
            <dl className="dados-ficha">
              <div>
                <dt>Nome</dt>
                <dd>{e.nome}</dd>
              </div>
              <div>
                <dt>CNPJ</dt>
                {e.cnpj ? (
                  <dd>
                    <span className="num">{formatarCnpj(e.cnpj)}</span>
                    <span className="selo selo-ok">
                      <Icone nome="check" className="ico" />
                      Dígitos conferidos
                    </span>
                  </dd>
                ) : (
                  <dd className="falta">Não informado</dd>
                )}
              </div>
              <div>
                <dt>Cidade</dt>
                <dd>{e.cidade ? `${e.cidade}${e.uf ? `, ${e.uf}` : ""}` : "Não informada"}</dd>
              </div>
              <div>
                <dt>Endereço</dt>
                {e.endereco ? <dd>{e.endereco}</dd> : <dd className="falta">Não informado</dd>}
              </div>
            </dl>
            {!pode ? (
              <p className="permissao" style={{ padding: "12px 24px" }}>
                <Icone nome="cadeado" className="ico" />
                Você consulta a ficha. Quem edita é a Implantação ou a Administração.
              </p>
            ) : null}
          </section>
          <section className="folha" aria-labelledby={`${ids}-contatos`}>
            <div className="folha-cab">
              <div>
                <h2 id={`${ids}-contatos`}>Contatos</h2>
                {contatos.length ? <p className="sub">{contatos.length} de até {MAX_CONTATOS}</p> : null}
              </div>
            </div>
            {contatos.length === 0 ? (
              <div className="folha-corpo">
                <Estado icone="telefone" titulo="Nenhum contato ainda"
                  acoes={pode ? (
                    <button className="btn btn-pri" type="button" onClick={aoEditar}>
                      <Icone nome="mais" className="ico" />
                      Adicionar contato
                    </button>
                  ) : undefined}>
                  Cadastre ao menos uma pessoa do escritório com telefone ou e-mail. Sem contato, o escritório aparece com “Sem contato” na carteira.
                </Estado>
              </div>
            ) : (
              <ul className="lista">
                {contatos.map((c, i) => (
                  <li key={`${c.nome}-${i}`} className="contato">
                    <div>
                      <strong>{c.nome}</strong>
                      <small>{c.papel}</small>
                    </div>
                    {c.telefone ? (
                      <a href={`tel:${c.telefone}`}>
                        <Icone nome="telefone" className="ico" />
                        <span className="num">{formatarTelefone(c.telefone)}</span>
                      </a>
                    ) : (
                      <span className="sem">Sem telefone</span>
                    )}
                    {c.email ? (
                      <a href={`mailto:${c.email}`}>
                        <Icone nome="envelope" className="ico" />
                        {c.email}
                      </a>
                    ) : (
                      <span className="sem">Sem e-mail</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      }
      lateral={
        <>
          <LateralTratar f={f} />
          <LateralResumo f={f} />
          {nota ? <UltimaNota nota={nota} /> : null}
        </>
      }
    />
  );
}

function Mudou() {
  return <span className="mudou">Mudou</span>;
}

function Editar({ f, aoSair, aoSalvar, aoConflito }: {
  f: FichaDoCliente;
  aoSair: () => void;
  aoSalvar: () => Promise<void>;
  /** Recarrega a ficha depois de um conflito, para comparar com o que foi salvo. */
  aoConflito: () => Promise<void>;
}) {
  const ids = useId();
  const form = useRef<HTMLFormElement>(null);
  const [r, setR] = useState<RascunhoFicha>(() => rascunhoDe(f));
  const [erros, setErros] = useState<ErrosFicha>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [conflito, setConflito] = useState(false);
  const salvo = rascunhoDe(f);
  const diferencas = conflito ? camposDiferentes(salvo, r) : [];
  const mudou = (campo: string) => diferencas.some((d) => d.campo === campo);

  const mudar = <K extends keyof RascunhoFicha>(k: K, v: RascunhoFicha[K]) => setR((x) => ({ ...x, [k]: v }));
  const mudarContato = (chave: number, campo: "nome" | "papel" | "telefone" | "email", v: string) =>
    setR((x) => ({ ...x, contatos: x.contatos.map((c) => (c.chave === chave ? { ...c, [campo]: v } : c)) }));

  async function salvar() {
    setErro(null);
    const v = conferirFicha(r, f.escritorio.versao);
    if (!v.ok) {
      setErros(v.erros);
      focarPrimeiroErro(form.current);
      return;
    }
    setErros({});
    setSalvando(true);
    const resp = await chamarConsole<{ versao: number }>(`/v1/clientes/${f.escritorio.id}/ficha`, { metodo: "PUT", corpo: v.corpo });
    setSalvando(false);
    if (resp.ok) {
      setConflito(false);
      await aoSalvar();
      return;
    }
    if (resp.erro.codigo === "VERSION_CONFLICT") {
      await aoConflito();
      setConflito(true);
      return;
    }
    const campos = resp.erro.detalhes?.campos;
    if (resp.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length === 1 && campos[0] === "cnpj") {
      setErros({ cnpj: "Este CNPJ já é de outro escritório. Confira o número." });
      focarPrimeiroErro(form.current);
      return;
    }
    setErro(resp.erro);
  }

  const nErros = Object.keys(erros).length;
  const campo = (chave: "nome" | "cnpj" | "cidade" | "endereco", rotulo: string, extra: {
    opcional?: boolean; ajuda?: string; classe: string; auto?: string; modo?: "numeric"; mudouCampo?: string;
  }) => {
    const id = `${ids}-${chave}`;
    const e = erros[chave];
    return (
      <div className={`campo ${extra.classe}`}>
        <label htmlFor={id}>
          {rotulo}
          {extra.opcional ? <span className="opcional"> (opcional)</span> : null}
          {extra.mudouCampo && mudou(extra.mudouCampo) ? <Mudou /> : null}
        </label>
        <input className="entrada" id={id} value={r[chave]} onChange={(ev) => mudar(chave, ev.target.value)}
          autoComplete={extra.auto ?? "off"} inputMode={extra.modo}
          aria-invalid={e ? true : undefined} aria-describedby={descritoPor(e && `${id}-erro`, !e && extra.ajuda && `${id}-ajuda`)} />
        {e ? <ErroCampo id={`${id}-erro`}>{e}</ErroCampo> : null}
        {!e && extra.ajuda ? (
          <p className="ajuda" id={`${id}-ajuda`}>
            {extra.ajuda}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Grade
      principal={
        <section className="folha" aria-labelledby={`${ids}-t`}>
          <div className="folha-cab">
            <div>
              <h2 id={`${ids}-t`}>Editar ficha</h2>
              <p className="sub">Os campos sem “(opcional)” são obrigatórios.</p>
            </div>
          </div>
          <form ref={form} className="form-folha" noValidate onSubmit={(ev) => { ev.preventDefault(); void salvar(); }}>
            {nErros ? (
              <div className="c6">
                <Aviso tom="urgencia" titulo={faltaAcertar(nErros)}>A ficha não foi salva. O resto do que você escreveu continua aqui.</Aviso>
              </div>
            ) : null}
            {erro ? (
              <div className="c6">
                <Aviso tom="urgencia" titulo="A ficha não foi salva.">{textoDoErro(erro)} O que você escreveu continua aqui.</Aviso>
              </div>
            ) : null}
            {conflito ? (
              <div className="c6">
                <Aviso tom="urgencia"
                  titulo={f.fichaAlteradaPor && f.fichaAlteradaEm
                    ? `${f.fichaAlteradaPor} salvou esta ficha às ${hora(f.fichaAlteradaEm)}, enquanto você editava.`
                    : "Outra pessoa salvou esta ficha enquanto você editava."}
                  acoes={
                    <>
                      {diferencas.length ? (
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
                            {diferencas.map((d) => (
                              <tr key={d.campo}>
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
                        <button className="btn btn-sec" type="button" onClick={() => { setConflito(false); setR(rascunhoDe(f)); aoSair(); }}>
                          Ficar com a versão salva
                        </button>
                      </div>
                    </>
                  }>
                  {diferencas.length
                    ? `Nada do que você escreveu se perdeu. Compare ${diferencas.length === 1 ? "o campo que mudou" : `os ${diferencas.length} campos que mudaram`} e escolha qual versão fica.`
                    : "Nada do que você escreveu se perdeu. A versão salva é igual à sua; salve para confirmar."}
                </Aviso>
              </div>
            ) : null}
            {campo("nome", "Nome do escritório", { classe: "c4", auto: "organization", mudouCampo: "Nome" })}
            {campo("cnpj", "CNPJ", { classe: "c2", opcional: true, ajuda: "Conferimos os dígitos ao salvar.", modo: "numeric", mudouCampo: "CNPJ" })}
            {campo("cidade", "Cidade", { classe: "c4", auto: "address-level2", mudouCampo: "Cidade" })}
            <div className="campo c2">
              <label htmlFor={`${ids}-uf`}>UF{mudou("UF") ? <Mudou /> : null}</label>
              <select className="entrada" id={`${ids}-uf`} value={r.uf} onChange={(ev) => mudar("uf", ev.target.value)}
                aria-invalid={erros.uf ? true : undefined} aria-describedby={erros.uf ? `${ids}-uf-erro` : undefined}>
                <option value="">Escolha</option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              {erros.uf ? <ErroCampo id={`${ids}-uf-erro`}>{erros.uf}</ErroCampo> : null}
            </div>
            {campo("endereco", "Endereço", { classe: "c6", opcional: true, auto: "street-address", mudouCampo: "Endereço" })}
            <fieldset className="contatos-edit">
              <legend>
                Contatos{mudou("Contatos") ? <Mudou /> : null}
                <small>Até 10. Cada um precisa de telefone ou e-mail.</small>
              </legend>
              {r.contatos.map((c, i) => {
                const par = erros[`contato.${c.chave}.par`];
                const base = `${ids}-ct${c.chave}`;
                const entrada = (k: "nome" | "papel" | "telefone" | "email", rotulo: string, tipo: string) => {
                  const e = erros[`contato.${c.chave}.${k}`];
                  const invalido = !!e || (!!par && (k === "telefone" || k === "email"));
                  return (
                    <div className="campo">
                      <label htmlFor={`${base}-${k}`}>{rotulo}</label>
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
                    <button className="remover" type="button" aria-label={`Remover o contato ${c.nome.trim() || i + 1}`}
                      onClick={() => setR((x) => ({ ...x, contatos: x.contatos.filter((y) => y.chave !== c.chave) }))}>
                      <Icone nome="xis" className="ico" />
                    </button>
                    {par ? (
                      <p className="erro-msg erro-par" id={`${base}-par`}>
                        <Icone nome="alerta" className="ico ico-s" />
                        {par}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {r.contatos.length < MAX_CONTATOS ? (
                <div>
                  <button className="btn btn-fantasma" type="button"
                    onClick={() => setR((x) => ({ ...x, contatos: [...x.contatos, { chave: novaChave(), nome: "", papel: "", telefone: "", email: "" }] }))}>
                    <Icone nome="mais" className="ico" />
                    Adicionar contato
                  </button>
                </div>
              ) : null}
            </fieldset>
            <div className="form-pe">
              <button className="btn btn-fantasma" type="button" onClick={aoSair}>
                Cancelar
              </button>
              <button className="btn btn-pri" type="submit" disabled={salvando}>
                <Icone nome="check" className="ico" />
                {salvando ? "Salvando…" : "Salvar ficha"}
              </button>
            </div>
          </form>
        </section>
      }
      lateral={
        <section className="explica campo-ambar" aria-labelledby={`${ids}-ex`}>
          <p className="sobretitulo">Editando</p>
          <h2 id={`${ids}-ex`}>A ficha é do escritório.</h2>
          <ul>
            <li>
              <Icone nome="escudo" className="ico" />
              <span>O sócio vê estes dados no Portal. Notas e contrato ficam só com a equipe.</span>
            </li>
            <li>
              <Icone nome="historico" className="ico" />
              <span>Cada mudança vai para o histórico, com seu nome e os campos alterados.</span>
            </li>
            <li>
              <Icone nome="pessoas" className="ico" />
              <span>Se outra pessoa salvar antes, avisamos e você escolhe qual versão fica.</span>
            </li>
          </ul>
        </section>
      }
    />
  );
}

export function AbaFichaDados({ f, nota, recarregar, editarAoAbrir }: {
  f: FichaDoCliente;
  nota: Nota | null;
  recarregar: () => Promise<void>;
  editarAoAbrir?: boolean;
}) {
  const pode = f.permissoes.includes("console.ficha.editar");
  const [editando, setEditando] = useState(!!editarAoAbrir && pode);
  const [salva, setSalva] = useState(false);
  if (editando) {
    return (
      <Editar f={f} aoSair={() => setEditando(false)} aoConflito={recarregar}
        aoSalvar={async () => { await recarregar(); setEditando(false); setSalva(true); }} />
    );
  }
  return (
    <>
      {salva ? <Aviso tom="sucesso" titulo="Ficha salva.">A mudança ficou no histórico, com seu nome e os campos alterados.</Aviso> : null}
      <Ver f={f} nota={nota} aoEditar={() => { setSalva(false); setEditando(true); }} />
    </>
  );
}
