export class ExternalTagManager extends Map<string, string> {
  constructor() {
    super()
  }

  replaceTag(tag: string) {
    if (this.has(tag)) {
      const tag2 = this.get(tag)!
      let i = 0
      if (tag2.endsWith('-r')) {
        const parts = tag2.split('-')
        i = parseInt(parts.at(-2)!) + 1
      }
      const tag3 = `${tag}-${i}-r`
      this.set(tag, tag3)
      return tag3
    }
    this.set(tag, tag)
    return tag
  }
}

export const tagManager = new ExternalTagManager()
