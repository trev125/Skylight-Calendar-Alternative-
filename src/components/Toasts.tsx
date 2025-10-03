import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type Toast = {
  id: string;
  message: string;
  type?: "info" | "error" | "success";
};

const ToastsContext = createContext<{
  show: (msg: string, type?: Toast["type"]) => void;
  remove: (id: string) => void;
} | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (message: string, type: any = "info") => {
      const id = Math.random().toString(36).slice(2, 9);
      const t: Toast = { id, message, type };
      setToasts((s) => [...s, t]);
      timers.current[id] = window.setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  return (
    <ToastsContext.Provider value={{ show, remove }}>
      {children}
      <div className="fixed right-4 top-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t.id)}
            className={`max-w-xs w-full text-left px-3 py-2 rounded shadow text-sm transform transition duration-150 ease-out focus:outline-none ${
              t.type === "error"
                ? "bg-red-600 text-white"
                : t.type === "success"
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-white"
            }`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastsContext.Provider>
  );
}

export function useToasts() {
  const c = useContext(ToastsContext);
  if (!c) throw new Error("useToasts must be used within ToastsProvider");
  return c;
}

export default ToastsProvider;
