"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export function NavCartButton({ price }: { price: number }) {
  const { cart, clear } = useCart();
  const [open, setOpen] = useState(false);

  const total = cart.size * price;
  const bibs = Array.from(cart);
  const hasItems = cart.size > 0;

  return (
    <div className="relative ml-auto shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all hover:opacity-90"
        style={{
          background: hasItems
            ? "linear-gradient(135deg, #1a3a6b, #2563eb)"
            : "#f1f5f9",
          color: hasItems ? "#fff" : "#64748b",
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {hasItems ? (
          <>
            <span className="font-extrabold">{cart.size}</span>
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

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            style={{ minWidth: 260, background: "white" }}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Tu carrito</p>
              {hasItems && (
                <button
                  onClick={() => { clear(); setOpen(false); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Vaciar
                </button>
              )}
            </div>

            {!hasItems ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs text-gray-400">Tu carrito está vacío</p>
                <p className="text-xs text-gray-300">Agregá dorsales desde la galería</p>
              </div>
            ) : (
              <>
                <ul className="py-2 max-h-60 overflow-y-auto">
                  {bibs.map((bib) => (
                    <li key={bib} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
                          style={{ background: "#0057A8" }}>
                          #{bib}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">Dorsal {bib}</span>
                      </div>
                      {price > 0 && (
                        <span className="text-sm font-bold" style={{ color: "#0057A8" }}>
                          ${price.toLocaleString("es-AR")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  {price > 0 && (
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">Total</span>
                      <span className="font-extrabold text-sm" style={{ color: "#0057A8" }}>
                        ${total.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setOpen(false)}
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
