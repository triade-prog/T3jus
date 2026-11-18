"use client";
// Nova senha (/redefinir), tela aprovada em 18/11/2026. A pessoa chega pelo link de "Esqueci a
// senha": a tela abre o link uma vez (o servidor guarda num cookie de 1 hora), mostra para qual
// e-mail é e pede a senha nova duas vezes, com as regras à vista. Ao salvar, a pessoa sai da
// conta nos outros aparelhos e entra de novo com a senha nova.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chamarApi, textoDoErro, type ErroApi } from "./api.ts";
import { Icone } from "./Icone.tsx";
import { Aviso, Cabecalho, CampoSenha, estadoTamanho, RegrasSenha, textoFaltam, tirarTokenDoEndereco, type EstadoRegra } from "./pecas.tsx";

type Etapa = "ABRINDO" | "FORMULARIO" | "VENCIDO" | "TROCADA";

export interface TextosNovaSenha {
  exemploEmail: string;
  /** Texto de "Senha trocada": no Console, lembra do autenticador. */
  trocada: string;
}

export function NovaSenha({ textos }: { textos: TextosNovaSenha }) {
  const [etapa, setEtapa] = useState<Etapa>("ABRINDO");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [tentou, setTentou] = useState(false);
  const [vazada, setVazada] = useState<{ estado: EstadoRegra; info: string }>({ estado: "falta", info: "" });
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [faltam, setFaltam] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [emailNovo, setEmailNovo] = useState("");
  const [enviado, setEnviado] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);
  const aberto = useRef(false);

  useEffect(() => {
    if (etapa !== "ABRINDO") titulo.current?.focus();
  }, [etapa]);

  useEffect(() => {
    if (aberto.current) return;
    aberto.current = true;
    const tokenHash = tirarTokenDoEndereco("/redefinir");
    void (async () => {
      if (!tokenHash) return setEtapa("VENCIDO");
      const r = await chamarApi<{ email: string }>("/v1/auth/redefinir/abrir", { corpo: { tokenHash } });
      if (!r.ok) {
        if (r.erro.codigo !== "TOKEN_INVALID" && r.erro.codigo !== "VALIDATION_ERROR") setErro(r.erro);
        return setEtapa("VENCIDO");
      }
      setEmail(r.dados.email);
      setEtapa("FORMULARIO");
    })();
  }, []);

  const tamanho = estadoTamanho(senha, tentou);
  // Repetição vazia só conta quando a senha já está boa (antes, o ponto é a própria senha).
  const naoConfere = (s: string, r: string) => r !== s && (r !== "" || estadoTamanho(s, true).estado === "ok");
  const diferentes = tentou && naoConfere(senha, repetir) ? "As duas senhas não são iguais." : null;

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setTentou(true);
    setErro(null);
    const pontos = (estadoTamanho(senha, true).estado === "ok" ? 0 : 1) + (naoConfere(senha, repetir) ? 1 : 0);
    setFaltam(pontos);
    if (pontos > 0) return;
    setEnviando(true);
    setVazada({ estado: "conferindo", info: "" });
    const r = await chamarApi("/v1/auth/redefinir", { corpo: { novaSenha: senha } });
    setEnviando(false);
    if (r.ok) {
      setVazada({ estado: "ok", info: "" });
      setSenha("");
      setRepetir("");
      return setEtapa("TROCADA");
    }
    if (r.erro.codigo === "PASSWORD_WEAK") {
      setVazada({ estado: "erro", info: "escolha outra" });
      return setFaltam(1);
    }
    setVazada({ estado: "falta", info: "" });
    if (r.erro.codigo === "TOKEN_INVALID") return setEtapa("VENCIDO");
    setErro(r.erro);
  }

  async function pedirNovo(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    const r = await chamarApi<{ mensagem: string }>("/v1/auth/recuperar", { corpo: { email: emailNovo } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setEnviado(r.dados.mensagem);
  }

  if (etapa === "ABRINDO") {
    return (
      <>
        <Cabecalho titulo="Nova senha" lede="Conferindo o link…" />
        <div className="ac-form" aria-busy="true" />
      </>
    );
  }

  if (etapa === "VENCIDO") {
    return (
      <>
        <Cabecalho ref={titulo} titulo="Link vencido"
          lede={<>Este link já foi usado ou passou do prazo de 1{" "}hora. Por segurança, cada link vale uma vez só.</>} />
        <form className="ac-form" onSubmit={pedirNovo}>
          {erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null}
          {enviado ? <Aviso tom="info" icone="envelope">{enviado}</Aviso> : null}
          <div className="ac-campo">
            <label htmlFor="email-novo">E-mail de acesso</label>
            <input className="ac-entrada" id="email-novo" type="email" autoComplete="username" placeholder={textos.exemploEmail} required
              aria-describedby="email-novo-ajuda" value={emailNovo} onChange={(e) => setEmailNovo(e.target.value)} />
            <p className="ac-ajuda" id="email-novo-ajuda">
              Mandamos um link novo para este e-mail. Ele vale por 1{" "}hora.
            </p>
          </div>
          <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando}>
            <Icone nome="envelope" />
            {enviando ? "Enviando…" : "Pedir novo link"}
          </button>
          <a className="ac-link ac-centro" href="/entrar">
            Voltar para entrar
          </a>
        </form>
        <div className="ac-primeiro">
          <Icone nome="relogio" />
          <p>
            <strong>Pediu mais de uma vez?</strong>Use o link do e-mail mais recente. Os anteriores deixam de valer.
          </p>
        </div>
      </>
    );
  }

  if (etapa === "TROCADA") {
    return (
      <>
        <div className="ac-disco">
          <Icone nome="check" />
        </div>
        <Cabecalho ref={titulo} titulo="Senha trocada" lede={textos.trocada} />
        <div className="ac-form ac-acoes">
          <Aviso tom="info" icone="escudo">Por segurança, saímos da sua conta nos outros aparelhos.</Aviso>
          <a className="ac-btn ac-btn-pri" href="/entrar">
            Entrar
          </a>
        </div>
        <div className="ac-primeiro">
          <Icone nome="cadeado" />
          <p>
            <strong>Usa gerenciador de senhas?</strong>Confira se ele guardou a senha nova no lugar da antiga.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Cabecalho ref={titulo} titulo="Nova senha"
        lede={<>Para <strong>{email}</strong>. Escolha uma senha que você não usa em outro lugar.</>} />
      <form className="ac-form" onSubmit={salvar} noValidate>
        {faltam > 0 ? <Aviso tom="erro">{textoFaltam(faltam)}</Aviso> : null}
        {erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null}
        {/* Ajuda o gerenciador de senhas a guardar a senha nova com o e-mail certo. */}
        <input type="email" name="email" autoComplete="username" value={email} hidden readOnly />
        <CampoSenha id="senha" rotulo="Senha nova" valor={senha} descricao="regras"
          invalido={tamanho.estado === "erro" || vazada.estado === "erro"}
          aoMudar={(v) => { setSenha(v); if (vazada.estado === "erro") setVazada({ estado: "falta", info: "" }); }} />
        <RegrasSenha id="regras" tamanho={tamanho} vazada={vazada} />
        <CampoSenha id="repetir" rotulo="Repita a senha nova" valor={repetir} aoMudar={setRepetir} erro={diferentes} />
        <button className="ac-btn ac-btn-pri" type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar senha nova"}
        </button>
        <a className="ac-link ac-centro" href="/entrar">
          Voltar para entrar
        </a>
      </form>
    </>
  );
}
