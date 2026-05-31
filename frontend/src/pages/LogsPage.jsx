import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { RefreshCw, Loader2 } from 'lucide-react'

const SOURCES = [
  { value: 'postfix', label: 'Postfix (SMTP)' },
  { value: 'dovecot', label: 'Dovecot (IMAP)' },
  { value: 'rspamd', label: 'Rspamd (Antispam)' },
]

const LINE_OPTIONS = [50, 100, 200, 500]

function colorize(line) {
  if (/error|reject|refused|failed/i.test(line)) return 'text-red-400'
  if (/warning|warn/i.test(line)) return 'text-yellow-400'
  if (/connect|accept|deliver|sent/i.test(line)) return 'text-green-400'
  return 'text-gray-400'
}

export default function LogsPage() {
  const [source, setSource] = useState('postfix')
  const [lines, setLines] = useState(100)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs', source, lines],
    queryFn: () => api.get(`/logs/?source=${source}&lines=${lines}`).then(r => r.data),
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs del sistema</h1>
          <p className="text-gray-400 text-sm mt-1">Últimas entradas del servidor de correo</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto"
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            className="input w-auto"
            value={lines}
            onChange={e => setLines(Number(e.target.value))}
          >
            {LINE_OPTIONS.map(n => <option key={n} value={n}>{n} líneas</option>)}
          </select>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="bg-gray-950 rounded-xl overflow-auto max-h-[65vh] p-4 font-mono text-xs leading-5">
            {data?.lines?.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Sin entradas de log</p>
            ) : (
              [...(data?.lines ?? [])].reverse().map((line, i) => (
                <div key={i} className={`${colorize(line)} hover:bg-gray-900/50 px-1 py-0.5 rounded`}>
                  {line}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
