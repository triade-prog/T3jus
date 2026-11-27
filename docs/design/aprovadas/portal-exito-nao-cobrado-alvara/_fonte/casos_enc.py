# Junta os estados das três páginas em casos.json, na ordem do plano (C5), para o fotos.cjs e o index.
import os, json
AQUI = os.path.dirname(os.path.abspath(__file__))
ORDEM = [('financeiro', ['enc-proposta', 'enc-indevido', 'enc-sem', 'enc-cobrar', 'enc-erro', 'enc-erro-cobrar', 'enc-conflito', 'enc-historico', 'enc-historico-sem']),
         ('sino', ['enc-sino', 'enc-sino-larissa']),
         ('caso', ['enc-caso-historico', 'enc-acerto', 'enc-acerto-larissa']),
         ('financeiro', ['enc-resumo-fechado']),
         ('caso', ['enc-ficha-cliente'])]
rot = {}
for p in ('financeiro', 'sino', 'caso'):
    rot[p] = json.load(open(os.path.join(AQUI, f'_rot_{p}.json'), encoding='utf-8'))
casos = [{'nome': e, 'url': f'{p}.html?estado={e}', 'rotulo': rot[p][e]} for p, es in ORDEM for e in es]
assert sum(len(r) for r in rot.values()) == len(casos)
json.dump(casos, open(os.path.join(AQUI, 'casos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('casos.json', len(casos))
