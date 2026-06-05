"use client";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes y respaldo</h1>

      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">📊 Exportar a Excel</h2>
          <p className="mb-2 text-sm text-slate-500">
            Descarga todas tus transferencias en un archivo CSV que abre en Excel.
          </p>
          <a href="/api/export/transferencias" className="btn-primary inline-flex">
            📥 Descargar Excel/CSV
          </a>
        </div>

        <hr className="border-slate-100" />

        <div>
          <h2 className="font-semibold">💾 Copia de seguridad</h2>
          <p className="mb-2 text-sm text-slate-500">
            Respaldo completo en formato JSON. Las cuentas van cifradas y solo se
            pueden restaurar con la misma clave de cifrado. Guárdalo en lugar seguro.
          </p>
          <a href="/api/backup" className="btn-secondary inline-flex">
            💾 Descargar respaldo (.json)
          </a>
        </div>

        <hr className="border-slate-100" />

        <div>
          <h2 className="font-semibold">🖨️ Imprimir reporte</h2>
          <p className="mb-2 text-sm text-slate-500">
            Abre un reporte con todas tus transferencias listo para imprimir o
            guardar como PDF.
          </p>
          <a
            href="/imprimir"
            target="_blank"
            rel="noopener"
            className="btn-secondary inline-flex"
          >
            🖨️ Imprimir / Guardar PDF
          </a>
        </div>
      </div>
    </div>
  );
}
