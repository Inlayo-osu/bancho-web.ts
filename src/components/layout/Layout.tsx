import { Outlet } from "react-router-dom";

{/* import { Footer } from "@/components/layout/Footer"; */}
import { Navbar } from "@/components/layout/Navbar";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
