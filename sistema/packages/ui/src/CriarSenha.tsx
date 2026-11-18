"use client";
// Convite: criar senha (/criar-senha), tela aprovada em 18/11/2026 (PT-20). A pessoa chega pelo
// link do convite (vale 1 hora): a tela abre o link uma vez, mostra quem convidou e para onde,
// e pede o nome, a senha e o aceite dos Termos. No Portal já entra; no Console segue para o
// cadastro do autenticador, que é obrigatório para a equipe.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chamarApi, textoDoErro, type ErroApi } from "./api.ts";
import { imagemQr } from "./Entrar.tsx";
import { Icone } from "./Icone.tsx";
import { Aviso, Cabecalho, CampoSenha, ErroCampo, estadoTamanho, RegrasSenha, tirarTokenDoEndereco, type EstadoRegra } from "./pecas.tsx";

type Etapa = "ABRINDO" | "FORMULARIO" | "VENCIDO" | "AUTENTICADOR";

interface Convite {
  email: string;
  nome?: string;
  escritorio?: string;
  quem?: string | null;
  papel?: "EQUIPE" | "ESCRITORIO";
}

export interface TextosConvite {
  sistema: "portal" | "console";
  /** Nome do sistema no painel do convite, quando não há escritório (Console). */
  nomeSistema: string;
  /** "Criar senha e entrar" (Portal) ou "Criar senha e seguir" (Console). */
  botao: string;
  /** Caixa do convite vencido: quem pode mandar um convite novo. */
  quemPode: string;
  /** Para onde vai depois de entrar. */
  destino: string;
}

/** O painel de quem convidou, como na tela aprovada. */
export function textoConvite(c: Convite, t: Pick<TextosConvite, "sistema" | "nomeSistema">): { de: string; quem: string; papel: string; onde: string } {
  if (t.sistema === "console" || c.papel !== "ESCRITORIO" || !c.quem) {
    return { de: "da", quem: "Equipe T3jus", papel: "", onde: c.escritorio ?? t.nomeSistema };
  }
  return { de: "de", quem: c.quem, papel: ", sócio", onde: c.escritorio ?? t.nomeSistema };
}

function Etapas({ atual }: { atual: 1 | 2 }) {
  return (
    <ol className="ac-etapas" aria-label="Etapas do primeiro acesso">
      <li {...(atual === 1 ? { "aria-current": "step" as const } : { className: "ac-feita" })}>
        <span className="ac-n">{atual === 1 ? "1" : <Icone nome="check" />}</span>
        Senha
        {atual === 2 ? <span className="ac-sr"> (feita)</span> : null}
      </li>
      <li {...(atual === 2 ? { "aria-current": "step" as const } : {})}>
        <span className="ac-n">2</span>
        Autenticador
      </li>
    </ol>
  );
}

export function CriarSenha({ textos }: { textos: TextosConvite }) {
  const [etapa, setEtapa] = useState<Etapa>("ABRINDO");
  const [convite, setConvite] = useState<Convite>({ email: "" });
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [aceite, setAceite] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [vazada, setVazada] = useState<{ estado: EstadoRegra; info: string }>({ estado: "falta", info: "" });
    const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cadastro, setCadastro] = useState<{ factorId: string; qrCode: string; segredo: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);
  const aberto = useRef(false);
  const console_ = textos.sistema === "console";

  useEffect(() => {
    if (etapa !== "ABRINDO") titulo.current?.focus();
  }, [etapa]);

  useEffect(() => {
    if (aberto.current) return;
    aberto.current = true;
    const tokenHash = tirarTokenDoEndereco("/criar-senha");
    void (async () => {
      if (!tokenHash) return setEtapa("VENCIDO");
      const r = await chamarApi<Convite>("/v1/auth/criar-senha/abrir", { corpo: { tokenHash } });
      if (!r.ok) return setEtapa("VENCIDO");
      setConvite(r.dados);
      setNome(r.dados.nome ?? "");
      setEtapa("FORMULARIO");
    })();
  }, []);

  const tamanho = estadoTamanho(senha, tentou);
  // Repetição vazia só conta quando a senha já está boa (antes, o ponto é a própria senha).
  const naoConfere = (s: string, r: string) => r !== s && (r !== "" || estadoTamanho(s, true).estado === "ok");
  const diferentes = tentou && naoConfere(senha, repetir) ? "As duas senhas não são iguais." : null;
  const semNome = tentou && !nome.trim() ? "Digite o seu nome." : null;
  const semAceite = tentou && !aceite ? "Aceite os Termos para continuar." : null;

  async function criar(ev: FormEvent) {
    ev.preventDefault();
    setTentou(true);
    setErro(null);
    const pontos = [!nome.trim(), estadoTamanho(senha, true).estado !== "ok", naoConfere(senha, repetir), !aceite].filter(Boolean).length;
    if (pontos > 0) return;
    setEnviando(true);
    setVazada({ estado: "conferindo", info: "" });
    const r = await chamarApi<{ etapa: "PRONTO" | "CODIGO" | "CADASTRAR_AUTENTICADOR" | "ENTRAR" }>("/v1/auth/criar-senha", {
      corpo: { novaSenha: senha, nome, aceiteTermos: true },
    });
    if (!r.ok) {
      setEnviando(false);
      if (r.erro.codigo === "PASSWORD_WEAK") {
        return setVazada({ estado: "erro", info: "escolha outra" });
      }
      setVazada({ estado: "falta", info: "" });
      if (r.erro.codigo === "TOKEN_INVALID") return setEtapa("VENCIDO");
      return setErro(r.erro);
    }
    setVazada({ estado: "ok", info: "" });
    if (r.dados.etapa === "CADASTRAR_AUTENTICADOR") {
      const c = await chamarApi<{ factorId: string; qrCode: string; segredo: string }>("/v1/auth/autenticador/cadastrar", { corpo: {} });
      setEnviando(false);
      if (!c.ok) return setErro(c.erro);
      setCadastro(c.dados);
      setSenha("");
      setRepetir("");
      return setEtapa("AUTENTICADOR");
    }
    // Pronto entra; com autenticador já cadastrado, ou sem acesso, segue pela tela de entrar.
    window.location.assign(r.dados.etapa === "PRONTO" ? textos.destino : "/entrar");
  }

  async function confirmarCodigo(ev: FormEvent) {
    ev.preventDefault();
    if (!cadastro) return;
    setErro(null);
    setEnviando(true);
    const r = await chamarApi("/v1/auth/autenticador/verificar", { corpo: { codigo, factorId: cadastro.factorId } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    window.location.assign(textos.destino);
  }

  if (etapa === "ABRINDO") {
    return (
      <>
        <Cabecalho titulo="Criar senha" lede="Conferindo o convite…" />
        <div className="ac-form" aria-busy="true" />
      </>
    );
  }

  if (etapa === "VENCIDO") {
    return (
      <>
        <div className="ac-disco ac-disco-alerta">
          <Icone nome="relogio" />
        </div>
        <Cabecalho ref={titulo} titulo="Convite vencido" lede={<>Este convite passou do prazo de 1{" "}hora ou já foi usado.</>} />
        <div className="ac-form ac-acoes">
          <Aviso tom="erro" icone="envelope">
            <strong>Peça um novo a quem convidou você.</strong> O convite novo chega por e-mail e vale por 1{" "}hora.
          </Aviso>
          <p className="ac-lede ac-pergunta">Já criou a senha por este convite?</p>
          <a className="ac-btn ac-btn-sec" href="/entrar">
            Ir para entrar
          </a>
        </div>
        <div className="ac-primeiro">
          <Icone nome="ajuda" />
          <p>
            <strong>Quem pode convidar?</strong>
            {textos.quemPode}
          </p>
        </div>
      </>
    );
  }

  if (etapa === "AUTENTICADOR" && cadastro) {
    return (
      <>
        <Cabecalho ref={titulo} titulo="Cadastrar o autenticador"
          lede="Leia o QR code no aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou outro) e digite os 6 números que ele mostrar.">
          <Etapas atual={2} />
        </Cabecalho>
        <form className="ac-form" onSubmit={confirmarCodigo}>
          {erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ac-qr" src={imagemQr(cadastro.qrCode)} alt="QR code para cadastrar o autenticador" width={180} height={180} />
          <p className="ac-ajuda">
            Sem câmera? Digite esta chave no aplicativo: <code className="ac-chave">{cadastro.segredo}</code>
          </p>
          <div className="ac-campo">
            <label htmlFor="codigo">Código de 6 números</label>
            <input className="ac-entrada ac-codigo" id="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required
              aria-invalid={erro?.codigo === "MFA_INVALID" || undefined}
              value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
          </div>
          <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando || codigo.length !== 6}>
            {enviando ? "Conferindo…" : "Confirmar código"}
          </button>
        </form>
      </>
    );
  }

  const painel = textoConvite(convite, textos);
  return (
    <>
      <Cabecalho ref={titulo} titulo="Criar senha">
        <div className="ac-convite">
          <Icone nome="envelope" />
          <div>
            <p>
              Convite {painel.de} <strong>{painel.quem}</strong>
              {painel.papel}
            </p>
            <p className="ac-onde">{painel.onde}</p>
            <p>para {convite.email}</p>
          </div>
        </div>
        {console_ ? <Etapas atual={1} /> : null}
      </Cabecalho>
      <form className="ac-form" onSubmit={criar} noValidate>
        {/* Como na tela aprovada, o convite marca os erros só nos campos (o cartão é mais apertado). */}
        {erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null}
        <input type="email" name="email" autoComplete="username" value={convite.email} hidden readOnly />
        <div className="ac-campo">
          <label htmlFor="nome">Seu nome</label>
          <input className="ac-entrada" id="nome" autoComplete="name" required maxLength={120}
            aria-invalid={Boolean(semNome) || undefined} aria-describedby={semNome ? "nome-erro" : undefined}
            value={nome} onChange={(e) => setNome(e.target.value)} />
          {semNome ? <ErroCampo id="nome-erro">{semNome}</ErroCampo> : null}
        </div>
        <CampoSenha id="senha" rotulo="Senha" valor={senha} descricao="regras"
          invalido={tamanho.estado === "erro" || vazada.estado === "erro"}
          aoMudar={(v) => { setSenha(v); if (vazada.estado === "erro") setVazada({ estado: "falta", info: "" }); }} />
        <RegrasSenha id="regras" tamanho={tamanho} vazada={vazada} />
        <CampoSenha id="repetir" rotulo="Repita a senha" valor={repetir} aoMudar={setRepetir} erro={diferentes} />
        <div>
          <label className="ac-aceite">
            <input type="checkbox" id="aceite" required checked={aceite} onChange={(e) => setAceite(e.target.checked)}
              aria-invalid={Boolean(semAceite) || undefined} aria-describedby={semAceite ? "aceite-erro" : undefined} />
            <span>
              Li e aceito os{" "}
              <a href="https://t3jus.pro/termos" target="_blank" rel="noopener">
                Termos de uso<span className="ac-sr"> (abre em nova aba)</span>
              </a>{" "}
              e a{" "}
              <a href="https://t3jus.pro/privacidade" target="_blank" rel="noopener">
                Política de privacidade<span className="ac-sr"> (abre em nova aba)</span>
              </a>
              .
            </span>
          </label>
          {semAceite ? <ErroCampo id="aceite-erro">{semAceite}</ErroCampo> : null}
        </div>
        <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : textos.botao}
        </button>
      </form>
    </>
  );
}
