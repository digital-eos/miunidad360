/**
 * The BIM demo lives under its project's slug (/demos/schependomlaan). Kept apart from
 * dataset.ts so links, the sitemap and next.config don't pull in the model data.
 *
 * Changing the slug also means renaming the route folder app/demos/<slug>.
 */
export const BIM_PROJECT_SLUG = "schependomlaan";

export const BIM_DEMO_PATH = `/demos/${BIM_PROJECT_SLUG}`;
