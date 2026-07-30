export default function ExportPanel() {
  const download = (format: 'csv' | 'json') => {
    window.open(`/api/export/${format}`, '_blank')
  }

  return (
    <div className="bg-white border p-4 rounded-lg">
      <h2 className="text-sm font-medium mb-2">Exportar</h2>

      <div className="flex gap-2">
        <button onClick={() => download('csv')} className="px-3 py-1 bg-green-700 text-white rounded">
          CSV
        </button>

        <button onClick={() => download('json')} className="px-3 py-1 border rounded">
          JSON
        </button>
      </div>
    </div>
  )
}