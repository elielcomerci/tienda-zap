const fs = require('fs')
const path = require('path')
const { PDFParse } = require('pdf-parse')

async function main() {
  const files = fs.readdirSync('listas').filter((file) => file.toLowerCase().endsWith('.pdf'))
  fs.mkdirSync(path.join('scratch', 'listas-text'), { recursive: true })

  for (const file of files) {
    const buffer = fs.readFileSync(path.join('listas', file))
    const parser = new PDFParse({ data: buffer })
    const data = await parser.getText()
    await parser.destroy()
    const textPath = path.join('scratch', 'listas-text', `${path.basename(file, '.pdf')}.txt`)
    fs.writeFileSync(textPath, data.text, 'utf8')
    const nonEmptyLines = data.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    console.log(JSON.stringify({
      file,
      pages: data.total,
      chars: data.text.length,
      lines: nonEmptyLines.length,
      sample: nonEmptyLines.slice(0, 40),
    }, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
