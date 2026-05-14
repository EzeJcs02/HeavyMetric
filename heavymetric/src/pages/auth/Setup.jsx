import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'

export default function Setup() {
  const { user, recargarPerfil } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token')

  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    // Pre-fill nombre from invitation if available
    supabase.from('invitaciones').select('nombre, email, rol').eq('token', token).maybeSingle()
      .then(({ data }) => { if (data?.nombre) setNombre(data.nombre) })
  }, [token])

  const handleUnirseConToken = async () => {
    if (!nombre.trim()) { setError('Ingresá tu nombre'); return }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.rpc('usar_invitacion', {
        p_token:   token,
        p_user_id: user.id,
        p_nombre:  nombre.trim(),
      })
      if (err) throw err
      await recargarPerfil()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return (
      <div className="min-h-screen bg-hm-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="font-mono text-2xl font-bold tracking-widest mb-6 text-center">
            HEAVY<span className="text-hm-accent">METRIC</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Unirte a la organización</h2>
          <p className="text-hm-muted text-sm mb-6">Completá tu nombre para activar tu acceso.</p>
          <Input label="Tu nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} className="mb-4" />
          {error && <p className="text-red-400 text-xs mb-3 font-mono">{error}</p>}
          <Button onClick={handleUnirseConToken} disabled={loading} className="w-full">
            {loading ? 'ACTIVANDO...' : 'ACTIVAR ACCESO'}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="font-mono text-3xl font-bold tracking-widest mb-4">
          HEAVY<span className="text-hm-accent">METRIC</span>
        </div>
        <div className="w-16 h-16 bg-hm-surface2 border border-hm-border rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-hm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Perfil Incompleto</h2>
        <p className="text-hm-muted text-sm mb-8 leading-relaxed">
          Tu cuenta ({user?.email}) está registrada, pero aún no has sido asignado a ninguna organización.
          Contactá al administrador de tu empresa para que te envíe un enlace de invitación.
        </p>
        <Button onClick={() => supabase.auth.signOut()} className="w-full">
          VOLVER AL LOGIN
        </Button>
      </Card>
    </div>
  )
}
