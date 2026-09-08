import { useEffect } from "react";
import { useWorkspaceStore } from "@/state/workspaceStore";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Raiz de la app. Dispara la hidratacion del espacio de trabajo desde
 * IndexedDB una sola vez y delega todo el layout en el shell.
 */
export function App() {
  const init = useWorkspaceStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return <AppShell />;
}
