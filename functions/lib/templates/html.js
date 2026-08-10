export function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] ?? character);
}
export function renderHtmlTemplate(template, values) {
    return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (token, name) => {
        if (!Object.hasOwn(values, name))
            return token;
        return escapeHtml(values[name]);
    });
}
