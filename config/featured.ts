export type FeaturedPhoto = {
  src: string;
  alt: string;
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
 * `fotos` is the starting material shown in the homepage hero (render del proyecto).
 * Files live in public/projects/<slug>/.
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
      src: "/projects/schependomlaan/schependomlaan-render.webp",
      alt: "Render del proyecto Schependomlaan",
    },
  ],
};

export const featuredProject: FeaturedProject = schependomlaan;
