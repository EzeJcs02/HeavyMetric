import { useRef, useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { useTheme } from '../../context/ThemeContext'
import { useRubro } from '../../context/RubroContext'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function Initials({ name }) {
  const parts = (name || '').trim().split(' ').filter(Boolean)
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : (name || '?').slice(0, 2)

  return letters.toUpperCase()
}

const ROL_LABEL = {
  owner: 'Owner',
  supervisor: 'Supervisor',
  operativo: 'Operativo',
}

const PRIORITY_COLOR = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baja: 'bg-blue-500',
}

export default function Topbar() {
  const { user, perfil, orgId, isOwner, recargarPerfil } = useAuth()
  const { tcVenta, formatARS } = useDolar()
  const { theme, toggleTheme } = useTheme()
  const { taxonomia } = useRubro()
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')
  const [openNotif, setOpenNotif] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const fileInputRef = useRef(null)
  const nombreInputRef = useRef(null)

  const displayName = perfil?.nombre_completo || user?.email || ''
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'Mi empresa'
  const logoUrl = perfil?.organizaciones?.logo_url

  const activoPlural = taxonomia?.activoPlural || 'Activos'
  const ordenTrabajoPlural = taxonomia?.ordenTrabajoPlural || 'Órdenes'
  const moduloTaller = taxonomia?.moduloTaller || 'Operaciones'
  const repuestoPlural = taxonomia?.repuestoPlural || 'Repuestos'

  const routeContext = useMemo(() => {
    const path = location.pathname

    if (path === '/app') {
      return {
        section: 'Centro de Operaciones',
        detail: 'Vista general del sistema',
      }
    }

    if (path.includes('/taller')) {
      return {
        section: moduloTaller,
        detail: ordenTrabajoPlural,
      }
    }

    if (path.includes('/activo360')) {
      return {
        section: activoPlural,
        detail: 'Estado operativo y trazabilidad',
      }
    }

    if (path.includes('/clientes')) {
      return {
        section: 'Clientes',
        detail: 'Relación comercial y operativa',
      }
    }

    if (path.includes('/repuestos')) {
      return {
        section: repuestoPlural,
        detail: 'Consumo, stock y disponibilidad',
      }
    }

    if (path.includes('/tesoreria')) {
      return {
        section: 'Tesorería',
        detail: 'Caja, bancos y vencimientos',
      }
    }

    if (path.includes('/facturacion')) {
      return {
        section: 'Facturación',
        detail: 'Comprobantes y ARCA',
      }
    }

    if (path.includes('/proveedores')) {
      return {
        section: 'Proveedores',
        detail: 'Compras y cuentas por pagar',
      }
    }

    if (path.includes('/ceo')) {
      return {
        section: 'Panel Dirección',
        detail: 'Indicadores ejecutivos',
      }
    }

    return {
      section: 'HeavyMetric',
      detail: 'Sistema operativo empresarial',
    }
  }, [location.pathname, activoPlural, moduloTaller, ordenTrabajoPlural, repuestoPlural])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpenNotif(false)
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!orgId) return

    async function loadNotificaciones() {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setNotificaciones(data)
    }

    loadNotificaciones()

    const sub = supabase.channel('notif_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          setNotificaciones((prev) => [payload.new, ...prev].slice(0, 10))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificaciones',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          setNotificaciones((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [orgId])

  async function marcarLeida(id) {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('id', id)

    if (!error) {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
      )
    }
  }

  async function marcarTodasLeidas() {
    const ids = notificaciones.filter((n) => !n.leido).map((n) => n.id)

    if (!ids.length) return

    const { error } = await supabase
      .from('notificaciones')
      .update({ leido: true })
      .in('id', ids)

    if (!error) {
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    }
  }

  const noLeidas = notificaciones.filter((n) => !n.leido).length

  function startEditNombre() {
    setNombreInput(orgNombre)
    setEditingNombre(true)
    setTimeout(() => nombreInputRef.current?.focus(), 0)
  }

  async function saveNombre() {
    const trimmed = nombreInput.trim()

    if (!trimmed || trimmed === orgNombre) {
      setEditingNombre(false)
      return
    }

    const { error } = await supabase
      .from('organizaciones')
      .update({ nombre_comercial: trimmed })
      .eq('id', orgId)

    if (error) {
      toast.error(error.message)
      return
    }

    await recargarPerfil()
    setEditingNombre(false)
    toast.success('Nombre actualizado')
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]

    if (!file || !orgId) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no puede superar 2 MB')
      return
    }

    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('organizaciones')
        .update({ logo_url: publicUrl })
        .eq('id', orgId)

      if (updateError) throw updateError

      await recargarPerfil()
      toast.success('Logo actualizado')
    } catch (err) {
      toast.error('Error al subir el logo')
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 border-b border-white/5 bg-[#07090d] px-4 md:px-5">
      <Link
        to="/app"
        className="hidden md:flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-1.5 hover:border-white/10 transition-colors shrink-0"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500/80">
          Operativo
        </span>
      </Link>

      <div className="hidden lg:flex min-w-[220px] flex-col leading-tight">
        <span className="text-sm font-bold text-neutral-200">
          {routeContext.section}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-600">
          {routeContext.detail}
        </span>
      </div>

      <div className="flex-1 flex justify-center px-2">
        <button className="group flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2 text-sm text-neutral-600 hover:border-white/10 hover:bg-white/[0.04] hover:text-neutral-400 transition-all">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left text-xs">
            Buscar {activoPlural.toLowerCase()}, clientes, {ordenTrabajoPlural.toLowerCase()}...
          </span>
          <span className="hidden sm:flex items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-neutral-700">
            ⌘K
          </span>
        </button>
      </div>

      <div className="hidden xl:flex items-center gap-2 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.03] px-3 py-1.5 shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-500/80">
          ISO
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          Traceability On
        </span>
      </div>

      {tcVenta && (
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600">BNA</span>
          <span className="font-mono text-sm font-bold tabular-nums text-neutral-200">
            {formatARS(tcVenta)}
          </span>
        </div>
      )}

      <div className="relative shrink-0" ref={notifRef}>
        <button
          onClick={() => {
            setOpenNotif((o) => !o)
            if (open) setOpen(false)
          }}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-neutral-600 hover:border-white/10 hover:bg-white/[0.04] hover:text-neutral-300 transition-all"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {noLeidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#07090d] bg-red-500 font-mono text-[9px] font-bold text-white">
              {noLeidas}
            </span>
          )}
        </button>

        {openNotif && (
          <div className="absolute right-0 top-full mt-2 z-50 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in flex flex-col max-h-[420px]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-200">Notificaciones</span>
                {noLeidas > 0 && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-400">
                    {noLeidas}
                  </span>
                )}
              </div>

              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  Marcar leídas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                    <svg className="h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <span className="text-sm text-neutral-600">Sin notificaciones</span>
                </div>
              ) : (
                notificaciones.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.leido) marcarLeida(n.id)
                    }}
                    className={`cursor-pointer border-b border-white/[0.04] px-4 py-3 last:border-0 transition-colors ${
                      n.leido
                        ? 'opacity-50 hover:bg-white/[0.02]'
                        : 'bg-cyan-300/[0.03] hover:bg-cyan-300/[0.06]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLOR[n.prioridad] || PRIORITY_COLOR.media}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-snug text-neutral-200">{n.titulo}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{n.mensaje}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-700">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => {
            setOpen((o) => !o)
            if (openNotif) setOpenNotif(false)
          }}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
        >
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold leading-none text-neutral-300">{displayName}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-600">
              {ROL_LABEL[perfil?.rol] || perfil?.rol}
            </div>
          </div>

          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-cyan-300/10">
            {logoUrl ? (
              <img src={logoUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="font-mono text-[11px] font-bold text-cyan-300">
                <Initials name={displayName} />
              </span>
            )}
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in">
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.015] px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {orgNombre.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {editingNombre ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={nombreInputRef}
                      value={nombreInput}
                      onChange={(e) => setNombreInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveNombre()
                        if (e.key === 'Escape') setEditingNombre(false)
                      }}
                      className="flex-1 min-w-0 rounded border border-cyan-300/30 bg-white/[0.06] px-2 py-0.5 text-sm text-neutral-200 outline-none"
                    />

                    <button onClick={saveNombre} className="shrink-0 text-cyan-400 hover:text-cyan-300">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-neutral-200">{orgNombre}</span>
                    {isOwner && (
                      <button
                        onClick={startEditNombre}
                        className="shrink-0 text-neutral-700 opacity-0 hover:text-cyan-400 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {isOwner && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="mt-0.5 text-[11px] text-cyan-500 hover:text-cyan-400 disabled:opacity-50 transition-colors"
                    >
                      {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </>
                )}
              </div>
            </div>

            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="text-sm font-semibold text-neutral-200">{displayName}</div>
              <div className="mt-0.5 text-xs text-neutral-600">{user?.email}</div>
              <span className="mt-2 inline-block rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {ROL_LABEL[perfil?.rol] || perfil?.rol}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </div>

              <button
                onClick={toggleTheme}
                className={`relative h-5 w-10 rounded-full transition-colors duration-200 ${theme === 'light' ? 'bg-cyan-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'light' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <button
              onClick={() => {
                setOpen(false)
                navigate('/perfil')
              }}
              className="flex w-full items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 text-sm text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200 transition-colors"
            >
              Mi perfil
            </button>

            <button
              onClick={() => {
                setOpen(false)
                supabase.auth.signOut()
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-neutral-500 hover:bg-red-500/[0.06] hover:text-red-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}