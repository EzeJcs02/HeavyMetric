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
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : (name || '?').slice(0, 2)
  return letters.toUpperCase()
}

const ROL_LABEL = { owner: 'Owner', supervisor: 'Supervisor', operativo: 'Operativo' }

export default function Topbar() {
  const { user, perfil, orgId, isOwner, recargarPerfil } = useAuth()
  const { tcVenta, formatARS } = useDolar()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
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

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false)
      }
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

    // Subscripción en tiempo real a notificaciones
    const sub = supabase.channel('notif_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `organization_id=eq.${orgId}` }, payload => {
        setNotificaciones(prev => [payload.new, ...prev].slice(0, 10))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notificaciones', filter: `organization_id=eq.${orgId}` }, payload => {
        setNotificaciones(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
      })
      .subscribe()
    
    return () => { supabase.removeChannel(sub) }
  }, [orgId])

  async function marcarLeida(id) {
    const { error } = await supabase.from('notificaciones').update({ leido: true }).eq('id', id)
    if (!error) {
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n))
    }
  }

  async function marcarTodasLeidas() {
    const ids = notificaciones.filter(n => !n.leido).map(n => n.id)
    if (!ids.length) return
    const { error } = await supabase.from('notificaciones').update({ leido: true }).in('id', ids)
    if (!error) {
      setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })))
    }
  }

  const noLeidas = notificaciones.filter(n => !n.leido).length

  function startEditNombre() {
    setNombreInput(orgNombre)
    setEditingNombre(true)
    setTimeout(() => nombreInputRef.current?.focus(), 0)
  }

  async function saveNombre() {
    const trimmed = nombreInput.trim()
    if (!trimmed || trimmed === orgNombre) { setEditingNombre(false); return }
    const { error } = await supabase
      .from('organizaciones')
      .update({ nombre_comercial: trimmed })
      .eq('id', orgId)
    if (error) { toast.error(error.message); return }
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
    <header className="h-14 bg-hm-surface border-b border-hm-border flex items-center px-4 md:px-6 shrink-0 gap-4">
      {/* Logo / link al inicio */}
      <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-lg bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl
            ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover rounded-lg" />
            : <span className="text-hm-accent text-[11px] font-black tracking-tight">HM</span>
          }
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-bold text-hm-text leading-none">{orgNombre}</div>
          <div className="text-[10px] font-mono text-hm-muted mt-0.5">v2.5</div>
        </div>
      </Link>

      <div className="flex-1" />

      {/* Dólar BNA */}
      {tcVenta && (
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-hm-bg border border-hm-border rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-mono font-bold text-hm-muted tracking-widest">BNA</span>
          <span className="text-sm font-mono font-bold text-hm-text tabular-nums">
            ${formatARS(tcVenta).replace('$', '').trim()}
          </span>
        </div>
      )}

      {/* Centro de Notificaciones */}
      <div className="relative border-l border-hm-border pl-4" ref={notifRef}>
        <button
          onClick={() => {
            setOpenNotif(o => !o)
            if (open) setOpen(false)
          }}
          className="relative p-2 text-hm-muted hover:text-hm-text hover:bg-hm-surface2 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {noLeidas > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-hm-surface">
              {noLeidas}
            </span>
          )}
        </button>

        {openNotif && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-hm-surface border border-hm-border rounded-xl shadow-card z-50 overflow-hidden animate-fade-in flex flex-col max-h-[400px]">
            <div className="px-4 py-3 border-b border-hm-border flex items-center justify-between bg-hm-surface2/50 shrink-0">
              <span className="text-sm font-semibold text-hm-text">Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} className="text-xs text-hm-accent hover:underline">
                  Marcar leídas
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 overscroll-contain">
              {notificaciones.length === 0 ? (
                <div className="p-6 text-center text-sm text-hm-muted">
                  No tienes notificaciones
                </div>
              ) : (
                notificaciones.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.leido) marcarLeida(n.id) }}
                    className={`px-4 py-3 border-b border-hm-border last:border-0 cursor-pointer transition-colors ${n.leido ? 'opacity-70 hover:bg-hm-surface2/50' : 'bg-hm-accent/5 hover:bg-hm-accent/10'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.prioridad === 'alta' ? 'bg-red-500' : n.prioridad === 'baja' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-sm font-semibold text-hm-text leading-snug">{n.titulo}</div>
                        <div className="text-xs text-hm-muted mt-0.5 line-clamp-2">{n.mensaje}</div>
                        <div className="text-[10px] font-mono text-hm-muted/70 mt-1 uppercase">
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

      {/* Avatar + dropdown */}
      <div className="relative border-l border-hm-border pl-4" ref={dropdownRef}>
        <button
          onClick={() => {
            setOpen(o => !o)
            if (openNotif) setOpenNotif(false)
          }}
          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-hm-surface2 transition-colors"
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-hm-text leading-tight">{displayName}</div>
            <div className="text-[10px] font-mono text-hm-muted tracking-wider uppercase">
              {ROL_LABEL[perfil?.rol] || perfil?.rol}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-hm-accent/15 border border-hm-accent/30 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-[11px] font-bold text-hm-accent"><Initials name={displayName} /></span>
            }
          </div>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-hm-surface border border-hm-border rounded-xl shadow-card z-50 overflow-hidden animate-fade-in">

            {/* Empresa */}
            <div className="px-4 py-3 border-b border-hm-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-hm-surface2 border border-hm-border flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-hm-accent">{orgNombre.slice(0, 2).toUpperCase()}</span>
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
                      className="flex-1 text-sm bg-hm-surface2 border border-hm-accent/40 rounded px-2 py-0.5 text-hm-text outline-none min-w-0"
                    />
                    <button onClick={saveNombre} className="text-hm-accent hover:opacity-80 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <span className="text-sm font-semibold text-hm-text truncate">{orgNombre}</span>
                    {isOwner && (
                      <button onClick={startEditNombre} className="opacity-0 group-hover:opacity-100 transition-opacity text-hm-muted hover:text-hm-accent shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-[11px] text-hm-accent hover:underline disabled:opacity-50"
                    >
                      {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Usuario */}
            <div className="px-4 py-3 border-b border-hm-border">
              <div className="text-sm font-semibold text-hm-text">{displayName}</div>
              <div className="text-xs text-hm-muted mt-0.5">{user?.email}</div>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-hm-accent/10 border border-hm-accent/20 text-[10px] font-mono font-bold text-hm-accent tracking-wider uppercase">
                {ROL_LABEL[perfil?.rol] || perfil?.rol}
              </span>
            </div>

            {/* Tema */}
            <div className="px-4 py-3 border-b border-hm-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-hm-text">
                {theme === 'dark'
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                }
                {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${theme === 'light' ? 'bg-hm-accent' : 'bg-hm-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${theme === 'light' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Mi perfil */}
            <button
              onClick={() => { setOpen(false); navigate('/perfil') }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-hm-muted hover:text-hm-text hover:bg-hm-surface2 transition-colors border-b border-hm-border"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mi perfil
            </button>
            {/* Cerrar sesión */}
            <button
              onClick={() => { setOpen(false); supabase.auth.signOut() }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-hm-muted hover:text-hm-danger hover:bg-hm-surface2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
