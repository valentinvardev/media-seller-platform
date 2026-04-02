export default function PendingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-6xl">⏳</span>
      <h1 className="text-2xl font-bold">Pago pendiente de confirmación</h1>
      <p className="text-gray-400 max-w-sm">
        Tu pago está siendo procesado. Una vez acreditado, recibirás el link de
        descarga en tu email. Esto puede demorar unos minutos.
      </p>
    </div>
  );
}
