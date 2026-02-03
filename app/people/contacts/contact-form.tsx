// app/people/contacts/contact-form.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserCircle, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IContact } from "@/models/Contact";
import type { IParty } from "@/models/Party";
import { Spinner } from "@/components/ui/spinner";

type ContactFormData = {
    partyId: string;
    name: string;
    designation?: string;
    phone?: string;
    email?: string;
    isPrimary: boolean;
    isActive: boolean;
};

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, id?: string) => void;
    defaultValues?: IContact | null;
    parties: IParty[];
    preselectedPartyId?: string;
}

export function ContactForm({
    isOpen,
    onClose,
    onSubmit,
    defaultValues,
    parties,
    preselectedPartyId
}: ContactFormProps) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { isSubmitting, isDirty }
    } = useForm<ContactFormData>({
        defaultValues: {
            isPrimary: false,
            isActive: true,
        }
    });

    const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
    const [partySearchQuery, setPartySearchQuery] = useState("");

    const isPrimary = watch("isPrimary");
    const isActive = watch("isActive");
    const selectedPartyId = watch("partyId");

    const selectedParty = parties.find(p => p._id === selectedPartyId);

    useEffect(() => {
        if (isOpen) {
            if (defaultValues) {
                const partyId = typeof defaultValues.partyId === 'string'
                    ? defaultValues.partyId
                    : (defaultValues.partyId as any)?._id || '';

                reset({
                    partyId,
                    name: defaultValues.name,
                    designation: defaultValues.designation || "",
                    phone: defaultValues.phone || "",
                    email: defaultValues.email || "",
                    isPrimary: defaultValues.isPrimary,
                    isActive: defaultValues.isActive,
                });

                const party = parties.find(p => p._id === partyId);
                if (party) {
                    setPartySearchQuery(party.company || party.name || "");
                }
            } else {
                reset({
                    partyId: preselectedPartyId || "",
                    name: "",
                    designation: "",
                    phone: "",
                    email: "",
                    isPrimary: false,
                    isActive: true,
                });

                if (preselectedPartyId) {
                    const party = parties.find(p => p._id === preselectedPartyId);
                    if (party) {
                        setPartySearchQuery(party.company || party.name || "");
                    }
                } else {
                    setPartySearchQuery("");
                }
            }
        }
    }, [isOpen, defaultValues, preselectedPartyId, parties, reset]);

    const handleFormSubmit = (data: ContactFormData) => {
        // Manual Validation

        if (!data.partyId) {
            toast.error("Please select a party");
            return;
        }

        if (!data.name || !data.name.trim()) {
            toast.error("Contact name is required");
            return;
        }

        if (data.name.length > 100) {
            toast.error("Contact name cannot exceed 100 characters");
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

        // Phone validation if provided
        if (data.phone && data.phone.trim()) {
            const phoneRegex = /^[0-9+\-\s()]+$/;
            if (!phoneRegex.test(data.phone)) {
                toast.error("Please enter a valid phone number");
                return;
            }
        }

        const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
        onSubmit(data, submissionId);
    };

    const filteredParties = parties.filter(party => {
        if (!partySearchQuery) return true;
        const searchLower = partySearchQuery.toLowerCase();
        const displayName = (party.company || party.name || "").toLowerCase();
        return displayName.includes(searchLower);
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5" />
                        {defaultValues ? "Edit Contact" : "Create Contact"}
                    </DialogTitle>
                    <DialogDescription>
                        Add or update contact person details for a party.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-6">
                    {/* Party Selection */}
                    <div className="space-y-2">
                        <Label>
                            Party <span className="text-destructive">*</span>
                        </Label>
                        <Controller
                            name="partyId"
                            control={control}
                            render={({ field }) => (
                                <Popover
                                    open={partyPopoverOpen}
                                    onOpenChange={(open) => {
                                        setPartyPopoverOpen(open);
                                        if (open && field.value) {
                                            const party = parties.find(p => p._id === field.value);
                                            if (party) {
                                                setPartySearchQuery(party.company || party.name || "");
                                            }
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            ref={field.ref}
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                            disabled={!!defaultValues}
                                        >
                                            {field.value
                                                ? (selectedParty?.company || selectedParty?.name || "Unknown Party")
                                                : "Select party..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search party..."
                                                value={partySearchQuery}
                                                onValueChange={setPartySearchQuery}
                                            />
                                            <CommandList
                                                className="max-h-[200px] overflow-y-auto"
                                                onWheel={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onTouchMove={(e) => e.stopPropagation()}
                                            >
                                                <CommandEmpty>No parties found</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredParties.map((party) => (
                                                        <CommandItem
                                                            key={party._id}
                                                            value={party._id}
                                                            onSelect={() => {
                                                                field.onChange(party._id);
                                                                setPartySearchQuery(party.company || party.name || "");
                                                                setPartyPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    field.value === party._id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{party.company || party.name}</span>
                                                                {party.company && party.name && (
                                                                    <span className="text-xs text-muted-foreground">{party.name}</span>
                                                                )}
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
                        {!selectedPartyId && (
                            <p className="text-xs text-muted-foreground">
                                Select the party this contact belongs to
                            </p>
                        )}
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Contact Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., John Doe"
                                    {...register("name")}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="designation">Designation</Label>
                                <Input
                                    id="designation"
                                    placeholder="e.g., Sales Manager"
                                    {...register("designation")}
                                />
                            </div>
                        </div>

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
                                    placeholder="e.g., john@company.com"
                                    {...register("email")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Settings
                        </h3>

                        <Label
                            htmlFor="isPrimary"
                            className={cn(
                                "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                isPrimary && "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                            )}
                        >
                            <div className="grid gap-1.5 font-normal flex-1">
                                <p className="text-sm leading-none font-medium">
                                    Primary Contact
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {isPrimary ? "Default contact for documents and communications" : "Set as the main contact person"}
                                </p>
                            </div>
                            <Controller
                                name="isPrimary"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="isPrimary"
                                        checked={field.value}
                                        onCheckedChange={(val) => field.onChange(val)}
                                        className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-700"
                                    />
                                )}
                            />
                        </Label>

                        <Label
                            htmlFor="isActive"
                            className={cn(
                                "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                isActive && "border-green-600 bg-green-50 dark:border-green-900 dark:bg-green-950"
                            )}
                        >
                            <div className="grid gap-1.5 font-normal flex-1">
                                <p className="text-sm leading-none font-medium">
                                    Active Status
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    {isActive ? "This contact is active and available" : "Inactive contacts won't appear in selections"}
                                </p>
                            </div>
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="isActive"
                                        checked={field.value}
                                        onCheckedChange={(val) => field.onChange(val)}
                                        className="data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-700"
                                    />
                                )}
                            />
                        </Label>
                    </div>

                    {/* Summary Card */}
                    <Card className="bg-muted/50">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Name</p>
                                    <p className="font-medium truncate">{watch("name") || "Not Set"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Party</p>
                                    <p className="font-medium truncate">
                                        {selectedParty ? (selectedParty.company || selectedParty.name) : "Not Selected"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <div className="flex gap-1 mt-1">
                                        {watch("isPrimary") && (
                                            <Badge variant="primary" appearance="outline" className="text-xs">
                                                Primary
                                            </Badge>
                                        )}
                                        <Badge
                                            variant={watch("isActive") ? 'success' : 'gray'}
                                            appearance="outline"
                                            className="text-xs"
                                        >
                                            {watch("isActive") ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
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
                            ) : defaultValues ? "Update Contact" : "Create Contact"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}