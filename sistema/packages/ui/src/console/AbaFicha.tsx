"use client";
// Aba Ficha (CO-02), tela aprovada em docs/design/aprovadas/console-v1 (ficha.html?aba=ficha):
// ver e editar são dois estados da mesma aba. Ao salvar, os erros ficam presos aos campos,
// com um resumo no topo; se outra pessoa salvou antes, a tela diz quem e quando, compara e
// deixa escolher a versão (PT-19).

import { soLeitura } from "./FimContrato.tsx";
import { useId, useRef, useState, type ReactNode } from "react";
import { TEXTO_ERRO_ESCRITORIO, TIPOS_ESCRITORIO, UFS, type TipoEscritorio } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import {
  camposDiferentes,
  conferirFicha,
  formatarCnpj,
  formatarTelefone,
  novaChave,
  rascunhoDe,
  sedeDaFicha,
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
                <dt>Tipo</dt>
                {e.tipo ? <dd>{TIPOS_ESCRITORIO[e.tipo].nome}</dd> : <dd className="falta">Não informado</dd>}
              </div>
              {e.tipo === "SEM_SOCIEDADE" ? null : (
                <>
                  <div>
                    <dt>Razão social</dt>
                    {e.razaoSocial ? <dd>{e.razaoSocial}</dd> : <dd className="falta">Não informada</dd>}
                  </div>
                  <div>
                    <dt>Registro da sociedade na OAB</dt>
                    {e.oab ? <dd className="num">{e.oab}</dd> : <dd className="falta">Não informado</dd>}
                  </div>
                </>
              )}
              <div>
                <dt>Sede</dt>
                {sedeDaFicha(f) ? (
                  <dd>
                    {sedeDaFicha(f)}
                    {e.enderecoConfira ? <span className="selo selo-atencao">Confira: texto antigo</span> : null}
                  </dd>
                ) : (
                  <dd className="falta">Não informada</dd>
                )}
              </div>
              {e.telefone || e.email || e.site ? (
                <div>
                  <dt>Contato do escritório</dt>
                  <dd>{[e.telefone ? formatarTelefone(e.telefone.startsWith("+") ? e.telefone : `+55${e.telefone}`) : null, e.email, e.site].filter(Boolean).join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
            {!pode ? (
              <p className="permissao" style={{ padding: "12px 24px" }}>
                <Icone nome="cadeado" className="ico" />
                {soLeitura(f) ? "Contrato encerrado: a ficha não muda mais." : "Você consulta a ficha. Quem edita é a Implantação ou a Administração."}
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
    const motivos = resp.erro.detalhes?.motivos as Record<string, string> | undefined;
    if (resp.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length === 1 && campos[0] === "cnpj") {
      setErros({ cnpj: "Este CNPJ já é de outro escritório. Confira o número." });
      focarPrimeiroErro(form.current);
      return;
    }
    if (resp.erro.codigo === "VALIDATION_ERROR" && motivos) {
      setErros(Object.fromEntries(Object.entries(motivos).map(([k, m]) => [k, TEXTO_ERRO_ESCRITORIO[m] ?? "Confira este campo."])));
      focarPrimeiroErro(form.current);
      return;
    }
    setErro(resp.erro);
  }

  const nErros = Object.keys(erros).length;
  type CampoTexto = "nome" | "cnpj" | "cidade" | "razaoSocial" | "oabNumero" | "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "telefone" | "email" | "site";
  const campo = (chave: CampoTexto, rotulo: string, extra: {
    opcional?: boolean; ajuda?: string; classe: string; auto?: string; modo?: "numeric" | "tel"; mudouCampo?: string; tipo?: string;
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
        <input className="entrada" id={id} type={extra.tipo ?? "text"} value={r[chave]} onChange={(ev) => mudar(chave, ev.target.value)}
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
              <p className="sub">Os campos sem “(opcional)” são obrigatórios. O que ficar em branco sai marcado nos documentos do escritório.</p>
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
            <h3 className="dd-sec">Quem é o escritório</h3>
            {campo("nome", "Nome no T3jus", { classe: "c6", auto: "organization", mudouCampo: "Nome", ajuda: "O nome curto, do Console, do Portal e das conversas. Não sai nos documentos." })}
            <fieldset className="grupo-opcoes dd-tipos">
              <legend>Tipo{mudou("Tipo") ? <Mudou /> : null}</legend>
              <div className="dd-ops">
                {(Object.keys(TIPOS_ESCRITORIO) as TipoEscritorio[]).map((t) => (
                  <label key={t} className="opcao">
                    <input className="marcar" type="radio" name={`${ids}-tipo`} checked={r.tipo === t} onChange={() => mudar("tipo", t)} />
                    <span>
                      {TIPOS_ESCRITORIO[t].nome}
                      <small>{TIPOS_ESCRITORIO[t].explica}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {r.tipo === "SEM_SOCIEDADE" ? null : (
              <>
                {campo("razaoSocial", "Razão social", { classe: "c6", opcional: true, mudouCampo: "Razão social", ajuda: "Como no registro da OAB e no CNPJ. Sai em maiúsculas no contrato." })}
                {campo("cnpj", "CNPJ", { classe: "c2", opcional: true, ajuda: "Conferimos os dígitos ao salvar.", modo: "numeric", mudouCampo: "CNPJ" })}
            <div className="campo c2">
              <label htmlFor={`${ids}-oabUf`}>Registro na OAB: seccional{mudou("Registro na OAB") ? <Mudou /> : null}</label>
              <select className="entrada" id={`${ids}-oabUf`} value={r.oabUf} onChange={(ev) => mudar("oabUf", ev.target.value)}
                aria-invalid={erros.oabUf ? true : undefined} aria-describedby={erros.oabUf ? `${ids}-oabUf-erro` : undefined}>
                <option value="">Escolha</option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              {erros.oabUf ? <ErroCampo id={`${ids}-oabUf-erro`}>{erros.oabUf}</ErroCampo> : null}
            </div>
                {campo("oabNumero", "Registro na OAB: número", { classe: "c2", modo: "numeric", mudouCampo: "Registro na OAB", ajuda: "O da sociedade; em branco se não houver." })}
              </>
            )}
            <h3 className="dd-sec">Onde fica</h3>
            <fieldset className="end-grupo" aria-describedby={`${ids}-end-aj`}>
              <legend>Endereço da sede{mudou("Sede") ? <Mudou /> : null}</legend>
              <p className="ajuda" id={`${ids}-end-aj`}>
                Sai no contrato, na procuração, nas petições e no timbrado. É o padrão do endereço de cobrança e do endereço profissional dos advogados.
              </p>
              {f.escritorio.enderecoConfira && f.escritorio.endereco ? (
                <Aviso tom="atencao" titulo="Confira a sede: ela veio do cadastro antigo, num texto só.">
                  O texto antigo está em “Rua”. Deixe ali só a rua e passe o número, o complemento e o bairro para os campos certos.
                </Aviso>
              ) : null}
              <div className="end-grade">
                {campo("cep", "CEP", { classe: "e2", auto: "postal-code", modo: "numeric", ajuda: "Só números ou com hífen." })}
                {campo("logradouro", "Rua, avenida ou travessa", { classe: "e4", auto: "address-line1" })}
                {campo("numero", "Número", { classe: "e1", ajuda: "Sem número: S/N." })}
                {campo("complemento", "Complemento", { classe: "e2", opcional: true, auto: "address-line2" })}
                {campo("bairro", "Bairro", { classe: "e3", auto: "address-level3" })}
                {campo("cidade", "Cidade", { classe: "e4", auto: "address-level2", mudouCampo: "Cidade" })}
                <div className="campo e2">
                  <label htmlFor={`${ids}-uf`}>UF{mudou("UF") ? <Mudou /> : null}</label>
                  <select className="entrada" id={`${ids}-uf`} value={r.uf} onChange={(ev) => mudar("uf", ev.target.value)} autoComplete="address-level1"
                    aria-invalid={erros.uf ? true : undefined} aria-describedby={erros.uf ? `${ids}-uf-erro` : undefined}>
                    <option value="">Escolha</option>
                    {UFS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  {erros.uf ? <ErroCampo id={`${ids}-uf-erro`}>{erros.uf}</ErroCampo> : null}
                </div>
              </div>
            </fieldset>
            <h3 className="dd-sec">Como falar com o escritório</h3>
            {campo("telefone", "Telefone do escritório", { classe: "c3", opcional: true, tipo: "tel", modo: "tel", mudouCampo: "Telefone", ajuda: "Vai no timbrado do recibo e do carnê." })}
            {campo("email", "E-mail do escritório", { classe: "c3", opcional: true, tipo: "email", mudouCampo: "E-mail", ajuda: "Vai no timbrado; nas petições, se o modelo pedir." })}
            {campo("site", "Site", { classe: "c6", opcional: true, mudouCampo: "Site", ajuda: "Só no timbrado do recibo." })}
            <fieldset className="contatos-edit">
              <legend>
                Contatos{mudou("Contatos") ? <Mudou /> : null}
                <small>Com quem a equipe T3jus fala. Até 10, cada um com telefone ou e-mail. Não saem nos documentos.</small>
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
              <p className="esq-pe">Vale para os próximos documentos; os já gerados não mudam.</p>
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
              <span>A sócia dona vê estes dados no Portal e também pode mudá-los, em Escritório › Dados do escritório. A última mudança vale.</span>
            </li>
            <li>
              <Icone nome="doc" className="ico" />
              <span>Razão social, CNPJ, registro na OAB e sede saem no contrato, na procuração, nas petições e no timbrado.</span>
            </li>
            <li>
              <Icone nome="historico" className="ico" />
              <span>Cada mudança vai para o histórico, com seu nome, onde foi feita (Console ou Portal) e os campos alterados.</span>
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
