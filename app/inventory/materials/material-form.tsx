// app/inventory/materials/material-form.tsx - FIXED: Event propagation

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
import type { IMaterial } from "@/models/Material";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// Predefined standard units
const PREDEFINED_UNITS = [
  "piece",
  "kilogram",
  "gram",
  "milligram",
  "liter",
  "milliliter",
  "meter",
  "centimeter",
  "millimeter",
  "squaremeter",
  "foott",
  "inch",
  "box",
  "pack",
  "roll",
  "set",
  "can",
  "dozen",
];

type MaterialFormData = {
  name: string;
  type: string;
  unit: string;
  stock: number;
  unitCost: number;
};

interface MaterialFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialFormData, id?: string) => void;
  defaultValues?: IMaterial | null;
  existingTypes?: string[];
  existingUnits?: string[];
}

export function MaterialForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  existingTypes = [],
  existingUnits = []
}: MaterialFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { isSubmitting, isDirty }
  } = useForm<MaterialFormData>({
    defaultValues: {
      name: "",
      type: "",
      unit: "piece",
      stock: 0,
      unitCost: 0,
    }
  });

  // State for Type/Category Popover
  const [isTypePopoverOpen, setIsTypePopoverOpen] = React.useState(false);
  const [customType, setCustomType] = React.useState("");
  const watchedType = watch("type");

  // State for Unit Popover
  const [isUnitPopoverOpen, setIsUnitPopoverOpen] = React.useState(false);
  const [customUnit, setCustomUnit] = React.useState("");
  const watchedUnit = watch("unit");

  // Combine predefined units with existing units from DB and remove duplicates
  const allUnits = React.useMemo(() => {
    return Array.from(new Set([...PREDEFINED_UNITS, ...existingUnits])).sort();
  }, [existingUnits]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: defaultValues?.name || "",
        type: defaultValues?.type || "",
        unit: defaultValues?.unit || "piece",
        stock: defaultValues?.stock || 0,
        unitCost: defaultValues?.unitCost || 0,
      });
      setCustomType("");
      setCustomUnit("");
    }
  }, [isOpen, defaultValues, reset]);

  // Sync Type Input
  React.useEffect(() => {
    if (isTypePopoverOpen) {
      setCustomType(watchedType || "");
    }
  }, [isTypePopoverOpen, watchedType]);

  // Sync Unit Input
  React.useEffect(() => {
    if (isUnitPopoverOpen) {
      setCustomUnit(watchedUnit || "");
    }
  }, [isUnitPopoverOpen, watchedUnit]);

  const handleFormSubmit: SubmitHandler<MaterialFormData> = (data) => {
    // Manual Validation
    if (!data.name || !data.name.trim()) {
      toast.error("Material name is required");
      return;
    }

    if (!data.type) {
      toast.error("Material type is required");
      return;
    }

    if (!data.unit) {
      toast.error("Unit of measurement is required");
      return;
    }

    if (isNaN(data.stock) || data.stock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    if (isNaN(data.unitCost) || data.unitCost < 0) {
      toast.error("Unit cost cannot be negative");
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

  const handleAddCustomUnit = (field: any) => {
    if (customUnit.trim()) {
      field.onChange(customUnit.trim());
      setCustomUnit("");
      setIsUnitPopoverOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-1xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Material" : "Add New Material"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the material below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Material Name *</Label>
            <Input
              id="name"
              {...register("name")}
            />
          </div>

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

          {/* Changed to responsive grid: stack on mobile, 3 cols on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                {...register("stock", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                {...register("unitCost", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => {
                  const isUnitLocked = defaultValues?.baseUnitLocked;

                  if (isUnitLocked) {
                    // Show read-only field when unit is locked
                    return (
                      <div className="relative">
                        <Input
                          value={field.value || ""}
                          readOnly
                          disabled
                          className="opacity-70 cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Unit locked after stock movement
                        </p>
                      </div>
                    );
                  }

                  return (
                    <Popover open={isUnitPopoverOpen} onOpenChange={setIsUnitPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value || "Select unit..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search or add unit..."
                            value={customUnit}
                            onValueChange={setCustomUnit}
                          />
                          <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                          >
                            <CommandGroup heading="Select Unit">
                              {allUnits.filter(u => !customUnit || u.toLowerCase().includes(customUnit.toLowerCase())).map((u) => (
                                <CommandItem
                                  key={u}
                                  value={u}
                                  onSelect={() => {
                                    field.onChange(u);
                                    setIsUnitPopoverOpen(false);
                                    setCustomUnit("");
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === u ? "opacity-100" : "opacity-0")} />
                                  {u}
                                </CommandItem>
                              ))}
                            </CommandGroup>

                            {customUnit.trim() && !allUnits.some(u => u.toLowerCase() === customUnit.trim().toLowerCase()) && (
                              <CommandGroup heading="Create New">
                                <CommandItem
                                  onSelect={() => handleAddCustomUnit(field)}
                                  className="text-primary"
                                  value={customUnit}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create "{customUnit.trim()}"
                                </CommandItem>
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
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
              ) : defaultValues ? "Update Material" : "Save Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}