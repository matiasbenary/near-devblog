# devblog-substack

Exporta los devblogs de NEAR Docs (`posts/`, copiados de `near/docs/blog`) a un RSS completo para el importador de Substack.

```bash
npm install
npm run build        # -> dist/rss.xml + dist/index.html (preview)
```

Deploy en Netlify: conectar el repo (usa `netlify.toml`) o
`npx netlify deploy --prod --dir dist` tras `SITE_URL=https://<sitio>.netlify.app npm run build`
(las imágenes apuntan a `SITE_URL`, así que tiene que coincidir con el dominio final).

Substack → Settings → Import → pegar `https://<sitio>.netlify.app/rss.xml`.
