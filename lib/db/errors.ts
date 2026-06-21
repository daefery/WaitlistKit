export function isPrismaUniqueError(err: unknown): boolean {
  return isPrismaErrorCode(err, 'P2002')
}

export function isPrismaNotFoundError(err: unknown): boolean {
  return isPrismaErrorCode(err, 'P2025')
}

function isPrismaErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === code
  )
}
