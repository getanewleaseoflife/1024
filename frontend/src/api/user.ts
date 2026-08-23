// 用户标识：自动生成 UUID 存 localStorage，用于多用户历史隔离（P1 加账号前用本地标识）
export function getUserId(): string {
  let id = localStorage.getItem('user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('user_id', id)
  }
  return id
}
