// Moldura da tela de entrar (aprovada pela Carol: docs/design/aprovadas/entrar.html). O lado
// vinho apresenta o produto; o cartão à direita recebe o formulário de cada sistema.

import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "./Icone.tsx";
import { LogoCompleto, Selo, Simbolo } from "./Marca.tsx";

export interface TextosAcesso {
  /** Sobretítulo do cartão: "Portal do advogado" ou "Console T3jus". */
  sistema: string;
  /** Endereço do sistema no rodapé do lado vinho. */
  endereco: string;
  frase: { sobre: string; inicial: string; resto: string; destaque: string; texto: string };
  areas: { nome: string; icone: NomeIcone }[];
  topo: { texto: string; link: string; href: string };
}

/** As nove cores do manual, na ordem da hierarquia, como a fita do rodapé aprovada. */
const FITA = ["#692746", "#87335B", "#AC3F6B", "#AC788D", "#DD9760", "#E9AE90", "#F2CDB3", "#F1E6DF", "#F2ECE8"];
const FUNDO_AREAS = ["var(--ac-ambar)", "var(--ac-ambar-2)", "var(--ac-ambar-3)", "var(--ac-sal)"];

/** denso: cartão um pouco mais apertado (convite), para caber em 900 px de altura. */
export function TelaAcesso({ textos, denso = false, children }: { textos: TextosAcesso; denso?: boolean; children: ReactNode }) {
  const f = textos.frase;
  return (
    <div className="ac-tela">
      <div className="ac-lado" aria-hidden="true" />
      {/* Marca d'água: o símbolo do logo oficial em vinho suave (Carol, 19/11/2026). */}
      <Simbolo cor="currentColor" className="ac-coluna" />
      <div className="ac-fita" aria-hidden="true">
        {FITA.map((cor) => (
          <i key={cor} style={{ background: cor }} />
        ))}
      </div>

      <div className="ac-marca-lado">
        <a className="ac-marca" href="https://t3jus.pro" aria-label="T3jus, site">
          <LogoCompleto tom="sobre-vinho" className="ac-logo" />
        </a>
        <section className="ac-frase" aria-label="Sobre o T3jus">
          <p className="ac-sobre">{f.sobre}</p>
          <h2>
            <span className="ac-circ">{f.inicial}</span>
            {f.resto} <i>{f.destaque}</i>
          </h2>
          <span className="ac-fio" aria-hidden="true" />
          <p>{f.texto}</p>
          <ul className="ac-areas" aria-label="Áreas do T3jus">
            {textos.areas.map((a, i) => (
              <li key={a.nome}>
                <span className="ac-bola" style={{ background: FUNDO_AREAS[i % FUNDO_AREAS.length] }}>
                  <Icone nome={a.icone} />
                </span>
                {a.nome}
              </li>
            ))}
          </ul>
        </section>
        <p className="ac-rodape-m">© 2026 T3jus · {textos.endereco}</p>
      </div>

      <div className="ac-lado-claro">
        <p className="ac-topo">
          {textos.topo.texto}{" "}
          <a className="ac-link" href={textos.topo.href}>
            {textos.topo.link}
          </a>
        </p>
        <div className="ac-folhas">
          <div className="ac-f-ambar" aria-hidden="true" />
          <div className="ac-f-timbre" aria-hidden="true" />
          <main className={denso ? "ac-cartao ac-cartao-denso" : "ac-cartao"} id="conteudo">
            <p className="ac-sobre">{textos.sistema}</p>
            {children}
          </main>
        </div>
        <div className="ac-pe">
          <span className="ac-seguro">
            <Icone nome="escudo" className="ac-ico ac-ico-p" />
            Cada escritório só vê os próprios dados.
          </span>
          <nav aria-label="Informações legais">
            <a href="https://t3jus.pro/termos">Termos</a>
            <a href="https://t3jus.pro/privacidade">Privacidade</a>
            <a href="https://t3jus.pro/ajuda">Ajuda</a>
          </nav>
        </div>
      </div>

      <Selo className="ac-selo" />
    </div>
  );
}
