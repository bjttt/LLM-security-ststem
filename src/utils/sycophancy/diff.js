export function diffText(original, objective) {
  if (original === objective) return { original: [{ text: original, changed: false }], objective: [{ text: objective, changed: false }] }
  let a = Array.from(original), b = Array.from(objective)
  if (a.length * b.length > 1_000_000) {
    a = original.split(/(?<=[。！？.!?\n])/u); b = objective.split(/(?<=[。！？.!?\n])/u)
  }
  if (a.length * b.length > 1_000_000) return { original: [{ text: original, changed: true }], objective: [{ text: objective, changed: true }] }
  const width = b.length + 1, values = new Uint32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) values[i * width + j] = a[i] === b[j] ? 1 + values[(i + 1) * width + j + 1] : Math.max(values[(i + 1) * width + j], values[i * width + j + 1])
  const left = [], right = []
  const push = (list, text, changed) => { if (list.at(-1)?.changed === changed) list.at(-1).text += text; else list.push({ text, changed }) }
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { push(left, a[i++], false); push(right, b[j++], false) }
    else if (i < a.length && (j === b.length || values[(i + 1) * width + j] >= values[i * width + j + 1])) push(left, a[i++], true)
    else push(right, b[j++], true)
  }
  return { original: left, objective: right }
}
