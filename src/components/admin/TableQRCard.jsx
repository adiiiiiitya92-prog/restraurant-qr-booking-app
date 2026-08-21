import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, ExternalLink, Copy, Check, Trash2, Power } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function TableQRCard({ table, onToggleActive, onDelete }) {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const qrRef = useRef(null);

  const orderUrl = `${window.location.origin}/order/${table.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    showToast(`Copied menu link for Table #${table.tableNumber}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    try {
      const canvas = qrRef.current?.querySelector('canvas');
      if (!canvas) return;

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `Table-${table.tableNumber}-QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      showToast(`Downloaded QR Code for Table #${table.tableNumber}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not download QR code', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between group hover:border-brand-500/30 transition-all">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center font-display shadow-xs">
              #{table.tableNumber}
            </span>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {table.name || `Table ${table.tableNumber}`}
              </h4>
              <span className="text-[11px] text-slate-400">
                Capacity: {table.capacity || 4} guests
              </span>
            </div>
          </div>

          <button
            onClick={() => onToggleActive(table)}
            title={table.isActive ? 'Active (Click to deactivate)' : 'Inactive (Click to activate)'}
            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-colors ${
              table.isActive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{table.isActive ? 'Active' : 'Inactive'}</span>
          </button>
        </div>

        {/* QR Code Canvas */}
        <div
          ref={qrRef}
          className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-700/60 mb-4"
        >
          <div className="p-2 bg-white rounded-lg shadow-xs">
            <QRCodeCanvas
              value={orderUrl}
              size={140}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2 truncate max-w-[180px]">
            /order/{table.id}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <a
            href={`/order/${table.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>Open Menu Preview</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={() => onDelete(table.id)}
            title="Delete Table"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
