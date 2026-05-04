export default function Pagination({ total, page, perPage, onPageChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-hm-border bg-hm-surface2/10">
      <span className="text-xs font-mono text-hm-muted">
        Mostrando {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded text-xs font-bold font-mono border border-hm-border text-hm-muted hover:border-hm-accent hover:text-hm-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← PREV
        </button>
        <span className="text-xs font-mono text-hm-muted tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded text-xs font-bold font-mono border border-hm-border text-hm-muted hover:border-hm-accent hover:text-hm-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          NEXT →
        </button>
      </div>
    </div>
  )
}
