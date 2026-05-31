import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, Trash2, Lock, ToggleLeft, ToggleRight, HardDrive, Loader2 } from 'lucide-react'

function AddMailboxModal({ domains, onClose, onSuccess }) {
  const [form, setForm] = useState({ domain: '', local_part: '', password: '', quota_mb: 1024 })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data) => api.post('/mailboxes/', data),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err) => {
      const d = err.response?.data
      setError(d?.local_part?.[0] || d?.password?.[0] || d?.non_field_errors?.[0] || 'Error al crear el buzón')
    },
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Crear buzón</h3>
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
            <label className="label">Usuario</label>
            <input className="input" placeholder="usuario" value={form.local_part}
              onChange={e => setForm(f => ({ ...f, local_part: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Contraseña (mín. 12 caracteres)</label>
            <input type="password" className="input" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={12} />
          </div>
          <div>
            <label className="label">Cuota (MB)</label>
            <input type="number" className="input" value={form.quota_mb} min={100}
              onChange={e => setForm(f => ({ ...f, quota_mb: Number(e.target.value) }))} />
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

function ChangePasswordModal({ mailbox, onClose }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api.post(`/mailboxes/${mailbox.id}/change_password/`, { password }),
    onSuccess: () => setOk(true),
    onError: (err) => setError(err.response?.data?.password?.[0] || 'Error'),
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Cambiar contraseña</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-400 mb-4">{mailbox.email}</p>
        {ok ? (
          <div className="text-green-400 text-sm text-center py-4">¡Contraseña actualizada!</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
            <input type="password" className="input" placeholder="Nueva contraseña (mín. 12)" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={12} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>Cambiar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function MailboxesPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [changePw, setChangePw] = useState(null)

  const { data: mailboxes = [], isLoading } = useQuery({
    queryKey: ['mailboxes'],
    queryFn: () => api.get('/mailboxes/').then(r => r.data.results ?? r.data),
  })

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get('/domains/').then(r => r.data.results ?? r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/mailboxes/${id}/`),
    onSuccess: () => qc.invalidateQueries(['mailboxes']),
  })

  const toggleMut = useMutation({
    mutationFn: (id) => api.post(`/mailboxes/${id}/toggle_active/`),
    onSuccess: () => qc.invalidateQueries(['mailboxes']),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Buzones</h1>
          <p className="text-gray-400 text-sm mt-1">{mailboxes.length} buzón(es)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Crear buzón
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
      ) : mailboxes.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">No hay buzones. Crea el primero.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Cuota</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {mailboxes.map(mb => (
                <tr key={mb.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-200">{mb.email}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} />
                      {mb.quota_mb >= 1024 ? `${(mb.quota_mb/1024).toFixed(0)} GB` : `${mb.quota_mb} MB`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {mb.is_active
                      ? <span className="badge-green">Activo</span>
                      : <span className="badge-red">Inactivo</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setChangePw(mb)} className="btn-secondary text-xs flex items-center gap-1">
                        <Lock size={12} /> Contraseña
                      </button>
                      <button onClick={() => toggleMut.mutate(mb.id)} className="btn-secondary text-xs flex items-center gap-1">
                        {mb.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {mb.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar ${mb.email}?`)) deleteMut.mutate(mb.id) }}
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
        <AddMailboxModal
          domains={domains}
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries(['mailboxes'])}
        />
      )}
      {changePw && <ChangePasswordModal mailbox={changePw} onClose={() => setChangePw(null)} />}
    </div>
  )
}
