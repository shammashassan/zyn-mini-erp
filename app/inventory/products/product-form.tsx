// app/documents/products/product-form.tsx - UPDATED: Sync search input with selection

"use client";

import * as React from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
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
import type { IProduct } from "@/models/Product";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type ProductFormData = {
  name: string;
  type: string;
  price: number;
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
    formState: { isSubmitting, isDirty }
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      type: "",
      price: 0,
    }
  });

  const [isTypePopoverOpen, setIsTypePopoverOpen] = React.useState(false);
  const [customType, setCustomType] = React.useState("");
  const watchedType = watch("type");

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: defaultValues?.name || "",
        type: defaultValues?.type || "",
        price: defaultValues?.price || 0,
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              {...register("name")}
            />
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
                {...register("price", { valueAsNumber: true })}
              />
            </div>
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