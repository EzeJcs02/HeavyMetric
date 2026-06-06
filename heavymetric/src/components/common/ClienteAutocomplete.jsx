import { useMemo, useRef, useState } from 'react'

export default function ClienteAutocomplete({
  clientes = [],
  value = '',
  onChange,
  label = 'Cliente',
  placeholder = 'Escribí razón social, nombre comercial o CUIT...',
  required = false,
  disabled = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const blurTimeout = useRef(null)

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === value) || null,
    [clientes, value]
  )

  const displayValue = open
    ? query
    : selectedCliente?.razon_social || selectedCliente?.nombre_comercial || ''

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return clientes.slice(0, 8)

    return clientes
      .filter((cliente) => {
        const razon = cliente.razon_social || ''
        const comercial = cliente.nombre_comercial || ''
        const cuit = cliente.cuit || ''
        const contacto = cliente.contacto_nombre || ''

        return (
          razon.toLowerCase().includes(q) ||
          comercial.toLowerCase().includes(q) ||
          cuit.toLowerCase().includes(q) ||
          contacto.toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [clientes, query])

  const handleSelect = (cliente) => {
    onChange?.(cliente.id, cliente)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.('', null)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative flex flex-col gap-1">
      {label && (
        <label className="label-mono">
          {label}
          {required ? ' *' : ''}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            if (blurTimeout.current) clearTimeout(blurTimeout.current)
            setOpen(true)
            setQuery('')
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 160)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)

            if (selectedCliente) {
              onChange?.('', null)
            }
          }}
          className="w-full bg-hm-surface2 border border-hm-border rounded-lg px-3 py-2 pr-10 text-sm text-hm-text placeholder:text-hm-muted/60 focus:outline-none focus:border-hm-accent focus:ring-1 focus:ring-hm-accent/30 transition-colors disabled:opacity-50"
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-hm-muted hover:text-red-400 text-sm"
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-72 overflow-y-auto rounded-lg border border-hm-border bg-hm-surface shadow-2xl">
          {resultados.length === 0 ? (
            <div className="px-3 py-3 text-sm text-hm-muted font-mono">
              No se encontraron clientes.
            </div>
          ) : (
            resultados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(cliente)}
                className="w-full text-left px-3 py-2 hover:bg-hm-surface2 transition-colors border-b border-hm-border/40 last:border-b-0"
              >
                <div className="text-sm font-medium text-hm-text">
                  {cliente.razon_social || cliente.nombre_comercial || 'Sin razón social'}
                </div>

                <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] font-mono text-hm-muted">
                  {cliente.nombre_comercial && cliente.nombre_comercial !== cliente.razon_social && (
                    <span>{cliente.nombre_comercial}</span>
                  )}
                  {cliente.cuit && <span>CUIT {cliente.cuit}</span>}
                  {cliente.contacto_nombre && <span>{cliente.contacto_nombre}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}