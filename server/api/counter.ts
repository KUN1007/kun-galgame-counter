import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { defineEventHandler, getMethod, getRequestIP, createError } from 'h3'
import { getRemoteIp } from '~~/server/utils/ip'

type CounterData = {
  total: number
  ips: Record<string, string>
}

const dataPath = join(process.cwd(), 'server', 'data', 'counter.json')
const defaultData: CounterData = {
  total: 0,
  ips: {},
}

async function ensureDataFile() {
  await mkdir(dirname(dataPath), { recursive: true })
  try {
    await access(dataPath)
  } catch {
    await writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8')
  }
}

async function readData(): Promise<CounterData> {
  await ensureDataFile()
  const raw = await readFile(dataPath, 'utf-8')
  try {
    const parsed = JSON.parse(raw) as CounterData
    return {
      total: parsed.total ?? 0,
      ips: parsed.ips ?? {},
    }
  } catch {
    await writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8')
    return { ...defaultData }
  }
}

async function writeData(data: CounterData) {
  await ensureDataFile()
  await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8')
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const ipData = getRemoteIp(event)
  const ip = Array.isArray(ipData) ? ipData[0] : ipData
  const data = await readData()

  if (method === 'GET') {
    return {
      total: data.total,
      clicked: Boolean(ip && data.ips[ip]),
    }
  }

  if (method === 'POST') {
    if (!ip) {
      throw createError({
        statusCode: 400,
        statusMessage: '无法识别 IP，无法更新计数器',
      })
    }

    if (data.ips[ip]) {
      return {
        total: data.total,
        clicked: true,
      }
    }

    data.total += 1
    data.ips[ip] = new Date().toISOString()
    await writeData(data)

    return {
      total: data.total,
      clicked: true,
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  })
})
