/** Шаблон title/description: «{name} — купить от {price}». Пустые плейсхолдеры убираются. */
export function fillTemplate(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])))
    .replace(/\s+по цене от(?=\s*(?:[|.,—–-]|$))/gi, "") // без цены — «от» не оставляем
    .replace(/\s+([.,])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
