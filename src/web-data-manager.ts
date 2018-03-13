import * as promiseRetry from 'promise-retry'
import { DataManager } from './data-manager'

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Response not ok...')
  }

  const json = await res.json()
  if (!json) {
    throw new Error('res.json() returning nothing...')
  }

  return json
}

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

    try {
      const data = await promiseRetry(async (retry) => {
        try {
          return await fetchJson(url)
        } catch (err) {
          retry(err)
        }
      }, { retries: 3 })

      this.cache[path] = data
      return data
    } catch (err) {
      console.log(`Error getting ${path}:`, err)
      return null
    }
  }
}

export class WebDataManager extends DataManager {
  constructor(webFileGetter: WebFileGetter) {
    super(webFileGetter)
  }

  static fromPathPrefix (pathPrefix?: string) {
    return new WebDataManager(new WebFileGetter(pathPrefix))
  }
}

export default WebDataManager.fromPathPrefix(process.env.PUBLIC_URL)
