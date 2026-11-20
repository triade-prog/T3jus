# Site "em breve" do T3jus (t3jus.pro)

Página única e estática que fica no ar em `t3jus.pro` até o site comercial completo (F2.1, em Astro) ficar pronto. Sem build e sem dependências: a Vercel serve a pasta como está.

- `index.html`: a página, com o CSS no próprio arquivo.
- `marca/`: cópias sem alteração dos SVGs de `docs/marca/svg`, o ícone do iPhone e a imagem de compartilhamento (`og.png`).
- `vercel.json`: cabeçalhos de segurança e cache da pasta `marca/`.

Na Vercel: projeto com diretório raiz `sistema/apps/site`, framework "Other", sem comando de build.
