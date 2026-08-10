export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

export function renderHtmlTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (token, name: string) => {
    if (!Object.hasOwn(values, name)) return token
    return escapeHtml(values[name])
  })
}
