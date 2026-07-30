import { Router } from 'express'
const router = Router()

router.get('/csv', (req, res) => {
  const data = [
    { id: '1', crop: 'Soja', disease: 'Ferrugem', severity: 70 }
  ]

  const csv = 'id,cultura,doenca,severidade\n' +
    data.map(d => `${d.id},${d.crop},${d.disease},${d.severity}`).join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.send(csv)
})

export default router