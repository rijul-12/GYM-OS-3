"use client"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GlobalExport({ data, filename = "export.csv" }) {
    const handleExport = () => {
        if (!data || !data.length) return;

        // Convert array of objects to CSV string
        const keys = Object.keys(data[0]);
        const csvRows = [];

        // Add Header
        csvRows.push(keys.join(','));

        // Add Rows
        for (const row of data) {
            const values = keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = String(cell).replace(/"/g, '""');
                return `"${cell}"`;
            });
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        a.click();
    }

    return (
        <Button onClick={handleExport} variant="outline" className="hidden sm:flex h-9 text-xs" disabled={!data || !data.length}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
        </Button>
    )
}
