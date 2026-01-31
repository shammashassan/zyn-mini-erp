// app/people/parties/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, Users, Eye } from "lucide-react";
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
import type { IParty } from "@/models/Party";
import { useState } from "react";
import Link from "next/link";

// Delete Dialog Component
const DeletePartyDialog = ({
    party,
    onDelete,
    trigger
}: {
    party: IParty;
    onDelete: (party: IParty) => void;
    trigger: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <div onClick={() => setIsOpen(true)}>{trigger}</div>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Party</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{party.company || party.name}</strong>?
                        <br /><br />
                        This will move the party to trash. You can restore it later if needed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            onDelete(party);
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

interface PartyPermissions {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

export const getPartyColumns = (
    onView: (party: IParty) => void,
    onEdit: (party: IParty) => void,
    onDelete: (party: IParty) => void,
    permissions: PartyPermissions
): ColumnDef<IParty>[] => [
        {
            accessorKey: "company",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Party Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const party = row.original;
                const displayName = party.company || party.name;
                const secondaryName = party.company && party.name ? party.name : null;

                return (
                    <div className="flex flex-col">
                        <div className="font-medium">{displayName || "N/A"}</div>
                        {secondaryName && (
                            <div className="text-xs text-muted-foreground">{secondaryName}</div>
                        )}
                    </div>
                );
            },
            meta: {
                label: "Party Name / City / VAT",
                placeholder: "Search party name, city, or VAT...",
                variant: "text",
            },
            enableColumnFilter: true,
            filterFn: (row, id, value) => {
                const searchValue = value.toLowerCase();
                const party = row.original;
                return (
                    (party.company?.toLowerCase() || "").includes(searchValue) ||
                    (party.name?.toLowerCase() || "").includes(searchValue) ||
                    (party.city?.toLowerCase() || "").includes(searchValue) ||
                    (party.vatNumber?.toLowerCase() || "").includes(searchValue)
                );
            },
            sortingFn: (rowA, rowB) => {
                const nameA = rowA.original.company || rowA.original.name || "";
                const nameB = rowB.original.company || rowB.original.name || "";
                return nameA.localeCompare(nameB);
            },
        },
        {
            accessorKey: "roles",
            header: "Roles",
            cell: ({ row }) => {
                const roles = row.original.roles;
                return (
                    <div className="flex gap-1 flex-wrap">
                        {roles.customer && (
                            <Badge variant="primary" appearance="outline" className="text-xs">
                                Customer
                            </Badge>
                        )}
                        {roles.supplier && (
                            <Badge variant="warning" appearance="outline" className="text-xs">
                                Supplier
                            </Badge>
                        )}
                    </div>
                );
            },
            meta: {
                label: "Role",
                variant: "select",
                options: [
                    { label: "Customer", value: "customer" },
                    { label: "Supplier", value: "supplier" },
                ],
            },
            enableColumnFilter: true,
            filterFn: (row, id, value) => {
                const roles = row.original.roles;
                if (value.includes("customer") && value.includes("supplier")) {
                    return roles.customer || roles.supplier;
                }
                if (value.includes("customer")) {
                    return roles.customer;
                }
                if (value.includes("supplier")) {
                    return roles.supplier;
                }
                return true;
            },
        },
        {
            accessorKey: "city",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Location
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const party = row.original;
                const location = [party.city, party.state, party.country]
                    .filter(Boolean)
                    .join(", ");
                return (
                    <span className="text-sm">{location || "—"}</span>
                );
            },
        },
        {
            accessorKey: "phone",
            header: "Contact",
            cell: ({ row }) => {
                const party = row.original;
                return (
                    <div className="flex flex-col text-sm">
                        {party.phone && <div>{party.phone}</div>}
                        {party.email && (
                            <div className="text-xs text-muted-foreground">{party.email}</div>
                        )}
                        {!party.phone && !party.email && <span>—</span>}
                    </div>
                );
            },
        },
        {
            accessorKey: "vatNumber",
            header: "VAT Number",
            cell: ({ row }) => (
                <span className="font-mono text-xs">
                    {row.original.vatNumber || "—"}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const party = row.original;
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
                                    onClick={() => onView(party)}
                                    className="cursor-pointer"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                                <Link
                                    href={`/people/contacts?partyId=${party._id}`}
                                    className="cursor-pointer"
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    View Contacts
                                </Link>
                            </DropdownMenuItem>

                            {canUpdate && (
                                <DropdownMenuItem
                                    onClick={() => onEdit(party)}
                                    className="cursor-pointer"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {canDelete && (
                                <DeletePartyDialog
                                    party={party}
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