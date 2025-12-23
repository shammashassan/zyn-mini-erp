// app/billing/items-table.tsx

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Item } from "@/lib/types";
import type { IProduct } from "@/models/Product";
import { Check, ChevronsUpDown, Plus, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemsTableProps {
  items: Item[];
  products: IProduct[];
  updateItem: (index: number, field: keyof Item, value: string | number) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
}

function ItemRow({ item, index, products, updateItem, removeItem }: { item: Item; index: number; products: IProduct[]; updateItem: ItemsTableProps['updateItem']; removeItem: ItemsTableProps['removeItem'] }) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const inputStyles = "bg-background placeholder:text-muted-foreground/70";

  // Sync search query with item description when opening
  React.useEffect(() => {
    if (open) {
      setSearchQuery(item.description || "");
    }
  }, [open, item.description]);

  const handleProductSelect = (product: IProduct) => {
    updateItem(index, "description", product.name);
    updateItem(index, "rate", product.price);
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      updateItem(index, "description", searchQuery.trim());
      // Don't auto-set rate for custom items, let user decide
      setOpen(false);
      setSearchQuery("");
    }
  };

  const handleQuantityChange = (value: string) => {
    updateItem(index, "quantity", value);
  };

  const doesProductExist = products.some(
    (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <TableRow>
      <TableCell className="w-2/5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
              {item.description || "Select or type a product..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Search or type new item..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList
                className="max-h-[200px] overflow-y-auto"
                onWheel={(e) => e.stopPropagation()}
              >
                <CommandEmpty>No product found.</CommandEmpty>
                
                {/* Existing Products */}
                {products.length > 0 && (
                  <CommandGroup heading="Existing Products">
                    {products.map((product) => (
                      <CommandItem
                        key={String(product._id)}
                        value={product.name}
                        onSelect={() => handleProductSelect(product)}
                      >
                        <Check className={cn("mr-2 h-4 w-4", item.description === product.name ? "opacity-100" : "opacity-0")} />
                        {product.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Create New Item */}
                {searchQuery.trim() && !doesProductExist && (
                  <CommandGroup heading="Add Custom Item">
                    <CommandItem
                      onSelect={handleCreateNew}
                      className="text-primary"
                      value={searchQuery} // Value ensures it's selectable via keyboard
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Use "{searchQuery}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(e.target.value)} className={inputStyles} />
      </TableCell>
      <TableCell>
        <Input type="number" value={item.rate} onChange={(e) => updateItem(index, "rate", e.target.value)} className={inputStyles} />
      </TableCell>
      <TableCell>
        <Input value={Number(item.total).toFixed(2)} disabled className="font-medium" />
      </TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}


export function ItemsTable({ items, products, updateItem, addItem, removeItem }: ItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2/5">Description</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <ItemRow
                key={index}
                item={item}
                index={index}
                products={products}
                updateItem={updateItem}
                removeItem={removeItem}
              />
            ))}
          </TableBody>
        </Table>
        <Button onClick={addItem} variant="default" className="mt-4 w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </CardContent>
    </Card>
  );
}