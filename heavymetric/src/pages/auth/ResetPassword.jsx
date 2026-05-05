import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase dispara PASSWORD_RECOVERY cuando detecta el token en la URL
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-hm-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-10 bg-hm-surface/40 backdrop-blur-2xl border-white/5 shadow-2xl animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-bold tracking-tighter mb-2 flex justify-center items-center">
            HM<span className="text-hm-accent">.</span>
          </div>
          <h1 className="text-lg font-bold text-hm-text mt-4">Nueva contraseña</h1>
          <p className="text-hm-muted text-sm mt-1">Elegí una contraseña segura para tu cuenta</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 text-sm font-medium">¡Contraseña actualizada!</p>
            <p className="text-hm-muted text-xs">Redirigiendo al login...</p>
          </div>
        ) : !ready ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-hm-surface2 border border-hm-border flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-hm-muted animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-hm-muted text-sm">Verificando el link...</p>
            <p className="text-hm-muted text-xs">Si llegaste acá por error, <button onClick={() => navigate('/login')} className="text-hm-accent hover:underline">volvé al login</button>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Nueva contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Confirmar contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full py-3"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-medium p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" className="w-full py-4 text-sm font-bold tracking-widest" disabled={loading}>
              {loading ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA'}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] text-hm-muted font-bold tracking-wider uppercase opacity-30">© 2026 HeavyMetric — v2.5.0</p>
        </div>
      </Card>
    </div>
  )
}
