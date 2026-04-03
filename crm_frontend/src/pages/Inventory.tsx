import { useState } from "react"
import { useProducts } from "@/hooks/useProducts"
import { useCreateProduct } from "@/hooks/useCreateProduct"
import { ProductCreate } from "@/types/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PackagePlus } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

export function Inventory() {
    const { data: products = [], isLoading } = useProducts()
    const createProduct = useCreateProduct()

    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [sku, setSku] = useState("")
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [price, setPrice] = useState("")
    const [reorderPoint, setReorderPoint] = useState("10")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const data: ProductCreate = {
            sku,
            name,
            description: description.trim() || undefined,
            price: Number(price),
            reorder_point: Number(reorderPoint)
        }

        try {
            await createProduct.mutateAsync(data)
            setIsSheetOpen(false)
            setSku("")
            setName("")
            setDescription("")
            setPrice("")
            setReorderPoint("10")
        } catch (error) {
            // Handled globally by the hook's onError
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Inventory</h1>
                    <p className="text-zinc-500 text-[13px] font-medium tracking-tight">Manage your product catalog and stock levels.</p>
                </div>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-sm h-9 px-4 text-[13px] font-medium tracking-tight">
                            <PackagePlus className="w-4 h-4 mr-2" />
                            New Product
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="p-6 overflow-y-auto sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle className="text-zinc-900 font-semibold tracking-tight">New Product</SheetTitle>
                            <SheetDescription className="text-zinc-500 text-[13px] tracking-tight">
                                Add a new product to your catalog. Initial stock will be 0.
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[13px] font-medium text-zinc-900">Name *</Label>
                                <Input required value={name} onChange={e => setName(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[13px] font-medium text-zinc-900">SKU *</Label>
                                <Input required value={sku} onChange={e => setSku(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[13px] font-medium text-zinc-900">Description</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[13px] font-medium text-zinc-900">Price ($) *</Label>
                                    <Input required type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[13px] font-medium text-zinc-900">Reorder Point</Label>
                                    <Input required type="number" min="0" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                                </div>
                            </div>
                            
                            <Button disabled={createProduct.isPending} type="submit" className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-medium tracking-tight">
                                {createProduct.isPending ? "Creating..." : "Save Product"}
                            </Button>
                        </form>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">PRODUCT</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">SKU</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">PRICE</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">STOCK</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-[13px] text-zinc-500">Loading products...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-[13px] text-zinc-500">No products found.</td></tr>
                        ) : (
                            products.map((product) => {
                                const isLowStock = product.stock <= product.reorder_point
                                return (
                                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-[14px] font-medium text-zinc-900">{product.name}</p>
                                            {product.description && (
                                                <p className="text-[12px] text-zinc-500 mt-0.5 max-w-xs truncate">{product.description}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-zinc-500">{product.sku}</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-zinc-900">{formatCurrency(product.price)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium
                                                    ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-800'}`}>
                                                    {product.stock}
                                                </span>
                                                {isLowStock && <span className="text-[11px] text-red-500 uppercase tracking-wider font-semibold">Low</span>}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
