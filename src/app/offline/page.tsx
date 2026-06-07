import { dict } from "@/lib/i18n";

export default function OfflinePage() {
  return (
    <div className="app-shell items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl text-navy">{dict.brand.name}</h1>
      <p className="mt-2 text-navy/60">Je bent offline. Check je verbinding.</p>
    </div>
  );
}
