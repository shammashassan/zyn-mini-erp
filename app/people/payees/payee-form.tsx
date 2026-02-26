// app/people/payees/payee-form.tsx - FIXED: Standardized validation and dirty state check

"use client";

import * as React from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Home, UserCheck, Utensils, Briefcase, Boxes } from "lucide-react";
import type { IPayee } from "@/models/Payee";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type PayeeFormData = {
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
};

interface PayeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayeeFormData, id?: string) => void;
  defaultValues?: IPayee | null;
}

const PAYEE_TYPES = [
  { value: 'employee', label: 'Employee', icon: User },
  { value: 'landlord', label: 'Landlord', icon: Home },
  { value: 'consultant', label: 'Consultant', icon: UserCheck },
  { value: 'restaurant', label: 'Restaurant', icon: Utensils },
  { value: 'vendor', label: 'Vendor', icon: Briefcase },
  { value: 'contractor', label: 'Contractor', icon: UserCheck },
  { value: 'utility_company', label: 'Utility Company', icon: Boxes },
  { value: 'service_provider', label: 'Service Provider', icon: Briefcase },
  { value: 'government', label: 'Government', icon: Briefcase },
  { value: 'individual', label: 'Individual', icon: User },
  { value: 'miscellaneous', label: 'Miscellaneous', icon: Boxes },
];

export function PayeeForm({ isOpen, onClose, onSubmit, defaultValues }: PayeeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, isDirty }
  } = useForm<PayeeFormData>();

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: defaultValues?.name || "",
        type: defaultValues?.type || "",
        email: defaultValues?.email || "",
        phone: defaultValues?.phone || "",
        address: defaultValues?.address || "",
        taxId: defaultValues?.taxId || "",
        notes: defaultValues?.notes || "",
      });
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit: SubmitHandler<PayeeFormData> = (data) => {
    // Manual Validation
    if (!data.name || !data.name.trim()) {
      toast.error("Payee Name is required");
      return;
    }

    if (!data.type) {
      toast.error("Payee Type is required");
      return;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    onSubmit(data, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>{defaultValues?._id ? "Edit Payee" : "Add New Payee"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the payee below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Payee Name *</Label>
              <Input
                id="name"
                {...register("name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type...">
                        {field.value && (
                          <div className="flex items-center gap-2">
                            {React.createElement(
                              PAYEE_TYPES.find(t => t.value === field.value)?.icon || User,
                              { className: "h-4 w-4" }
                            )}
                            <span>{PAYEE_TYPES.find(t => t.value === field.value)?.label}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYEE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID / Business Registration</Label>
            <Input id="taxId" {...register("taxId")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={3} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting || (!!defaultValues?._id && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : defaultValues?._id ? "Update Payee" : "Create Payee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}