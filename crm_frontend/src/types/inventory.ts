export interface ProductCreate {
    sku: string;
    name: string;
    description?: string;
    price: number;
    reorder_point?: number;
}

export interface ProductResponse {
    id: number;
    tenant_id: number;
    sku: string;
    name: string;
    description: string | null;
    price: number;
    reorder_point: number;
    stock: number;
    created_at: string;
}
