// Offsets are UTF-16 string indexes, matching String.slice and Vue text nodes.
export function locateQuote(text, quote, occurrence = 1) {
  if (typeof text !== 'string' || typeof quote !== 'string' || !quote || !Number.isInteger(occurrence) || occurrence < 1 || occurrence > 100) return null
  let start = -1, offset = 0
  for (let i = 0; i < occurrence; i++) {
    start = text.indexOf(quote, offset)
    if (start < 0) return null
    offset = start + quote.length
  }
  return { start, end: start + quote.length }
}
