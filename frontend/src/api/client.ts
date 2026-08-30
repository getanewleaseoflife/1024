// REST + SSE 客户端封装（开发期经 vite proxy 转发到后端 /api）
import { getToken, getUserId } from './user'

/** 鉴权头：登录带 Bearer token，游客带 X-User-Id（后端 get_current_user_id 兼容处理）。 */
function authHeaders(json: boolean): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  else headers['X-User-Id'] = getUserId()
  return headers
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeaders(false) })
  if (!res.ok) throw new Error(`GET ${path} 失败: ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} 失败: ${res.status}`)
  return res.json() as Promise<T>
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} 失败: ${res.status}`)
  return res.json() as Promise<T>
}

export interface SSEEvent {
  type: string
  [key: string]: unknown
}

/** SSE 流式请求：逐事件回调 onEvent，直到流结束。 */
export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) throw new Error(`SSE 请求失败: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const line = block.trim()
      if (line.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(line.slice(6)) as SSEEvent)
        } catch {
          // 忽略无法解析的片段
        }
      }
    }
  }
}
