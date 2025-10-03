export default function DebugInfo() {
  const clientId =
    (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "(not set)";
  const check = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const has = !!(window as any).google?.accounts?.oauth2;
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const mod = require("./Toasts");
      const toasts = mod.useToasts ? mod.useToasts() : null;
      if (toasts)
        toasts.show(
          `clientId=${clientId} origin=${window.location.origin} GIS loaded=${has}`
        );
      else
        alert(
          `clientId=${clientId}\norigin=${window.location.origin}\nGIS loaded=${has}`
        );
    } catch {
      alert(
        `clientId=${clientId}\norigin=${window.location.origin}\nGIS loaded=${has}`
      );
    }
    // also print to console for deeper inspection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    console.log("window.google:", (window as any).google);
  };

  return (
    <div className="text-xs text-gray-500">
      <div>dev debug:</div>
      <div>
        clientId: <span className="font-mono">{clientId}</span>
      </div>
      <div>
        origin: <span className="font-mono">{window.location.origin}</span>
      </div>
      <button
        onClick={check}
        className="mt-1 px-2 py-1 bg-gray-200 rounded text-xs"
      >
        Check GIS
      </button>
    </div>
  );
}
