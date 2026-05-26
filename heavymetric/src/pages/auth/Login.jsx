import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Login() {
  const { user } = useAuth()

  // REDIRECCIÓN CORRECTA
  if (user) return <Navigate to="/app" replace />

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError(null)
    setSuccess(null)
    setPassword('')
    setShowPassword(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) setError(error.message)
    }

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Cuenta creada. Revisá tu email para confirmar el registro.')
      }
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Te enviamos un link para restablecer tu contraseña.')
      }
    }

    setLoading(false)
  }

  const titles = {
    login: {
      label: 'Acceso al sistema',
      heading: 'Iniciá sesión',
      sub: 'Ingresá tus credenciales para continuar.',
      action: 'INGRESAR',
    },
    register: {
      label: 'Alta de usuario',
      heading: 'Crear cuenta',
      sub: 'Registrate con tu email corporativo.',
      action: 'CREAR CUENTA',
    },
    reset: {
      label: 'Recuperación',
      heading: 'Restablecer contraseña',
      sub: 'Te enviamos un link a tu email.',
      action: 'ENVIAR LINK',
    },
  }

  const current = titles[mode]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0c0e] text-white">
      <style>
        {`
          @keyframes hmGrid {
            from { background-position: 0 0; }
            to { background-position: 44px 44px; }
          }

          @keyframes hmScanLogin {
            0% { top: -2px; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: .35; }
            100% { top: 100%; opacity: 0; }
          }

          @keyframes hmPulseLogin {
            0%,100% { opacity: .35; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.12); }
          }

          .hm-login-grid {
            background-image:
              linear-gradient(rgba(0,212,255,0.028) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,255,0.028) 1px, transparent 1px);
            background-size: 44px 44px;
            animation: hmGrid 22s linear infinite;
          }

          .hm-login-scan {
            position: absolute;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0,212,255,.16), transparent);
            animation: hmScanLogin 8s ease-in-out infinite;
          }

          .hm-login-pulse {
            animation: hmPulseLogin 2.8s ease-in-out infinite;
          }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(0,245,160,0.07),transparent_28%)]" />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-neutral-800/70 bg-[#0b0c0e] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="hm-login-grid absolute inset-0" />
          <div className="hm-login-scan" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_35%_45%,transparent_30%,rgba(0,0,0,0.78)_100%)]" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-950">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,245,160,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.18),transparent_40%)]" />
              <span className="relative bg-gradient-to-br from-zinc-100 via-zinc-400 to-zinc-700 bg-clip-text font-mono text-3xl font-black text-transparent">
                ∞
              </span>
            </div>

            <div>
              <div className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-lg font-black tracking-[0.14em] text-transparent">
                HEAVYMETRIC
              </div>

              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-neutral-500">
                Industrial Operations System
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
              <span className="h-px w-8 bg-cyan-300/40" />
              Operational Command Layer
            </div>

            <h1 className="text-4xl font-light leading-tight tracking-tight text-neutral-100">
              Operaciones.
              <br />
              <span className="font-semibold text-white">Bajo control.</span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-neutral-500">
              Acceso seguro al entorno operativo de activos, taller, stock, tesorería y continuidad.
            </p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10">
          <div className="relative w-full max-w-md rounded-3xl border border-neutral-800/80 bg-neutral-950/70 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300/80">
                <span className="h-px w-6 bg-cyan-300/50" />
                {current.label}
              </div>

              <h2 className="text-3xl font-light tracking-tight text-white">
                {current.heading}
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                {current.sub}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-neutral-500">
                  Email
                </label>

                <Input
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border-neutral-800 bg-neutral-900/70 py-3 font-mono text-sm text-neutral-100"
                  required
                />
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-neutral-500">
                      Contraseña
                    </label>

                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-[11px] text-cyan-300/70 transition-colors hover:text-cyan-200"
                      >
                        ¿Olvidaste?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full border-neutral-800 bg-neutral-900/70 py-3 pr-20 font-mono text-sm text-neutral-100"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 hover:text-cyan-300"
                    >
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-300">
                  ⚠ {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300">
                  ✓ {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-4 text-sm font-bold tracking-[0.18em]"
                disabled={loading}
              >
                {loading ? 'PROCESANDO...' : current.action}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}