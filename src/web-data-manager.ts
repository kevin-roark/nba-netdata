const { PUBLIC_URL } = process.env
import { DataManager } from './data-manager'

export class WebFileGetter {
  pathPrefix: string
  cache: {[path: string]: any } = {}
  constructor(pathPrefix = '') {
    this.pathPrefix = pathPrefix
  }

  getFullPath(path: string) {
    return this.pathPrefix + '/' + path
  }

  async getPathData(path: string) {
    if (this.cache[path]) {
      return this.cache[path]
    }

    const url = this.getFullPath(path)
    const res = await fetch(url)
    if (!res.ok) {
      return null
    }

    const data = await res.json()
    if (!data) {
      return null
    }

    this.cache[path] = data
    return data
  }
}

export class WebDataManager extends DataManager {
  constructor(webFileGetter: WebFileGetter) {
    super(webFileGetter)
  }
}

export default new WebDataManager(new WebFileGetter(PUBLIC_URL))
