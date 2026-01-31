// app/people/parties/party-view-modal.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { IParty } from "@/models/Party";
import {
    Mail,
    Phone,
    Calendar,
    MapPin,
    FileText,
    Users,
    Building2,
    UserCircle,
} from "lucide-react";
import { formatLongDate } from "@/utils/formatters/date";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import type { IContact } from "@/models/Contact";

/**
 * Interface for the props of the PartyViewModal component.
 */
interface PartyViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    party: IParty | null;
}

/**
 * A modal component to display party details.
 * @param {PartyViewModalProps} props - The props for the component.
 * @returns {JSX.Element | null} The rendered component.
 */
export function PartyViewModal({ isOpen, onClose, party }: PartyViewModalProps) {
    const [contacts, setContacts] = useState<IContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    // Fetch contacts when party changes
    useEffect(() => {
        if (party?._id) {
            setLoadingContacts(true);
            fetch(`/api/contacts?partyId=${party._id}`)
                .then(res => res.json())
                .then(data => setContacts(data))
                .catch(err => console.error('Failed to fetch contacts:', err))
                .finally(() => setLoadingContacts(false));
        } else {
            setContacts([]);
        }
    }, [party?._id]);

    if (!party) return null;

    // Determine the display name and avatar fallback text
    const displayName = party.company || party.name || "Unknown Party";
    const fallback = party.company
        ? party.company.substring(0, 2).toUpperCase()
        : party.name
            ? party.name.substring(0, 2).toUpperCase()
            : "??";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Party Details
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
                                        <h2 className="text-2xl font-bold">{displayName}</h2>
                                        {party.company && party.name && (
                                            <p className="text-muted-foreground mt-1">{party.name}</p>
                                        )}
                                        <div className="flex gap-2 mt-2 justify-center md:justify-start flex-wrap">
                                            {party.roles.customer && (
                                                <Badge variant="primary" appearance="outline">
                                                    Customer
                                                </Badge>
                                            )}
                                            {party.roles.supplier && (
                                                <Badge variant="warning" appearance="outline">
                                                    Supplier
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                                        {party.phone && (
                                            <div className="flex items-center gap-2 justify-center md:justify-start group">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>{party.phone}</span>
                                                <CopyButton textToCopy={party.phone} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                        {party.email && (
                                            <div className="flex items-center gap-2 justify-center md:justify-start group">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="break-all">{party.email}</span>
                                                <CopyButton textToCopy={party.email} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Identity Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {party.company && (
                                    <div className="flex items-start gap-3">
                                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <div className="text-sm text-muted-foreground">Company Name</div>
                                            <div className="font-medium">{party.company}</div>
                                        </div>
                                    </div>
                                )}

                                {party.name && (
                                    <div className="flex items-start gap-3">
                                        <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <div className="text-sm text-muted-foreground">Individual Name</div>
                                            <div className="font-medium">{party.name}</div>
                                        </div>
                                    </div>
                                )}

                                {party.vatNumber && (
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <div className="text-sm text-muted-foreground">VAT Number</div>
                                            <div className="font-medium font-mono">{party.vatNumber}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Address Information */}
                    {(party.address || party.city || party.state || party.country) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {party.address && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Street Address</div>
                                        <div className="font-medium">{party.address}</div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {party.city && (
                                        <div>
                                            <div className="text-sm text-muted-foreground">City</div>
                                            <div className="font-medium">{party.city}</div>
                                        </div>
                                    )}
                                    {party.district && (
                                        <div>
                                            <div className="text-sm text-muted-foreground">District</div>
                                            <div className="font-medium">{party.district}</div>
                                        </div>
                                    )}
                                    {party.state && (
                                        <div>
                                            <div className="text-sm text-muted-foreground">State</div>
                                            <div className="font-medium">{party.state}</div>
                                        </div>
                                    )}
                                    {party.country && (
                                        <div>
                                            <div className="text-sm text-muted-foreground">Country</div>
                                            <div className="font-medium">{party.country}</div>
                                        </div>
                                    )}
                                    {party.postalCode && (
                                        <div>
                                            <div className="text-sm text-muted-foreground">Postal Code</div>
                                            <div className="font-medium">{party.postalCode}</div>
                                        </div>
                                    )}
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
                                        <div>{formatLongDate(party.createdAt)}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Last Updated</div>
                                        <div>{formatLongDate(party.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contacts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <UserCircle className="h-5 w-5" />
                                Contacts ({contacts.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingContacts ? (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    Loading contacts...
                                </div>
                            ) : contacts.length > 0 ? (
                                <div className="space-y-3">
                                    {contacts.map(contact => (
                                        <div key={contact._id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{contact.name}</span>
                                                    {contact.isPrimary && (
                                                        <Badge variant="primary" appearance="outline" className="text-xs">
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    {!contact.isActive && (
                                                        <Badge variant="gray" appearance="outline" className="text-xs">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>
                                                {contact.designation && (
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {contact.designation}
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1 text-sm">
                                                    {contact.phone && (
                                                        <div className="flex items-center gap-2 group">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            <span>{contact.phone}</span>
                                                            <CopyButton textToCopy={contact.phone} className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}
                                                    {contact.email && (
                                                        <div className="flex items-center gap-2 group">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs break-all">{contact.email}</span>
                                                            <CopyButton textToCopy={contact.email} className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    No contacts found for this party.
                                </div>
                            )}
                            <div className="mt-4">
                                <Link href={`/people/contacts?partyId=${party._id}`}>
                                    <Button variant="outline" className="gap-2 w-full">
                                        <UserCircle className="h-4 w-4" />
                                        View All Contacts
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link href={`/people/contacts?partyId=${party._id}`}>
                                <Button variant="outline" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    Manage Contacts
                                </Button>
                            </Link>
                        </CardContent>
                    </Card> */}
                </div>
            </DialogContent>
        </Dialog>
    );
}