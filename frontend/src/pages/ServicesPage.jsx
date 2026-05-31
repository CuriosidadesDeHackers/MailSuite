import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { CheckCircle2, XCircle, Play, Square, RefreshCw, Loader2 } from 'lucide-react'

const SERVICE_LABELS = {
  postfix: { label: 'Postfix', desc: 'Servidor SMTP' },
  dovecot: { label: 'Dovecot', desc: 'Servidor IMAP/POP3' },
  rspamd: { label: 'Rspamd', desc: 'Antispam' },
  nginx: { label: 'Nginx', desc: 'Proxy web' },
  opendkim: { label: 'OpenDKIM', desc: 'Firma DKIM' },
  fail2ban: { label: 'Fail2ban', desc: 'Protección fuerza bruta' },
}

export default function ServicesPage() {
  const qc = useQueryClient()

  const { data: services = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.get('/services/').then(r => r.data),
    refetchInterval: 15000,
  })

  const controlMut = useMutation({
    mutationFn: ({ service, action }) => api.post(`/services/${service}/${action}/`),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries(['services']), 1500)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servicios del sistema</h1>
          <p className="text-gray-400 text-sm mt-1">Control de servicios de correo</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map(svc => {
            const meta = SERVICE_LABELS[svc.name] || { label: svc.name, desc: '' }
            const pending = controlMut.isPending && controlMut.variables?.service === svc.name
            return (
              <div key={svc.name} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${svc.active ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-semibold text-white">{meta.label}</p>
                    <p className="text-xs text-gray-500">{meta.desc}</p>
                    <p className="text-xs text-gray-600 font-mono mt-0.5">{svc.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {svc.active ? (
                    <>
                      <button
                        onClick={() => controlMut.mutate({ service: svc.name, action: 'restart' })}
                        disabled={pending}
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        {pending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Reiniciar
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Detener ${svc.name}?`)) controlMut.mutate({ service: svc.name, action: 'stop' }) }}
                        disabled={pending}
                        className="btn-danger text-xs flex items-center gap-1"
                      >
                        <Square size={11} /> Detener
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => controlMut.mutate({ service: svc.name, action: 'start' })}
                      disabled={pending}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      {pending ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Iniciar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
