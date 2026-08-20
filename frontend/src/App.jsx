import { CallProvider } from './contexts/CallContext';
import { CallsPage } from './features/calls/pages/CallsPage';

/**
 * Root Application Container wrapping CallsPage feature module within global CallProvider context.
 */
function App() {
  return (
    <CallProvider>
      <div className="w-screen min-h-screen bg-[#0B0F17] text-slate-100 font-sans p-4 sm:p-6 overflow-y-auto selection:bg-blue-600 selection:text-white flex flex-col items-center justify-center relative">
        <CallsPage />

        {/* Global Bottom Right Attribution Watermark */}
        <footer className="fixed bottom-4 right-6 z-50 pointer-events-none select-none">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase bg-[#0B0F17]/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-800/60 shadow-sm">
            Desarrollado por <span className="text-slate-300 font-extrabold">Juan Calero</span>
          </span>
        </footer>
      </div>
    </CallProvider>
  );
}

export default App;

