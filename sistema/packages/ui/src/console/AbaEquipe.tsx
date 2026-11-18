"use client";
// Aba Equipe T3jus do cliente (PT-24), tela aprovada em docs/design/aprovadas/console-v1
// (ficha.html?aba=equipe): quem atende o cliente, atribuir (só as funções que a pessoa tem na
// equipe) e retirar, com confirmação. Só a Administração atribui e retira.

import { useEffect, useId, useState } from "react";
import { FUNCOES_CONSOLE, type FuncaoConsole } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import type { FichaDoCliente } from "./ficha.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroCampo, Estado, Janela } from "./pecas.tsx";
import { dataLonga, iniciais } from "./tempo.ts";

export const DESCRICAO_FUNCOES: Record<FuncaoConsole, string> = {
  ADMINISTRACAO: "Tudo: equipe, cadastro de escritórios, contrato, estágio, atribuições e notas.",
  IMPLANTACAO: "Edita a ficha, muda o estágio, convida o sócio, vê o histórico e escreve notas.",
  FINANCEIRO: "Vê a ficha e escreve notas.",
  SUPORTE: "Vê a ficha e escreve notas.",
};

export function FuncoesDef({ titulo = "O que cada função pode" }: { titulo?: string }) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-t`}>
      <div className="folha-cab" style={{ paddingBottom: 6 }}>
        <h2 id={`${ids}-t`} style={{ fontSize: 20 }}>
          {titulo}
        </h2>
      </div>
      <dl className="funcoes-def">
        {(Object.keys(FUNCOES_CONSOLE) as FuncaoConsole[]).map((f) => (
          <div key={f}>
            <dt>{FUNCOES_CONSOLE[f]}</dt>
            <dd>{DESCRICAO_FUNCOES[f]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface PessoaEquipe {
  id: string;
  nome: string;
  ativa: boolean;
  funcoes: FuncaoConsole[];
}

type Atribuido = FichaDoCliente["equipe"][number];

const nomeFuncao = (f: string) => FUNCOES_CONSOLE[f as FuncaoConsole] ?? f;

export function AbaEquipe({ f, eu, recarregar }: { f: FichaDoCliente; eu: string | null; recarregar: () => Promise<void> }) {
  const ids = useId();
  const pode = f.permissoes.includes("console.equipe.atribuir");
  const [pessoas, setPessoas] = useState<PessoaEquipe[] | null>(null);
  const [pessoa, setPessoa] = useState("");
  const [funcao, setFuncao] = useState("");
  const [erroForm, setErroForm] = useState<{ campo: "pessoa" | "funcao" | null; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [retirando, setRetirando] = useState<Atribuido | null>(null);
  const [erroRetirar, setErroRetirar] = useState<{ nome: string; erro: ErroApi } | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!pode) return;
    void chamarConsole<{ pessoas: PessoaEquipe[] }>("/v1/equipe").then((r) => {
      if (r.ok) setPessoas(r.dados.pessoas.filter((p) => p.ativa));
    });
  }, [pode]);

  const escolhida = pessoas?.find((p) => p.id === pessoa);

  async function atribuir() {
    setOk(null);
    if (!pessoa) return setErroForm({ campo: "pessoa", texto: "Escolha a pessoa." });
    if (!funcao) return setErroForm({ campo: "funcao", texto: "Escolha a função neste cliente." });
    const ja = f.equipe.find((a) => a.pessoaId === pessoa && a.funcao === funcao);
    if (ja) return setErroForm({ campo: "funcao", texto: `${ja.nome} já atende este cliente como ${nomeFuncao(funcao)}.` });
    setErroForm(null);
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/equipe`, { corpo: { pessoaId: pessoa, funcao } });
    setEnviando(false);
    if (!r.ok) {
      const texto = r.erro.detalhes?.motivo === "JA_ATRIBUIDO" && escolhida
        ? `${escolhida.nome} já atende este cliente como ${nomeFuncao(funcao)}.`
        : textoDoErro(r.erro);
      return setErroForm({ campo: "funcao", texto });
    }
    setOk(`${escolhida?.nome ?? "A pessoa"} agora atende ${f.escritorio.nome} como ${nomeFuncao(funcao)}.`);
    setPessoa("");
    setFuncao("");
    await recarregar();
  }

  async function retirar() {
    const a = retirando;
    if (!a) return;
    setEnviando(true);
    const r = await chamarConsole(`/v1/clientes/${f.escritorio.id}/equipe/${a.vinculoId}/retirar`, { corpo: { versao: a.versao ?? 1 } });
    setEnviando(false);
    setRetirando(null);
    if (!r.ok) return setErroRetirar({ nome: a.nome, erro: r.erro });
    setErroRetirar(null);
    setOk(`${a.nome} foi retirado deste cliente.`);
    await recarregar();
  }

  const primeiroNome = (n: string) => n.split(/\s+/)[0];
  const soAdministracao = f.equipe.every((a) => a.funcao === "ADMINISTRACAO");

  return (
    <div className="grade">
      <div className="col">
        {ok ? <Aviso tom="sucesso" titulo={ok} /> : null}
        <section className="folha" aria-labelledby={`${ids}-t`}>
          <div className="folha-cab">
            <div>
              <h2 id={`${ids}-t`}>Quem atende {f.escritorio.nome}</h2>
              <p className="sub">Só quem está aqui vê este cliente no Console.</p>
            </div>
          </div>
          {erroRetirar ? (
            <div style={{ padding: "0 24px 14px" }}>
              <Aviso tom="urgencia" titulo={`Não deu para retirar ${erroRetirar.nome}.`}>
                {erroRetirar.erro.detalhes?.motivo === "ULTIMA_ADMINISTRACAO"
                  ? `O cliente precisa de alguém da Administração. Atribua outra pessoa com essa função antes de retirar ${primeiroNome(erroRetirar.nome)}.`
                  : textoDoErro(erroRetirar.erro)}
              </Aviso>
            </div>
          ) : null}
          <ul className="lista">
            {f.equipe.map((a) => (
              <li key={a.vinculoId} className="pessoa">
                <span className={a.funcao === "ADMINISTRACAO" ? "av-p forte" : "av-p"} aria-hidden="true">
                  {iniciais(a.nome)}
                </span>
                <div className="quem-e">
                  <strong>
                    {a.nome}
                    {a.pessoaId === eu ? <span className="voce">você</span> : null}
                  </strong>
                  {a.desde ? <small>desde {dataLonga(a.desde)}</small> : null}
                </div>
                <span className="selo selo-neutro">{nomeFuncao(a.funcao)}</span>
                {pode ? (
                  <div className="acoes">
                    <button className="btn btn-fantasma btn-compacto" type="button" aria-label={`Retirar ${a.nome} (${nomeFuncao(a.funcao)}) deste cliente`}
                      onClick={() => { setErroRetirar(null); setRetirando(a); }}>
                      <Icone nome="pessoaMenos" className="ico ico-s" />
                      Retirar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {soAdministracao ? (
            <div style={{ padding: "0 24px 20px" }}>
              <Estado icone="pessoaMais" titulo={f.equipe.length ? "Só a Administração atende este cliente" : "Ninguém atende este cliente"}>
                Atribua quem vai cuidar da implantação, do financeiro e do suporte. Cada pessoa atribuída passa a ver o cliente no Console.
              </Estado>
            </div>
          ) : null}
        </section>
        {pode ? (
          <section className="folha" aria-labelledby={`${ids}-atr`}>
            <div className="folha-cab">
              <div>
                <h2 id={`${ids}-atr`}>Atribuir alguém</h2>
                <p className="sub">Só aparecem as pessoas ativas da equipe.</p>
              </div>
            </div>
            <form className="form-folha" noValidate onSubmit={(e) => { e.preventDefault(); void atribuir(); }}>
              <div className="campo c3">
                <label htmlFor={`${ids}-pessoa`}>Pessoa</label>
                <select className="entrada" id={`${ids}-pessoa`} value={pessoa}
                  onChange={(e) => { setPessoa(e.target.value); setFuncao(""); setErroForm(null); }}
                  aria-invalid={erroForm?.campo === "pessoa" || undefined}
                  aria-describedby={erroForm?.campo === "pessoa" ? `${ids}-pessoa-erro` : undefined}>
                  <option value="">{pessoas ? "Escolha" : "Carregando…"}</option>
                  {pessoas?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                {erroForm?.campo === "pessoa" ? <ErroCampo id={`${ids}-pessoa-erro`}>{erroForm.texto}</ErroCampo> : null}
              </div>
              <div className="campo c3">
                <label htmlFor={`${ids}-funcao`}>Função neste cliente</label>
                <select className="entrada" id={`${ids}-funcao`} value={funcao} onChange={(e) => { setFuncao(e.target.value); setErroForm(null); }}
                  aria-invalid={erroForm?.campo === "funcao" || undefined}
                  aria-describedby={descritoPor(erroForm?.campo === "funcao" && `${ids}-funcao-erro`, `${ids}-funcao-ajuda`)}>
                  <option value="">{escolhida ? "Escolha" : "Escolha a pessoa antes"}</option>
                  {escolhida?.funcoes.map((fn) => (
                    <option key={fn} value={fn}>
                      {FUNCOES_CONSOLE[fn]}
                    </option>
                  ))}
                </select>
                {erroForm?.campo === "funcao" ? <ErroCampo id={`${ids}-funcao-erro`}>{erroForm.texto}</ErroCampo> : null}
                <p className="ajuda" id={`${ids}-funcao-ajuda`}>
                  Só as funções que a pessoa tem na equipe.
                </p>
              </div>
              <div className="form-pe">
                <button className="btn btn-pri" type="submit" disabled={enviando}>
                  <Icone nome="pessoaMais" className="ico" />
                  {enviando ? "Atribuindo…" : "Atribuir"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <p className="permissao">
            <Icone nome="cadeado" className="ico" />
            Quem atribui e retira pessoas é a Administração.
          </p>
        )}
      </div>
      <aside className="col" aria-label="Funções da equipe">
        <FuncoesDef titulo="O que cada função pode aqui" />
      </aside>
      <Janela id={`${ids}-retirar`} aberta={!!retirando} aoFechar={() => setRetirando(null)} alerta
        sobretitulo={retirando ? nomeFuncao(retirando.funcao) : undefined}
        titulo={retirando ? `Retirar ${retirando.nome} da ${f.escritorio.nome}?` : ""} descricao={`${ids}-retirar-d`}
        aoEnviar={() => void retirar()}
        pe={
          <>
            <button className="btn btn-fantasma" type="button" data-foco onClick={() => setRetirando(null)}>
              Cancelar
            </button>
            <button className="btn btn-perigo" type="submit" disabled={enviando}>
              <Icone nome="pessoaMenos" className="ico" />
              {retirando ? `Retirar ${primeiroNome(retirando.nome)}` : "Retirar"}
            </button>
          </>
        }>
        <p id={`${ids}-retirar-d`}>
          {retirando ? `${primeiroNome(retirando.nome)} deixa de ver este cliente no Console. As notas e o histórico que registrou continuam.` : null}
        </p>
      </Janela>
    </div>
  );
}
