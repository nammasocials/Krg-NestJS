import { Brand } from "@/components/layout/brand";
import { MainNav } from "@/components/layout/nav/main-nav";
import { MobileNav } from "@/components/layout/nav/mobile-nav";
import { UserArea } from "@/components/layout/user-area";

/** Sticky app header: brand, main menu, user area. `relative` anchors the mobile menu panel. */
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b bg-white shadow-sm">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Brand
          imageClassName="size-9 md:size-12"
          nameClassName="text-lg md:text-xl md:max-lg:hidden"
        />
        <MainNav />
        <div className="flex items-center gap-2">
          <UserArea />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
