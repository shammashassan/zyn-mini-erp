// app/hr/employees/employee-form.tsx - UPDATED: Populated role combobox input

"use client";

import * as React from "react";
import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, PlusCircleIcon, Trash2Icon, ChevronsUpDown, Check, Plus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ImageUploader } from "@/components/image-uploader";
import type { IEmployee } from "@/models/Employee";

type EmployeeFormData = {
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  address1?: string;
  address2?: string;
  mobiles: { value: string }[];
  passport?: string;
  dob?: string;
  civilStatus: string;
  salary?: number;
  salaryFrequency?: string;
  joinedDate?: string;
  description?: string;
  avatar?: string;
};

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, avatarBlob: Blob | null, wasAvatarRemoved: boolean, id?: string) => Promise<void>;
  defaultValues?: IEmployee | null;
  existingRoles?: string[];
}

export function EmployeeForm({ isOpen, onClose, onSubmit, defaultValues, existingRoles = [] }: EmployeeFormProps) {
  const { register, handleSubmit, reset, control, formState: { isSubmitting, isDirty } } = useForm<EmployeeFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "",
      email: "",
      address1: "",
      address2: "",
      mobiles: [{ value: "" }],
      passport: "",
      dob: "",
      civilStatus: "Single",
      salary: 0,
      salaryFrequency: "monthly",
      joinedDate: "",
      description: "",
      avatar: "",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "mobiles"
  });

  const [avatarBlob, setAvatarBlob] = React.useState<Blob | null>(null);
  const [wasAvatarRemoved, setWasAvatarRemoved] = React.useState(false);
  const [isDobPopoverOpen, setIsDobPopoverOpen] = React.useState(false);
  const [isJoinedDatePopoverOpen, setIsJoinedDatePopoverOpen] = React.useState(false);
  const [isRolePopoverOpen, setIsRolePopoverOpen] = React.useState(false);
  const [customRole, setCustomRole] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      const mobilesArray = defaultValues?.mobiles?.length
        ? defaultValues.mobiles.map(m => ({ value: m }))
        : [{ value: "" }];

      reset({
        firstName: defaultValues?.firstName || "",
        lastName: defaultValues?.lastName || "",
        role: defaultValues?.role || "",
        email: defaultValues?.email || "",
        address1: defaultValues?.address1 || "",
        address2: defaultValues?.address2 || "",
        mobiles: mobilesArray,
        passport: defaultValues?.passport || "",
        dob: defaultValues?.dob ? new Date(defaultValues.dob).toISOString().split('T')[0] : "",
        civilStatus: defaultValues?.civilStatus || "Single",
        salary: defaultValues?.salary || 0,
        salaryFrequency: (defaultValues as any)?.salaryFrequency || "monthly",
        joinedDate: defaultValues?.joinedDate ? new Date(defaultValues.joinedDate).toISOString().split('T')[0] : "",
        description: defaultValues?.description || "",
        avatar: defaultValues?.avatar || "",
      });
      setAvatarBlob(null);
      setWasAvatarRemoved(false);
      setCustomRole(defaultValues?.role || "");
    }
  }, [isOpen, defaultValues, reset]);

  const handleImageCropped = (blob: Blob | null) => {
    setAvatarBlob(blob);
    if (blob === null && defaultValues?.avatar) {
      setWasAvatarRemoved(true);
    }
  };

  const handleFormSubmit: SubmitHandler<EmployeeFormData> = async (data) => {
    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(data, avatarBlob, wasAvatarRemoved, submissionId);
  };

  const isEditing = !!defaultValues?._id;
  const hasChanges = isDirty || avatarBlob !== null || wasAvatarRemoved;

  const handleAddCustomRole = (field: any) => {
    if (customRole.trim()) {
      field.onChange(customRole.trim());
      setCustomRole(customRole.trim());
      setIsRolePopoverOpen(false);
    }
  };

  // Filter roles based on search input
  const filteredRoles = existingRoles.filter(role =>
    !customRole || role.toLowerCase().includes(customRole.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            Fill in the details for the employee below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 sidebar-scroll">
          <form id="employee-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-4 pb-4" autoComplete="off">
            <ImageUploader
              initialImageUrl={defaultValues?.avatar}
              onImageCropped={handleImageCropped}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register("firstName", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register("lastName", { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="role"
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <Popover
                    open={isRolePopoverOpen}
                    onOpenChange={(open) => {
                      setIsRolePopoverOpen(open);
                      if (open) setCustomRole(field.value || "");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {field.value || "Select or create role..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search or type new role..."
                          value={customRole}
                          onValueChange={setCustomRole}
                        />
                        <CommandList
                          className="max-h-[200px] overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>No roles found.</CommandEmpty>

                          {filteredRoles.length > 0 && (
                            <CommandGroup heading="Existing Roles">
                              {filteredRoles.map((role) => (
                                <CommandItem
                                  key={role}
                                  value={role}
                                  onSelect={() => {
                                    field.onChange(role);
                                    setCustomRole(role);
                                    setIsRolePopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === role ? "opacity-100" : "opacity-0")} />
                                  {role}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}

                          {customRole.trim() && !existingRoles.some(r => r.toLowerCase() === customRole.trim().toLowerCase()) && (
                            <CommandGroup heading="Create New">
                              <CommandItem
                                onSelect={() => handleAddCustomRole(field)}
                                className="text-primary"
                                value={customRole}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create "{customRole.trim()}"
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Mobile Numbers</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input {...register(`mobiles.${index}.value`)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2Icon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
                disabled={fields.length >= 3}
              >
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Mobile
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input id="address1" {...register("address1")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input id="address2" {...register("address2")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passport">Passport No.</Label>
                <Input id="passport" {...register("passport")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Controller
                  control={control}
                  name="dob"
                  render={({ field }) => (
                    <Popover open={isDobPopoverOpen} onOpenChange={setIsDobPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            setIsDobPopoverOpen(false);
                          }}
                          captionLayout="dropdown"
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="civilStatus">Civil Status</Label>
                <Controller
                  control={control}
                  name="civilStatus"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinedDate">Joined Date</Label>
                <Controller
                  control={control}
                  name="joinedDate"
                  render={({ field }) => (
                    <Popover open={isJoinedDatePopoverOpen} onOpenChange={setIsJoinedDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            setIsJoinedDatePopoverOpen(false);
                          }}
                          captionLayout="dropdown"
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input id="salary" type="number" step="0.01" {...register("salary", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryFrequency">Salary Frequency</Label>
                <Controller
                  control={control}
                  name="salaryFrequency"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
          </form>
        </div>
        <DialogFooter className="pt-4 pb-4 px-6 bg-background border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="employee-form" disabled={isSubmitting || (isEditing && !hasChanges)}>
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </div>
            ) : "Save Employee"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}