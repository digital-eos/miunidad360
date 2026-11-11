/**
 * Live listings shown on /publicaciones: projects a developer pays to publish, aimed at
 * buyers. Unlike /demos (which shows sellers what the product can do), each entry here is a
 * property on sale. Add a new paid listing by appending it to this list.
 */
export type Publicacion = {
  slug: string;
  /** Page that opens the listing in 3D. */
  href: string;
  /** "Departamentos en venta", "Lotes en venta"… */
  operacion: string;
  titulo: string;
  ubicacion: string;
  /** One line with the key figures: units, rooms, amenities. */
  resumen: string;
  imagen: { src: string; alt: string };
};

export const PUBLICACIONES: Publicacion[] = [
  {
    slug: "torre-aldrey",
    href: "/demos/torre-aldrey",
    operacion: "Departamentos en venta",
    titulo: "Torre Aldrey",
    ubicacion: "A 800 m del mar",
    resumen: "15 unidades de 1, 2 y 3 ambientes, con quincho, terraza con solárium y parrilla.",
    imagen: {
      src: "/projects/cataluna-ii/fotos/edificio-fachada.webp",
      alt: "Fachada de Torre Aldrey de noche",
    },
  },
];
