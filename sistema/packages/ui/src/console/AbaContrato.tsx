"use client";
// Aba Contrato e documentos (CO-01, CO-02, CO-05), tela aprovada em
// docs/design/aprovadas/console-v1 (ficha.html?aba=contrato): referência do contrato (só a
// Administração muda), documentos do cliente (enviar, abrir e baixar; nada se apaga) e o
// estágio, que só anda para a frente e pede o motivo.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CATEGORIAS_DOCUMENTO, ESTAGIOS, ESTAGIOS_CARTEIRA, etapasImplantacao, type CategoriaDocumento } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { enviarArquivo, problemaDoArquivo, tamanhoLegivel, tipoDoArquivo, tipoLegivel, type DocumentoCliente } from "./documentos.ts";
import type { FichaDoCliente } from "./ficha.ts";
import { AcaoEncerrar, dataBr, FolhaFim, JanelaEncerrar, soLeitura, TrajetoTres } from "./FimContrato.tsx";
import { type EventoHistorico } from "./historico.ts";
import { LateralTratar } from "./Laterais.tsx";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, Janela } from "./pecas.tsx";
import { dataHora, dataLonga } from "./tempo.ts";

const MAX_REFERENCIA = 120;

function Referencia({ f, recarregar }: { f: FichaDoCliente; recarregar: () => Promise<void> }) {
  const ids = useId();
  const fechada = soLeitura(f);
  const pode = f.permissoes.includes("console.contrato.editar") && !fechada;
  const ref = f.cliente.referenciaContrato;
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(ref ?? "");
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [salvando, setSalvando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) entrada.current?.focus();
  }, [editando]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/contrato`, {
      metodo: "PUT", corpo: { versao: f.cliente.versao, referenciaContrato: valor.trim() || null },
    });
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      if (r.erro.codigo === "VERSION_CONFLICT") await recarregar();
      return;
    }
    await recarregar();
    setEditando(false);
  }

  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Referência do contrato</h2>
          <p className="sub">Texto curto, até 120 caracteres.</p>
        </div>
        {pode && ref && !editando ? (
          <div className="acoes">
            <button className="btn btn-sec" type="button" onClick={() => { setValor(ref); setEditando(true); }}>
              <Icone nome="lapis" className="ico" />
              Editar referência
            </button>
          </div>
        ) : null}
      </div>
      {editando ? (
        <form className="form-folha" noValidate style={{ paddingTop: 0 }} onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
          {erro ? (
            <div className="c6">
              <Aviso tom="urgencia" titulo="A referência não foi salva.">
                {erro.codigo === "VERSION_CONFLICT"
                  ? "Outra pessoa mudou o contrato enquanto você editava. Confira a referência salva e salve de novo se precisar."
                  : textoDoErro(erro)}
              </Aviso>
            </div>
          ) : null}
          <div className="campo c6">
            <div className="campo-linha">
              <label htmlFor={`${ids}-ref`}>Referência do contrato</label>
              <span className="contador" id={`${ids}-cont`}>
                {valor.length} de {MAX_REFERENCIA} caracteres
              </span>
            </div>
            <input ref={entrada} className="entrada" id={`${ids}-ref`} value={valor} maxLength={MAX_REFERENCIA} autoComplete="off"
              onChange={(e) => setValor(e.target.value)} aria-describedby={`${ids}-ajuda ${ids}-cont`} />
            <p className="ajuda" id={`${ids}-ajuda`}>
              Número, pasta ou link que leva ao contrato assinado. O arquivo vai em Documentos, logo abaixo.
            </p>
          </div>
          <div className="form-pe">
            <button className="btn btn-fantasma" type="button" onClick={() => { setEditando(false); setErro(null); }}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" disabled={salvando}>
              <Icone nome="check" className="ico" />
              {salvando ? "Salvando…" : "Salvar referência"}
            </button>
          </div>
        </form>
      ) : ref ? (
        <>
          <div className="referencia">
            <Icone nome="pena" className="ico" />
            <div>
              <strong>{ref}</strong>
            </div>
          </div>
          {pode ? (
            <div style={{ height: 18 }} />
          ) : (
            <p className="permissao" style={{ padding: "8px 24px 18px" }}>
              <Icone nome="cadeado" className="ico" />
              {fechada ? "Contrato encerrado: a referência não muda mais." : "Só a Administração altera a referência do contrato."}
            </p>
          )}
        </>
      ) : (
        <div className="folha-corpo">
          <Estado icone="pena" titulo="Nenhuma referência de contrato"
            acoes={pode ? (
              <button className="btn btn-pri" type="button" onClick={() => { setValor(""); setEditando(true); }}>
                <Icone nome="mais" className="ico" />
                Registrar referência
              </button>
            ) : (
              <p className="permissao">
                <Icone nome="cadeado" className="ico" />
                Só a Administração registra o contrato.
              </p>
            )}>
            Registre o número, a pasta ou o link do contrato assinado. Enquanto não houver, o escritório aparece com “Sem contrato” na carteira.
          </Estado>
        </div>
      )}
    </section>
  );
}

interface ItemFila {
  chave: number;
  arquivo: File;
  categoria: CategoriaDocumento;
  estado: "fila" | "enviando" | "erro";
  progresso: number;
  erro?: string;
  /** Erro de rede ou do servidor: dá para tentar de novo. */
  deNovo?: boolean;
}

let chaveFila = 1;

function Documentos({ f, aoMudar }: { f: FichaDoCliente; aoMudar: () => void }) {
  const ids = useId();
  const id = f.escritorio.id;
  const pode = f.permissoes.includes("console.documentos.enviar");
  const [docs, setDocs] = useState<DocumentoCliente[] | null>(null);
  const [erroLista, setErroLista] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDocumento>("DOCUMENTO_ESCRITORIO");
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erroAbrir, setErroAbrir] = useState<{ doc: string; erro: ErroApi } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const enviandoAgora = useRef(false);

  const carregar = useCallback(async () => {
    setErroLista(false);
    const r = await chamarConsole<{ documentos: DocumentoCliente[] }>(`/v1/clientes/${id}/documentos`);
    if (r.ok) setDocs(r.dados.documentos);
    else if (r.status !== 401) setErroLista(true);
  }, [id]);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => carregar());
  }, [carregar]);

  const mudarItem = (chave: number, m: Partial<ItemFila>) => setFila((l) => l.map((i) => (i.chave === chave ? { ...i, ...m } : i)));

  const enviarUm = useCallback(async (item: ItemFila): Promise<boolean> => {
    const tipo = tipoDoArquivo(item.arquivo.name, item.arquivo.type)!;
    mudarItem(item.chave, { estado: "enviando", progresso: 0, erro: undefined });
    const ini = await chamarConsole<{ id: string; enderecoDeEnvio: string }>(`/v1/clientes/${id}/documentos`, {
      corpo: { categoria: item.categoria, nome: item.arquivo.name, tipo, tamanho: item.arquivo.size },
    });
    if (!ini.ok) {
      mudarItem(item.chave, { estado: "erro", erro: textoDoErro(ini.erro), deNovo: ini.status === 0 || ini.status >= 500 });
      return false;
    }
    const foi = await enviarArquivo(ini.dados.enderecoDeEnvio, item.arquivo, tipo, (p) => mudarItem(item.chave, { progresso: p }));
    const fim = foi ? await chamarConsole(`/v1/clientes/${id}/documentos/${ini.dados.id}/concluir`, { corpo: {} }) : null;
    if (!fim?.ok) {
      mudarItem(item.chave, { estado: "erro", erro: "O envio caiu no meio. O arquivo não foi guardado.", deNovo: true });
      return false;
    }
    setFila((l) => l.filter((i) => i.chave !== item.chave));
    return true;
  }, [id]);

  /** Envia os da fila, um por vez (o progresso de cada um fica claro). */
  const processar = useCallback(async (itens: ItemFila[]) => {
    if (enviandoAgora.current) return;
    enviandoAgora.current = true;
    let algum = false;
    for (const item of itens) algum = (await enviarUm(item)) || algum;
    enviandoAgora.current = false;
    if (algum) {
      await carregar();
      aoMudar();
    }
  }, [enviarUm, carregar, aoMudar]);

  function escolher(lista: FileList | null) {
    if (!lista?.length) return;
    const novos: ItemFila[] = [...lista].map((arquivo) => {
      const problema = problemaDoArquivo(arquivo.name, arquivo.type, arquivo.size);
      return { chave: chaveFila++, arquivo, categoria, estado: problema ? "erro" : "fila", progresso: 0, erro: problema ?? undefined };
    });
    setFila((l) => [...l.filter((i) => i.estado !== "erro"), ...novos]);
    void processar(novos.filter((i) => i.estado === "fila"));
  }

  async function abrir(doc: DocumentoCliente, baixar: boolean) {
    setAbrindo(`${doc.id}:${baixar ? "b" : "a"}`);
    setErroAbrir(null);
    const r = await chamarConsole<{ url: string }>(`/v1/clientes/${id}/documentos/${doc.id}/abrir`, { corpo: {} });
    setAbrindo(null);
    if (!r.ok) return setErroAbrir({ doc: doc.id, erro: r.erro });
    if (baixar) {
      const a = document.createElement("a");
      a.href = r.dados.url;
      a.rel = "noopener";
      a.click();
    } else {
      // Abrir mostra no navegador: o mesmo link, sem pedir para baixar.
      const u = new URL(r.dados.url);
      u.searchParams.delete("download");
      window.open(u.toString(), "_blank", "noopener");
    }
  }

  const comErro = fila.filter((i) => i.estado === "erro");
  const enviando = fila.filter((i) => i.estado !== "erro");
  const atual = enviando.find((i) => i.estado === "enviando");

  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-t`}>Documentos</h2>
          {docs ? (
            <p className="sub">
              {docs.length === 0 ? "Nenhum arquivo" : docs.length === 1 ? "1 arquivo" : `${docs.length} arquivos`}
              {docs.length > 1 ? " · do mais novo para o mais antigo" : ""}
            </p>
          ) : null}
        </div>
      </div>
      {erroLista ? (
        <div className="folha-corpo">
          <ErroAoCarregar oque="os documentos" aoTentar={() => void carregar()} />
        </div>
      ) : docs === null ? (
        <div className="folha-corpo" aria-busy="true">
          <p className="sr" role="status">
            Carregando os documentos…
          </p>
          <span className="esqueleto esq-linha" aria-hidden="true" style={{ display: "block", width: "60%" }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="folha-corpo" style={{ paddingBottom: 4 }}>
          <Estado icone="doc" titulo="Nenhum documento ainda">
            Guarde aqui o contrato assinado, a proposta e os documentos do escritório. Tudo o que for enviado fica guardado.
          </Estado>
        </div>
      ) : (
        <ul className="lista docs">
          {docs.map((d) => (
            <li key={d.id}>
              <span className="doc-ico" aria-hidden="true">
                <Icone nome={d.tipo === "application/pdf" ? "doc" : "imagem"} className="ico" />
              </span>
              <div>
                <span className="doc-nome">{d.nome}</span>
                <p className="doc-meta">
                  <span className="selo selo-neutro">{CATEGORIAS_DOCUMENTO[d.categoria as CategoriaDocumento] ?? d.categoria}</span>
                  <span>
                    {tipoLegivel(d.tipo)} · {tamanhoLegivel(d.tamanho)}
                  </span>
                  <span>
                    {d.enviadoPor.nome ?? "Equipe T3jus"} · {dataHora(d.enviadoEm)}
                  </span>
                </p>
                {erroAbrir?.doc === d.id ? <ErroCampo id={`${ids}-${d.id}-erro`}>{textoDoErro(erroAbrir.erro)}</ErroCampo> : null}
              </div>
              <div className="doc-acoes">
                {(["a", "b"] as const).map((k) => {
                  const ocupado = abrindo === `${d.id}:${k}`;
                  return (
                    <button key={k} className={k === "a" ? "btn btn-sec btn-compacto" : "btn btn-fantasma btn-compacto"} type="button"
                      aria-label={ocupado ? undefined : `${k === "a" ? "Abrir" : "Baixar"} ${d.nome}`}
                      aria-busy={ocupado || undefined} aria-disabled={ocupado || undefined}
                      onClick={() => { if (!abrindo) void abrir(d, k === "b"); }}>
                      {ocupado ? "Gerando link…" : (
                        <>
                          <Icone nome={k === "a" ? "olho" : "baixar"} className="ico ico-s" />
                          {k === "a" ? "Abrir" : "Baixar"}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {abrindo ? (
        <p className="sr" role="status">
          Gerando um link temporário.
        </p>
      ) : null}
      <div style={{ padding: "6px 0 18px" }}>
        {pode ? (
          <div className="envio">
            <div className="campo">
              <label htmlFor={`${ids}-cat`}>Categoria dos próximos arquivos</label>
              <select className="entrada" id={`${ids}-cat`} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}>
                {(Object.keys(CATEGORIAS_DOCUMENTO) as CategoriaDocumento[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIAS_DOCUMENTO[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="soltar" style={arrastando ? { borderColor: "var(--vinho)", background: "var(--ambar-3)" } : undefined}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files); }}>
              <Icone nome="enviar" className="ico" />
              <p>
                <strong className="so-pc-t">Arraste os arquivos para cá ou</strong>
              </p>
              <input className="sr" type="file" id={`${ids}-arq`} multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                aria-describedby={`${ids}-regra`} onChange={(e) => { escolher(e.target.files); e.target.value = ""; }} />
              <label className="btn btn-sec" htmlFor={`${ids}-arq`}>
                <Icone nome="mais" className="ico" />
                Escolher arquivos
              </label>
              <p className="ajuda" id={`${ids}-regra`}>
                PDF, JPG ou PNG, até 10 MB por arquivo.
              </p>
            </div>
            {comErro.length ? (
              <Aviso tom="urgencia"
                titulo={comErro.length === 1 ? "1 arquivo não foi enviado." : `${comErro.length} arquivos não foram enviados.`}>
                Os outros continuam guardados. Veja o motivo de cada um abaixo.
              </Aviso>
            ) : null}
            {fila.length ? (
              <ul className="fila" aria-label={comErro.length && !enviando.length ? "Arquivos com problema" : "Envio em andamento"}>
                {fila.map((i) => (
                  <li key={i.chave} className={i.estado === "erro" ? "com-erro" : undefined}>
                    <Icone nome={i.estado === "erro" ? "alerta" : i.arquivo.type.startsWith("image/") ? "imagem" : "doc"} className="ico" />
                    <div>
                      <strong>{i.arquivo.name}</strong>
                      {i.estado === "erro" ? (
                        <p className="erro-msg">{i.erro}</p>
                      ) : (
                        <small>
                          {tipoLegivel(tipoDoArquivo(i.arquivo.name, i.arquivo.type) ?? "")} · {tamanhoLegivel(i.arquivo.size)} · {CATEGORIAS_DOCUMENTO[i.categoria]}
                        </small>
                      )}
                    </div>
                    {i.estado === "fila" ? <span className="selo selo-neutro">Na fila</span> : null}
                    {i.estado === "erro" && i.deNovo ? (
                      <button className="btn btn-sec btn-compacto" type="button" onClick={() => void processar([{ ...i, estado: "fila" }])}>
                        <Icone nome="reenviar" className="ico ico-s" />
                        Tentar de novo
                      </button>
                    ) : i.estado === "enviando" ? <span /> : null}
                    {i.estado === "enviando" ? (
                      <div className="barra">
                        <progress max={100} value={i.progresso} aria-label={`Enviando ${i.arquivo.name}`} />
                        <span aria-hidden="true">{i.progresso}%</span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {atual ? (
              <p className="sr" role="status">
                Enviando {enviando.length === 1 ? "1 arquivo" : `${enviando.length} arquivos`}. {atual.arquivo.name} em {atual.progresso}%.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="permissao" style={{ margin: "0 24px" }}>
            <Icone nome="cadeado" className="ico" />
            Você vê e baixa os documentos. Quem envia é a Implantação ou a Administração.
          </p>
        )}
      </div>
      <p className="docs-pe">
        <Icone nome="cadeado" className="ico" />
        Nada é apagado: cada arquivo fica guardado com quem enviou e quando. Abrir e Baixar geram um link temporário, que expira sozinho.
      </p>
    </section>
  );
}

function Estagio({ f, recarregar, abrirAoEntrar }: { f: FichaDoCliente; recarregar: () => Promise<void>; abrirAoEntrar: boolean }) {
  const ids = useId();
  const pode = f.permissoes.includes("console.estagio.mudar");
  const podeHistorico = f.permissoes.includes("console.historico.ver");
  const e = etapasImplantacao({ situacoes: f.situacoes, socios: f.socios, equipe: f.equipe });
  const pronta = e.proxima === null;
  const ativo = f.cliente.estagio === "ATIVO";
  const encerrado = f.cliente.estagio === "ENCERRADO";
  const [aberta, setAberta] = useState(abrirAoEntrar && pode && pronta && !ativo && !encerrado);
  const [encerrar, setEncerrar] = useState(false);
  const [encerrou, setEncerrou] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [mudancas, setMudancas] = useState<EventoHistorico[] | null>(null);

  const carregarMudancas = useCallback(async () => {
    if (!podeHistorico) return;
    const r = await chamarConsole<{ eventos: EventoHistorico[] }>(`/v1/clientes/${f.escritorio.id}/historico?limite=200`);
    if (r.ok) {
      setMudancas(r.dados.eventos.filter((x) => (x.acao === "estado.mudou" && x.entidade === "clientes") || x.acao === "escritorio.cadastrado"));
    }
  }, [f.escritorio.id, podeHistorico]);

  useEffect(() => {
    // Depois da montagem: a busca começa fora do efeito.
    void Promise.resolve().then(() => carregarMudancas());
  }, [carregarMudancas]);

  async function mudar() {
    setErro(null);
    if (!motivo.trim()) {
      setErroMotivo(true);
      document.getElementById(`${ids}-motivo`)?.focus();
      return;
    }
    setErroMotivo(false);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/estagio`, {
      metodo: "PUT", corpo: { versao: f.cliente.versao, estagio: "ATIVO", motivo: motivo.trim() },
    });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setAberta(false);
    setFeito(true);
    setMotivo("");
    await recarregar();
    await carregarMudancas();
  }

  const falta = e.lista.filter((x) => !x.feita).map((x) => x.nome);
  const soSocio = falta.length === 1 && e.proxima === "SOCIO_NO_PORTAL";
  const pendente = f.socios.find((s) => !s.senhaCriadaEm);

  return (
    <>
      {feito ? (
        <Aviso tom="sucesso" titulo={`${f.escritorio.nome} agora está Ativo.`}>O motivo ficou no histórico do cliente, com seu nome e a data.</Aviso>
      ) : null}
      {encerrou ? <Aviso tom="sucesso" titulo={encerrou}>O motivo ficou no histórico do cliente, com seu nome e a data.</Aviso> : null}
      <section className="folha" aria-labelledby={`${ids}-t`} style={{ paddingBottom: 22 }}>
        <div className="folha-cab">
          <div>
            <h2 id={`${ids}-t`}>Estágio</h2>
            <p className="sub">
              {f.encerramento?.situacao === "MARCADO"
                ? `Encerramento marcado para ${dataBr(f.encerramento.fimEm)}. Até lá, o cliente segue ${ESTAGIOS_CARTEIRA[f.cliente.estagio]}.`
                : encerrado && f.encerramento
                  ? `Encerrado em ${dataBr(f.encerramento.fimEm)}. O estágio não volta, a não ser que a Administração reabra o contrato.`
                  : "O estágio só anda para a frente. O fim do contrato é o último passo."}
            </p>
          </div>
        </div>
        <TrajetoTres f={f} desdeImplantacao={dataLonga(f.escritorio.criadoEm)} />
        {!ativo && !encerrado && pode ? (
          <div className="estagio-acao">
            {!pronta ? (
              <Aviso tom="atencao" titulo={soSocio ? "Falta o sócio para passar para Ativo." : "Faltam etapas para passar para Ativo."}
                acoes={soSocio ? (
                  <a className="btn btn-sec btn-compacto" href={`/clientes/${f.escritorio.id}/socio`}>
                    Ir para Sócio
                    <Icone nome="dir" className="ico ico-s" />
                  </a>
                ) : undefined}>
                {soSocio
                  ? pendente
                    ? `${pendente.nome} foi convidado em ${dataHora(pendente.desde)} e ainda não criou a senha. A implantação só termina quando houver sócio no Portal.`
                    : "Convide o sócio dono. A implantação só termina quando houver sócio no Portal."
                  : `Falta: ${falta.join(", ")}.`}
              </Aviso>
            ) : null}
            <button className="btn btn-pri" type="button" style={{ justifySelf: "start" }}
              aria-disabled={!pronta || undefined} aria-describedby={!pronta ? `${ids}-bloq` : undefined}
              onClick={() => { if (pronta) { setErro(null); setErroMotivo(false); setAberta(true); } }}>
              Passar para ativo
              {pronta ? <Icone nome="seta" className="ico" /> : null}
            </button>
            {!pronta ? (
              <p className="sr" id={`${ids}-bloq`}>
                Indisponível: {falta.join(", ")}.
              </p>
            ) : null}
          </div>
        ) : null}
        {!pode && !encerrado ? (
          <p className="permissao" style={{ margin: "16px 24px 0" }}>
            <Icone nome="cadeado" className="ico" />
            Quem muda o estágio é a Implantação ou a Administração.
          </p>
        ) : null}
        {!encerrado && !f.encerramento ? <AcaoEncerrar f={f} aoAbrir={() => setEncerrar(true)} /> : null}
        {mudancas?.length ? (
          <div className="mini-hist">
            <h3>Mudanças de estágio</h3>
            <ul className="lista" style={{ listStyle: "none" }}>
              {mudancas.map((m) => (
                <li key={m.id}>
                  <span>{dataLonga(m.ocorridoEm)}</span>
                  {m.acao === "escritorio.cadastrado"
                    ? `Cadastrado em implantação · ${m.autor?.nome ?? "Equipe T3jus"}`
                    : `${m.dados?.para === "ENCERRADO" ? "Contrato encerrado" : m.dados?.de === "ENCERRADO" ? `Reaberto, voltou para ${ESTAGIOS_CARTEIRA[(m.dados?.para as "ATIVO") ?? "ATIVO"] ?? "o estágio de antes"}` : `Passou para ${ESTAGIOS_CARTEIRA[(m.dados?.para as "ATIVO") ?? "ATIVO"] ?? "outro estágio"}`} · ${m.autor?.nome ?? "Equipe T3jus"}${typeof m.dados?.motivo === "string" ? ` · “${m.dados.motivo}”` : ""}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <Janela id={`${ids}-janela`} aberta={aberta} aoFechar={() => setAberta(false)} sobretitulo="Mudar estágio"
        titulo={`Passar ${f.escritorio.nome} para Ativo?`} descricao={`${ids}-janela-d`} aoEnviar={() => void mudar()}
        pe={
          <>
            <button className="btn btn-fantasma" type="button" onClick={() => setAberta(false)}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" disabled={enviando}>
              {enviando ? "Passando…" : "Passar para ativo"}
            </button>
          </>
        }>
        {erroMotivo ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>O estágio não mudou.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="O estágio não mudou.">{textoDoErro(erro)}</Aviso> : null}
        <div className="passagem" aria-hidden="true">
          <span className="selo selo-implant">{ESTAGIOS.IMPLANTACAO}</span>
          <Icone nome="seta" className="ico" />
          <span className="selo selo-ativo">
            <span className="bolinha" />
            {ESTAGIOS.ATIVO}
          </span>
        </div>
        <p id={`${ids}-janela-d`}>A implantação termina e o cliente passa a contar como ativo na carteira. Não dá para voltar pelo Console.</p>
        <div className="campo">
          <label htmlFor={`${ids}-motivo`}>Motivo</label>
          <textarea className="entrada" id={`${ids}-motivo`} data-foco value={motivo} maxLength={300} required
            onChange={(ev) => setMotivo(ev.target.value)} aria-invalid={erroMotivo || undefined}
            aria-describedby={descritoPor(erroMotivo && `${ids}-motivo-erro`, `${ids}-motivo-ajuda`)} />
          {erroMotivo ? <ErroCampo id={`${ids}-motivo-erro`}>Escreva o motivo da mudança. Ele fica no histórico.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-motivo-ajuda`}>
            Obrigatório. Fica no histórico do cliente, com seu nome e a data.
          </p>
        </div>
      </Janela>
      <JanelaEncerrar f={f} aberta={encerrar} aoFechar={() => setEncerrar(false)}
        aoFeito={async () => {
          setEncerrar(false);
          await recarregar();
          await carregarMudancas();
          setEncerrou(`Contrato da ${f.escritorio.nome} encerrado.`);
          document.getElementById("fim-contrato")?.querySelector("h2")?.focus();
        }} />
    </>
  );
}

export function AbaContrato({ f, recarregar, mudarAoEntrar, implantacaoAberta }: {
  f: FichaDoCliente; recarregar: () => Promise<void>; mudarAoEntrar?: boolean;
  /** CO-08 (F1.47): com a implantação assistida aberta, passar para Ativo é "Concluir a implantação", na aba Implantação. */
  implantacaoAberta?: boolean;
}) {
  const ids = useId();
  const concluir = !!implantacaoAberta && f.cliente.estagio === "IMPLANTACAO" && !f.encerramento;
  return (
    <div className="grade">
      <div className="col">
        {concluir ? (
          <Aviso tom="info" titulo="Passar para Ativo agora é “Concluir a implantação”."
            acoes={f.permissoes.includes("console.estagio.mudar") ? (
              <a className="btn btn-sec btn-compacto" href={`/clientes/${f.escritorio.id}/implantacao?concluir=1`}>
                <Icone nome="check" className="ico ico-s" />
                Concluir a implantação
              </a>
            ) : undefined}>
            O botão do cabeçalho leva à aba Implantação, que pede o resumo e mostra o que acontece na cobrança. Quem passa para Ativo por outro caminho também conclui a
            implantação.
          </Aviso>
        ) : null}
        <FolhaFim f={f} recarregar={recarregar} />
        <Referencia f={f} recarregar={recarregar} />
        <Documentos f={f} aoMudar={() => void recarregar()} />
        <Estagio f={f} recarregar={recarregar} abrirAoEntrar={!!mudarAoEntrar} />
      </div>
      <aside className="col" aria-label="Contexto do contrato">
        {f.encerramento && f.encerramento.situacao !== "MARCADO" ? (
          <section className="explica campo-ambar" aria-labelledby={`${ids}-como`}>
            <p className="sobretitulo">Como funciona</p>
            <h2 id={`${ids}-como`}>Depois do fim do contrato.</h2>
            <ul>
              <li>
                <Icone nome="olho" className="ico" />
                <span>Por 30 dias, o escritório consulta e baixa os dados. Ninguém cria nem muda nada.</span>
              </li>
              <li>
                <Icone nome="pessoas" className="ico" />
                <span>Depois dos 30 dias, o acesso fecha. Os dados dos clientes ficam guardados; o escritório pode pedir uma cópia.</span>
              </li>
              <li>
                <Icone nome="guardar" className="ico" />
                <span>Tudo fica 5 anos, só para a equipe T3jus. Até lá, dá para reabrir.</span>
              </li>
              <li>
                <Icone nome="historico" className="ico" />
                <span>Cada passo vai para o histórico, com a contagem.</span>
              </li>
            </ul>
          </section>
        ) : (
          <section className="explica campo-ambar" aria-labelledby={`${ids}-como`}>
            <p className="sobretitulo">Como funciona</p>
            <h2 id={`${ids}-como`}>Da implantação ao uso diário.</h2>
            <ul>
              <li>
                <Icone nome="seta" className="ico" />
                <span>O cliente nasce “Em implantação” e passa a “Ativo”. Não há volta pelo Console.</span>
              </li>
              <li>
                <Icone nome="pessoas" className="ico" />
                <span>
                  {concluir
                    ? "Para passar a Ativo, conclua a implantação na aba Implantação, com o resumo para o escritório e o efeito na cobrança."
                    : "Para passar a Ativo, o escritório precisa ter sócio no Portal."}
                </span>
              </li>
              <li>
                <Icone nome="historico" className="ico" />
                <span>O motivo da mudança fica no histórico.</span>
              </li>
              <li>
                <Icone nome="cadeado" className="ico" />
                <span>A referência do contrato só a Administração muda. O cliente não vê nada desta aba.</span>
              </li>
              <li>
                <Icone nome="doc" className="ico" />
                <span>Documentos: PDF, JPG ou PNG, até 10 MB cada. Nada é apagado.</span>
              </li>
            </ul>
          </section>
        )}
        <LateralTratar f={f} />
      </aside>
    </div>
  );
}
