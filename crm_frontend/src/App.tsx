import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RootLayout } from "./components/layout/RootLayout"
import { ProtectedRoute } from "./components/layout/ProtectedRoute"
import { AuthProvider } from "./contexts/AuthContext"
import { QueryProvider } from "./providers/QueryProvider"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Pipeline from "./pages/Pipeline"
import { Contacts } from "./pages/Contacts"
import { Deals } from "./pages/Deals"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="deals" element={<Deals />} />
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
