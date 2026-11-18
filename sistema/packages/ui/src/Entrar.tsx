"use client";
// Entrar no Portal e no Console (PT-08), no cartão da tela aprovada. Etapas:
// - senha (com "manter conectado") ou link de acesso por e-mail;
// - código do autenticador (Console sempre; Portal só de quem cadastrou);
// - no primeiro acesso ao Console, o QR code para cadastrar o autenticador;
// - "Esqueci a senha", no mesmo cartão.
// O escritório nunca vai do navegador: a sessão fica num cookie do servidor.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chamarApi, textoDoErro, type ErroApi } from "./api.ts";
import { Icone } from "./Icone.tsx";
import { Aviso } from "./pecas.tsx";

type Etapa = "SENHA" | "CODIGO" | "CADASTRAR_AUTENTICADOR" | "RECUPERAR" | "ENVIADO" | "LINK";
type Proxima = "CODIGO" | "CADASTRAR_AUTENTICADOR" | "PRONTO";

interface Cadastro {
  factorId: string;
  qrCode: string;
  segredo: string;
}

export interface TextosEntrar {
  /** Frase abaixo do título, na etapa da senha. */
  lede: string;
  /** Caixa "Primeiro acesso?" do rodapé do cartão. */
  primeiroAcesso: string;
  /** Exemplo no campo de e-mail. */
  exemploEmail: string;
}

/** O QR do Auth vem como SVG; vira uma imagem segura para o <img>. */
export function imagemQr(qr: string): string {
  const svg = qr.replace(/^data:image\/svg\+xml;utf-8,/, "");
  return svg.startsWith("data:") ? svg : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** O link de acesso volta com ?token_hash=...; /entrar/link/sessao quer dizer "não manter". */
export function lerLinkDoEndereco(endereco: { pathname: string; search: string }): { tokenHash: string | null; manterConectado: boolean } {
  return {
    tokenHash: new URLSearchParams(endereco.search).get("token_hash"),
    manterConectado: !endereco.pathname.replace(/\/$/, "").endsWith("/sessao"),
  };
}

export function Entrar({ textos, comLink = false, destino = "/" }: { textos: TextosEntrar; comLink?: boolean; destino?: string }) {
  const [etapa, setEtapa] = useState<Etapa>(comLink ? "LINK" : "SENHA");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [manter, setManter] = useState(true);
  const [codigo, setCodigo] = useState("");
  const [cadastro, setCadastro] = useState<Cadastro | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [faltaEmail, setFaltaEmail] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const campoEmail = useRef<HTMLInputElement>(null);
  const linkUsado = useRef(false);

  // A cada etapa nova, o foco vai para o título do cartão (leitor de tela anuncia a troca).
  useEffect(() => {
    if (etapa !== "SENHA" || erro) titulo.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  async function seguir(proxima: Proxima) {
    if (proxima === "PRONTO") {
      window.location.assign(destino);
      return;
    }
    if (proxima === "CADASTRAR_AUTENTICADOR") {
      const r = await chamarApi<Cadastro>("/v1/auth/autenticador/cadastrar", { corpo: {} });
      if (!r.ok) return setErro(r.erro);
      setCadastro(r.dados);
    }
    setEtapa(proxima);
  }

  // Chegou pelo link do e-mail: troca o token por uma sessão, uma vez só.
  useEffect(() => {
    if (!comLink || linkUsado.current) return;
    linkUsado.current = true;
    const { tokenHash, manterConectado } = lerLinkDoEndereco(window.location);
    window.history.replaceState(null, "", "/entrar");
    void (async () => {
      // Sem token no endereço, a tela diz o mesmo que diria de um link vencido.
      const r = tokenHash
        ? await chamarApi<{ etapa: Proxima }>("/v1/auth/link/usar", { corpo: { tokenHash, manterConectado } })
        : ({ ok: false, status: 410, erro: { codigo: "TOKEN_INVALID" } } as const);
      if (!r.ok) {
        setErro(r.erro);
        setEtapa("SENHA");
        return;
      }
      await seguir(r.dados.etapa);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comLink]);

  async function enviarSenha(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setFaltaEmail(false);
    setEnviando(true);
    const r = await chamarApi<{ etapa: Proxima }>("/v1/auth/entrar", { corpo: { email, senha, manterConectado: manter } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setSenha("");
    await seguir(r.dados.etapa);
  }

  async function pedirLink() {
    setErro(null);
    if (!campoEmail.current?.validity.valid || !email) {
      setFaltaEmail(true);
      campoEmail.current?.focus();
      return;
    }
    setFaltaEmail(false);
    setEnviando(true);
    const r = await chamarApi<{ mensagem: string }>("/v1/auth/link", { corpo: { email, manterConectado: manter } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setMensagem(r.dados.mensagem);
    setEtapa("ENVIADO");
  }

  async function enviarRecuperacao(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    const r = await chamarApi<{ mensagem: string }>("/v1/auth/recuperar", { corpo: { email } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setMensagem(r.dados.mensagem);
    setEtapa("ENVIADO");
  }

  async function enviarCodigo(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    const corpo = cadastro ? { codigo, factorId: cadastro.factorId } : { codigo };
    const r = await chamarApi("/v1/auth/autenticador/verificar", { corpo });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    window.location.assign(destino);
  }

  function voltar() {
    setErro(null);
    setMensagem("");
    setCodigo("");
    setCadastro(null);
    setEtapa("SENHA");
  }

  const cabecalho = (texto: string, lede: string) => (
    <>
      <h1 ref={titulo} tabIndex={-1}>
        {texto}
      </h1>
      <span className="ac-fio" aria-hidden="true" />
      <p className="ac-lede">{lede}</p>
    </>
  );
  const avisoErro = erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null;
  const linkVoltar = (
    <button type="button" className="ac-link ac-botao-link" onClick={voltar}>
      Voltar para entrar
    </button>
  );

  if (etapa === "LINK") {
    return (
      <>
        {cabecalho("Entrar", "Conferindo o seu link de acesso…")}
        <div className="ac-form" aria-busy="true" />
      </>
    );
  }

  if (etapa === "ENVIADO") {
    return (
      <>
        {cabecalho("Confira o e-mail", "Abra o link pelo mesmo navegador em que pediu.")}
        <div className="ac-form">
          <Aviso tom="info">{mensagem}</Aviso>
          {linkVoltar}
        </div>
      </>
    );
  }

  if (etapa === "RECUPERAR") {
    return (
      <>
        {cabecalho("Criar senha nova", "Digite o e-mail de acesso. Mandamos um link para você criar uma senha nova.")}
        <form className="ac-form" onSubmit={enviarRecuperacao} noValidate={false}>
          {avisoErro}
          <div className="ac-campo">
            <label htmlFor="email">E-mail</label>
            <input className="ac-entrada" id="email" type="email" autoComplete="username" placeholder={textos.exemploEmail} required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
          {linkVoltar}
        </form>
      </>
    );
  }

  if (etapa === "CODIGO" || etapa === "CADASTRAR_AUTENTICADOR") {
    return (
      <>
        {etapa === "CADASTRAR_AUTENTICADOR"
          ? cabecalho("Cadastrar o autenticador", "Leia o QR code no aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou outro) e digite os 6 números que ele mostrar.")
          : cabecalho("Código do autenticador", "Abra o aplicativo autenticador e digite o código de 6 números do T3jus.")}
        <form className="ac-form" onSubmit={enviarCodigo}>
          {avisoErro}
          {etapa === "CADASTRAR_AUTENTICADOR" && cadastro ? (
            <>
              {/* QR gerado na hora em data: (sem otimização de imagem a fazer). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ac-qr" src={imagemQr(cadastro.qrCode)} alt="QR code para cadastrar o autenticador" width={180} height={180} />
              <p className="ac-ajuda">
                Sem câmera? Digite esta chave no aplicativo: <code className="ac-chave">{cadastro.segredo}</code>
              </p>
            </>
          ) : null}
          <div className="ac-campo">
            <label htmlFor="codigo">Código de 6 números</label>
            <input className="ac-entrada ac-codigo" id="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required
              aria-invalid={erro?.codigo === "MFA_INVALID" || undefined}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
          </div>
          <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando || codigo.length !== 6}>
            {enviando ? "Conferindo…" : "Confirmar código"}
          </button>
          {linkVoltar}
        </form>
      </>
    );
  }

  return (
    <>
      {cabecalho("Entrar", textos.lede)}
      <form className="ac-form" onSubmit={enviarSenha}>
        {avisoErro}
        <div className="ac-campo">
          <label htmlFor="email">E-mail</label>
          <input ref={campoEmail} className="ac-entrada" id="email" type="email" autoComplete="username" placeholder={textos.exemploEmail} required
            aria-invalid={faltaEmail || erro?.codigo === "INVALID_CREDENTIALS" || undefined}
            aria-describedby={faltaEmail ? "email-falta" : undefined}
            value={email} onChange={(e) => setEmail(e.target.value)} />
          {faltaEmail ? (
            <p id="email-falta" className="ac-ajuda">
              Digite o e-mail para receber o link de acesso.
            </p>
          ) : null}
        </div>
        <div className="ac-campo">
          <label htmlFor="senha">Senha</label>
          <div className="ac-senha">
            <input className="ac-entrada" id="senha" type={verSenha ? "text" : "password"} autoComplete="current-password" required
              aria-invalid={erro?.codigo === "INVALID_CREDENTIALS" || undefined}
              value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="button" aria-controls="senha" aria-pressed={verSenha} onClick={() => setVerSenha((v) => !v)}>
              <Icone nome="olho" className="ac-ico ac-ico-p" />
              {verSenha ? "Esconder" : "Mostrar"}
              <span className="ac-sr"> a senha</span>
            </button>
          </div>
        </div>
        <div className="ac-linha">
          <label className="ac-lembrar">
            <input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} />
            Manter conectado
          </label>
          <button type="button" className="ac-link ac-botao-link" onClick={() => { setErro(null); setEtapa("RECUPERAR"); }}>
            Esqueci a senha
          </button>
        </div>
        <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando}>
          {enviando ? "Conferindo…" : "Entrar"}
        </button>
        <p className="ac-ou">ou</p>
        <button className="ac-btn ac-btn-sec" type="button" onClick={pedirLink} disabled={enviando}>
          <Icone nome="envelope" />
          {/* Hífen que não quebra: "e-mail" fica inteiro no celular. */}
          Receber link de acesso por e{"\u2011"}mail
        </button>
      </form>
      <div className="ac-primeiro">
        <Icone nome="cadeado" />
        <p>
          <strong>Primeiro acesso?</strong>
          {textos.primeiroAcesso}
        </p>
      </div>
    </>
  );
}
