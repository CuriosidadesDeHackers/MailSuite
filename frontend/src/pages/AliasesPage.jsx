import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

function AddAliasModal({ domains, onClose, onSuccess }) {
  const [form, setForm] = useState({ domain: '', local_part: '', destinations: '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data) => api.post('/aliases/', data),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err) => {
      const d = err.response?.data
      setError(d?.local_part?.[0] || d?.destinations?.[0] || 'Error al crear el alias')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Crear alias</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, domain: Number(form.domain) }) }} className="space-y-4">
          <div>
            <label className="label">Dominio</label>
            <select className="input" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} required>
              <option value="">Seleccionar dominio...</option>
              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nombre del alias</label>
            <input className="input" placeholder="info" value={form.local_part}
              onChange={e => setForm(f => ({ ...f, local_part: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Destinos (separados por coma)</label>
            <input className="input" placeholder="user@dominio.com, otro@dominio.com" value={form.destinations}
              onChange={e => setForm(f => ({ ...f, destinations: e.target.value }))} required />
            <p className="text-xs text-gray-500 mt-1">Puede redirigir a múltiples direcciones</p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AliasesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ['aliases'],
    queryFn: () => api.get('/aliases/').then(r => r.data.results ?? r.data),
  })

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get('/domains/').then(r => r.data.results ?? r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/aliases/${id}/`),
    onSuccess: () => qc.invalidateQueries(['aliases']),
  })

  const toggleMut = useMutation({
    mutationFn: (id) => api.post(`/aliases/${id}/toggle_active/`),
    onSuccess: () => qc.invalidateQueries(['aliases']),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alias y redirecciones</h1>
          <p className="text-gray-400 text-sm mt-1">{aliases.length} alias configurado(s)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Crear alias
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
      ) : aliases.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">No hay alias configurados.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Alias</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Destinos</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {aliases.map(alias => (
                <tr key={alias.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-200">{alias.email}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {alias.destination_list?.map((d, i) => (
                        <span key={i} className="bg-gray-800 px-2 py-0.5 rounded text-xs font-mono">{d}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {alias.is_active
                      ? <span className="badge-green">Activo</span>
                      : <span className="badge-red">Inactivo</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleMut.mutate(alias.id)} className="btn-secondary text-xs flex items-center gap-1">
                        {alias.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {alias.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar alias ${alias.email}?`)) deleteMut.mutate(alias.id) }}
                        className="btn-danger text-xs"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddAliasModal
          domains={domains}
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries(['aliases'])}
        />
      )}
    </div>
  )
}
