import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import { useStore } from "../../store/useStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { toastMessage, setToastMessage, schemaMessage } = useStore();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  return (
    <div className="flex min-h-screen bg-[#f6f4ef]">
      <Sidebar />
      <main className="relative min-h-screen flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:ml-64 lg:h-screen lg:p-8">
        {schemaMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
          >
            {schemaMessage}
          </div>
        )}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white border-l-4 border-primary shadow-lg rounded-r-lg p-4 pr-10 max-w-sm flex items-start gap-3">
              <span className="text-slate-800 font-medium text-sm leading-relaxed">
                {toastMessage}
              </span>
              <button
                onClick={() => setToastMessage(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
