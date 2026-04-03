import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function RootLayout() {
    return (
        <div className="font-sans text-slate-900 bg-[#f9f9f9] min-h-screen">
            <Sidebar />
            <div className="ml-64 min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 w-full bg-[#f9f9f9]">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
