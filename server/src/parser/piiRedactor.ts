const PATTERNS: { name: string; re: RegExp; replacement: string }[] = [
  { name: 'email',   re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { name: 'phone',   re: /(\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,  replacement: '[PHONE]' },
  { name: 'ssn',     re: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g,                         replacement: '[SSN]' },
  { name: 'cc',      re: /\b(?:\d[ -]?){13,16}\b/g,                               replacement: '[CC]' },
  { name: 'api_key', re: /\b[A-Za-z0-9]{32,}\b/g,                                replacement: '[KEY]' },
  { name: 'url',     re: /https?:\/\/[^\s]+/g,                                    replacement: '[URL]' },
]

export interface RedactionResult {
  redacted: string
  hits: { name: string; count: number }[]
  clean: boolean
}

export function redactPii(text: string): RedactionResult {
  let result = text
  const hits: { name: string; count: number }[] = []

  for (const { name, re, replacement } of PATTERNS) {
    const matches = result.match(re)
    if (matches) {
      hits.push({ name, count: matches.length })
      result = result.replace(re, replacement)
    }
  }

  return { redacted: result, hits, clean: hits.length === 0 }
}
