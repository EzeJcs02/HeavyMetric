import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function Login() {
  const { user } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  function switchMode(next) {
    setMode(next)
    setError(null)
    setSuccess(null)
    setPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Cuenta creada. Revisá tu email para confirmar el registro.')
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setSuccess('Te enviamos un link para restablecer tu contraseña.')
    }

    setLoading(false)
  }

  const titles = {
    login:    { heading: 'Ingresar',             sub: 'Iniciá sesión en tu cuenta' },
    register: { heading: 'Crear cuenta',         sub: 'Registrate con tu email corporativo' },
    reset:    { heading: 'Restablecer contraseña', sub: 'Te enviamos un link a tu email' },
  }

  const { heading, sub } = titles[mode]

  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-hm-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-10 bg-hm-surface/40 backdrop-blur-2xl border-white/5 shadow-2xl animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="font-display text-4xl font-bold tracking-tighter mb-2 flex justify-center items-center">
            HM<span className="text-hm-accent">.</span>
          </div>
          <div className="text-hm-text font-bold tracking-widest text-[10px] uppercase opacity-50 mb-4">HEAVYMETRIC OPERATIVE SYSTEM</div>
          <h1 className="text-lg font-bold text-hm-text">{heading}</h1>
          <p className="text-hm-muted text-sm mt-1">{sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Email</label>
            <Input
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full py-3"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Contraseña</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3"
                required
              />
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs font-medium p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="text-green-400 text-xs font-medium p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              ✓ {success}
            </div>
          )}

          <Button type="submit" className="w-full py-4 text-sm font-bold tracking-widest" disabled={loading}>
            {loading ? 'PROCESANDO...' : mode === 'login' ? 'INGRESAR' : mode === 'register' ? 'CREAR CUENTA' : 'ENVIAR LINK'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-hm-muted">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('reset')} className="hover:text-hm-text transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
              <button onClick={() => switchMode('register')} className="hover:text-hm-text transition-colors">
                ¿No tenés una cuenta? <span className="text-hm-accent font-semibold">Registrate</span>
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <button onClick={() => switchMode('login')} className="hover:text-hm-text transition-colors">
              ← Volver al inicio de sesión
            </button>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-hm-muted font-bold tracking-wider uppercase opacity-30">© 2026 HeavyMetric — v2.5.0</p>
        </div>
      </Card>
    </div>
  )
}
