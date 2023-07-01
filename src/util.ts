export function getStoredSessionString (): string {
  const s = localStorage.getItem('dc-chat-session')
  if (!s) {
    return ''
  }
  return s
}

export function simpleCallback (param): () => Promise<any> {
  return async function (): Promise<any> {
    return await new Promise(resolve => { resolve(param) })
  }
}

export function extractError (error: Error): string {
  const s = error.toString()
  if (s.startsWith('Error: ')) {
    return s.slice('Error: '.length)
  }
  return s
}
