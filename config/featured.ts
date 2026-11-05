export type FeaturedPhoto = {
  src: string;
  alt: string;
  /** Approximate 3D camera framing so the live model lines up with this photo's angle. */
  camara: { posicion: [number, number, number]; objetivo: [number, number, number] };
};

export type FeaturedProject = {
  slug: string;
  nombre: string;
  ubicacion: string;
  credito: string;
  licencia: string;
  modelo: string;
  datos: string;
  fotos: FeaturedPhoto[];
};

/**
 * The project shown live on the homepage hero. Swap this object to feature a different
 * project — nothing else in the homepage needs to change.
 *
 * `fotos` are placeholders (no real on-site photos ship with the Schependomlaan research
 * dataset under a license clear enough for a commercial demo). Drop real photos into
 * public/projects/<slug>/fotos/ and update the `src`/`camara` fields below when available.
 */
const schependomlaan: FeaturedProject = {
  slug: "schependomlaan",
  nombre: "Schependomlaan",
  ubicacion: "Nijmegen, Países Bajos",
  credito:
    "Dataset «Schependomlaan» — ROOT bv, Hendriks Bouw en Ontwikkeling, TU Eindhoven · CC BY 4.0",
  licencia: "CC BY 4.0",
  modelo: "/models/schependomlaan.glb",
  datos: "/data/schependomlaan.json",
  fotos: [
    {
      src: "/projects/schependomlaan/fotos/vista-aerea.svg",
      alt: "Vista aérea de referencia del proyecto (placeholder)",
      camara: {
        posicion: [15.5, 14.8, 20.1],
        objetivo: [0, 4.8, 0],
      },
    },
    {
      src: "/projects/schependomlaan/fotos/fachada-frontal.svg",
      alt: "Vista de fachada frontal de referencia (placeholder)",
      camara: {
        posicion: [0, 6, 31],
        objetivo: [0, 5, 0],
      },
    },
  ],
};

export const featuredProject: FeaturedProject = schependomlaan;
