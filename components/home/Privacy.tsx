import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const POINTS = [
  {
    title: "Link privado, fuera de Google",
    text: "Cada proyecto tiene su propio link. Si lo marcás como privado, los buscadores no lo indexan: solo lo ve quien lo recibe de vos.",
  },
  {
    title: "Contraseña opcional",
    text: "Podés pedir una contraseña para entrar al proyecto. Se guarda cifrada y, si la cambiás, todos tienen que ingresar la nueva.",
  },
  {
    title: "Tus archivos quedan con nosotros",
    text: "Tus planos, renders y modelos no se comparten con terceros ni se usan en otros proyectos sin tu autorización.",
  },
  {
    title: "Acuerdo de confidencialidad",
    text: "Si lo necesitás, por ejemplo antes de un lanzamiento, firmamos un acuerdo de confidencialidad antes de que nos mandes los archivos.",
  },
];

export function Privacy() {
  return (
    <section id="confidencialidad" className="border-t border-border-subtle py-16 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <SectionHeading
          eyebrow="Confidencialidad"
          title="Tu proyecto lo ve quien vos elegís"
          description="Las demos de este sitio son públicas. Los proyectos de nuestros clientes, no tienen por qué serlo."
        />
        <ul className="grid gap-6 sm:grid-cols-2">
          {POINTS.map((point) => (
            <li key={point.title} className="border-t border-border-subtle pt-4">
              <h3 className="text-base font-semibold">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{point.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
