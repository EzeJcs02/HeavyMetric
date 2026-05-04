import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function Setup() {
  const { user } = useAuth()

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
          Contactá al administrador de tu empresa para que asigne tu usuario al perfil correspondiente.
        </p>

        <Button onClick={() => supabase.auth.signOut()} className="w-full">
          VOLVER AL LOGIN
        </Button>
      </Card>
    </div>
  )
}
