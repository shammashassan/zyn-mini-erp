// app/inventory/products/product-form.tsx - UPDATED: Sync search input with selection

"use client";

import * as React from "react";
import { useForm, SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { ChevronsUpDown, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IProduct, IBOMItem } from "@/models/Product";
import type { IMaterial } from "@/models/Material";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProductFormData = {
  name: string;
  type: string;
  price: number;
  bom: Array<{
    materialId: string;
    quantity: number;
    unit: string;
  }>;
};

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData, id?: string) => void;
  defaultValues?: IProduct | null;
  existingTypes?: string[];
}

export function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  existingTypes = []
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      type: "",
      price: 0,
      bom: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bom",
  });

  const [materials, setMaterials] = React.useState<IMaterial[]>([]);
  const [isTypePopoverOpen, setIsTypePopoverOpen] = React.useState(false);
  const [customType, setCustomType] = React.useState("");
  const watchedType = watch("type");

  React.useEffect(() => {
    // Fetch materials from API
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        if (response.ok) {
          const data = await response.json();
          setMaterials(data);
        }
      } catch (error) {
        console.error('Failed to fetch materials:', error);
      }
    };

    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: defaultValues?.name || "",
        type: defaultValues?.type || "",
        price: defaultValues?.price || 0,
        bom: defaultValues?.bom?.map(item => ({
          materialId: item.materialId.toString(),
          quantity: item.quantity,
          unit: item.unit,
        })) || [],
      });
      setCustomType("");
    }
  }, [isOpen, defaultValues, reset]);

  // Sync Type Input
  React.useEffect(() => {
    if (isTypePopoverOpen) {
      setCustomType(watchedType || "");
    }
  }, [isTypePopoverOpen, watchedType]);

  const handleFormSubmit: SubmitHandler<ProductFormData> = (data) => {
    // Manual Validation
    if (!data.name || !data.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!data.type) {
      toast.error("Product type/category is required");
      return;
    }

    if (data.price === undefined || data.price === null || isNaN(data.price) || data.price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    onSubmit(data, submissionId);
  };

  const handleAddCustomType = (field: any) => {
    if (customType.trim()) {
      field.onChange(customType.trim());
      setCustomType("");
      setIsTypePopoverOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-1xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the product below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
              <Input id="name" {...register("name")} placeholder="e.g., Chocolate Cake" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type / Category <span className="text-destructive">*</span></Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value || "Select or create type..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search or type new type..."
                            value={customType}
                            onValueChange={setCustomType}
                          />
                          <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                          >
                            {existingTypes.length > 0 && (
                              <CommandGroup heading="Existing Types">
                                {existingTypes.filter(t => !customType || t.toLowerCase().includes(customType.toLowerCase())).map((type) => (
                                  <CommandItem
                                    key={type}
                                    value={type}
                                    onSelect={() => {
                                      field.onChange(type);
                                      setIsTypePopoverOpen(false);
                                      setCustomType("");
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", field.value === type ? "opacity-100" : "opacity-0")} />
                                    {type}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}

                            {customType.trim() && !existingTypes.some(t => t.toLowerCase() === customType.trim().toLowerCase()) && (
                              <CommandGroup heading="Create New">
                                <CommandItem
                                  onSelect={() => handleAddCustomType(field)}
                                  className="text-primary"
                                  value={customType}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create "{customType.trim()}"
                                </CommandItem>
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register("price", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* BOM (Bill of Materials) Editor */}
          <div className="space-y-4 border-t pt-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Bill of Materials (BOM)</Label>
                <p className="text-sm text-muted-foreground mt-1">Define which materials are consumed to produce this product</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ materialId: "", quantity: 1, unit: "" })}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Material
              </Button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const selectedMaterial = materials.find(m => m._id === watch(`bom.${index}.materialId`));

                  return (
                    <div key={field.id} className="p-3 border rounded-lg bg-muted/30">
                      {/* Desktop Layout - Horizontal */}
                      <div className="hidden md:flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm">Material *</Label>
                          <Controller
                            control={control}
                            name={`bom.${index}.materialId`}
                            render={({ field: materialField }) => (
                              <Select
                                value={materialField.value}
                                onValueChange={(value) => {
                                  materialField.onChange(value);
                                  const material = materials.find(m => m._id === value);
                                  if (material) {
                                    setValue(`bom.${index}.unit`, material.unit);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select material..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {materials.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground">No materials available</div>
                                  ) : (
                                    materials.map((material) => (
                                      <SelectItem key={material._id} value={material._id}>
                                        {material.name} ({material.unit})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        <div className="w-28 space-y-2">
                          <Label className="text-sm">Quantity *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="1.0"
                            {...register(`bom.${index}.quantity`, { valueAsNumber: true })}
                          />
                        </div>

                        <div className="w-24 space-y-2">
                          <Label className="text-sm">Unit</Label>
                          <Input
                            value={selectedMaterial?.unit || "-"}
                            readOnly
                            disabled
                            className="bg-muted text-muted-foreground"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Mobile Layout - Card (matching invoice-form.tsx pattern) */}
                      <Card className="md:hidden border-2">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">Material #{index + 1}</CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Material *</Label>
                            <Controller
                              control={control}
                              name={`bom.${index}.materialId`}
                              render={({ field: materialField }) => (
                                <Select
                                  value={materialField.value}
                                  onValueChange={(value) => {
                                    materialField.onChange(value);
                                    const material = materials.find(m => m._id === value);
                                    if (material) {
                                      setValue(`bom.${index}.unit`, material.unit);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="Select material..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {materials.length === 0 ? (
                                      <div className="p-2 text-sm text-muted-foreground">No materials available</div>
                                    ) : (
                                      materials.map((material) => (
                                        <SelectItem key={material._id} value={material._id}>
                                          {material.name} ({material.unit})
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Quantity *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="1.0"
                                className="h-9"
                                {...register(`bom.${index}.quantity`, { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Unit</Label>
                              <Input
                                value={selectedMaterial?.unit || "-"}
                                readOnly
                                disabled
                                className="h-9 bg-muted text-muted-foreground"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}

            {fields.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  No materials added. Click "Add Material" to define the BOM.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || (!!defaultValues && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : defaultValues ? "Update Product" : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}