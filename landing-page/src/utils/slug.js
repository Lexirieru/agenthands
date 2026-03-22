/**
 * Finds a project by its slug (uses the slug field from the JSON)
 */
export function findProjectBySlug(slug, projects) {
  return projects.find(project => project.slug === slug)
}
