// app/people/contacts/contact-view-modal.tsx

"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { IContact } from "@/models/Contact";
import {
    Mail,
    Phone,
    Calendar,
    Briefcase,
    UserCircle,
    Users,
    Star,
    CheckCircle2,
    Building2,
} from "lucide-react";
import { formatLongDate } from "@/utils/formatters/date";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";

/**
 * Interface for the props of the ContactViewModal component.
 */
interface ContactViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: IContact | null;
}

/**
 * A modal component to display contact details.
 * @param {ContactViewModalProps} props - The props for the component.
 * @returns {JSX.Element | null} The rendered component.
 */
export function ContactViewModal({ isOpen, onClose, contact }: ContactViewModalProps) {
    if (!contact) return null;

    const party = typeof contact.partyId === 'object' && contact.partyId
        ? contact.partyId as any
        : null;

    // Determine the display name and avatar fallback text
    const displayName = contact.name;
    const fallback = contact.name
        ? contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : "??";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5" />
                        Contact Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Card with Avatar */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                                <Avatar className="h-32 w-32 border-4 border-muted">
                                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                        {fallback}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-center md:text-left space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <h2 className="text-2xl font-bold">{displayName}</h2>
                                            {contact.isPrimary && (
                                                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                                            )}
                                        </div>
                                        {contact.designation && (
                                            <p className="text-muted-foreground mt-1 flex items-center gap-2 justify-center md:justify-start">
                                                <Briefcase className="h-4 w-4" />
                                                {contact.designation}
                                            </p>
                                        )}
                                        <div className="flex gap-2 mt-2 justify-center md:justify-start flex-wrap">
                                            {contact.isPrimary && (
                                                <Badge variant="primary" appearance="outline">
                                                    Primary Contact
                                                </Badge>
                                            )}
                                            <Badge
                                                variant={contact.isActive ? 'success' : 'gray'}
                                                appearance="outline"
                                            >
                                                {contact.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                                        {contact.phone && (
                                            <div className="flex items-center gap-2 justify-center md:justify-start group">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>{contact.phone}</span>
                                                <CopyButton textToCopy={contact.phone} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                        {contact.email && (
                                            <div className="flex items-center gap-2 justify-center md:justify-start group">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="break-all">{contact.email}</span>
                                                <CopyButton textToCopy={contact.email} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Party Information */}
                    {party && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Associated Party
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3">
                                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div className="flex-1">
                                        <div className="font-medium text-lg">{party.company || party.name}</div>
                                        {party.company && party.name && (
                                            <div className="text-sm text-muted-foreground">{party.name}</div>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            {party.roles?.customer && (
                                                <Badge variant="primary" appearance="outline">
                                                    Customer
                                                </Badge>
                                            )}
                                            {party.roles?.supplier && (
                                                <Badge variant="warning" appearance="outline">
                                                    Supplier
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {/* <Link href={`/people/parties`}>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Users className="h-4 w-4" />
                                            View Party
                                        </Button>
                                    </Link> */}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Contact Information */}
                    {contact.designation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Position</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3">
                                    <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Designation</div>
                                        <div className="font-medium">{contact.designation}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Record Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Created</div>
                                        <div>{formatLongDate(contact.createdAt)}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Last Updated</div>
                                        <div>{formatLongDate(contact.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}