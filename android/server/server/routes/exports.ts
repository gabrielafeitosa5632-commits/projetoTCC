import { Router } from 'express'
const router = Router()

// Substituir por import real do banco quando tiver
const getMockData = () => [
  {
    id: '1',
    crop: 'Soja',
    disease: 'Ferrugem asiática',
    severity: 72,
    date: new Date().toISOString(),
    location: 'Fazenda São João'
  },
  {
    id: '2',
    crop: 'Milho',
    disease: 'Mancha foliar',
    severity: 41,
    date: new Date().toISOString(),
    location: 'Talhão B'
  }
]

router.get('/csv', (req, res) => {
  const data = getMockData()
  const header = 'id,cultura,doença,severidade(%),data,localização\n'
  const rows = data.map(a =>
    `${a.id},"${a.crop}","${a.disease}",${a.severity},"${a.date}","${a.location}"`
  ).join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=analises.csv')
  res.send('\uFEFF' + header + rows)
})

router.get('/json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=analises.json')
  res.json(getMockData())
})

export default router