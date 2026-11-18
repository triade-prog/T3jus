#!/usr/bin/env python3
"""Painel de execução do T3jus: dados em arquivos pequenos, painel montado por script.

Os dados ficam em docs/painel/dados/, um arquivo JSON por registro, para que dois PRs
quase nunca mexam no mesmo arquivo (fim dos conflitos de merge). Nada gerado vai para o Git.

Comandos (rode a partir da raiz do repositório):

  python3 docs/painel/painel.py conferir
      Valida os dados. Rode antes de cada commit que mexe no painel.

  python3 docs/painel/painel.py montar <pasta-de-saida>
      Roda o conferir e, sem erro, gera na pasta:
        painel-execucao.html      o painel inteiro num arquivo só, para abrir no computador
        index.html + dados/*.json as partes para publicar o artifact (ver LEIA-ME.md)

  python3 docs/painel/painel.py novo-historico --inicio HH:MM --fim HH:MM \\
          --texto "..." [--refs R15.5 NG-13] [--data dd/mm/aaaa] [--nome curto]
      Cria a linha do histórico como arquivo novo (data de hoje em Brasília se faltar --data).

  python3 docs/painel/painel.py importar <ramo>
      Para um PR aberto ainda no formato antigo (docs/painel-execucao.html): compara o arquivo
      antigo do ramo com o do merge-base entre o ramo e o main e escreve os arquivos novos
      equivalentes nesta cópia de trabalho. Confira com `git status` e `conferir` antes do commit.

  python3 docs/painel/painel.py migrar <arquivo-html-antigo>
      Usado uma vez, na troca de formato: escreve a pasta dados/ a partir do painel antigo.
"""
import argparse
import datetime as dt
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent            # docs/painel
DOCS = AQUI.parent                                # docs
PROJETO = DOCS.parent                             # raiz do repositório
DADOS = AQUI / "dados"
PAGINA = AQUI / "pagina.html"
IDEIAS = PROJETO / "IDEIAS.md"
ANTIGO = DOCS / "painel-execucao.html"
ANTIGO_GIT = "docs/painel-execucao.html"
MARCA = "/*__DADOS_DO_PAINEL__*/"
STATUS = ("pendente", "andamento", "bloqueado", "feito")
POR_PARTE = 25
NOME_HIST = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})-[a-z0-9-]+\.json$")


# ---------------------------------------------------------------- utilidades

def ler(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def gravar(p: Path, valor) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(valor, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slug(t: str, limite: int = 40) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:limite].strip("-") or "linha"


def sem_ordem(r: dict) -> dict:
    return {k: v for k, v in r.items() if k != "ordem"}


def pela_ordem(lista, chave_id="id"):
    # ordem e, no empate, o id: dois PRs que pegam o mesmo número não quebram o main.
    return sorted(lista, key=lambda r: (r.get("ordem", 0), str(r.get(chave_id, ""))))


def codigos_do_ideias() -> list:
    """Códigos das ideias, na ordem do IDEIAS.md: tabelas das partes numeradas ("## 1. ...")."""
    codigos, dentro = [], False
    for linha in IDEIAS.read_text(encoding="utf-8").split("\n"):
        if linha.startswith("## "):
            dentro = bool(re.match(r"## \d+\. ", linha))
        m = re.match(r"^\| ([A-Z]{1,3}-\d{2,3}[a-z]?) \|", linha)
        if dentro and m:
            codigos.append(m.group(1))
    return codigos


def data_iso(data: str) -> str:
    d, m, a = data.split("/")
    return f"{a}-{m}-{d}"


# ---------------------------------------------------------------- leitura da pasta

def carregar() -> dict:
    """Junta a pasta dados/ no mesmo formato de dados que a página sempre usou."""
    meta = ler(DADOS / "meta.json")
    situacao = ler(DADOS / "situacao.json")

    fases = []
    for pasta in sorted(p for p in (DADOS / "fases").iterdir() if p.is_dir()):
        cab = ler(pasta / "fase.json")
        itens = [ler(p) for p in pasta.glob("*.json") if p.name != "fase.json"]
        f = sem_ordem(cab)
        f["itens"] = [sem_ordem(i) for i in pela_ordem(itens)]
        fases.append((cab.get("ordem", 0), cab["id"], f, itens))
    fases.sort(key=lambda x: (x[0], x[1]))

    publicacao = []
    for pasta in sorted(p for p in (DADOS / "publicacao").iterdir() if p.is_dir()):
        cab = ler(pasta / "grupo.json")
        itens = [ler(p) for p in pasta.glob("*.json") if p.name != "grupo.json"]
        g = sem_ordem(cab)
        g["itens"] = [sem_ordem(i) for i in pela_ordem(itens)]
        publicacao.append((cab.get("ordem", 0), cab["grupo"], g))
    publicacao.sort(key=lambda x: (x[0], x[1]))

    def pasta_simples(nome):
        return [sem_ordem(r) for r in pela_ordem([ler(p) for p in (DADOS / nome).glob("*.json")])]

    novos = sorted((DADOS / "historico").glob("*.json"), key=lambda p: p.name, reverse=True)
    novos = [p for p in novos if p.name != "legado.json"]
    historico = [ler(p) for p in novos] + ler(DADOS / "historico" / "legado.json")

    # Próximos passos: um por item que tenha "proximo", na ordem das fases e dos itens.
    proximos = []
    for _, fid, f, _brutos in fases:
        for i in f["itens"]:
            if i.get("proximo"):
                proximos.append({"id": i["id"], "fase": fid, "status": i.get("status", "pendente"), "texto": i["proximo"]})
        for i in f["itens"]:
            i.pop("proximo", None)

    codigos = codigos_do_ideias()
    d = {
        "meta": {
            "atualizado_em": historico[0]["data"] if historico else "",
            "total_ideias": len(codigos),
            "situacao": situacao["texto"],
            "fase_atual": meta.get("fase_atual"),
            "codigos_ideias": codigos,
            "fora_do_software": meta.get("fora_do_software", []),
        },
        "proximos": proximos,
        "fases": [f for _, _, f, _ in fases],
        "testes": pasta_simples("testes"),
        "publicacao": [g for _, _, g in publicacao],
        "externos": pasta_simples("externos"),
        "decisoes": [[r["id"], r["texto"]] for r in pela_ordem([ler(p) for p in (DADOS / "decisoes").glob("*.json")])],
        "historico": historico,
    }
    return d


# ---------------------------------------------------------------- conferir

def conferir(silencioso=False) -> bool:
    erros, avisos = [], []
    try:
        rastreado = subprocess.run(["git", "ls-files", "--error-unmatch", ANTIGO_GIT], cwd=PROJETO,
                                   capture_output=True).returncode == 0
    except FileNotFoundError:
        rastreado = False
    if ANTIGO.exists() or rastreado:
        erros.append("docs/painel-execucao.html voltou a existir. O painel agora fica em docs/painel/dados/ "
                     "(ver docs/painel/LEIA-ME.md); para um PR antigo, use o comando importar.")

    for p in DADOS.rglob("*.json"):
        try:
            ler(p)
        except Exception as e:  # noqa: BLE001
            erros.append(f"{p.relative_to(DADOS)}: JSON inválido ({e})")
    if erros:
        return relatar(erros, avisos, silencioso)

    d = carregar()
    codigos = set(d["meta"]["codigos_ideias"])
    if len(codigos) != len(d["meta"]["codigos_ideias"]):
        erros.append("IDEIAS.md tem código de ideia repetido")
    ids_fase = {f["id"] for f in d["fases"]}
    vistos = {}

    def item(i, onde, arquivo=None):
        iid = i.get("id")
        if not iid:
            erros.append(f"{onde}: registro sem id")
            return
        if iid in vistos:
            erros.append(f"{iid}: id repetido ({vistos[iid]} e {onde})")
        vistos[iid] = onde
        if arquivo is not None and arquivo.stem != iid:
            erros.append(f"{arquivo.relative_to(DADOS)}: o nome do arquivo tem que ser o id ({iid}.json)")
        stt = i.get("status", "pendente")
        if stt not in STATUS:
            erros.append(f"{iid}: status \"{stt}\" não existe (use {', '.join(STATUS)})")
        if stt == "feito" and not i.get("evidencia"):
            avisos.append(f"{iid}: \"feito\" sem evidencia")
        if stt == "bloqueado" and not i.get("nota"):
            erros.append(f"{iid}: \"bloqueado\" sem nota com o motivo")
        if not i.get("texto"):
            erros.append(f"{iid}: sem texto")
        for r in i.get("refs", []):
            if r not in codigos:
                erros.append(f"{iid}: refs cita {r}, que não está nas partes numeradas do IDEIAS.md")

    feitos_com_proximo = []
    for pasta in sorted(p for p in (DADOS / "fases").iterdir() if p.is_dir()):
        cab = ler(pasta / "fase.json")
        if cab.get("id") != pasta.name:
            erros.append(f"fases/{pasta.name}/fase.json: id \"{cab.get('id')}\" diferente do nome da pasta")
        ordens = {}
        for p in pasta.glob("*.json"):
            if p.name == "fase.json":
                continue
            i = ler(p)
            item(i, f"fases/{pasta.name}", p)
            if "ordem" not in i:
                erros.append(f"{i.get('id')}: sem ordem")
            ordens.setdefault(i.get("ordem"), []).append(i.get("id"))
            if i.get("peca") is None:
                avisos.append(f"{i.get('id')}: sem peca")
            if i.get("proximo") is not None and not str(i.get("proximo")).strip():
                erros.append(f"{i.get('id')}: proximo vazio (apague o campo quando não houver próximo passo)")
            if i.get("status") == "feito" and i.get("proximo"):
                feitos_com_proximo.append(i.get("id"))
        for o, ids in ordens.items():
            if o is not None and len(ids) > 1:
                avisos.append(f"fase {pasta.name}: ordem {o} repetida em {', '.join(sorted(ids))} (desempata pelo id)")
    if feitos_com_proximo:
        avisos.append("itens feitos que ainda têm proximo (apague o campo quando a pendência acabar): "
                      + ", ".join(sorted(feitos_com_proximo)))
    for p in (DADOS / "testes").glob("*.json"):
        t = ler(p)
        item(t, "testes", p)
        if t.get("fase") not in ids_fase:
            avisos.append(f"{t.get('id')}: fase \"{t.get('fase')}\" não é uma fase do painel")
    for p in (DADOS / "externos").glob("*.json"):
        item(ler(p), "externos", p)
    for pasta in (DADOS / "publicacao").iterdir():
        if pasta.is_dir():
            for p in pasta.glob("*.json"):
                if p.name != "grupo.json":
                    item(ler(p), f"publicacao/{pasta.name}", p)
    for p in (DADOS / "decisoes").glob("*.json"):
        r = ler(p)
        if p.stem != r.get("id") or not r.get("texto"):
            erros.append(f"decisoes/{p.name}: precisa de id igual ao nome do arquivo e texto")

    fa = d["meta"]["fase_atual"]
    if fa and fa not in ids_fase:
        erros.append(f"meta.json: fase_atual \"{fa}\" não é uma fase")
    for r in d["meta"]["fora_do_software"]:
        if r not in codigos:
            erros.append(f"meta.json: fora_do_software cita {r}, que não está no IDEIAS.md")

    for p in (DADOS / "historico").glob("*.json"):
        if p.name == "legado.json":
            continue
        m = NOME_HIST.match(p.name)
        h = ler(p)
        if not m:
            erros.append(f"historico/{p.name}: nome fora do padrão AAAA-MM-DD-HHMM-nome-curto.json")
            continue
        for campo in ("data", "inicio", "fim", "texto"):
            if not h.get(campo):
                erros.append(f"historico/{p.name}: falta \"{campo}\"")
        if h.get("data") and not re.fullmatch(r"\d{2}/\d{2}/\d{4}", h["data"]):
            erros.append(f"historico/{p.name}: data tem que ser dd/mm/aaaa")
        elif h.get("data") and data_iso(h["data"]) != "-".join(m.group(1, 2, 3)):
            erros.append(f"historico/{p.name}: a data do nome não bate com \"data\"")
        if h.get("inicio") and re.sub(r"\D", "", h["inicio"]) != m.group(4) + m.group(5):
            erros.append(f"historico/{p.name}: a hora do nome tem que ser a de \"inicio\"")
        for campo in ("inicio", "fim"):
            if h.get(campo) and not re.fullmatch(r"~?\d{2}:\d{2}", h[campo]):
                erros.append(f"historico/{p.name}: {campo} tem que ser hh:mm (ou ~hh:mm quando aproximado)")
        for r in h.get("refs", []):
            if r not in codigos and r not in vistos:
                avisos.append(f"historico/{p.name}: refs cita {r}, que não é ideia nem item")
    return relatar(erros, avisos, silencioso)


def relatar(erros, avisos, silencioso) -> bool:
    for a in avisos:
        print("aviso:", a)
    for e in erros:
        print("ERRO:", e)
    if not silencioso or erros:
        print(f"conferir: {len(erros)} erro(s), {len(avisos)} aviso(s)")
    return not erros


# ---------------------------------------------------------------- montar

def montar(saida: Path) -> None:
    if not conferir(silencioso=True):
        sys.exit("montar: corrija os erros acima antes de publicar")
    d = carregar()
    pagina = PAGINA.read_text(encoding="utf-8")
    if MARCA not in pagina:
        sys.exit("pagina.html sem a marca dos dados")
    saida.mkdir(parents=True, exist_ok=True)
    bloco = json.dumps(d, ensure_ascii=False, indent=1).replace("</", "<\\/")
    (saida / "painel-execucao.html").write_text(pagina.replace(MARCA, bloco, 1), encoding="utf-8")
    dividir(d, pagina, saida)
    print(f"montar: painel e partes em {saida}")


def dividir(d: dict, pagina: str, saida: Path) -> None:
    """Partes do artifact: as mesmas de antes (meta, fases de 25 em 25, histórico por mês)."""
    (saida / "dados").mkdir(parents=True, exist_ok=True)
    for velho in (saida / "dados").glob("*.json"):
        velho.unlink()
    partes = []

    def grava(nome, valor):
        (saida / "dados" / nome).write_text(json.dumps(valor, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        partes.append(nome)

    grava("meta.json", {k: v for k, v in d.items() if k not in ("fases", "historico")})
    for f in d["fases"]:
        itens = f["itens"]
        for n, i in enumerate(range(0, max(len(itens), 1), POR_PARTE), start=1):
            parte = {"fase": f["id"], "itens": itens[i:i + POR_PARTE]}
            if n == 1:
                parte["cabeca"] = {k: v for k, v in f.items() if k != "itens"}
            grava(f"fase-{f['id']}-{n:02d}.json", parte)
    meses = {}
    for h in d["historico"]:
        _, mm, aaaa = h["data"].split("/")
        meses.setdefault(f"{aaaa}-{mm}", []).append(h)
    for mes in sorted(meses, reverse=True):
        grava(f"historico-{mes}.json", meses[mes])
    (saida / "dados" / "partes.json").write_text(json.dumps(partes, indent=1) + "\n", encoding="utf-8")

    vazio = pagina.replace(MARCA, "{}", 1)
    app = "<script>\n(function(){\n  const D=JSON.parse(document.getElementById('dados').textContent);"
    if app not in vazio:
        sys.exit("script principal não encontrado na pagina.html")
    vazio = vazio.replace(app, '<script type="text/plain" id="app">\n(function(){\n  const D=JSON.parse(document.getElementById(\'dados\').textContent);', 1)
    carregar_js = """<script>
(async()=>{
  try{
    const lista=await (await fetch('dados/partes.json',{cache:'no-store'})).json();
    const blocos=await Promise.all(lista.map(n=>fetch('dados/'+n,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(n);return r.json();})));
    const D={fases:[],historico:[]};const fases={};
    lista.forEach((n,i)=>{const b=blocos[i];
      if(n==='meta.json')Object.assign(D,b);
      else if(n.startsWith('fase-')){let f=fases[b.fase];if(!f){f=fases[b.fase]={...(b.cabeca||{id:b.fase}),itens:[]};D.fases.push(f);}f.itens.push(...b.itens);}
      else if(n.startsWith('historico-'))D.historico.push(...b);});
    const ordem=['meta','proximos','fases','testes','publicacao','externos','decisoes','historico'];
    const certo={};ordem.forEach(k=>{if(k in D)certo[k]=D[k];});Object.keys(D).forEach(k=>{if(!(k in certo))certo[k]=D[k];});
    document.getElementById('dados').textContent=JSON.stringify(certo);
    const s=document.createElement('script');s.textContent=document.getElementById('app').textContent;document.body.appendChild(s);
  }catch(e){
    const p=document.createElement('p');p.setAttribute('role','alert');p.style.cssText='margin:24px;font:16px/1.5 system-ui';
    p.textContent='Não deu para carregar os dados do painel ('+e.message+'). Recarregue a página.';document.body.prepend(p);
  }
})();
</script>
</body>"""
    if vazio.count("</body>") != 1:
        sys.exit("pagina.html precisa de um </body> só")
    (saida / "index.html").write_text(vazio.replace("</body>", carregar_js, 1), encoding="utf-8")


# ---------------------------------------------------------------- novo-historico

def novo_historico(a) -> None:
    agora = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3)))
    data = a.data or agora.strftime("%d/%m/%Y")
    for v in (a.inicio, a.fim):
        if not re.fullmatch(r"\d{2}:\d{2}", v):
            sys.exit("inicio e fim em hh:mm (horário de Brasília)")
    h = {"data": data, "inicio": a.inicio, "fim": a.fim, "texto": a.texto}
    if a.refs:
        h["refs"] = a.refs
    nome = slug(a.nome or (a.refs[0] if a.refs else a.texto))
    base = f"{data_iso(data)}-{a.inicio.replace(':', '')}-{nome}"
    p = DADOS / "historico" / f"{base}.json"
    n = 2
    while p.exists():
        p = DADOS / "historico" / f"{base}-{n}.json"
        n += 1
    gravar(p, h)
    print(p.relative_to(PROJETO))


# ---------------------------------------------------------------- migrar (formato antigo -> pasta)

def dados_do_html(html: str) -> dict:
    m = re.search(r'<script type="application/json" id="dados">(.*?)</script>', html, re.S)
    if not m:
        sys.exit("bloco de dados não encontrado no painel antigo")
    return json.loads(m.group(1))


ID_ITEM = re.compile(r"\b(?:D\d+(?:\.\d+[a-z]?)?|F\d+\.\d+[a-z]?|R\d+\.\d+[a-z]?|R\d+)\b")


def repartir_proximo(texto: str, ids_itens: list) -> tuple:
    """Separa o texto antigo do próximo passo em frases e põe cada frase no primeiro item que ela cita."""
    conhecidos = set(ids_itens)
    frases = [f.strip() for f in re.split(r"(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])", texto) if f.strip()]
    por_item, sobras, vistas = {}, [], set()
    for f in frases:
        if f in vistas:
            continue  # o texto antigo tinha blocos repetidos
        vistas.add(f)
        alvo = next((c for c in ID_ITEM.findall(f) if c in conhecidos), None)
        if alvo:
            por_item.setdefault(alvo, []).append(f)
        else:
            sobras.append(f)
    return {k: " ".join(v) for k, v in por_item.items()}, sobras


def migrar(html_antigo: Path) -> None:
    d = dados_do_html(html_antigo.read_text(encoding="utf-8"))
    if DADOS.exists() and any(DADOS.rglob("*.json")):
        sys.exit(f"{DADOS} já tem dados; apague a pasta antes de migrar de novo")
    gravar(DADOS / "meta.json", {"fase_atual": d["meta"]["fase_atual"], "fora_do_software": d["meta"]["fora_do_software"]})
    gravar(DADOS / "situacao.json", {"texto": d["meta"]["situacao"]})
    ids = [i["id"] for f in d["fases"] for i in f["itens"]]
    proximos, sobras = repartir_proximo(d["meta"].get("proximo_passo", ""), ids)
    for n, f in enumerate(d["fases"], start=1):
        cab = {k: v for k, v in f.items() if k != "itens"}
        cab["ordem"] = n * 10
        gravar(DADOS / "fases" / f["id"] / "fase.json", cab)
        for k, i in enumerate(f["itens"], start=1):
            r = dict(i)
            if i["id"] in proximos:
                r["proximo"] = proximos[i["id"]]
            r["ordem"] = k * 10
            gravar(DADOS / "fases" / f["id"] / f"{i['id']}.json", r)
    for k, t in enumerate(d["testes"], start=1):
        gravar(DADOS / "testes" / f"{t['id']}.json", {**t, "ordem": k * 10})
    for k, e in enumerate(d["externos"], start=1):
        gravar(DADOS / "externos" / f"{e['id']}.json", {**e, "ordem": k * 10})
    for n, g in enumerate(d["publicacao"], start=1):
        pasta = DADOS / "publicacao" / slug(g["grupo"])
        gravar(pasta / "grupo.json", {"grupo": g["grupo"], "ordem": n * 10})
        for k, i in enumerate(g["itens"], start=1):
            gravar(pasta / f"{i['id']}.json", {**i, "ordem": k * 10})
    for k, (did, texto) in enumerate(d["decisoes"], start=1):
        gravar(DADOS / "decisoes" / f"{did}.json", {"id": did, "texto": texto, "ordem": k * 10})
    gravar(DADOS / "historico" / "legado.json", d["historico"])
    relatorio = {"proximo_por_item": proximos, "frases_sem_item": sobras}
    print(json.dumps(relatorio, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------- importar (PR antigo -> pasta)

def git(*args) -> str:
    return subprocess.run(["git", *args], cwd=PROJETO, check=True, capture_output=True, text=True).stdout


def importar(ramo: str) -> None:
    base = git("merge-base", ramo, "origin/main").strip()
    antes = dados_do_html(git("show", f"{base}:{ANTIGO_GIT}"))
    depois = dados_do_html(git("show", f"{ramo}:{ANTIGO_GIT}"))
    mudou = []

    def por_id(lista):
        return {i["id"]: i for i in lista}

    # Itens das fases.
    for f in depois["fases"]:
        pasta = DADOS / "fases" / f["id"]
        fa = next((x for x in antes["fases"] if x["id"] == f["id"]), None)
        cab = {k: v for k, v in f.items() if k != "itens"}
        if fa is None or cab != {k: v for k, v in fa.items() if k != "itens"}:
            atual = ler(pasta / "fase.json") if (pasta / "fase.json").exists() else {"ordem": 999}
            gravar(pasta / "fase.json", {**cab, "ordem": atual.get("ordem", 999)})
            mudou.append(f"fases/{f['id']}/fase.json")
        velhos = por_id(fa["itens"]) if fa else {}
        anterior = None
        for i in f["itens"]:
            p = pasta / f"{i['id']}.json"
            if velhos.get(i["id"]) != i:
                atual = ler(p) if p.exists() else {}
                if "ordem" in atual:
                    ordem = atual["ordem"]
                else:
                    ant = ler(pasta / f"{anterior}.json") if anterior and (pasta / f"{anterior}.json").exists() else None
                    ordem = ant["ordem"] + 1 if ant else 1
                novo = dict(i)
                if atual.get("proximo"):
                    novo["proximo"] = atual["proximo"]
                novo["ordem"] = ordem
                gravar(p, novo)
                mudou.append(str(p.relative_to(DADOS)))
            anterior = i["id"]

    # Testes, externos, publicação e decisões.
    for nome in ("testes", "externos"):
        velhos = por_id(antes[nome])
        for k, r in enumerate(depois[nome], start=1):
            if velhos.get(r["id"]) != r:
                p = DADOS / nome / f"{r['id']}.json"
                ordem = ler(p)["ordem"] if p.exists() else 10_000 + k
                gravar(p, {**r, "ordem": ordem})
                mudou.append(str(p.relative_to(DADOS)))
    for g in depois["publicacao"]:
        ga = next((x for x in antes["publicacao"] if x["grupo"] == g["grupo"]), {"itens": []})
        velhos = por_id(ga["itens"])
        pasta = DADOS / "publicacao" / slug(g["grupo"])
        if not (pasta / "grupo.json").exists():
            gravar(pasta / "grupo.json", {"grupo": g["grupo"], "ordem": 999})
        for k, r in enumerate(g["itens"], start=1):
            if velhos.get(r["id"]) != r:
                p = pasta / f"{r['id']}.json"
                ordem = ler(p)["ordem"] if p.exists() else 10_000 + k
                gravar(p, {**r, "ordem": ordem})
                mudou.append(str(p.relative_to(DADOS)))
    velhas = dict(antes["decisoes"])
    for k, (did, texto) in enumerate(depois["decisoes"], start=1):
        if velhas.get(did) != texto:
            p = DADOS / "decisoes" / f"{did}.json"
            ordem = ler(p)["ordem"] if p.exists() else 10_000 + k
            gravar(p, {"id": did, "texto": texto, "ordem": ordem})
            mudou.append(str(p.relative_to(DADOS)))

    # Histórico: as linhas que o ramo acrescentou viram arquivos novos.
    ja = {json.dumps(h, sort_keys=True, ensure_ascii=False) for h in antes["historico"]}
    for h in depois["historico"]:
        if json.dumps(h, sort_keys=True, ensure_ascii=False) in ja:
            continue
        novo = dict(h)
        nome = slug((novo.get("refs") or [novo.get("ref") or novo["texto"]])[0])
        hora = (re.sub(r"\D", "", novo.get("inicio", "")) + "0000")[:4]
        base_nome = f"{data_iso(novo['data'])}-{hora}-{nome}"
        p = DADOS / "historico" / f"{base_nome}.json"
        n = 2
        while p.exists() and ler(p) != novo:
            p = DADOS / "historico" / f"{base_nome}-{n}.json"
            n += 1
        gravar(p, novo)
        mudou.append(str(p.relative_to(DADOS)))

    # Próximo passo: as frases novas do ramo vão para os itens que elas citam.
    ids = [i["id"] for f in depois["fases"] for i in f["itens"]]
    novas_antes = set(repartir_proximo(antes["meta"].get("proximo_passo", ""), ids)[0].items())
    por_item, sobras = repartir_proximo(depois["meta"].get("proximo_passo", ""), ids)
    _, sobras_antes = repartir_proximo(antes["meta"].get("proximo_passo", ""), ids)
    for iid, texto in por_item.items():
        if (iid, texto) in novas_antes:
            continue
        fase = next(f["id"] for f in depois["fases"] if any(i["id"] == iid for i in f["itens"]))
        p = DADOS / "fases" / fase / f"{iid}.json"
        r = ler(p)
        r["proximo"] = texto
        gravar(p, r)
        mudou.append(str(p.relative_to(DADOS)) + " (proximo)")
    for s in sobras:
        if s not in sobras_antes:
            print("aviso: frase nova do próximo passo sem item; ponha no proximo do item certo:", s)
    if depois["meta"].get("situacao") != antes["meta"].get("situacao"):
        print("aviso: o ramo mudou meta.situacao; o resumo geral agora fica em dados/situacao.json (só o coordenador mexe)")
    if depois["meta"].get("fase_atual") != antes["meta"].get("fase_atual"):
        gravar(DADOS / "meta.json", {**ler(DADOS / "meta.json"), "fase_atual": depois["meta"]["fase_atual"]})
        mudou.append("meta.json")
    print("importar: arquivos escritos:" if mudou else "importar: nada mudou no painel desse ramo")
    for m in dict.fromkeys(mudou):
        print("  ", m)


# ---------------------------------------------------------------- entrada

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("conferir")
    m = sub.add_parser("montar")
    m.add_argument("saida", type=Path)
    n = sub.add_parser("novo-historico")
    n.add_argument("--inicio", required=True)
    n.add_argument("--fim", required=True)
    n.add_argument("--texto", required=True)
    n.add_argument("--refs", nargs="*", default=[])
    n.add_argument("--data")
    n.add_argument("--nome")
    i = sub.add_parser("importar")
    i.add_argument("ramo")
    g = sub.add_parser("migrar")
    g.add_argument("html", type=Path)
    a = ap.parse_args()
    if a.cmd == "conferir":
        sys.exit(0 if conferir() else 1)
    if a.cmd == "montar":
        montar(a.saida)
    elif a.cmd == "novo-historico":
        novo_historico(a)
    elif a.cmd == "importar":
        importar(a.ramo)
    elif a.cmd == "migrar":
        migrar(a.html)


if __name__ == "__main__":
    main()
