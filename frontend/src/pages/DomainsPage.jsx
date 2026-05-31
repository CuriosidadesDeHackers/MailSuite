import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, ListChecks, Key, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

function DnsChecklist({ domainId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dns-checklist', domainId],
    queryFn: () => api.get(`/domains/${domainId}/dns_checklist/`).then(r => r.data),
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Registros DNS requeridos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : (
          <div className="space-y-3">
            {data?.map((record, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-400 uppercase">{record.type}</span>
                  <span className="text-xs text-gray-500">{record.description}</span>
                </div>
                <p className="text-sm text-gray-300 font-mono"><span className="text-yellow-400">{record.name}</span></p>
                <p className="text-sm text-green-400 font-mono break-all mt-1">{record.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AddDomainModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', dkim_selector: 'mail' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data) => api.post('/domains/', data),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err) => setError(err.response?.data?.name?.[0] || 'Error al crear el dominio'),
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Añadir dominio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Nombre de dominio</label>
            <input className="input" placeholder="ejemplo.com" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Selector DKIM</label>
            <input className="input" value={form.dkim_selector}
              onChange={e => setForm(f => ({ ...f, dkim_selector: e.target.value }))} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DomainsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [checklist, setChecklist] = useState(null)

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => api.get('/domains/').then(r => r.data.results ?? r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/domains/${id}/`),
    onSuccess: () => qc.invalidateQueries(['domains']),
  })

  const verifyMut = useMutation({
    mutationFn: (id) => api.post(`/domains/${id}/verify_dns/`),
    onSuccess: () => qc.invalidateQueries(['domains']),
  })

  const dkimMut = useMutation({
    mutationFn: (id) => api.post(`/domains/${id}/regenerate_dkim/`),
    onSuccess: () => qc.invalidateQueries(['domains']),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dominios</h1>
          <p className="text-gray-400 text-sm mt-1">{domains.length} dominio(s) configurado(s)</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Añadir dominio
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
      ) : domains.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">No hay dominios configurados. Añade uno para comenzar.</div>
      ) : (
        <div className="space-y-3">
          {domains.map(domain => (
            <div key={domain.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{domain.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {domain.mailbox_count} buzones · {domain.alias_count} alias · selector: {domain.dkim_selector}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { label: 'MX', ok: domain.mx_verified },
                      { label: 'SPF', ok: domain.spf_verified },
                      { label: 'DKIM', ok: domain.dkim_verified },
                      { label: 'DMARC', ok: domain.dmarc_verified },
                    ].map(({ label, ok }) => (
                      <span key={label} className={ok ? 'badge-green' : 'badge-red'}>
                        {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChecklist(domain.id)}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <ListChecks size={14} /> DNS
                  </button>
                  <button
                    onClick={() => verifyMut.mutate(domain.id)}
                    disabled={verifyMut.isPending}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={verifyMut.isPending ? 'animate-spin' : ''} /> Verificar
                  </button>
                  <button
                    onClick={() => dkimMut.mutate(domain.id)}
                    disabled={dkimMut.isPending}
                    className="btn-secondary text-sm flex items-center gap-1.5"
                  >
                    <Key size={14} /> DKIM
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el dominio ${domain.name} y todos sus buzones?`))
                        deleteMut.mutate(domain.id)
                    }}
                    className="btn-danger text-sm flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddDomainModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries(['domains'])}
        />
      )}
      {checklist && <DnsChecklist domainId={checklist} onClose={() => setChecklist(null)} />}
    </div>
  )
}
