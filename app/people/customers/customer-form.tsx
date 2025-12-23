// app/documents/customers/customer-form.tsx - FIXED: Standardized validation and dirty state check

"use client";

import * as React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
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
import type { ICustomer } from "@/models/Customer";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type CustomerFormData = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData, id?: string) => void;
  defaultValues?: ICustomer | null;
}

export function CustomerForm({ isOpen, onClose, onSubmit, defaultValues }: CustomerFormProps) {
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { isSubmitting, isDirty } 
  } = useForm<CustomerFormData>();

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: defaultValues?.name || "",
        email: defaultValues?.email || "",
        phone: defaultValues?.phone || "",
        address: defaultValues?.address || "",
      });
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit: SubmitHandler<CustomerFormData> = (data) => {
    // Manual Validation
    if (!data.name || !data.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    onSubmit(data, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the customer below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              {...register("name")}
            />
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
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} rows={3} />
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
              ) : defaultValues ? "Update Customer" : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}