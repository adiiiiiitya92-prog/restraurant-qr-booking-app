import React from 'react';
import { formatDateTime } from '../../utils/formatters';

export function KOTPrintSlip({ order }) {
  if (!order) return null;

  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'Gourmet Bistro';

  return (
    <div id="kot-print-area" className="hidden print:block text-black bg-white">
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        <h2 className="text-lg font-bold uppercase tracking-wider">{restaurantName}</h2>
        <h3 className="text-base font-extrabold mt-1">KITCHEN ORDER TICKET (KOT)</h3>
      </div>

      <div className="py-2 text-xs border-b border-dashed border-black space-y-1">
        <div className="flex justify-between font-bold text-sm">
          <span>TABLE: #{order.tableNumber || '?'}</span>
          <span>{order.orderNumber || order.id}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>Date: {formatDateTime(order.createdAt)}</span>
          <span className="uppercase font-bold">Status: {order.status}</span>
        </div>
      </div>

      <div className="py-2 border-b-2 border-dashed border-black">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="pb-1 w-8">QTY</th>
              <th className="pb-1">ITEM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {order.items?.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-1.5 font-extrabold text-sm">{item.qty}x</td>
                <td className="py-1.5">
                  <div className="font-bold">{item.name}</div>
                  {item.notes && (
                    <div className="text-[11px] font-semibold italic text-gray-800">
                      ** Note: {item.notes} **
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.customerNotes && (
        <div className="py-2 border-b border-dashed border-black text-xs">
          <span className="font-bold">Order Note:</span> {order.customerNotes}
        </div>
      )}

      <div className="pt-2 text-center text-[10px] uppercase font-mono">
        --- End of Ticket ---
      </div>
    </div>
  );
}
