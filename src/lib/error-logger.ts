/**
 * Logge le détail technique d'une erreur côté serveur (visible dans Vercel → Functions → Logs).
 * Ne jamais exposer ces détails dans la réponse JSON au frontend.
 *
 * Usage:
 *   } catch (error) {
 *     logServerError("MY_ROUTE", error)
 *     return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
 *   }
 */
export function logServerError(context: string, error: unknown): void {
  const err = error as Record<string, unknown>
  console.error(`[${context}]`, {
    message:   typeof err?.message === "string"  ? err.message  : String(error),
    code:      typeof err?.code    === "string"  ? err.code     : null,
    name:      typeof err?.name    === "string"  ? err.name     : null,
    timestamp: new Date().toISOString(),
  })
}
