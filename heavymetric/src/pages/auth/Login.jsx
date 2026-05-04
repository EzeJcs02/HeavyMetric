import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function Login() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-hm-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-hm-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-10 bg-hm-surface/40 backdrop-blur-2xl border-white/5 shadow-2xl animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <div className="font-display text-4xl font-bold tracking-tighter mb-2 flex justify-center items-center">
            HM<span className="text-hm-accent">.</span>
          </div>
          <div className="text-hm-text font-bold tracking-widest text-[10px] uppercase opacity-50">HEAVYMETRIC OPERATIVE SYSTEM</div>
          <p className="text-hm-muted text-sm mt-3 font-medium">Gestión de flota y taller para Knock S.A.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Email corporativo</label>
            <Input 
              type="email" 
              placeholder="nombre@knock.com"
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="hm-input w-full py-3"
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-hm-muted uppercase tracking-widest ml-1">Contraseña</label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="hm-input w-full py-3"
              required 
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs font-medium p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-slide-up">
              ⚠️ {error}
            </div>
          )}

          <Button type="submit" className="w-full py-4 text-sm font-bold tracking-widest" disabled={loading}>
            {loading ? 'VERIFICANDO...' : 'INGRESAR AL SISTEMA'}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-hm-muted font-bold tracking-wider uppercase opacity-30">© 2026 HeavyMetric — v2.4.0</p>
        </div>
      </Card>
    </div>
  )
}
