import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useDolar } from '../../context/DolarContext'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

// ─── Sección editable de tarifa ──────────────────────────────────────────────
function FilaTarifa({ label, campo, valor, onSave }) {
  const [editing, setEditing] = useState(false)
  const [tempVal, setTempVal] = useState(valor)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(campo, Number(tempVal))
      setEditing(false)
      toast.success(`${label} actualizado`)
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-hm-border last:border-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs font-mono text-hm-muted mt-0.5">{campo}</div>
      </div>
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              type="number"
              step="0.01"
              value={tempVal}
              onChange={e => setTempVal(e.target.value)}
              className="w-32 bg-hm-surface2 border border-hm-accent rounded p-2 text-white text-right text-sm focus:outline-none"
              autoFocus
            />
            <button onClick={handleSave} disabled={loading} className="px-3 py-1.5 bg-hm-accent text-white text-xs font-mono font-bold rounded hover:bg-yellow-500 transition-colors disabled:opacity-50">
              {loading ? '...' : 'GUARDAR'}
            </button>
            <button onClick={() => { setEditing(false); setTempVal(valor) }} className="px-3 py-1.5 border border-hm-border text-hm-muted text-xs font-mono rounded hover:border-hm-accent/50 transition-colors">
              CANCELAR
            </button>
          </>
        ) : (
          <>
            <span className="font-mono font-bold text-lg text-hm-accent">USD {Number(valor).toFixed(2)}</span>
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-hm-border text-hm-muted text-xs font-mono rounded hover:border-hm-accent hover:text-hm-accent transition-colors">
              EDITAR
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Módulo Precios (Solo Owner) ──────────────────────────────────────────────
export default function Precios() {
  const { isOwner, orgId } = useAuth()
  const { dolar, formatUSD } = useDolar()

  const [config, setConfig] = useState(null)
  const [maquinas, setMaquinas] = useState([])
  const [aiKey, setAiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingMaquina, setEditingMaquina] = useState(null)
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!orgId) return
      setLoading(true)
      const [{ data: cfg }, { data: maq }, { data: org }] = await Promise.all([
        supabase.from('config_sistema').select('*').limit(1).maybeSingle(),
        supabase.from('maquinas').select('id, nombre_unidad, marca, modelo, tarifa_diaria_usd, activa').order('nombre_unidad'),
        supabase.from('organizaciones').select('api_key_ia').eq('id', orgId).single()
      ])
      setConfig(cfg)
      setMaquinas(maq || [])
      setAiKey(org?.api_key_ia || '')
      setLoading(false)
    }
    fetchData()
  }, [orgId])

  const updateConfig = async (campo, valor) => {
    const { error } = await supabase
      .from('config_sistema')
      .update({ [campo]: valor })
      .eq('id', config.id)
    if (error) throw error
    setConfig(prev => ({ ...prev, [campo]: valor }))
  }

  const updateAIKey = async () => {
    if (!orgId) {
      toast.error('No se pudo identificar el ID de tu empresa.')
      return
    }
    setSavingKey(true)
    try {
      const { error } = await supabase
        .from('organizaciones')
        .update({ api_key_ia: aiKey })
        .eq('id', orgId)
      if (error) throw error
      toast.success('Llave de IA actualizada correctamente')
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSavingKey(false)
    }
  }

  const updateTarifaMaquina = async (maquinaId, tarifa) => {
    const { error } = await supabase
      .from('maquinas')
      .update({ tarifa_diaria_usd: tarifa })
      .eq('id', maquinaId)
    if (error) throw error
    setMaquinas(prev => prev.map(m => m.id === maquinaId ? { ...m, tarifa_diaria_usd: tarifa } : m))
    setEditingMaquina(null)
    toast.success('Tarifa de máquina actualizada')
  }

  if (!isOwner) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
          <p className="text-hm-muted text-sm">Este módulo es exclusivo para el rol de <span className="text-hm-accent font-mono">OWNER</span>.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-hm-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Precios</h1>
          <p className="text-sm text-hm-muted mt-1">Panel de configuración de tarifas — Solo visible para Owner</p>
        </div>
        <div className="flex items-center gap-2 bg-hm-surface2/50 border border-hm-border rounded-lg px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono text-hm-muted">DÓLAR BNA VENTA:</span>
          <span className="font-mono font-bold text-hm-accent">
            ${dolar ? Number(dolar.venta).toLocaleString('es-AR') : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── CONFIGURACIÓN GLOBAL ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="font-mono text-hm-accent tracking-widest text-sm mb-6">TARIFAS GLOBALES DE MANO DE OBRA</h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-hm-surface2 rounded animate-pulse" />)}
              </div>
            ) : config ? (
              <>
                <FilaTarifa label="Precio Hora Taller (Estándar)" campo="precio_hora_taller_usd" valor={config.precio_hora_taller_usd ?? 45} onSave={updateConfig} />
                <FilaTarifa label="Precio Hora Taller (Urgente)" campo="precio_hora_urgente_usd" valor={config.precio_hora_urgente_usd ?? 65} onSave={updateConfig} />
                <FilaTarifa label="Tarifa Diaria Mínima Alquiler" campo="tarifa_minima_alquiler_usd" valor={config.tarifa_minima_alquiler_usd ?? 150} onSave={updateConfig} />
              </>
            ) : (
              <p className="text-sm text-hm-muted font-mono">No se encontró configuración. Ejecutá el seed de config_sistema.</p>
            )}
          </Card>

          {/* ── CONFIGURACIÓN DE IA (SaaS) ───────────────────────────── */}
          <Card className="p-6 border-hm-accent/20">
            <h2 className="font-mono text-hm-accent tracking-widest text-sm mb-2">CONFIGURACIÓN DE ASISTENTE IA</h2>
            <p className="text-[11px] text-hm-muted mb-6">Cada empresa debe cargar su propia llave de Anthropic (Claude) para activar el asistente.</p>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-hm-muted">ANTHROPIC API KEY (CLAUDE)</label>
                <div className="flex gap-2">
                  <Input 
                    type="password"
                    value={aiKey}
                    onChange={e => setAiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="flex-1 font-mono text-xs"
                  />
                  <Button 
                    onClick={updateAIKey} 
                    disabled={savingKey}
                    variant="primary"
                    className="px-4 py-2"
                  >
                    {savingKey ? '...' : 'GUARDAR'}
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-hm-muted italic border-l-2 border-hm-accent/30 pl-2">
                Esta llave se guardará de forma segura en tu registro de organización y solo será utilizada para las consultas de IA de tu equipo.
              </p>
            </div>
          </Card>
        </div>

        {/* ── TARIFAS POR MÁQUINA ──────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="font-mono text-hm-accent tracking-widest text-sm mb-6">TARIFAS POR UNIDAD DE FLOTA</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-hm-surface2 rounded animate-pulse" />)}
            </div>
          ) : maquinas.length === 0 ? (
            <p className="text-sm text-hm-muted font-mono text-center py-8">No hay máquinas registradas en la flota.</p>
          ) : (
            <div className="overflow-y-auto max-h-[480px] pr-1 space-y-0 divide-y divide-hm-border">
              {maquinas.map(m => (
                <div key={m.id} className="flex items-center justify-between py-3 group">
                  <div>
                    <div className="font-medium text-sm">{m.nombre_unidad}</div>
                    <div className="text-xs font-mono text-hm-muted">{m.marca} {m.modelo}</div>
                  </div>
                  {editingMaquina === m.id ? (
                    <EditTarifaInline
                      initial={m.tarifa_diaria_usd}
                      onSave={(v) => updateTarifaMaquina(m.id, v)}
                      onCancel={() => setEditingMaquina(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-hm-accent">
                        {formatUSD(m.tarifa_diaria_usd)}<span className="text-hm-muted text-xs font-normal">/día</span>
                      </span>
                      <button
                        onClick={() => setEditingMaquina(m.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 border border-hm-border text-hm-muted text-[10px] font-mono rounded hover:border-hm-accent hover:text-hm-accent"
                      >
                        EDITAR
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── Inline editor de tarifa para máquinas ───────────────────────────────────
function EditTarifaInline({ initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    await onSave(Number(val))
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-28 bg-hm-surface2 border border-hm-accent rounded p-1.5 text-white text-right text-sm focus:outline-none"
        autoFocus
      />
      <button onClick={handleSave} disabled={loading} className="px-2 py-1 bg-hm-accent text-white text-[10px] font-mono font-bold rounded hover:bg-yellow-500 disabled:opacity-50">
        {loading ? '...' : 'OK'}
      </button>
      <button onClick={onCancel} className="px-2 py-1 border border-hm-border text-hm-muted text-[10px] font-mono rounded">
        ✕
      </button>
    </div>
  )
}
