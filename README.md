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

4. (Opcional) Insertá un lead de prueba para verificar la conexión:

   ```bash
   npm run db:seed
   ```

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
| `npm run db:seed`     | Inserta un lead de prueba (uso local)          |

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

Se trackean tres eventos personalizados con `@vercel/analytics`:

- `demo_click` — clic en una de las tres tarjetas de demos (`maqueta`, `selector`, `sol`)
- `whatsapp_click` — clic en cualquier botón de WhatsApp, con el origen (`hero`, `header`, `contact-section`, `demo-coming-soon`)
- `form_submit` — intento de envío del formulario de contacto

Los eventos aparecen en el panel de Analytics del proyecto en Vercel una vez
deployado (no se registran en `localhost`).

## Notas de implementación

- La escena 3D es un placeholder geométrico (cajas + líneas + una grilla de
  "ventanas" con emisión de color) generado íntegramente en Three.js — no usa
  ningún modelo, imagen o fuente de terceros, para evitar cualquier problema de
  licencia. La maqueta real del producto se integrará en un paso posterior.
- El Canvas 3D se carga de forma diferida (`next/dynamic`, `ssr: false`) después
  del contenido principal, y cae a un fondo estático (`SceneFallback`) si el
  navegador no soporta WebGL.
- Se respeta `prefers-reduced-motion` tanto en las animaciones de `motion` como
  en la rotación de la escena 3D (se detiene si el usuario lo prefiere así).
- El rate limiting del formulario de contacto es una implementación simple en
  memoria (`lib/rate-limit.ts`), pensada para disuadir envíos automatizados
  básicos. En un entorno serverless con múltiples instancias no es un límite
  estrictamente global; para eso conviene migrar a algo como Upstash Redis.
- El formulario de contacto incluye un campo honeypot (`company_website`,
  oculto visualmente pero accesible para lectores de pantalla como "no
  completar") además del rate limit.

## Qué falta configurar manualmente

- [ ] Crear el proyecto en Neon y cargar `DATABASE_URL` (local y en Vercel).
- [ ] Cargar `NEXT_PUBLIC_WHATSAPP_NUMBER` con el número real de Digital EOS.
- [ ] Cargar `NEXT_PUBLIC_SITE_URL` con el dominio final del sitio.
- [ ] Conectar el dominio propio en Vercel.
- [ ] Activar Vercel Analytics en el proyecto (Project Settings → Analytics).
- [ ] Revisar/journalizar el texto de `app/privacidad/page.tsx` con el área legal
      de Digital EOS antes de publicar (el texto actual es un borrador genérico).
- [ ] Reemplazar el placeholder 3D del hero por la maqueta real del producto
      cuando esté disponible.
- [ ] Construir las páginas reales de `/demos/maqueta`, `/demos/selector` y
      `/demos/sol` (hoy muestran "Próximamente").
- [ ] Si se espera mucho tráfico o abuso del formulario, migrar el rate limit en
      memoria a una solución distribuida (ej. Upstash Redis).
- [ ] Inicializar el repositorio Git (`git init`) si todavía no se hizo, y
      configurar el remoto antes de conectar Vercel.
