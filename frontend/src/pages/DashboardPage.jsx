import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Globe, Inbox, AtSign, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'text-blue-400 bg-blue-900/30 border-blue-800/50',
    green: 'text-green-400 bg-green-900/30 border-green-800/50',
    purple: 'text-purple-400 bg-purple-900/30 border-purple-800/50',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function ServiceBadge({ name, active }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-800/50">
      <span className="text-sm font-mono text-gray-300">{name}</span>
      {active
        ? <span className="badge-green"><CheckCircle2 size={12} /> Activo</span>
        : <span className="badge-red"><XCircle size={12} /> Inactivo</span>
      }
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/').then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Resumen del servidor de correo</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Globe} label="Dominios activos" value={data?.domains} color="blue" />
            <StatCard icon={Inbox} label="Buzones activos" value={data?.mailboxes} color="green" />
            <StatCard icon={AtSign} label="Alias activos" value={data?.aliases} color="purple" />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Estado de servicios</h2>
              {data?.services_ok
                ? <span className="badge-green"><CheckCircle2 size={12} /> Todos activos</span>
                : <span className="badge-red"><XCircle size={12} /> Hay servicios caídos</span>
              }
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data?.services?.map(s => (
                <ServiceBadge key={s.name} name={s.name} active={s.active} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
