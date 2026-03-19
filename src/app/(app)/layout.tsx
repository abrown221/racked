import BottomNav from "@/components/BottomNav";
import { CellarProvider } from "@/hooks/useCellar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CellarProvider>
      <div className="w-full min-h-screen flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen relative">
          {children}
          <BottomNav />
        </div>
      </div>
    </CellarProvider>
  );
}
