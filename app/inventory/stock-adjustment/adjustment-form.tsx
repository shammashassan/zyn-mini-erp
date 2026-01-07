// app/inventory/adjustments/adjustment-form.tsx - UPDATED: Sync search input with selection

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { IMaterial } from "@/models/Material";

import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type AdjustmentFormData = {
  materialId: string;
  adjustmentType: 'increment' | 'decrement';
  value: number | '';
  newUnitCost?: number;
  adjustmentReason?: string;
};

interface AdjustmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormData) => void;
  materials: IMaterial[];
  isLoadingMaterials: boolean;
}

export function AdjustmentForm({ isOpen, onClose, onSubmit, materials, isLoadingMaterials }: AdjustmentFormProps) {
  const { 
    handleSubmit, 
    control, 
    reset, 
    watch, 
    setValue,
    formState: { isSubmitting } 
  } = useForm<AdjustmentFormData>({
    defaultValues: {
      materialId: "",
      adjustmentType: 'increment',
      value: 1,
      newUnitCost: undefined,
      adjustmentReason: "",
    },
  });

  const [adjustmentMode, setAdjustmentMode] = useState<'stock' | 'price'>('stock');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const watchedMaterialId = watch("materialId");

  useEffect(() => {
    if (isOpen) {
      setAdjustmentMode('stock');
      reset({
        materialId: "",
        adjustmentType: 'increment',
        value: 1,
        newUnitCost: undefined,
        adjustmentReason: ""
      });
      setSearchQuery("");
    }
  }, [isOpen, reset]);

  // Sync Search Query
  useEffect(() => {
    if (isPopoverOpen && watchedMaterialId) {
       const selected = materials.find(m => m._id === watchedMaterialId);
       if (selected) {
         setSearchQuery(selected.name);
       }
    }
  }, [isPopoverOpen, watchedMaterialId, materials]);

  const handleFormSubmit: SubmitHandler<AdjustmentFormData> = (data) => {
    // Manual Validation
    if (!data.materialId) {
      toast.error("Please select a material");
      return;
    }

    if (!data.adjustmentReason || !data.adjustmentReason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    let submissionData = { ...data };

    if (adjustmentMode === 'stock') {
      if (data.value === '' || Number(data.value) <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
    } else if (adjustmentMode === 'price') {
      // Force stock logic to neutral
      submissionData = { ...submissionData, adjustmentType: 'increment', value: 0 };
      
      const unitCostValue = submissionData.newUnitCost;
      if (typeof unitCostValue !== 'number' || !isFinite(unitCostValue) || unitCostValue < 0) {
        toast.error("Please enter a valid unit cost");
        return;
      }
    }

    onSubmit(submissionData);
  };

  const selectedMaterial = materials.find(m => m._id === watchedMaterialId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 1. SINGLE SCROLLER: DialogContent handles the scrolling, form is flat */}
      <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Make an Adjustment
          </DialogTitle>
        </DialogHeader>

        {/* Removed nested overflow/max-height wrappers to fix the "2 windows" scrolling issue */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">

          <div className="space-y-2">
            <Label className="text-sm font-medium">Material</Label>
            <Controller
              name="materialId"
              control={control}
              render={({ field }) => (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between h-auto py-2 px-3 text-left">
                      <span className="truncate flex-1">
                        {field.value
                          ? materials.find(m => m._id === field.value)?.name
                          : "Select a material..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search material..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup>
                          {materials.filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())).map((material) => (
                            <CommandItem
                              key={material._id}
                              value={material.name}
                              onSelect={() => {
                                field.onChange(material._id);
                                setIsPopoverOpen(false);
                                setSearchQuery("");
                              }}
                              className="flex items-start gap-2 py-2"
                            >
                              <Check className={cn("mt-1 h-4 w-4 shrink-0", field.value === material._id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{material.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Stock: {material.stock} {material.unit} • {formatCurrency(material.unitCost ?? 0)}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Adjustment Type</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={adjustmentMode}
              onValueChange={(value: 'stock' | 'price') => { if (value) setAdjustmentMode(value) }}
              className="w-full justify-start p-1"
            >
              <ToggleGroupItem value="stock" className="flex-1 h-8 text-sm">Adjust Stock</ToggleGroupItem>
              <ToggleGroupItem value="price" className="flex-1 h-8 text-sm">Adjust Unit Cost</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {adjustmentMode === 'stock' && (
            /* 2. RESPONSIVE LAYOUT: Stacks on mobile/narrow windows, side-by-side on desktop */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-accent/5 animate-in fade-in-0 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Stock Change</Label>
                <Controller
                  name="adjustmentType"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup type="single" value={field.value} onValueChange={(v: 'increment' | 'decrement') => v && field.onChange(v)} className="w-full">
                      <ToggleGroupItem value="increment" className="flex-1 border text-xs h-9">Increment (+)</ToggleGroupItem>
                      <ToggleGroupItem value="decrement" className="flex-1 border text-xs h-9">Decrement (-)</ToggleGroupItem>
                    </ToggleGroup>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-xs font-semibold text-muted-foreground">By Quantity</Label>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="value"
                      type="number"
                      placeholder="e.g., 5"
                      className="h-9"
                      value={field.value ?? ""}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseInt(val, 10));
                      }}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {adjustmentMode === 'price' && (
            <div className="p-4 border rounded-lg bg-accent/5 animate-in fade-in-0 duration-300">
              <div className="space-y-2">
                <Label htmlFor="newUnitCost" className="text-sm font-medium">New Unit Cost</Label>
                <Controller
                  name="newUnitCost"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="newUnitCost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-10"
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        // Trigger dirty state by setting value
                        field.onChange(isNaN(val) ? '' : val);
                      }}
                      value={field.value ?? ""}
                    />
                  )}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjustmentReason" className="text-sm font-medium">Reason for Adjustment</Label>
            <Controller
              name="adjustmentReason"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="adjustmentReason"
                  placeholder="e.g., Damaged during transit, weekly audit..."
                  className="min-h-[100px] resize-none"
                  value={field.value ?? ""}
                />
              )}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Processing...
                </>
              ) : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}