import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Stat { date: string; avgSeverity: number; count: number }

export default function SeverityChart() {
  const [data, setData] = useState<Stat[]>([])

  useEffect(() => {
    fetch('/api/analyses/stats')
      .then(r => r.json())
      .then(setData)
  }, [])

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-sm font-medium mb-2">Severidade</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="avgSeverity" stroke="#1B4332" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}