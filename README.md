# MiUnidad360

Sitio vitrine de **MiUnidad360**, un producto de **Digital EOS**: experiencias 3D
interactivas para que promotores, inmobiliarias y estudios de arquitectura vendan
unidades antes de construirlas.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript estricto)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Three.js](https://threejs.org) vía `@react-three/fiber` y `@react-three/drei`
  (carga solo en cliente, con `dynamic(..., { ssr: false })`)
- [motion](https://motion.dev) para animaciones de interfaz
- [Drizzle ORM](https://orm.drizzle.team) + [Neon](https://neon.tech) (Postgres)
- [Zod](https://zod.dev) para validación
- [@vercel/analytics](https://vercel.com/docs/analytics) con eventos personalizados

## Estructura

```
app/                 Rutas (App Router), Server Actions en app/actions/
components/          Componentes de UI y de secciones
components/three/    Escena 3D (cliente, carga diferida)
components/ui/       Primitivas de layout (Container, SectionHeading, Reveal)
lib/                 Utilidades, cliente de base de datos, validaciones
db/                  Esquema Drizzle, migraciones y script de seed
```

## Desarrollo local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completá los valores:

```bash
cp .env.example .env.local
```

- `DATABASE_URL`: connection string de tu base de Neon (ver "Base de datos" abajo).
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número de WhatsApp en formato internacional, sin
  "+" ni espacios (ej. `5491122334455`).
- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio, usada en metadatos SEO/Open Graph.

### 3. Base de datos (Neon + Drizzle)

1. Creá un proyecto en [Neon](https://neon.tech) (o agregá la integración de Neon
   desde el Vercel Marketplace en tu proyecto de Vercel).
2. Copiá el connection string a `DATABASE_URL` en `.env.local`.
3. Generá y aplicá las migraciones:

   ```bash
   npm run db:generate   # genera el SQL a partir de db/schema.ts (ya incluido en el repo)
   npm run db:migrate    # aplica las migraciones contra tu base
   ```

4. Cargá los proyectos de demo (Edificio Demo, Schependomlaan y Barrio Demo):

   ```bash
   npm run db:seed            # no pisa precios ni estados editados en /admin
   npm run db:seed -- --reset # reescribe todas las unidades
   ```

   Cada unidad vendible (departamento, lote, nave…) es una fila de la tabla `unidades`:
   columnas comunes (código, sector, superficie, precio, estado, objeto 3D) y los datos
   propios de cada tipo en `atributos` (JSONB). Las etiquetas de la ficha de unidad para
   cada tipo se definen en `lib/unidades/tipos.ts`.

5. Para explorar la base con una interfaz visual:

   ```bash
   npm run db:studio
   ```

### 4. Levantar el sitio

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando             | Qué hace                                      |
| -------------------- | ---------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                         |
| `npm run build`       | Build de producción                            |
| `npm run start`       | Sirve el build de producción                   |
| `npm run lint`        | ESLint                                         |
| `npm run db:generate` | Genera migraciones Drizzle a partir del schema  |
| `npm run db:migrate`  | Aplica las migraciones a la base de datos       |
| `npm run db:studio`   | Abre Drizzle Studio                            |
| `npm run db:seed`     | Carga los proyectos y unidades de demo         |

## Deploy en Vercel

1. Subí el repositorio a GitHub/GitLab/Bitbucket e importalo en
   [Vercel](https://vercel.com/new).
2. Agregá la integración de **Neon** desde el Vercel Marketplace (esto puede crear
   `DATABASE_URL` automáticamente) o cargá las variables de entorno a mano en
   Project Settings → Environment Variables, usando los mismos valores que
   `.env.example`.
3. Corré las migraciones contra la base de producción (`npm run db:migrate` con
   el `DATABASE_URL` de producción, o desde un pipeline de CI).
4. Hacé deploy. Vercel detecta Next.js automáticamente.

## Analítica

Se trackean estos eventos personalizados con `@vercel/analytics` (`lib/analytics.ts`):

- `demo_click` — clic en una tarjeta de demo (`selector`, `bim`, `lotes`)
- `whatsapp_click` — clic en cualquier botón de WhatsApp, con el origen (`hero`, `header`,
  `contact-section`, `floating-button`, `demo-{demo}-end`, `selector-unidad`, …)
- `form_submit` — intento de envío de un formulario (contacto general o CTA de fin de demo)
- `filter_used` — se aplicó un filtro en el selector de unidades
- `unit_opened` — se abrió la ficha de una unidad (`selector`, `bim` o `lotes`)
- `capture_mode_entered` — se entró al modo captura (`?capture=1`) de una demo, con el formato
- `video_recorded` — se generó y descargó un video con el botón "Grabar video"

Los eventos aparecen en el panel de Analytics del proyecto en Vercel una vez
deployado (no se registran en `localhost`).

## Modo captura para redes (Instagram/Reels)

Las demos `/demos/selector` y `/demos/schependomlaan` aceptan dos parámetros de URL
pensados para grabar contenido vertical:

- `?capture=1` — oculta toda la interfaz propia del sitio (header, controles, botón de
  WhatsApp flotante) y muestra un cuadro recortado al formato elegido, con una secuencia de
  cámara guionada de ~13s que se repite en loop (en el selector: vista general, zoom a un
  piso y apertura de una unidad).
- `&format=9x16` (Reels/Stories, 1080×1920, default) o `&format=4x5` (feed, 1080×1350).

El botón **"Grabar video"** graba el canvas 3D con `canvas.captureStream` + `MediaRecorder`
(compuesto sobre un canvas intermedio para exportar siempre a la resolución exacta del
formato, sin importar el tamaño en pantalla) y descarga un `.webm` (o `.mp4` si el navegador
lo soporta) con el logo y una frase de cierre incrustados de forma opcional. No se sube nada
a ningún servidor: todo pasa en el navegador de quien graba.

## Rendimiento y SEO

- Calidad 3D adaptativa: `@react-three/drei`'s `PerformanceMonitor` baja el `dpr` del canvas
  automáticamente si el framerate cae (en el hero y en las tres demos).
- Fuentes autoalojadas con `next/font`, escenas 3D con carga diferida (`next/dynamic`,
  `ssr: false`) y fallback estático si no hay WebGL.
- `app/sitemap.ts` y `app/robots.ts` generan `/sitemap.xml` y `/robots.txt`; cada ruta tiene
  su propia imagen Open Graph (`opengraph-image.tsx`) y hay datos estructurados
  (`Organization` en el layout, `Product` en el home) vía `lib/structured-data.ts`.

## Notas de implementación

- El hero de la home es el propio visualizador BIM (`components/three/demos/bim`,
  el mismo que `/demos/schependomlaan`) en vivo, con un curtido "antes/después" sobre una
  foto de referencia del proyecto. El proyecto mostrado es configurable desde
  `config/featured.ts` (modelo, dataset, fotos y su encuadre de cámara); cambiar
  de proyecto solo implica editar ese archivo.
- El Canvas 3D se carga de forma diferida (`next/dynamic`, `ssr: false`) después
  del contenido principal, muestra un póster estático mientras carga y cae a un
  mensaje de texto si el navegador no soporta WebGL.
- Se respeta `prefers-reduced-motion` tanto en las animaciones de `motion` como
  en la rotación de la escena 3D (se detiene si el usuario lo prefiere así).
- El rate limiting del formulario de contacto es una implementación simple en
  memoria (`lib/rate-limit.ts`), pensada para disuadir envíos automatizados
  básicos. En un entorno serverless con múltiples instancias no es un límite
  estrictamente global; para eso conviene migrar a algo como Upstash Redis.
- El formulario de contacto incluye un campo honeypot (`company_website`,
  oculto visualmente pero accesible para lectores de pantalla como "no
  completar") además del rate limit.

## Checklist de mise en production

**Dominio**
- [ ] Conectar el dominio propio en Vercel (Project Settings → Domains) y esperar a que el
      certificado SSL quede activo.
- [ ] Cargar `NEXT_PUBLIC_SITE_URL` en Vercel con ese dominio final (sin barra final), por
      ejemplo `https://miunidad360.com.ar`. Se usa en metadatos SEO, Open Graph, el
      `sitemap.xml` y el `robots.txt`.

**Variables de entorno en Vercel** (Project Settings → Environment Variables, mismos nombres
que `.env.example`, valores de producción)
- [ ] `DATABASE_URL` — connection string de la base de Neon de **producción** (no la de
      desarrollo).
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` — número real de Digital EOS, formato internacional sin
      "+" ni espacios (ej. `5491122334455`).
- [ ] `NEXT_PUBLIC_SITE_URL` — ver punto anterior.
- [ ] `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` — valores únicos y largos para producción,
      distintos de los que se usan en local (`ADMIN_SESSION_SECRET` se genera con
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

**Base Neon de producción**
- [ ] Crear (o confirmar) el proyecto/rama de Neon dedicado a producción — no reutilizar la
      base de desarrollo.
- [ ] Correr las migraciones contra esa base: `npm run db:migrate` con el `DATABASE_URL` de
      producción (local o desde un paso de CI/deploy).
- [ ] Cargar los proyectos/unidades reales (reemplazar o adaptar `db/seed.ts`) antes de
      anunciar el sitio — hoy la base solo tiene el "Edificio Demo" de ejemplo.

**WhatsApp**
- [ ] Confirmar que `NEXT_PUBLIC_WHATSAPP_NUMBER` responde desde WhatsApp Business (probar
      el botón flotante, el del header, el del final de cada demo y el de la ficha de unidad
      del selector).

**Antes de anunciar**
- [ ] Activar Vercel Analytics en el proyecto (Project Settings → Analytics) — los eventos
      personalizados (ver sección "Analítica") no se registran en local.
- [ ] Revisar el texto de `app/privacidad/page.tsx` con el área legal de Digital EOS.
- [ ] Reemplazar el placeholder 3D del hero por la maqueta real del producto cuando esté
      disponible.
- [ ] Probar el modo captura (`?capture=1`) y el botón "Grabar video" de las tres demos en
      Chrome/Safari de escritorio y en iPhone Safari / Android Chrome.
- [ ] Si se espera mucho tráfico o abuso de los formularios, migrar el rate limit en memoria
      (`lib/rate-limit.ts`) a una solución distribuida (ej. Upstash Redis) — en serverless con
      múltiples instancias no es un límite estrictamente global.
- [ ] Correr `npm run build` localmente (o revisar el build de Vercel) y confirmar que no hay
      errores ni warnings de tipos/lint antes de cada deploy a producción.
