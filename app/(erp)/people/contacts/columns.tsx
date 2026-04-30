// app/people/contacts/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, Star, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { IContact } from "@/models/Contact";
import { useState } from "react";

// Delete Dialog Component
const DeleteContactDialog = ({
    contact,
    onDelete,
    trigger
}: {
    contact: IContact;
    onDelete: (contact: IContact) => void;
    trigger: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <div onClick={() => setIsOpen(true)}>{trigger}</div>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{contact.name}</strong>?
                        <br /><br />
                        This will move the contact to trash. You can restore it later if needed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onDelete(contact);
                            setIsOpen(false);
                        }}
                        variant="destructive"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

interface ContactPermissions {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export const getContactColumns = (
    onView: (contact: IContact) => void,
    onEdit: (contact: IContact) => void,
    onDelete: (contact: IContact) => void,
    onSetPrimary: (contact: IContact) => void,
    onToggleActive: (contact: IContact) => void,
    permissions: ContactPermissions
): ColumnDef<IContact>[] => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Contact Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const contact = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{contact.name}</span>
                                {contact.isPrimary && (
                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                )}
                            </div>
                            {contact.designation && (
                                <div className="text-xs text-muted-foreground">{contact.designation}</div>
                            )}
                        </div>
                    </div>
                );
            },
            meta: {
                label: "Name / Party / Phone / Email",
                placeholder: "Search name, party, phone or email...",
                variant: "text",
            },
            enableColumnFilter: true,
            filterFn: (row, id, value) => {
                const searchValue = value.toLowerCase();
                const contact = row.original;
                const partyName = typeof contact.partyId === 'object' && contact.partyId
                    ? ((contact.partyId as any).company || (contact.partyId as any).name || "")
                    : "";

                return (
                    contact.name.toLowerCase().includes(searchValue) ||
                    (contact.designation?.toLowerCase() || "").includes(searchValue) ||
                    (contact.phone?.toLowerCase() || "").includes(searchValue) ||
                    (contact.email?.toLowerCase() || "").includes(searchValue) ||
                    partyName.toLowerCase().includes(searchValue)
                );
            },
        },
        {
            accessorKey: "partyId",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Party
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const contact = row.original;
                const party = typeof contact.partyId === 'object' && contact.partyId
                    ? contact.partyId as any
                    : null;

                if (!party) return <span className="text-muted-foreground">—</span>;

                return (
                    <div className="font-medium">{party.company || party.name}</div>
                );
            },
            sortingFn: (rowA, rowB) => {
                const partyA = typeof rowA.original.partyId === 'object' && rowA.original.partyId
                    ? ((rowA.original.partyId as any).company || (rowA.original.partyId as any).name || "")
                    : "";
                const partyB = typeof rowB.original.partyId === 'object' && rowB.original.partyId
                    ? ((rowB.original.partyId as any).company || (rowB.original.partyId as any).name || "")
                    : "";
                return partyA.localeCompare(partyB);
            },
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.phone || "—"}</span>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.email || "—"}
                </span>
            ),
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => {
                const contact = row.original;
                return (
                    <div className="flex gap-1">
                        <Badge
                            variant={contact.isActive ? 'success' : 'gray'}
                            appearance="outline"
                            className="text-xs"
                        >
                            {contact.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                );
            },
            filterFn: (row, id, value) => {
                if (value.includes("active") && value.includes("inactive")) {
                    return true;
                }
                if (value.includes("active")) {
                    return row.original.isActive === true;
                }
                if (value.includes("inactive")) {
                    return row.original.isActive === false;
                }
                return true;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const contact = row.original;
                const { canRead, canUpdate, canDelete } = permissions;

                if (!canRead && !canUpdate && !canDelete) {
                    return null;
                }

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>

                            {canRead && (
                                <DropdownMenuItem
                                    onClick={() => onView(contact)}
                                    className="cursor-pointer"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                            )}

                            {canUpdate && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => onEdit(contact)}
                                        className="cursor-pointer"
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>

                                    {!contact.isPrimary && (
                                        <DropdownMenuItem
                                            onClick={() => onSetPrimary(contact)}
                                            className="cursor-pointer"
                                        >
                                            <Star className="mr-2 h-4 w-4" />
                                            Set as Primary
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                        onClick={() => onToggleActive(contact)}
                                        className="cursor-pointer"
                                    >
                                        {contact.isActive ? (
                                            <>
                                                <ToggleLeft className="mr-2 h-4 w-4" />
                                                Deactivate
                                            </>
                                        ) : (
                                            <>
                                                <ToggleRight className="mr-2 h-4 w-4" />
                                                Activate
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                </>
                            )}

                            <DropdownMenuSeparator />

                            {canDelete && (
                                <DeleteContactDialog
                                    contact={contact}
                                    onDelete={onDelete}
                                    trigger={
                                        <DropdownMenuItem
                                            className="text-destructive cursor-pointer"
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    }
                                />
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];