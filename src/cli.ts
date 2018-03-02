#!/usr/bin/env ts-node

import * as program from 'commander'
import { Season } from './types'
import { saveGameLog } from './save-game-log'

export interface CliOptions {
  season: Season
}

const defaultOptions: CliOptions = {
  season: '2017-18'
}

const functionMap: { [key: string]: (options: CliOptions) => any } = {
  saveGameLog
}

program
  .version('0.1.0')
  .option('-f, --function [value]', 'Function')
  .option('-s, --season [value]', 'Season')
  .parse(process.argv)

main()

async function main() {
  console.log('WELCOME TO NETDATA CLI!')

  const fn = functionMap[program.function]
  if (!fn) {
    console.log(`No valid function given (${program.function})...`)
    return logHelp()
  }

  const options: CliOptions = { ...defaultOptions, ...(program as any) }

  try {
    await fn(options)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

function logHelp() {
  console.log('Here is some help... run --help for more')
  console.log('Possible functions:', Object.keys(functionMap).join(', '))
}
