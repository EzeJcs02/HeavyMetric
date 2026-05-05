import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDolar } from '../../context/DolarContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

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
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState('')
  const dropdownRef = useRef(null)
  const fileInputRef = useRef(null)
  const nombreInputRef = useRef(null)

  const displayName = perfil?.nombre_completo || user?.email || ''
  const orgNombre = perfil?.organizaciones?.nombre || 'Mi empresa'
  const logoUrl = perfil?.organizaciones?.logo_url

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
      .update({ nombre: trimmed })
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

      {/* Avatar + dropdown */}
      <div className="relative border-l border-hm-border pl-4" ref={dropdownRef}>
        <button
          onClick={() => setOpen(o => !o)}
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
