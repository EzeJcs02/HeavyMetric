import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { consultarMotorIA } from '../lib/claude'
import { useAuth } from '../context/AuthContext'
import Button from './ui/Button'
import Input from './ui/Input'

export default function AsistenteIA() {
  const [isOpen, setIsOpen] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const mensajesEndRef = useRef(null)
  const location = useLocation()
  const { orgId } = useAuth()

  const moduloActual = location.pathname === '/' ? 'Dashboard' : location.pathname.slice(1).toUpperCase()

  const scrollBottom = () => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollBottom() }, [mensajes])

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()

    if (!orgId) {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'No se pudo identificar tu empresa. Iniciá sesión de nuevo.' }])
      return
    }

    setInput('')
    setMensajes(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const historial = mensajes.map(m => ({ role: m.role, content: m.content }))
      const respuesta = await consultarMotorIA(userMsg, historial, moduloActual, orgId)
      setMensajes(prev => [...prev, { role: 'assistant', content: respuesta }])
    } catch (err) {
      setMensajes(prev => [...prev, { role: 'assistant', content: err.message || 'Error de conexión.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 ${isOpen ? 'right-[340px]' : 'right-6'} w-12 h-12 bg-hm-accent hover:bg-yellow-500 text-hm-bg rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 z-50 focus:outline-none`}
        title={isOpen ? "Cerrar Asistente" : "Abrir Asistente IA"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-[320px] bg-hm-surface border-l border-hm-border shadow-2xl z-40 flex flex-col pt-16 animate-slide-in">
          <div className="p-4 border-b border-hm-border bg-hm-surface2 flex justify-between items-center">
            <h3 className="font-mono font-bold tracking-wider text-hm-accent uppercase">ASISTENTE IA</h3>
            <span className="text-xs font-mono text-hm-muted bg-hm-bg px-2 py-1 rounded">{moduloActual}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {mensajes.length === 0 && (
              <div className="text-center text-sm text-hm-muted my-auto font-mono">
                ¿En qué puedo ayudarte hoy?
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-hm-accent text-hm-bg rounded-tr-none' : 'bg-hm-surface2 border border-hm-border rounded-tl-none text-hm-text whitespace-pre-wrap'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="self-start bg-hm-surface2 border border-hm-border p-3 rounded-lg rounded-tl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-hm-accent rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-hm-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-hm-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={mensajesEndRef} />
          </div>

          <form onSubmit={enviarMensaje} className="p-4 border-t border-hm-border bg-hm-surface">
            <div className="flex gap-2">
              <Input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Consultar IA..." 
                className="flex-1"
              />
              <Button type="submit" variant="primary" className="px-3" disabled={loading}>→</Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
