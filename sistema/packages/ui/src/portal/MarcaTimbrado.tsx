"use client";
// Escritório › Recebimento › "Marca e timbrado" (F3.81, FI-23; resto do F3.19, FI-14), desenho
// aprovado em docs/design/aprovadas/portal-nao-paga-logo (decisões 13 a 27): o nome em letra ou o
// logo no alto do carnê e do recibo, o envio do logo com a conferência para impressão, a prévia
// em cores e em preto e branco e o registro da sociedade na OAB, que agora só se mostra aqui: ele
// se muda em Dados do escritório (PA-07, decisão 3). Só a sócia dona muda.
// Também o logo no papel (LogoNoDocumento), lido da cópia da marca guardada em cada documento.
// F3.146 (docs/design/aprovadas/razao-social-sobras, D1 a D3): a prévia mostra o papel como ele sai
// (a linha da identificação no carnê e as 4 linhas no recibo) e a linha de aviso da razão social em
// branco (LinhaRazaoSocial), usada também nas janelas "Gerar carnê" e "Registrar recebimento".

import { useRef, useState, type ReactNode } from "react";
import {
  contrasteLegivel, enderecoDoLogo, fraseOabSociedade, identificacaoDoCarne, jeitoPadrao, linhasDoTimbreRecibo, LOGO_MIN_CONTRASTE, LOGO_MIN_LADO,
  quaseQuadrado, razaoLonga, razaoSocialEmBranco, subMarcaAdvocacia, textoDaLinha, textoRecusaLogo, timbradoDoEscritorio,
  type CorLogo, type EscritorioNoPapel, type JeitoLogo, type LinhaDoPapel, type LogoEscritorio, type MarcaDocumento, type MarcaNoDocumento,
  type MotivoRazaoEmBranco, type RecusaLogo,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, Janela } from "../console/pecas.tsx";
import { chamarPortal } from "./Moldura.tsx";
import { ROTAS_ESCRITORIO } from "./WhatsApp.tsx";
import { consultaDoEnvio, prepararLogo } from "./logoArquivo.ts";

const ACEITA = ".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml";
const kb = (b: number) => `${Math.max(1, Math.round(b / 1024))} KB`;

export type EstadoMarca = {
  marca: MarcaDocumento;
  logo: LogoEscritorio | null;
  jeito: JeitoLogo;
  cor: CorLogo;
  oabUf: string;
  oabNumero: string;
};

/** O logo como vai no papel: a imagem, ou a imagem e o nome ao lado; em uma cor só, na cor da tinta. */
export function LogoNoDocumento({ marca, nome, classe, alt }: { marca: Pick<MarcaNoDocumento, "logoId" | "jeito" | "cor">; nome: string; classe: string; alt?: string }) {
  // O logo vem da API do escritório, sem otimização do Next (é PNG pequeno, guardado já cortado).
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={enderecoDoLogo(marca.logoId!)} alt={marca.jeito === "LOGO_E_NOME" ? "" : (alt ?? nome)}
      className={marca.cor === "UMA_COR" ? "lg-uma-cor" : undefined} decoding="async" />
  );
  if (marca.jeito === "LOGO_E_NOME") return <span className={`${classe} lg-lado`}>{img}<span className="lg-letra">{nome}</span></span>;
  return <span className={classe}>{img}</span>;
}

function Topo({ e, nome }: { e: EstadoMarca; nome: string }) {
  if (e.marca === "LOGO" && e.logo) return <LogoNoDocumento marca={{ logoId: e.logo.id, jeito: e.jeito, cor: e.cor }} nome={nome} classe="lg-m" alt="" />;
  return <span className="lg-m"><span className="lg-letra">{nome}</span></span>;
}

/** Os pedaços de uma linha; CNPJ, OAB, CEP e telefones não quebram no meio. */
function Linha({ l }: { l: LinhaDoPapel }) {
  return <>{l.map((p, i) => (p.inteiro ? <span key={i} className="rz-nw">{p.texto}</span> : p.texto))}</>;
}

const usaLetra = (e: EstadoMarca) => !(e.marca === "LOGO" && e.logo);

/** A via do carnê (D1, decisões 2 a 5): a marca, o "Advocacia" pequeno no nome em letra que não diz
 *  isso e a linha da identificação (razão social · CNPJ · OAB). `semIdentificacao`: sem sociedade,
 *  para quem não recebe o nome da sócia dona (decisão 7). */
function MiniCarne({ e, d, semIdentificacao = false }: { e: EstadoMarca; d: DadosTimbrado; semIdentificacao?: boolean }) {
  const sub = usaLetra(e) ? subMarcaAdvocacia(d.nome) : null;
  const ident = semIdentificacao ? null : identificacaoDoCarne(d);
  const longo = !!ident?.nome && razaoLonga(ident.nome);
  return (
    <div className={`lg-papel lg-cn rz-cn${longo ? " rz-longo" : ""}`}>
      <div className="lg-cn-top">
        <div className="rz-marca">
          <Topo e={e} nome={d.nome} />
          {sub ? <span className="rz-sub">{sub}</span> : null}
          {ident ? (
            <p className="lg-doc rz-ident">
              {ident.nome ? <b>{ident.nome}</b> : null}{ident.nome && ident.documento.length ? " · " : null}<Linha l={ident.documento} />
            </p>
          ) : null}
        </div>
        <p className="lg-num">Via do cliente<b>4 de 6</b></p>
      </div>
      <div className="lg-fio" />
    </div>
  );
}

/** O alto do recibo (D1, decisões 1 e 4): a marca à esquerda e as 4 linhas da folha, a 1ª em destaque. */
function MiniRecibo({ e, d }: { e: EstadoMarca; d: DadosTimbrado }) {
  const t = linhasDoTimbreRecibo(d);
  const sub = usaLetra(e) ? subMarcaAdvocacia(d.nome) : null;
  const longo = !!t.destaque && razaoLonga(t.destaque);
  return (
    <div className={`lg-papel${longo ? " rz-longo" : ""}`}>
      <div className="lg-rb rz-rb">
        {sub ? <div className="rz-marca"><Topo e={e} nome={d.nome} /><span className="rz-sub">{sub}</span></div> : <Topo e={e} nome={d.nome} />}
        <p className="rz-ender">
          {t.destaque ? <b>{t.destaque}</b> : null}
          {t.linhas.map((l, i) => <span key={i}><Linha l={l} /></span>)}
        </p>
      </div>
      <div className="lg-fio" style={{ marginTop: 8 }} />
    </div>
  );
}

/** O escritório como vai no papel (o timbrado do dia; o nome é o nome curto). `semDona`: sem
 *  sociedade, a pessoa não recebe o nome completo e a OAB da sócia dona (só Financeiro, Contratos
 *  e a dona recebem; migration 1000). */
export type DadosTimbrado = EscritorioNoPapel & { semDona?: boolean };

const nomeDaMarca = (e: EstadoMarca) =>
  e.marca === "LOGO" && e.logo ? (quaseQuadrado(e.logo) && e.jeito === "LOGO_E_NOME" ? "o logo e o nome ao lado" : "o logo") : "o nome em letra";

/** O texto para leitor de tela (decisão 8): a identificação inteira, como vai no papel. */
function identificacaoInteira(d: DadosTimbrado, site: boolean): string {
  const t = timbradoDoEscritorio(d, { site });
  return [t.nome, ...[t.documento, t.sede, t.contato].map(textoDaLinha)].filter(Boolean).join(" · ");
}

export function PreviaMarca({ e, d, titulo = "Como vai sair" }: { e: EstadoMarca; d: DadosTimbrado; titulo?: string }) {
  const figuras: ReactNode[] = [];
  for (const doc of ["carnê", "recibo"] as const) {
    for (const pb of [false, true]) {
      figuras.push(
        <figure key={`${doc}${pb}`} className={pb ? "lg-pb" : undefined}>
          <div role="img" aria-label={`Prévia do alto do ${doc}, ${pb ? "em preto e branco" : "em cores"}, com ${nomeDaMarca(e)} e a identificação do escritório: ${identificacaoInteira(d, doc === "recibo")}`}>
            {doc === "carnê" ? <MiniCarne e={e} d={d} /> : <MiniRecibo e={e} d={d} />}
          </div>
          <figcaption><b>{doc === "carnê" ? "Carnê" : "Recibo"}</b> · {pb ? "preto e branco" : "em cores"}</figcaption>
        </figure>,
      );
    }
  }
  return (
    <div className="lg-bloco">
      <h3><Icone nome="olho" className="ico" />{titulo}</h3>
      <div className="lg-prev">{figuras}</div>
    </div>
  );
}

/** Para "Completar em Escritório › Dados do escritório": a página abre no editar. */
export const ROTA_COMPLETAR_DADOS = `${ROTAS_ESCRITORIO.dados}?editar=1`;

/**
 * A linha de aviso da razão social em branco (D1 a D3, decisões 9 a 12): só na tela, nunca no papel.
 * O texto sai do motivo de razaoSocialEmBranco; a sócia dona vê "Completar", os outros leem quem
 * completa e "Ver". Sem botão de "pedir" nesta entrega (pergunta 5 do plano).
 */
export function LinhaRazaoSocial({ motivo, papel, nomeCurto, dono, dona }: {
  motivo: MotivoRazaoEmBranco;
  /** "O carnê", "O recibo" ou "O carnê e o recibo". */
  papel: "O carnê" | "O recibo" | "O carnê e o recibo";
  nomeCurto: string;
  dono: boolean;
  /** O nome da sócia dona, para "Quem completa é…". */
  dona: string;
}) {
  const sai = papel === "O carnê e o recibo" ? "saem" : "sai";
  return (
    <p className="cn-chave rz-linha">
      <Icone nome="alerta" className="ico" />
      <span>
        {motivo === "TIPO" ? (
          <><b>Falta dizer em Dados do escritório se ele é uma sociedade.</b> {papel} {sai} com o nome {nomeCurto}, sem razão social. Se a advogada atua sem sociedade, é só marcar isso lá, e o aviso some.</>
        ) : (
          <><b>A razão social do escritório está em branco.</b> {papel} {sai} com o nome {nomeCurto} no lugar dela.</>
        )}
        {dono ? null : ` Quem completa é ${dona}, a sócia dona.`}
        {dono
          ? <a className="rz-ir" href={ROTA_COMPLETAR_DADOS}><Icone nome="lapis" className="ico" />Completar em Escritório › Dados do escritório</a>
          : <a className="rz-ir" href={ROTAS_ESCRITORIO.dados}><Icone nome="olho" className="ico" />Ver em Escritório › Dados do escritório</a>}
      </span>
    </p>
  );
}

function Conferencia({ l }: { l: LogoEscritorio }) {
  const c = l.corte ?? {};
  const mw = (c.esquerda ?? 0) + (c.direita ?? 0);
  const mh = (c.topo ?? 0) + (c.baixo ?? 0);
  const ok = (t: ReactNode, s?: ReactNode) => <li><Icone nome="check" className="ico" /><span>{t}{s ? <small>{s}</small> : null}</span></li>;
  const nao = (t: ReactNode, s?: ReactNode) => <li className="lg-nao"><Icone nome="alerta" className="ico" /><span>{t}{s ? <small>{s}</small> : null}</span></li>;
  return (
    <ul className="lg-conf" aria-label="Conferência do logo para impressão">
      {ok(<><b>Formato e peso:</b> {l.formato}, {kb(l.bytes)}.</>, "Aceita PNG, JPG ou SVG, até 1 MB.")}
      {ok(<><b>Tamanho:</b> {l.largura} × {l.altura} px depois do corte. Sai nítido no carnê e no recibo.</>,
        `${mw || mh ? `Cortamos a margem vazia em volta (${mw} px na largura e ${mh} px na altura).` : "Não havia margem vazia para cortar."} O mínimo é ${LOGO_MIN_LADO} px no lado maior.`)}
      {l.passa ? (
        <>
          {ok(<><b>Contraste com o papel:</b> a parte mais clara tem {contrasteLegivel(l.contraste)}.</>, `O mínimo é ${LOGO_MIN_CONTRASTE}:1, a mesma régua da WCAG para desenhos.`)}
          {ok(<><b>Preto e branco:</b> continua legível.</>, "A impressora troca cada cor por um cinza; veja a prévia abaixo.")}
        </>
      ) : (
        <>
          {nao(<><b>Contraste com o papel: {contrasteLegivel(l.contraste)}.</b> O logo some no papel.</>, `O mínimo é ${LOGO_MIN_CONTRASTE}:1. Em preto e branco fica ainda mais apagado; veja a prévia abaixo.`)}
          {nao(<><b>Preto e branco:</b> quase não aparece.</>)}
        </>
      )}
    </ul>
  );
}

/** A folha "Marca e timbrado", controlada pelo formulário do Recebimento (um Salvar só). */
export function MarcaTimbrado({ e, mudar, d, salvoEm, erroMarca, naoSalvo, aoRemover }: {
  e: EstadoMarca;
  mudar: (m: Partial<EstadoMarca>) => void;
  d: DadosTimbrado;
  /** O logo em uso já salvo (para "salvo em" e o "Remover o logo"). */
  salvoEm: string | null;
  /** Marcou "O logo" sem enviar. */
  erroMarca: boolean;
  /** O servidor não salvou a marca: o logo some no papel nas cores do arquivo (pergunta 7). */
  naoSalvo: number | null;
  aoRemover: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [recusa, setRecusa] = useState<{ titulo: string; texto: string; nome: string } | null>(null);
  const [novo, setNovo] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setRecusa(null);
    setEnviando(true);
    const p = await prepararLogo(arquivo);
    if (!p.ok) {
      setEnviando(false);
      const t = textoRecusaLogo(p.recusa, p.detalhes);
      setRecusa({ ...t, nome: p.nome });
      return;
    }
    const r = await chamarPortal<LogoEscritorio>(`/v1/escritorio/recebimento/logo?${consultaDoEnvio(p)}`, { bruto: p.png });
    setEnviando(false);
    if (entrada.current) entrada.current.value = "";
    if (!r.ok) {
      const m = r.erro.detalhes?.motivo;
      const t = typeof m === "string" && m.startsWith("LOGO_") ? textoRecusaLogo(m as RecusaLogo, { bytes: p.bytes, largura: p.analise.largura, altura: p.analise.altura })
        : { titulo: "O logo não foi enviado.", texto: textoDoErro(r.erro) };
      setRecusa({ ...t, nome: p.nome });
      return;
    }
    setNovo(true);
    mudar({ marca: "LOGO", logo: r.dados, jeito: jeitoPadrao(r.dados), cor: "ARQUIVO" });
  }

  const l = e.marca === "LOGO" ? e.logo : null;
  // Com a razão social em branco, a mesma linha das janelas embaixo da prévia (decisão 6). Só a dona edita esta folha.
  const motivo = razaoSocialEmBranco(d);
  const input = (id: string, rotulo: ReactNode, foco?: boolean) => (
    <>
      <input ref={entrada} className="sr" type="file" id={id} accept={ACEITA} aria-describedby="lg-arq-aj" disabled={enviando}
        onChange={(x) => void escolher(x.target.files?.[0])} />
      <label className="btn btn-sec" htmlFor={id} data-foco={foco ? "" : undefined} aria-disabled={enviando || undefined}>{rotulo}</label>
    </>
  );

  return (
    <section className="folha" aria-labelledby="t-rm">
      <div className="folha-cab">
        <div>
          <h2 id="t-rm"><Icone nome="imagem" className="ico" />Marca e timbrado</h2>
          <p className="sub">O carnê e o recibo são do escritório: a marca dele vai no alto. O T3jus aparece só no rodapé, em letra pequena (“Modelo T3jus”). Carnês e recibos já emitidos ficam como saíram.</p>
        </div>
      </div>
      <div className="cn-form">
        {naoSalvo !== null ? (
          <Aviso tom="urgencia" titulo="A marca não foi salva: o logo some no papel.">
            A parte mais clara tem {contrasteLegivel(naoSalvo)} contra o papel branco, e o mínimo é {LOGO_MIN_CONTRASTE}:1. Escolha “Em uma cor só”, envie uma versão mais escura ou fique com o nome em letra. O resto da página foi salvo.
          </Aviso>
        ) : null}
        <fieldset className="fi-grupo-op">
          <legend>O que vai no alto do carnê e do recibo</legend>
          <label className="opcao">
            <input className="marcar" type="radio" name="lg-m" checked={e.marca === "LETRA"} onChange={() => mudar({ marca: "LETRA" })} />
            <span>O nome do escritório em letra<small>{d.nome}, em serifa vinho. Sai bem em qualquer impressora.</small></span>
          </label>
          <label className="opcao">
            <input className="marcar" type="radio" name="lg-m" checked={e.marca === "LOGO"} onChange={() => mudar({ marca: "LOGO" })} />
            <span>O logo do escritório<small>Envie o arquivo abaixo. O T3jus confere antes de usar.</small></span>
          </label>
        </fieldset>
        {e.marca === "LOGO" ? (
          <div className="lg-bloco" id="lg-logo">
            <h3><Icone nome="imagem" className="ico" />O logo</h3>
            {l ? (
              <>
                <div className="lg-arq">
                  <div className="lg-miniatura">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enderecoDoLogo(l.id)} alt={`Logo do escritório ${d.nome}`} />
                  </div>
                  <div className="lg-arq-info">
                    <strong>{l.nome}</strong>
                    <small>
                      {l.largura + (l.corte?.esquerda ?? 0) + (l.corte?.direita ?? 0)} × {l.altura + (l.corte?.topo ?? 0) + (l.corte?.baixo ?? 0)} px · {kb(l.bytes)} ·{" "}
                      {novo ? "enviado agora, ainda não salvo" : salvoEm ?? "ainda não salvo"}
                    </small>
                    <div className="lg-arq-ac">
                      {input("lg-trocar", <><Icone nome="trocar" className="ico" />{enviando ? "Enviando…" : "Trocar o logo"}</>)}
                      {salvoEm && !novo ? (
                        <button className="btn btn-fantasma" type="button" onClick={aoRemover}><Icone nome="lixeira" className="ico" />Remover o logo</button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {recusa ? <Aviso tom="urgencia" titulo={`Não deu para usar “${recusa.nome}”. ${recusa.titulo}`}>{recusa.texto}</Aviso> : null}
                <Conferencia l={l} />
                {!l.passa ? (
                  <>
                    <fieldset className={`x-ops lg-grupo${naoSalvo !== null && e.cor === "ARQUIVO" ? " lg-com-erro" : ""}`} aria-describedby={descritoPor(naoSalvo !== null && e.cor === "ARQUIVO" && "lg-j-er")}>
                      <legend>Como imprimir o logo</legend>
                      {naoSalvo !== null && e.cor === "ARQUIVO" ? <ErroCampo id="lg-j-er">Nas cores do arquivo, o logo não aparece no papel. Escolha outra forma.</ErroCampo> : null}
                      <div className="x-ops-l">
                        <label className="opcao">
                          <input className="marcar" type="radio" name="lg-c" checked={e.cor === "ARQUIVO"} onChange={() => mudar({ cor: "ARQUIVO" })}
                            aria-invalid={(naoSalvo !== null && e.cor === "ARQUIVO") || undefined} />
                          <span>Nas cores do arquivo<small>Claro demais: some no papel.</small></span>
                        </label>
                        <label className="opcao">
                          <input className="marcar" type="radio" name="lg-c" checked={e.cor === "UMA_COR"} onChange={() => mudar({ cor: "UMA_COR" })} />
                          <span>Em uma cor só, na cor da tinta<small>O desenho é o mesmo; só a cor muda, e só no papel.</small></span>
                        </label>
                      </div>
                    </fieldset>
                    <div className="lg-uma" role="img" aria-label="Como fica em uma cor só: o mesmo logo, em tinta escura">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={enderecoDoLogo(l.id)} alt="" className="lg-uma-cor" /><span>Em uma cor só</span>
                    </div>
                  </>
                ) : null}
                {quaseQuadrado(l) ? (
                  <fieldset className="x-ops lg-grupo">
                    <legend>Como o logo entra</legend>
                    <div className="x-ops-l">
                      <label className="opcao">
                        <input className="marcar" type="radio" name="lg-j" checked={e.jeito === "SO_LOGO"} onChange={() => mudar({ jeito: "SO_LOGO" })} />
                        <span>Só o logo<small>Na altura do alto do carnê, um logo quadrado fica pequeno e não diz o nome.</small></span>
                      </label>
                      <label className="opcao">
                        <input className="marcar" type="radio" name="lg-j" checked={e.jeito === "LOGO_E_NOME"} onChange={() => mudar({ jeito: "LOGO_E_NOME" })} />
                        <span>O logo e o nome ao lado<small>O padrão para logo quadrado. O nome vai em letra, como hoje.</small></span>
                      </label>
                    </div>
                  </fieldset>
                ) : null}
              </>
            ) : (
              <>
                {recusa ? (
                  <Aviso tom="urgencia" titulo={`Não deu para usar “${recusa.nome}”.`}>{recusa.titulo} {recusa.texto}</Aviso>
                ) : null}
                {erroMarca && !recusa ? <ErroCampo id="lg-arq-er">Envie o logo, ou escolha o nome do escritório em letra.</ErroCampo> : null}
                <div className={`lg-soltar${recusa || erroMarca ? " lg-erro" : ""}${arrastando ? " lg-arrastando" : ""}`}
                  onDragOver={(x) => { x.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
                  onDrop={(x) => { x.preventDefault(); setArrastando(false); void escolher(x.dataTransfer.files?.[0]); }}>
                  <Icone nome="imagem" className="ico" />
                  <p><strong>Arraste o logo para cá ou</strong></p>
                  {input("lg-arq", <><Icone nome="mais" className="ico" />{enviando ? "Conferindo…" : recusa ? "Escolher outro arquivo" : "Escolher o arquivo"}</>, !!recusa)}
                  <p className="ajuda" id="lg-arq-aj">PNG, JPG ou SVG, até 1 MB. O melhor é fundo transparente ou branco.</p>
                </div>
                <ul className="lg-regras" aria-label="Como o T3jus confere o logo">
                  <li><Icone nome="filtro" className="ico" /><span><b>Corta a margem vazia</b> em volta do desenho. O logo em si não é cortado nem esticado.</span></li>
                  <li><Icone nome="imagem" className="ico" /><span><b>Confere o tamanho:</b> pelo menos {LOGO_MIN_LADO} px no lado maior, para sair nítido no papel.</span></li>
                  <li><Icone nome="olho" className="ico" /><span><b>Confere o contraste com o papel</b>, em cores e em preto e branco, e mostra como vai sair.</span></li>
                </ul>
              </>
            )}
          </div>
        ) : null}
        <PreviaMarca e={e} d={d} titulo={e.marca === "LOGO" && !l ? "Como sai hoje, enquanto não houver logo" : "Como vai sair"} />
        {motivo ? <LinhaRazaoSocial motivo={motivo} papel="O carnê e o recibo" nomeCurto={d.nome} dono dona="" /> : null}
        <div className="lg-bloco">
          <h3><Icone nome="balanca" className="ico" />Registro da sociedade na OAB</h3>
          <p className="lg-oab-ler">
            <b>{fraseOabSociedade(e.oabUf, e.oabNumero) ?? "Sem registro cadastrado"}</b>
            <span>
              Vai no alto do carnê e no timbrado do recibo, depois do CNPJ. Fica em Dados do escritório, junto da razão social e do CNPJ, para ninguém ter duas
              versões dele. <a href={ROTAS_ESCRITORIO.dados}>Mudar em Dados do escritório</a>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function JanelaRemoverLogo({ aberta, aoFechar, aoRemover }: { aberta: boolean; aoFechar: () => void; aoRemover: () => void }) {
  return (
    <Janela id="janela-remover" aberta={aberta} aoFechar={aoFechar} alerta sobretitulo="Marca e timbrado" titulo="Remover o logo?" descricao="janela-remover-d"
      aoEnviar={aoRemover}
      pe={
        <>
          <button className="btn btn-sec" type="button" onClick={aoFechar} data-foco="">Voltar</button>
          <button className="btn btn-pri" type="submit"><Icone nome="lixeira" className="ico" />Remover o logo</button>
        </>
      }>
      <p id="janela-remover-d">O registro na OAB continua no timbrado.</p>
      <ul className="cn-lista" style={{ marginTop: 12 }}>
        <li><Icone nome="doc" className="ico" /><span>Os próximos carnês e recibos saem com <b>o nome em letra</b>, como antes.</span></li>
        <li><Icone nome="historico" className="ico" /><span>O arquivo do logo fica guardado no histórico. Nada se apaga, e ele pode voltar com “Trocar o logo”.</span></li>
        <li><Icone nome="cadeado" className="ico" /><span><b>Carnês e recibos já emitidos não mudam:</b> continuam com o logo, como foram entregues.</span></li>
      </ul>
    </Janela>
  );
}

/** Para ler (quem não é a sócia dona): a marca em uso, com a prévia do carnê, e o registro na OAB.
 *  Sem sociedade e sem o nome da sócia dona (decisão 7), a miniatura vem sem a linha e com uma frase. */
export function MarcaParaLer({ e, d, desde }: { e: EstadoMarca; d: DadosTimbrado; desde: string | null }) {
  const semLinha = d.tipo === "SEM_SOCIEDADE" && !!d.semDona;
  const ident = semLinha ? null : identificacaoDoCarne(d);
  const rot = `Prévia do alto do carnê com ${nomeDaMarca(e)}${ident ? ` e a identificação do escritório: ${[ident.nome, textoDaLinha(ident.documento)].filter(Boolean).join(" · ")}` : ""}`;
  return (
    <>
      <div>
        <dt>Marca no carnê e no recibo</dt>
        <dd>
          <div className="lg-ro-marca">
            {e.marca === "LOGO" && e.logo ? `O logo do escritório${desde ? `, desde ${desde}` : ""}` : `${d.nome}, em letra`}
            <div role="img" aria-label={rot}><MiniCarne e={e} d={d} semIdentificacao={semLinha} /></div>
            {semLinha ? (
              <p className="rz-nota">Embaixo da marca, o carnê leva o nome completo e a OAB da advogada. Essa linha aparece aqui para quem tem Financeiro ou Contratos.</p>
            ) : null}
          </div>
        </dd>
      </div>
      <div><dt>Registro da sociedade na OAB</dt><dd>{d.oab ?? (d.tipo === "SEM_SOCIEDADE" ? "Sem registro: advogada sem sociedade" : "Não informado")}</dd></div>
    </>
  );
}
