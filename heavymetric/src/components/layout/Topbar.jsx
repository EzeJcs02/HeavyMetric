import { useRef, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function Initials({ name }) {
  const parts = (name || '').trim().split(' ').filter(Boolean)
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : (name || '?').slice(0, 2)).toUpperCase()
}

const ROL_LABEL = { owner: 'Owner', supervisor: 'Supervisor', operativo: 'Operativo' }

export default function Topbar() {
  const { user, perfil, orgId, isOwner, recargarPerfil } = useAuth()
  const { tcVenta } = useDolar()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [openNotif, setOpenNotif] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [uploading, setUploading] = useState(false)
  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')

  const dropdownRef = useRef(null)
  const notifRef = useRef(null)
  const fileInputRef = useRef(null)
  const nombreInputRef = useRef(null)

  const displayName = perfil?.nombre_completo || user?.email || ''
  const orgNombre = perfil?.organizaciones?.nombre_comercial || 'Mi empresa'
  const logoUrl = perfil?.organizaciones?.logo_url
  const noLeidas = notificaciones.filter(n => !n.leido).length

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
    async function load() {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotificaciones(data)
    }
    load()
    const sub = supabase.channel('topbar_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `organization_id=eq.${orgId}` },
        p => setNotificaciones(prev => [p.new, ...prev].slice(0, 10)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `organization_id=eq.${orgId}` },
        p => setNotificaciones(prev => prev.map(n => n.id === p.new.id ? p.new : n)))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [orgId])

  async function marcarLeida(id) {
    await supabase.from('notificaciones').update({ leido: true }).eq('id', id)
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n))
  }

  async function marcarTodasLeidas() {
    const ids = notificaciones.filter(n => !n.leido).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notificaciones').update({ leido: true }).in('id', ids)
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })))
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    if (file.size > 2 * 1024 * 1024) { toast.error('El archivo no puede superar 2 MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${orgId}/logo.${ext}`
      await supabase.storage.from('logos').upload(path, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      await supabase.from('organizaciones').update({ logo_url: publicUrl }).eq('id', orgId)
      await recargarPerfil()
      toast.success('Logo actualizado')
    } catch { toast.error('Error al subir el logo') }
    finally { setUploading(false); e.target.value = '' }
  }

  async function saveNombre() {
    const t = nombreInput.trim()
    if (!t || t === orgNombre) { setEditingNombre(false); return }
    const { error } = await supabase.from('organizaciones').update({ nombre_comercial: t }).eq('id', orgId)
    if (error) { toast.error(error.message); return }
    await recargarPerfil()
    setEditingNombre(false)
    toast.success('Nombre actualizado')
  }

  return (
    <header className="h-11 shrink-0 flex items-center gap-3 border-b border-hm-border bg-hm-surface px-4 md:px-5 sticky top-0 z-20">

      {/* Status badge */}
      <Link to="/app"
        className="hidden md:flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 hover:border-emerald-300 transition-colors shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-blink" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 font-semibold">Operativo</span>
      </Link>

      <div className="w-px h-5 bg-hm-border shrink-0 hidden md:block" />

      {/* Page title slot — filled by Layout via context or just static */}
      <div className="hidden md:block shrink-0">
        <div className="text-[12.5px] font-semibold text-hm-text leading-none">Centro de Operaciones</div>
        <div className="font-mono text-[8.5px] text-hm-muted tracking-widest mt-0.5">VISTA GENERAL</div>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-2">
        <button className="flex w-full max-w-xs items-center gap-2 rounded-md border border-hm-border bg-hm-surface2 px-3 py-1.5 text-sm text-hm-muted hover:border-hm-accent/40 transition-colors">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left text-xs">Buscar activos, clientes, OTs…</span>
          <kbd className="hidden sm:inline font-mono text-[9px] bg-hm-surface border border-hm-border rounded px-1.5 py-0.5 text-hm-muted">⌘K</kbd>
        </button>
      </div>

      {/* ISO badge */}
      <div className="hidden sm:flex items-center gap-1.5 rounded border border-hm-border bg-hm-surface2 px-2 py-1 shrink-0">
        <span className="font-mono text-[8.5px] text-hm-muted">ISO</span>
        <span className="font-mono text-[8.5px] text-hm-blue font-semibold">TRACEABILITY ON</span>
      </div>

      {/* BNA */}
      {tcVenta && (
        <div className="hidden sm:flex items-center gap-1.5 rounded border border-hm-border bg-hm-surface2 px-2 py-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[8.5px] text-hm-muted">BNA</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-hm-text">
            ${tcVenta.toLocaleString('es-AR')}
          </span>
        </div>
      )}

      {/* Notifications */}
      <div className="relative shrink-0" ref={notifRef}>
        <button
          onClick={() => { setOpenNotif(o => !o); setOpen(false) }}
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-hm-border bg-hm-surface text-hm-muted hover:border-hm-accent/40 hover:text-hm-text transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {noLeidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-hm-surface bg-red-500 font-mono text-[8px] font-bold text-white">
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>

        {openNotif && (
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-hm-border bg-hm-surface shadow-card-md animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-hm-border bg-hm-surface2/50">
              <span className="text-sm font-semibold text-hm-text">Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} className="text-xs text-hm-blue hover:underline">
                  Marcar leídas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-hm-muted text-sm">
                  Sin notificaciones
                </div>
              ) : notificaciones.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.leido && marcarLeida(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-hm-border/50 last:border-0 cursor-pointer transition-colors ${
                    n.leido ? 'opacity-50 hover:bg-hm-surface2/40' : 'hover:bg-hm-surface2/60'
                  }`}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.prioridad === 'alta' ? 'bg-red-500' : n.prioridad === 'baja' ? 'bg-blue-400' : 'bg-amber-500'
                  }`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-hm-text leading-snug">{n.titulo}</div>
                    <div className="mt-0.5 text-xs text-hm-muted line-clamp-2">{n.mensaje}</div>
                    <div className="mt-1 font-mono text-[9px] text-hm-muted">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => { setOpen(o => !o); setOpenNotif(false) }}
          className="flex items-center gap-2 rounded-md border border-hm-border bg-hm-surface px-2 py-1 hover:border-hm-accent/40 transition-colors"
        >
          <div className="hidden text-right sm:block">
            <div className="text-[11px] font-semibold text-hm-text leading-none">{displayName}</div>
            <div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-hm-muted">
              {ROL_LABEL[perfil?.rol] || perfil?.rol}
            </div>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hm-border bg-hm-surface2">
            {logoUrl
              ? <img src={logoUrl} alt="avatar" className="h-full w-full object-cover" />
              : <span className="font-mono text-[10px] font-bold text-hm-accent"><Initials name={displayName} /></span>
            }
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-hm-border bg-hm-surface shadow-card-md animate-fade-in overflow-hidden">
            {/* Org */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-hm-border bg-hm-surface2/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hm-border bg-hm-surface">
                {logoUrl
                  ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  : <span className="font-mono text-[10px] font-bold text-hm-accent">{orgNombre.slice(0, 2).toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                {editingNombre ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={nombreInputRef}
                      value={nombreInput}
                      onChange={e => setNombreInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNombre(); if (e.key === 'Escape') setEditingNombre(false) }}
                      className="flex-1 min-w-0 rounded border border-hm-accent/40 bg-hm-surface2 px-2 py-0.5 text-sm text-hm-text outline-none"
                    />
                    <button onClick={saveNombre} className="text-hm-green">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-hm-text">{orgNombre}</span>
                    {isOwner && (
                      <button onClick={() => { setNombreInput(orgNombre); setEditingNombre(true); setTimeout(() => nombreInputRef.current?.focus(), 0) }}
                        className="shrink-0 text-hm-muted opacity-0 group-hover:opacity-100 hover:text-hm-accent transition-opacity">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                )}
                {isOwner && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="mt-0.5 text-[11px] text-hm-blue hover:underline disabled:opacity-50">
                      {uploading ? 'Subiendo…' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </>
                )}
              </div>
            </div>

            {/* User info */}
            <div className="px-4 py-3 border-b border-hm-border">
              <div className="text-sm font-semibold text-hm-text">{displayName}</div>
              <div className="text-xs text-hm-muted mt-0.5">{user?.email}</div>
              <span className="mt-1.5 inline-block font-mono text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border border-hm-accent/30 bg-hm-accent/10 text-hm-accent">
                {ROL_LABEL[perfil?.rol] || perfil?.rol}
              </span>
            </div>

            {/* Theme toggle */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-hm-border">
              <span className="text-sm text-hm-muted">{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
              <button onClick={toggleTheme}
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${theme === 'light' ? 'bg-hm-accent' : 'bg-hm-border'}`}>
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'light' ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <button onClick={() => { setOpen(false); navigate('/perfil') }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-hm-muted hover:bg-hm-surface2/60 hover:text-hm-text transition-colors border-b border-hm-border">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Mi perfil
            </button>
            <button onClick={() => supabase.auth.signOut()}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-hm-muted hover:bg-red-50 hover:text-red-600 transition-colors">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
