import BottomNav from "@/components/BottomNav";
import { CellarProvider } from "@/hooks/useCellar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CellarProvider>
      <div className="max-w-[430px] mx-auto min-h-screen relative overflow-hidden">
        {children}
        <BottomNav />
      </div>
    </CellarProvider>
  );
}
