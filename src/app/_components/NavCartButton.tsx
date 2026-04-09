"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export function NavCartButton({ price }: { price: number }) {
  const { items, clear, toggle } = useCart();
  const [open, setOpen] = useState(false);

  const count = items.length;
  const total = count * price;
  const hasItems = count > 0;

  return (
    <div className="relative ml-auto shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all hover:opacity-90"
        style={{
          background: hasItems ? "linear-gradient(135deg, #1a3a6b, #2563eb)" : "#f1f5f9",
          color: hasItems ? "#fff" : "#64748b",
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {hasItems ? (
          <>
            <span className="font-extrabold">{count}</span>
            {price > 0 && (
              <span className="hidden sm:inline font-normal opacity-80">
                · ${total.toLocaleString("es-AR")}
              </span>
            )}
          </>
        ) : (
          <span className="hidden sm:inline">Carrito</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            style={{ minWidth: 300, maxWidth: 340, background: "white" }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                Tu carrito {hasItems && <span className="text-gray-400 font-normal normal-case">({count} foto{count !== 1 ? "s" : ""})</span>}
              </p>
              {hasItems && (
                <button onClick={() => { clear(); }} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Vaciar
                </button>
              )}
            </div>

            {/* Empty state */}
            {!hasItems ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-400">Tu carrito está vacío</p>
                <p className="text-xs text-gray-300">Presioná el ícono del carrito en cada foto para agregarla</p>
              </div>
            ) : (
              <>
                {/* Photo list */}
                <ul className="py-2 max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {items.map((item) => (
                    <li key={item.photoId} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {item.bibNumber ? (
                          <p className="text-xs font-bold text-gray-800">Dorsal #{item.bibNumber}</p>
                        ) : (
                          <p className="text-xs font-medium text-gray-400">Sin dorsal</p>
                        )}
                        {price > 0 && (
                          <p className="text-sm font-extrabold mt-0.5" style={{ color: "#0057A8" }}>
                            ${price.toLocaleString("es-AR")}
                          </p>
                        )}
                      </div>
                      {/* Remove */}
                      <button
                        onClick={() => toggle(item)}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  {price > 0 && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">Total ({count} foto{count !== 1 ? "s" : ""})</span>
                      <span className="font-extrabold text-base" style={{ color: "#0057A8" }}>
                        ${total.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  <button
                    className="w-full py-2.5 rounded-xl font-display font-700 uppercase tracking-wide text-white text-xs transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
                  >
                    Comprar
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
