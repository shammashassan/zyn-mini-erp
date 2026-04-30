"use client"

import {
    Edit2Icon,
    FileDownIcon,
    ListFilterIcon,
    MoreHorizontalIcon,
    NotepadTextIcon,
    WarehouseIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/formatters/currency";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    sales: number;
    revenue: number;
    status: "in-stock" | "low-stock" | "out-of-stock";
}

export const ProductSalesTable = ({ products = [] }: { products: Product[] }) => {
    const router = useRouter();

    return (
        <Card className="w-full h-full max-h-[420px] flex flex-col pb-5 max-md:py-4">
            <CardHeader className="max-md:px-4">
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Your highest performing products by revenue.</CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon-sm" variant="outline" aria-label="Menu" className="h-8 w-8">
                                    <MoreHorizontalIcon className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => router.push('/reports/inventory-report')}>
                                        <NotepadTextIcon className="size-4 mr-2" />
                                        View Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push('/inventory/stock-adjustment')}>
                                        <WarehouseIcon className="size-4 mr-2" />
                                        Manage Inventory
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="max-md:px-4 flex-1 min-h-0 overflow-auto px-4 -mx-1">
                {products.length === 0 ? (
                    <div className="flex justify-center items-center h-48 text-muted-foreground text-sm">
                        No sales data available.
                    </div>
                ) : (
                    <div className="w-full">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">Name</TableHead>
                                <TableHead className="text-center">Category</TableHead>
                                <TableHead className="text-center">Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex w-[100px] sm:w-auto flex-col items-center text-center mx-auto">
                                            <p className="truncate font-medium">{product.name}</p>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Badge variant="primary" appearance="outline" className="whitespace-nowrap font-normal text-[11px] px-2 py-0.5">
                                            {product.category}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex flex-col items-center text-center mx-auto">
                                            <p className="font-medium text-sm">{formatCurrency(product.revenue)}</p>
                                            <p className="text-muted-foreground text-[10px]">
                                                {product.sales.toLocaleString()} sold
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
