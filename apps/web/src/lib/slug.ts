/**
 * Paths under /events that are pages rather than events.
 *
 * Next resolves a static segment before a dynamic one, so an event whose slug
 * were "new" would be permanently shadowed by the create page and unreachable.
 * Better to refuse the slug while it is being typed than to create an event
 * nobody can open.
 */
export const RESERVED_SLUGS = ["new", "edit"] as const;

/** The slug shape the API accepts, restated so the form can say so first. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A slug suggestion from a title.
 *
 * Accents are stripped rather than dropped, so "Crème Brûlée" becomes
 * "creme-brulee" instead of "cr-me-br-l-e". Anything else that is not a letter
 * or digit becomes a separator, and runs of separators collapse.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugProblem(slug: string): string | undefined {
  if (slug === "") return "Needed, so the event has a web address.";
  if (!SLUG_PATTERN.test(slug)) {
    return "Lowercase letters, numbers, and single hyphens only.";
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return `"${slug}" is used by the site itself. Pick another.`;
  }
  return undefined;
}
