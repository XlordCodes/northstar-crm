import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "./components/layout/RootLayout"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"
import { AuthProvider } from "./contexts/AuthContext"
import { QueryProvider } from "./providers/QueryProvider"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Pipeline from "./pages/Pipeline"
import { Contacts } from "./pages/Contacts"
import { Finance } from "./pages/Finance"
import { Inventory } from "./pages/Inventory"
import { InboxPage } from "./pages/InboxPage"
import { Campaigns } from "./pages/Campaigns"
import Settings from "./pages/Settings"

import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="finance" element={<Finance />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryProvider>
  )
}

export default App
