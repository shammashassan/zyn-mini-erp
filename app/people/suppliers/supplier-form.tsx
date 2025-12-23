// app/documents/suppliers/supplier-form.tsx - FIXED: Standardized validation and dirty state check

"use client";

import React, { useEffect } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
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
  DialogClose 
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import type { ISupplier } from "@/models/Supplier";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type SupplierFormData = {
  name: string;
  email: string;
  vatNumber: string;
  district: string;
  city: string;
  street: string;
  buildingNo: string;
  postalCode: string;
  contactNumbers: { value: string }[];
};

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    vatNumber: string;
    district: string;
    city: string;
    street: string;
    buildingNo: string;
    postalCode: string;
    contactNumbers: string[];
  }, id?: string) => void;
  defaultValues?: ISupplier | null;
}

export function SupplierForm({ isOpen, onClose, onSubmit, defaultValues }: SupplierFormProps) {
  const { 
    register, 
    handleSubmit, 
    control, 
    reset, 
    formState: { isSubmitting, isDirty } 
  } = useForm<SupplierFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contactNumbers",
  });

  useEffect(() => {
    if (isOpen) {
      const contactNumbers = defaultValues?.contactNumbers?.map(num => ({ value: num })) || [{ value: "" }];
      reset({
        name: defaultValues?.name || "",
        email: defaultValues?.email || "",
        vatNumber: defaultValues?.vatNumber || "",
        district: defaultValues?.district || "",
        city: defaultValues?.city || "",
        street: defaultValues?.street || "",
        buildingNo: defaultValues?.buildingNo || "",
        postalCode: defaultValues?.postalCode || "",
        contactNumbers,
      });
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit: SubmitHandler<SupplierFormData> = (data) => {
    // Manual Validation
    if (!data.name || !data.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    const submitData = {
      ...data,
      contactNumbers: data.contactNumbers.map(contact => contact.value).filter(Boolean),
    };
    onSubmit(submitData, submissionId);
  };

  const addContactNumber = () => {
    if (fields.length < 3) {
      append({ value: "" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the supplier below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Supplier Name *</Label>
            <Input
              id="name"
              {...register("name")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                {...register("vatNumber")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                {...register("district")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register("city")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                {...register("street")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingNo">Building No</Label>
              <Input
                id="buildingNo"
                {...register("buildingNo")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                {...register("postalCode")}
              />
            </div>
            
            {/* Empty div to keep the grid alignment if needed, or allow contacts to span full width below */}
            <div className="hidden md:block"></div> 
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contact Numbers</Label>
              {fields.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContactNumber}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder={`Contact number ${index + 1}`}
                    {...register(`contactNumbers.${index}.value`)}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
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
              ) : defaultValues ? "Update Supplier" : "Save Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}