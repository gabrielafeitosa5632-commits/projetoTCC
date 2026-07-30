import { Router } from 'express'
const router = Router()

interface Analysis {
  id: string
  crop: string
  disease: string
  severity: number
  date: string
  location?: string
}

let analyses: Analysis[] = []

router.get('/', (req, res) => {
  const { sort } = req.query
  let result = [...analyses]
  if (sort === 'severity') {
    result.sort((a, b) => b.severity - a.severity)
  } else {
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }
  res.json(result)
})

router.get('/stats', (req, res) => {
  const range = Number(String(req.query.range ?? '7').replace('d', ''))
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const filtered = analyses.filter(a => new Date(a.date) >= cutoff)
  const byDay: Record<string, number[]> = {}
  filtered.forEach(a => {
    const day = a.date.split('T')[0]
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(a.severity)
  })
  const stats = Object.entries(byDay).map(([date, sevs]) => ({
    date,
    avgSeverity: Math.round(sevs.reduce((s, v) => s + v, 0) / sevs.length),
    count: sevs.length
  }))
  res.json(stats)
})

router.post('/', (req, res) => {
  const analysis: Analysis = {
    ...req.body,
    id: Date.now().toString(),
    date: new Date().toISOString()
  }
  analyses.push(analysis)
  res.status(201).json(analysis)
})

router.delete('/:id', (req, res) => {
  analyses = analyses.filter(a => a.id !== req.params.id)
  res.json({ ok: true })
})

export default router