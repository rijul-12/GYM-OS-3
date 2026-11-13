'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { UploadCloud, Download, CheckCircle2 } from 'lucide-react'
import { DashShell } from '@/components/dash-shell'
import { Button } from '@/components/ui/button'
import { Card, Stat, StatusBadge, inputClass, formatDate } from '@/components/ui-kit'
import { IMPORT_FIELDS, IMPORT_MAX_ROWS, detectColumnMapping, applyMapping, buildErrorReportCsv } from '@/lib/domain/import'
import { validateImportBatch, executeImportBatch, getImportFailures } from '@/actions/db/import'

const STEPS = ['Upload', 'Map columns', 'Preview & validate', 'Report']
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ROW_TONE = { READY: 'text-emerald-400', WARNING: 'text-amber-400', ERROR: 'text-red-400' }

function download(name, text) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
}

/** Reads a CSV or XLSX file into { headers, rows } entirely in the browser. Nothing is uploaded at this point. */
async function parseFile(file) {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'csv') {
    const Papa = (await import('papaparse')).default
    const text = await file.text()
    const res = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => String(h).trim() })
    return { headers: (res.meta.fields || []).filter(Boolean), rows: res.data }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' })
    const headerIndex = matrix.findIndex(r => r.filter(c => String(c).trim() !== '').length >= 2)
    if (headerIndex < 0) return { headers: [], rows: [] }
    const headers = matrix[headerIndex].map((h, i) => String(h).trim() || `Column ${i + 1}`)
    const rows = matrix.slice(headerIndex + 1).filter(r => r.some(c => String(c).trim() !== '')).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
    return { headers, rows }
  }
  throw new Error('Only CSV or XLSX files are supported.')
}

export default function ImportClient({ history }) {
  const router = useRouter()
  const inputRef = useRef(null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState(null)       // { name, headers, rows }
  const [mapping, setMapping] = useState({})
  const [result, setResult] = useState(null)   // validation
  const [includeWarnings, setIncludeWarnings] = useState(true)
  const [report, setReport] = useState(null)
  const [show, setShow] = useState('ALL')

  const reset = () => { setStep(0); setFile(null); setMapping({}); setResult(null); setReport(null); setShow('ALL') }

  const onFile = async (f) => {
    if (!f) return
    if (f.size > MAX_FILE_BYTES) return toast.error('The file is larger than 10 MB. Split it into smaller files.')
    setBusy(true)
    try {
      const parsed = await parseFile(f)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) throw new Error('The file has no data rows.')
      if (parsed.rows.length > IMPORT_MAX_ROWS) throw new Error(`The file has ${parsed.rows.length} rows. One import can contain at most ${IMPORT_MAX_ROWS} — split the file.`)
      setFile({ name: f.name, ...parsed })
      setMapping(detectColumnMapping(parsed.headers))
      setStep(1)
    } catch (e) {
      toast.error(e.message || 'The file could not be read.')
    } finally { setBusy(false) }
  }

  const mapped = useMemo(() => (file ? applyMapping(file.rows, mapping) : []), [file, mapping])

  const validate = async () => {
    if (!mapping.name) return toast.error('Choose which column contains the member name.')
    if (!mapping.phone && !mapping.email) return toast.error('Map a phone or an e-mail column.')
    setBusy(true)
    try {
      const res = await validateImportBatch(mapped)
      if (res.error) return toast.error(res.error)
      setResult(res); setStep(2)
    } catch { toast.error('Validation failed. Check your connection and try again.') } finally { setBusy(false) }
  }

  const runImport = async () => {
    setBusy(true)
    try {
      const res = await executeImportBatch(mapped, file.name, { includeWarnings })
      if (res.error) return toast.error(res.error)
      setReport(res); setStep(3)
      router.refresh()
    } catch { toast.error('The import was interrupted. Open Import history to see what was saved before retrying.') } finally { setBusy(false) }
  }

  const importable = result ? result.summary.ready + (includeWarnings ? result.summary.warnings : 0) : 0
  const visibleRows = result ? result.rows.filter(r => show === 'ALL' || r.status === show).slice(0, 200) : []

  return (
    <DashShell title="Bring Your Data" subtitle="Move your existing members into BGM from a CSV or Excel file">
      <ol className="flex gap-2 mb-5">{STEPS.map((s, i) => (
        <li key={s} className="flex-1"><div className={`h-1 rounded-full ${i <= step ? 'bg-foreground' : 'bg-foreground/15'}`} /><div className={`text-[11px] mt-1.5 ${i === step ? '' : 'text-foreground/40'}`}>{i + 1}. {s}</div></li>
      ))}</ol>

      {step === 0 && (
        <Card>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} data-testid="import-file" />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]) }}
            className="w-full rounded-2xl border-2 border-dashed border-foreground/15 hover:border-foreground/30 p-8 sm:p-12 text-center transition">
            <UploadCloud className="h-10 w-10 mx-auto text-foreground/40" />
            <div className="mt-3 font-medium">{busy ? 'Reading file…' : 'Choose a CSV or Excel file'}</div>
            <div className="text-xs text-foreground/50 mt-1">Up to {IMPORT_MAX_ROWS.toLocaleString()} rows · 10 MB. The first row must contain column names.</div>
          </button>
          <div className="mt-4 text-xs text-foreground/50 space-y-1">
            <p>Nothing is saved until you review the preview and confirm. Imported members become normal BGM members — they appear in Members, analytics and can be invited to the member portal.</p>
            <button className="underline" onClick={() => download('bgm-import-template.csv', 'Full Name,Phone,Email,Membership Plan,Start Date,Expiry Date,Membership Fee,Amount Paid,Payment Method,Trainer,Member ID\nAsha Rao,9876543210,asha@example.com,Gold,01/01/2026,31/12/2026,12000,5000,Cash,,M-101\n')}>Download a template</button>
          </div>
        </Card>
      )}

      {step === 1 && file && (
        <Card title={`Map columns — ${file.name}`} subtitle={`${file.rows.length} rows found. We matched the columns we recognised; adjust any that are wrong.`}>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {IMPORT_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-3">
                <span className="text-sm w-40 shrink-0">{f.label}{f.required ? ' *' : ''}</span>
                <select className={`${inputClass} h-10`} value={mapping[f.key] || ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value || null }))} data-map={f.key}>
                  <option value="">— not in my file —</option>
                  {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={reset}>Choose another file</Button>
            <Button disabled={busy} onClick={validate} data-testid="import-validate">{busy ? 'Validating…' : 'Preview & validate'}</Button>
          </div>
        </Card>
      )}

      {step === 2 && result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Rows" value={result.summary.total} hint={result.summary.skippedBlank ? `${result.summary.skippedBlank} blank rows skipped` : null} />
            <Stat label="Ready" value={result.summary.ready} tone="#34d399" />
            <Stat label="With warnings" value={result.summary.warnings} tone={result.summary.warnings ? '#fbbf24' : undefined} />
            <Stat label="Errors (not imported)" value={result.summary.errors} tone={result.summary.errors ? '#f87171' : undefined} />
          </div>
          {result.capacityError && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-3">{result.capacityError}</div>}
          <Card className="mt-4" title="Preview" action={
            <div className="flex items-center gap-2">
              <select value={show} onChange={e => setShow(e.target.value)} className="h-9 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-2 text-xs"><option value="ALL">All rows</option><option value="READY">Ready</option><option value="WARNING">Warnings</option><option value="ERROR">Errors</option></select>
              {(result.summary.errors + result.summary.warnings) > 0 && <Button variant="outline" className="h-9 text-xs" onClick={() => download('bgm-import-problems.csv', buildErrorReportCsv(result.rows))}><Download className="h-3.5 w-3.5 mr-1.5" />Report</Button>}
            </div>}>
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="w-full text-xs min-w-[720px]" data-testid="import-preview">
                <thead className="text-left text-foreground/40 uppercase tracking-wider"><tr><th className="px-4 py-2">Row</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Phone</th><th className="px-2 py-2">Plan</th><th className="px-2 py-2">Start → Expiry</th><th className="px-2 py-2">Fee / Paid / Due</th><th className="px-2 py-2">Trainer</th><th className="px-4 py-2">Notes</th></tr></thead>
                <tbody className="divide-y divide-foreground/5">
                  {visibleRows.map(r => (
                    <tr key={r.rowNumber} className="align-top">
                      <td className="px-4 py-2 text-foreground/40">{r.rowNumber}</td>
                      <td className={`px-2 py-2 font-semibold ${ROW_TONE[r.status]}`}>{r.status}</td>
                      <td className="px-2 py-2">{r.data.name || '—'}<div className="text-foreground/40">{r.data.email}</div></td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.data.phone || '—'}</td>
                      <td className="px-2 py-2">{r.data.plan || '—'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.data.startDate || '—'} → {r.data.expiryDate || 'none'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.data.fee} / {r.data.amountPaid} / {r.data.outstanding}</td>
                      <td className="px-2 py-2">{r.data.trainerName || '—'}</td>
                      <td className="px-4 py-2 text-foreground/60 max-w-[280px]">{[...r.errors, ...r.warnings].join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length > 200 && <div className="text-xs text-foreground/40 mt-3">Showing the first 200 matching rows. Download the report for the full list of problems.</div>}
          </Card>
          <Card className="mt-4">
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="h-4 w-4 mt-0.5 accent-red-500" checked={includeWarnings} onChange={e => setIncludeWarnings(e.target.checked)} /><span>Also import the {result.summary.warnings} row{result.summary.warnings === 1 ? '' : 's'} with warnings<span className="block text-xs text-foreground/50">Rows with errors are never imported.</span></span></label>
            <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
              <Button variant="outline" disabled={busy} onClick={() => setStep(1)}>Back to mapping</Button>
              <Button disabled={busy || importable === 0 || !!result.capacityError} onClick={runImport} data-testid="import-confirm">{busy ? 'Importing…' : `Confirm and import ${importable} member${importable === 1 ? '' : 's'}`}</Button>
            </div>
          </Card>
        </>
      )}

      {step === 3 && report && (
        <Card>
          <div className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" /><div><div className="font-display text-lg font-semibold" data-testid="import-result">{report.successCount} member{report.successCount === 1 ? '' : 's'} imported</div><div className="text-xs text-foreground/50">Batch {report.importBatchId}</div></div></div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat label="Imported" value={report.successCount} tone="#34d399" /><Stat label="With warnings" value={report.warningCount} /><Stat label="Not imported" value={report.failedCount} tone={report.failedCount ? '#f87171' : undefined} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/members"><Button>View members</Button></Link>
            {report.failedCount > 0 && <Button variant="outline" onClick={() => download(`${report.importBatchId}-not-imported.csv`, failuresCsv(report.failures))}><Download className="h-4 w-4 mr-2" />Download error report</Button>}
            <Button variant="outline" onClick={reset}>Import another file</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6" title="Import history">
        {(history || []).length === 0 ? <div className="text-sm text-foreground/40">No imports yet.</div> : (
          <ul className="divide-y divide-foreground/5 -my-2">
            {history.map(h => (
              <li key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0"><div className="text-sm truncate">{h.fileName}</div><div className="text-[11px] text-foreground/50">{formatDate(h.createdAt)} · {h.id} · {h.successCount} imported{h.errorCount ? ` · ${h.errorCount} not imported` : ''}</div></div>
                <div className="flex items-center gap-2"><StatusBadge status={h.status} />
                  {h.errorCount > 0 && <button className="text-xs underline" onClick={async () => { const res = await getImportFailures(h.id); if (res.error) toast.error(res.error); else download(`${h.id}-not-imported.csv`, failuresCsv(res.failures)) }}>Error report</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashShell>
  )
}

function failuresCsv(failures) {
  return buildErrorReportCsv((failures || []).map(f => ({ rowNumber: f.rowNumber, status: 'NOT IMPORTED', data: { name: f.name, phone: f.phone, email: f.email }, errors: f.reasons || [], warnings: [] })))
}
