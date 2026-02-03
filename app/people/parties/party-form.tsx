// app/people/parties/party-form.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IParty } from "@/models/Party";
import { Spinner } from "@/components/ui/spinner";

type PartyFormData = {
    company?: string;
    name?: string;
    roles: {
        customer: boolean;
        supplier: boolean;
    };
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    vatNumber?: string;
    phone?: string;
    email?: string;
};

interface PartyFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, id?: string) => void;
    defaultValues?: IParty | null;
}

export function PartyForm({ isOpen, onClose, onSubmit, defaultValues }: PartyFormProps) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { isSubmitting, isDirty }
    } = useForm<PartyFormData>({
        defaultValues: {
            roles: {
                customer: false,
                supplier: false,
            }
        }
    });

    const roles = watch("roles");
    const company = watch("company");
    const name = watch("name");

    useEffect(() => {
        if (isOpen) {
            if (defaultValues) {
                reset({
                    company: defaultValues.company || "",
                    name: defaultValues.name || "",
                    roles: {
                        customer: defaultValues.roles?.customer || false,
                        supplier: defaultValues.roles?.supplier || false,
                    },
                    address: defaultValues.address || "",
                    city: defaultValues.city || "",
                    district: defaultValues.district || "",
                    state: defaultValues.state || "",
                    country: defaultValues.country || "",
                    postalCode: defaultValues.postalCode || "",
                    vatNumber: defaultValues.vatNumber || "",
                    phone: defaultValues.phone || "",
                    email: defaultValues.email || "",
                });
            } else {
                reset({
                    company: "",
                    name: "",
                    roles: {
                        customer: false,
                        supplier: false,
                    },
                    address: "",
                    city: "",
                    district: "",
                    state: "",
                    country: "",
                    postalCode: "",
                    vatNumber: "",
                    phone: "",
                    email: "",
                });
            }
        }
    }, [isOpen, defaultValues, reset]);

    const handleFormSubmit = (data: PartyFormData) => {
        // Manual Validation

        // At least one of company or name must be provided
        if (!data.company?.trim() && !data.name?.trim()) {
            toast.error("Either Company Name or Individual Name is required");
            return;
        }

        // At least one role must be selected
        if (!data.roles.customer && !data.roles.supplier) {
            toast.error("Please select at least one role (Customer or Supplier)");
            return;
        }

        // Email validation if provided
        if (data.email && data.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                toast.error("Please enter a valid email address");
                return;
            }
        }

        // Phone validation if provided (basic check)
        if (data.phone && data.phone.trim()) {
            const phoneRegex = /^[0-9+\-\s()]+$/;
            if (!phoneRegex.test(data.phone)) {
                toast.error("Please enter a valid phone number");
                return;
            }
        }

        // VAT Number validation if provided
        if (data.vatNumber && data.vatNumber.trim()) {
            if (data.vatNumber.length > 50) {
                toast.error("VAT Number cannot exceed 50 characters");
                return;
            }
        }

        const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
        onSubmit(data, submissionId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {defaultValues ? "Edit Party" : "Create Party"}
                    </DialogTitle>
                    <DialogDescription>
                        Add or update party information. A party can be both a customer and supplier.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-6">
                    {/* Identity Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Identity
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company">
                                    Company Name
                                </Label>
                                <Input
                                    id="company"
                                    placeholder="e.g., ABC Corporation Ltd."
                                    {...register("company")}
                                />
                                <p className="text-xs text-muted-foreground">Legal business name</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Individual Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., John Doe"
                                    {...register("name")}
                                />
                                <p className="text-xs text-muted-foreground">For individuals or reference</p>
                            </div>
                        </div>

                        {!company?.trim() && !name?.trim() && (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Provide at least one: Company Name or Individual Name
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Roles Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Roles
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Label
                                htmlFor="customer"
                                className={cn(
                                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                    roles.customer && "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                                )}
                            >
                                <div className="grid gap-1.5 font-normal flex-1">
                                    <p className="text-sm leading-none font-medium">
                                        Customer
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        This party can be used in sales transactions
                                    </p>
                                </div>
                                <Controller
                                    name="roles.customer"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="customer"
                                            checked={field.value}
                                            onCheckedChange={(val) => field.onChange(val)}
                                            className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-700"
                                        />
                                    )}
                                />
                            </Label>

                            <Label
                                htmlFor="supplier"
                                className={cn(
                                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                    roles.supplier && "border-amber-600 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                                )}
                            >
                                <div className="grid gap-1.5 font-normal flex-1">
                                    <p className="text-sm leading-none font-medium">
                                        Supplier
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        This party can be used in purchase transactions
                                    </p>
                                </div>
                                <Controller
                                    name="roles.supplier"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="supplier"
                                            checked={field.value}
                                            onCheckedChange={(val) => field.onChange(val)}
                                            className="data-[state=checked]:bg-amber-600 dark:data-[state=checked]:bg-amber-700"
                                        />
                                    )}
                                />
                            </Label>
                        </div>

                        {!roles.customer && !roles.supplier && (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Select at least one role for this party
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Contact Information (Temporary)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="e.g., +1 234 567 8900"
                                    {...register("phone")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="e.g., contact@company.com"
                                    {...register("email")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Address
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Street Address</Label>
                                <Textarea
                                    id="address"
                                    placeholder="Building, street, area"
                                    rows={2}
                                    {...register("address")}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        placeholder="e.g., Mumbai"
                                        {...register("city")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="district">District</Label>
                                    <Input
                                        id="district"
                                        placeholder="e.g., Mumbai Suburban"
                                        {...register("district")}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        placeholder="e.g., Maharashtra"
                                        {...register("state")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        placeholder="e.g., India"
                                        {...register("country")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="postalCode">Postal Code</Label>
                                    <Input
                                        id="postalCode"
                                        placeholder="e.g., 400001"
                                        {...register("postalCode")}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax Identity */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Tax Identity
                        </h3>
                        <div className="space-y-2">
                            <Label htmlFor="vatNumber">VAT / GST Number</Label>
                            <Input
                                id="vatNumber"
                                placeholder="e.g., 27AABCU9603R1ZM"
                                {...register("vatNumber")}
                            />
                            <p className="text-xs text-muted-foreground">Tax identification number</p>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <Card className="bg-muted/50">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Display Name</p>
                                    <p className="font-medium truncate">
                                        {company || name || "Not Set"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Roles</p>
                                    <div className="flex gap-1 mt-1">
                                        {roles.customer && (
                                            <Badge variant="primary" appearance="outline" className="text-xs">
                                                Customer
                                            </Badge>
                                        )}
                                        {roles.supplier && (
                                            <Badge variant="success" appearance="outline" className="text-xs">
                                                Supplier
                                            </Badge>
                                        )}
                                        {!roles.customer && !roles.supplier && (
                                            <span className="text-muted-foreground text-xs">None</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Location</p>
                                    <p className="font-medium truncate">
                                        {watch("city") || watch("state") || "Not Set"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">VAT Number</p>
                                    <p className="font-medium truncate font-mono text-xs">
                                        {watch("vatNumber") || "Not Set"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || (!!defaultValues && !isDirty)}
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner />
                                    Saving...
                                </>
                            ) : defaultValues ? "Update Party" : "Create Party"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}