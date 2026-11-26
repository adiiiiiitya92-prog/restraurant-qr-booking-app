import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, ExternalLink, Copy, Check, Trash2, Power, RefreshCw, AlertTriangle } from 'lucide-react';
import { getTableOrderUrl, isGuessableTableId } from '../../utils/tableLinks';
import { BRAND } from '../../config/brand';
import { useToast } from '../../context/ToastContext';

export function TableQRCard({ table, onToggleActive, onDelete, onRegenerate }) {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const qrRef = useRef(null);

  const orderUrl = getTableOrderUrl(table.id);
  const guessable = isGuessableTableId(table.id);
  const label = `Table ${String(table.tableNumber).padStart(2, '0')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    showToast(`Copied menu link for Table #${table.tableNumber}`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  // Saves the QR WITH the table number printed under it, so printed stickers
  // can't get mixed up between tables.
  const handleDownloadQR = () => {
    try {
      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (!qrCanvas) return;

      const pad = 40;
      const size = 600;
      const out = document.createElement('canvas');
      out.width = size + pad * 2;
      out.height = size + pad * 2 + 170;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrCanvas, pad, pad, size, size);

      ctx.fillStyle = '#141414';
      ctx.textAlign = 'center';
      ctx.font = 'bold 72px Georgia, serif';
      ctx.fillText(label.toUpperCase(), out.width / 2, size + pad + 90);
      ctx.fillStyle = '#93571d';
      ctx.font = '28px Arial, sans-serif';
      ctx.fillText(`${BRAND.name} · Scan to order`, out.width / 2, size + pad + 140);

      const downloadLink = document.createElement('a');
      downloadLink.href = out.toDataURL('image/png');
      downloadLink.download = `Junio8-${label.replace(' ', '-')}-QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      showToast(`Downloaded QR for ${label}`, 'success');
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
              size={600}
              level="H"
              includeMargin={true}
              style={{ width: 140, height: 140 }}
            />
          </div>
          <p className="text-sm font-display mt-2">{label}</p>
          <p className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]" title={orderUrl}>
            {orderUrl}
          </p>
        </div>

        {guessable && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              This is an old sample QR anyone could guess. Click <b>New QR</b> before printing.
            </span>
          </div>
        )}
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
            href={orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>Open Menu Preview</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {onRegenerate && (
            <button
              onClick={() => onRegenerate(table)}
              title="Give this table a new QR link (old printed QR stops working)"
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold transition-colors ${
                guessable ? 'bg-amber-600 text-white hover:bg-amber-700' : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>New QR</span>
            </button>
          )}

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
