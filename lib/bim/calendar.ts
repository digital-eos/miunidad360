import { bimDataset, weekNumbers } from "@/lib/bim/dataset";

export type CalendarCategory = "estructura" | "muros" | "fachada" | "techo" | "terminaciones";

export const CALENDAR_CATEGORY_LABELS: Record<CalendarCategory, string> = {
  estructura: "Estructura",
  muros: "Muros",
  fachada: "Fachada",
  techo: "Techo",
  terminaciones: "Terminaciones",
};

export const CALENDAR_CATEGORY_COLORS: Record<CalendarCategory, string> = {
  estructura: "#90a4c0",
  muros: "#e8d9b8",
  fachada: "#d98f6c",
  techo: "#6f9e9a",
  terminaciones: "#b79fc7",
};

/** Dutch task names from the dataset, translated to Spanish and bucketed into a calendar category. */
const TASK_INFO: Record<string, { es: string; category: CalendarCategory }> = {
  "Stellen bruggetjes": { es: "Colocación de puentes de encofrado", category: "estructura" },
  "Bekisten liftwanden": { es: "Encofrado de muros del ascensor", category: "muros" },
  "Stellen funderingkist incl. poeren": {
    es: "Armado del encofrado de fundación, incl. bases",
    category: "estructura",
  },
  "Opstorten fundering": { es: "Hormigonado de la fundación", category: "estructura" },
  "Stelwerk metselwerk onder peil": { es: "Mampostería bajo nivel de piso", category: "muros" },
  "Kanaalplaatvloer leggen (lev. week 16)": {
    es: "Colocación de losas alveolares (entrega semana 16)",
    category: "estructura",
  },
  "Afstorten kanaalplaat": {
    es: "Hormigonado de terminación sobre losa alveolar",
    category: "estructura",
  },
  "Stelwerk kalkzandsteen": { es: "Mampostería de bloques silicocalcáreos", category: "muros" },
  "Plaatsen stalen kolommen": { es: "Colocación de columnas de acero", category: "estructura" },
  "Leggen breedplaat incl. Veiligheid": {
    es: "Colocación de losa compuesta (incl. medidas de seguridad)",
    category: "estructura",
  },
  "Stalen balken": { es: "Vigas de acero", category: "estructura" },
  "Prefab trappen en bordes ": {
    es: "Escaleras y descansos prefabricados",
    category: "estructura",
  },
  "Lijmwerk kalkzandsteen elementen": {
    es: "Mampostería encolada de elementos silicocalcáreos",
    category: "muros",
  },
  Opstellen: { es: "Montaje de estructura", category: "estructura" },
  Stort: { es: "Hormigonado", category: "estructura" },
  "Stelwerk buitengevel": { es: "Montaje de fachada exterior", category: "fachada" },
  "Plaatsen kozijnen": { es: "Colocación de marcos de ventanas y puertas", category: "fachada" },
  Metselwerk: { es: "Mampostería", category: "muros" },
  "Staalconstuctie dak": { es: "Estructura de acero del techo", category: "techo" },
  "Prefab trappen en bordes 2e verd.": {
    es: "Escaleras y descansos prefabricados (2.º piso)",
    category: "estructura",
  },
  "Stelwerk /lijmwerk lift": { es: "Montaje del ascensor", category: "estructura" },
  "Plaatsen scharnierkap incl. goot en platte daken": {
    es: "Colocación de techo articulado, con canaletas y techos planos",
    category: "techo",
  },
  "Zinken bekleding dakkapelen": { es: "Revestimiento de zinc en buhardillas", category: "techo" },
  "Dakbedekking platte daken": { es: "Cubierta de techos planos", category: "techo" },
  Dakramen: { es: "Ventanas de techo (claraboyas)", category: "techo" },
  Afbouw: { es: "Terminaciones", category: "terminaciones" },
};

function infoFor(task: string) {
  return TASK_INFO[task] ?? { es: task, category: "terminaciones" as CalendarCategory };
}

/** Translated task labels for a milestone week's raw (Dutch) task list. */
export function translateTasks(tasks: string[]): string[] {
  return tasks.map((t) => infoFor(t).es);
}

/** Distinct calendar categories touched by a milestone week's tasks. */
export function categoriesForWeek(week: number): CalendarCategory[] {
  const entry = bimDataset.weeks[String(week)];
  if (!entry) return [];
  const seen = new Set<CalendarCategory>();
  for (const task of entry.tasks) seen.add(infoFor(task).category);
  return [...seen];
}

/** Milestone week number keyed by its ISO date string ("YYYY-MM-DD"), for calendar day lookups. */
export const milestoneWeekByDate = new Map(
  weekNumbers.map((w) => [bimDataset.weeks[String(w)].date, w]),
);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ORIGIN = new Date(`${bimDataset.origin_date}T00:00:00`);
export const LAST_WEEK = weekNumbers[weekNumbers.length - 1] ?? 0;

/** Calendar date for any week number (0..LAST_WEEK), not just dataset milestones. */
export function dateForWeek(week: number): Date {
  return new Date(ORIGIN.getTime() + week * 7 * MS_PER_DAY);
}

/** Week number (clamped) whose 7-day span contains `date`. */
export function weekForDate(date: Date): number {
  const days = Math.round((date.getTime() - ORIGIN.getTime()) / MS_PER_DAY);
  const week = Math.round(days / 7);
  return Math.min(LAST_WEEK, Math.max(0, week));
}

/** The most recent dataset milestone at or before `week`, if any. */
export function milestoneAtOrBefore(week: number): number | null {
  let best: number | null = null;
  for (const w of weekNumbers) {
    if (w <= week) best = w;
    else break;
  }
  return best;
}

/** Share (0..100) of the dataset's construction groups scheduled at or before `week`. */
export function progressPercentForWeek(week: number): number {
  const total = bimDataset.groups.length;
  if (total === 0) return 0;
  const built = bimDataset.groups.filter((g) => g.week <= week).length;
  return Math.round((built / total) * 100);
}

export function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" }).format(
    date,
  );
}
