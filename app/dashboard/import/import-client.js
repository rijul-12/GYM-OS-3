'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, Table2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashShell } from '@/components/dash-shell'
import { toast } from 'sonner'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { validateImportBatch, executeImportBatch } from '@/actions/db/import'

const TARGET_FIELDS = [
    { key: 'Full Name', required: true, matches: ['customer name', 'member name', 'name', 'client name', 'full name'] },
    { key: 'Phone', matches: ['mobile', 'mobile number', 'phone number', 'contact', 'contact number', 'phone'] },
    { key: 'Email', matches: ['email address', 'e-mail', 'mail', 'email'] },
    { key: 'Membership Plan', matches: ['plan', 'membership', 'package', 'membership plan'] },
    { key: 'Start Date', matches: ['joining date', 'join date', 'membership start', 'start date'] },
    { key: 'Expiry Date', matches: ['expiry', 'valid till', 'membership expiry', 'end date', 'expiry date'] },
    { key: 'Trainer', matches: ['trainer name', 'assigned trainer', 'coach', 'trainer'] },
    { key: 'Amount Paid', matches: ['paid amount', 'paid', 'amount paid', 'collected'] },
    { key: 'Outstanding Amount', matches: ['outstanding', 'due', 'balance', 'outstanding amount'] },
    { key: 'Payment Status', matches: ['payment status', 'status'] },
    { key: 'Source ID', matches: ['id', 'member id', 'user id', 'source id'] }
]

function guessMapping(headers) {
    const map = {}
    headers.forEach(h => {
        const lowerH = h.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ')
        for (let target of TARGET_FIELDS) {
            if (target.matches.some(m => lowerH.includes(m.replace(/[^a-z0-9]/g, ' ')))) {
                if (!Object.values(map).includes(target.key)) {
                    map[h] = target.key
                    break
                }
            }
        }
    })
    return map
}

export default function ImportClient({ user }) {
    const router = useRouter()
    const [step, setStep] = useState(1) // 1:Upload, 2:Map, 3:Preview, 4:Result
    const [file, setFile] = useState(null)
    const [rawHeaders, setRawHeaders] = useState([])
    const [rawRows, setRawRows] = useState([])

    const [columnMap, setColumnMap] = useState({}) // { FileHeader: BGM_Field }
    const [isProcessing, setIsProcessing] = useState(false)

    const [validationReport, setValidationReport] = useState(null)
    const [importResult, setImportResult] = useState(null)

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            toast.error('Only CSV or XLSX files are supported.')
            return
        }

        setIsProcessing(true)
        setFile(file)

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (file.name.endsWith('.csv')) {
                Papa.parse(evt.target.result, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        processRawData(results.data, results.meta.fields)
                    }
                })
            } else {
                const workbook = XLSX.read(evt.target.result, { type: 'binary' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
                if (json.length > 0) {
                    processRawData(json, Object.keys(json[0]))
                } else {
                    toast.error('Spreadsheet is empty.')
                    setIsProcessing(false)
                }
            }
        }
        if (file.name.endsWith('.csv')) reader.readAsText(file)
        else reader.readAsBinaryString(file)
    }

    const processRawData = (data, headers) => {
        setRawHeaders(headers)
        setRawRows(data)
        setColumnMap(guessMapping(headers))
        setIsProcessing(false)
        setStep(2)
    }

    const prepareValidation = async () => {
        setIsProcessing(true)

        // Transform purely mapped data
        const mappedData = rawRows.map(row => {
            const mappedRow = {}
            for (let sourceHeader of Object.keys(columnMap)) {
                const targetKey = columnMap[sourceHeader]
                if (targetKey !== 'IGNORE') {
                    mappedRow[targetKey] = row[sourceHeader]
                }
            }
            return mappedRow
        })

        try {
            const report = await validateImportBatch(mappedData)
            setValidationReport(report)
            setStep(3)
        } catch (err) {
            toast.error(err.message || 'Validation failed')
        } finally {
            setIsProcessing(false)
        }
    }

    const executeImport = async () => {
        setIsProcessing(true)
        try {
            const res = await executeImportBatch(validationReport.validatedRows, file.name)
            setImportResult(res)
            setStep(4)
        } catch (err) {
            toast.error(err.message || 'Import execution failed')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <DashShell title="Bring Your Data" active="members">
            <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-16">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Bring Your Data</h1>
                    <p className="text-foreground/60 text-[15px]">Seamlessly migrate from your previous management software.</p>
                </div>

                {/* Progress Tracker */}
                <div className="flex items-center gap-2 mb-8 text-xs font-semibold uppercase tracking-widest overflow-hidden">
                    {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, i) => (
                        <div key={label} className="flex items-center gap-2 shrink-0">
                            <span className={step >= i + 1 ? 'text-emerald-500' : 'text-foreground/20'}>{i + 1}. {label}</span>
                            {i < 3 && <span className="text-foreground/10">/</span>}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="border border-foreground/10 border-dashed bg-foreground/[0.02] rounded-3xl p-10 flex flex-col items-center justify-center text-center relative group hover:bg-foreground/[0.04] transition-colors">
                                <UploadCloud className="h-10 w-10 text-foreground/40 mb-4 group-hover:text-emerald-500 transition-colors" />
                                <h3 className="text-lg font-bold mb-2">Upload CSV or XLSX Excel</h3>
                                <p className="text-foreground/50 text-sm max-w-sm mb-6">Drop your member export file here. Formats supported: .csv, .xlsx</p>

                                <Button disabled={isProcessing} onClick={() => document.getElementById('data-upload').click()} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-12 px-8 rounded-xl">
                                    {isProcessing ? 'Processing File...' : 'Browse Computer'}
                                </Button>
                                <input type="file" id="data-upload" accept=".csv, .xlsx" className="hidden" onChange={handleFileUpload} />
                            </div>

                            <a href={`data:text/csv;charset=utf-8,Full Name,Phone,Email,Membership Plan,Start Date,Expiry Date,Trainer,Amount Paid,Outstanding Amount,Payment Status\n"John Doe","9876543210","jdoe@bgm.app","Gold Plan",${new Date().toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]},"Mike Tyson","2000","0","PAID"`}
                                download="BGM_Migration_Template.csv" className="flex items-center justify-center gap-2 text-sm text-foreground/50 hover:text-emerald-500 transition-colors">
                                Download a Sample Template CSV <ArrowRight className="h-4 w-4" />
                            </a>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-6 overflow-hidden">
                                <h2 className="font-display font-semibold mb-6 flex items-center gap-2"><Table2 className="h-5 w-5 text-emerald-500" /> Map Your Data Columns</h2>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                                    {rawHeaders.map((header) => {
                                        const mappedTo = columnMap[header] || 'IGNORE'
                                        return (
                                            <div key={header} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-black/40 border border-foreground/5 gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] uppercase tracking-widest text-foreground/40 mb-1">Your Spreadsheet</div>
                                                    <div className="font-semibold truncate">{header}</div>
                                                </div>
                                                <div className="hidden sm:block text-foreground/20 px-2"><ArrowRight className="h-4 w-4" /></div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] uppercase tracking-widest text-emerald-500/70 mb-1">BGM Field</div>
                                                    <select value={mappedTo} onChange={(e) => setColumnMap({ ...columnMap, [header]: e.target.value })} className="w-full bg-foreground/[0.05] border border-foreground/10 rounded-xl h-10 px-3 text-sm focus:border-emerald-500 outline-none text-foreground">
                                                        <option value="IGNORE">— Ignore this column —</option>
                                                        {TARGET_FIELDS.map(t => <option key={t.key} value={t.key}>{t.key} {t.required ? '*' : ''}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-4 border-t border-foreground/10 pt-6">
                                <Button variant="outline" onClick={() => setStep(1)} className="border-foreground/20">Cancel</Button>
                                <Button onClick={prepareValidation} disabled={isProcessing || !Object.values(columnMap).includes('Full Name')} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 px-8 rounded-xl">
                                    {isProcessing ? 'Analyzing Database...' : 'Validate Import'}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && validationReport && (
                        <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-2 font-bold">Ready to Import</div>
                                    <div className="font-display text-4xl text-emerald-400 font-bold">{validationReport.summary.validCount}</div>
                                </div>
                                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-orange-500 mb-2 font-bold">Warnings</div>
                                    <div className="font-display text-4xl text-orange-400 font-bold">{validationReport.summary.warningCount}</div>
                                </div>
                                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                                    <div className="text-[10px] uppercase tracking-widest text-red-500 mb-2 font-bold">Failed / Skipped</div>
                                    <div className="font-display text-4xl text-red-400 font-bold">{validationReport.summary.errorCount}</div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.02] p-6 overflow-hidden">
                                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-foreground/50 border-b border-foreground/10 pb-4">
                                    <Info className="h-4 w-4" /> Import Preview ({Math.min(5, validationReport.validatedRows.length)} rows)
                                </div>

                                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                    {validationReport.validatedRows.slice(0, 50).map((r, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${r._meta.status === 'ERROR' ? 'border-red-500/30 bg-red-500/5' : r._meta.status === 'WARNING' ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/20 bg-emerald-500/5'} text-[13px]`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-base">{r['Full Name'] || 'Missing Name'}</div>
                                                <div className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest" style={{ background: r._meta.status === 'ERROR' ? 'rgba(239,68,68,0.2)' : r._meta.status === 'WARNING' ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)', color: r._meta.status === 'ERROR' ? '#ef4444' : r._meta.status === 'WARNING' ? '#f97316' : '#10b981' }}>{r._meta.status}</div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-foreground/70 mb-3">
                                                <div><span className="text-foreground/40 text-[10px]">PHONE:</span> {r['Phone'] || '-'}</div>
                                                <div><span className="text-foreground/40 text-[10px]">EMAIL:</span> {r['Email'] || '-'}</div>
                                                <div><span className="text-foreground/40 text-[10px]">PLAN:</span> {r._meta.resolvedPlanName}</div>
                                                <div><span className="text-foreground/40 text-[10px]">TRAINER:</span> {r._meta.resolvedTrainerId ? 'Mapped' : r['Trainer'] || '-'}</div>
                                            </div>
                                            {(r._meta.errors.length > 0 || r._meta.warnings.length > 0) && (
                                                <div className="pt-2 border-t border-white/5 space-y-1">
                                                    {r._meta.errors.map(err => <div key={err} className="text-red-400">🚨 {err}</div>)}
                                                    {r._meta.warnings.map(warn => <div key={warn} className="text-orange-400">⚠️ {warn}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-4 border-t border-foreground/10 pt-6">
                                <Button variant="outline" onClick={() => setStep(2)} className="border-foreground/20">Back</Button>
                                <Button onClick={executeImport} disabled={isProcessing || validationReport.summary.validCount === 0} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    {isProcessing ? 'Executing Import...' : 'Confirm & Import Data'}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && importResult && (
                        <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-6">
                            <div className="h-20 w-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/40">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <div>
                                <h2 className="font-display text-3xl font-bold mb-2">Import Complete</h2>
                                <p className="text-foreground/60 text-[15px]">Successfully processed batch ID <b>{importResult.importBatchId}</b></p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto my-8">
                                <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-2xl flex flex-col items-center">
                                    <div className="text-3xl font-display font-bold text-emerald-400">{importResult.successCount}</div>
                                    <div className="text-[11px] uppercase tracking-widest text-foreground/40 font-bold mt-1">Imported</div>
                                </div>
                                <div className="border border-foreground/10 bg-foreground/[0.02] p-4 rounded-2xl flex flex-col items-center">
                                    <div className="text-3xl font-display font-bold text-red-400">{importResult.failedCount}</div>
                                    <div className="text-[11px] uppercase tracking-widest text-foreground/40 font-bold mt-1">Failed/Duplicates</div>
                                </div>
                            </div>

                            <Button onClick={() => window.location.href = '/dashboard/members'} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-12 px-10 rounded-xl">
                                View Imported Members
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashShell>
    )
}
