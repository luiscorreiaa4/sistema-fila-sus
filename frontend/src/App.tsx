import { BrowserRouter, Route, Routes } from 'react-router-dom';

function PaginaInicial() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-xl w-full rounded-xl bg-white p-8 shadow-sm border border-slate-200">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          SUS — Transparência de Filas Públicas
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Ambiente Frontend Inicializado
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Estrutura base com React, TypeScript, Vite, Tailwind CSS e React Router pronta para os próximos blocos do MVP.
        </p>
      </section>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaInicial />} />
      </Routes>
    </BrowserRouter>
  );
}
