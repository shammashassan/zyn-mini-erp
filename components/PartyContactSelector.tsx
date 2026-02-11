"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PartyForm } from "@/app/people/parties/party-form"
import { PayeeForm } from "@/app/people/payees/payee-form"
import { ContactForm } from "@/app/people/contacts/contact-form"
import type { IParty } from "@/models/Party"

export type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor'

export interface PartyContactValue {
    partyType?: PartyType
    partyId?: string
    partyName?: string
    contactId?: string
}

interface PartyContactSelectorProps {
    value?: PartyContactValue
    onChange: (value: PartyContactValue, party?: Party) => void
    allowedRoles?: PartyType[]
    role?: PartyType
    showContactSelector?: boolean
    showCreateButton?: boolean
    disabled?: boolean
    disablePartyTypeSelector?: boolean
    disablePartySelector?: boolean
    className?: string
    layout?: 'vertical' | 'horizontal' | 'responsive'
    showPartyLabel?: boolean
}

interface Party {
    _id: string
    company?: string
    name?: string
    displayName?: string
    email?: string
    phone?: string
    roles?: {
        customer?: boolean
        supplier?: boolean
        payee?: boolean
        vendor?: boolean
        employee?: boolean
    }
}

interface Contact {
    _id: string
    name: string
    isPrimary: boolean
}

const PARTY_TYPE_LABELS: Record<PartyType, string> = {
    customer: 'Customer',
    supplier: 'Supplier',
    payee: 'Payee',
    vendor: 'Vendor'
}

export function PartyContactSelector({
    value,
    onChange,
    allowedRoles,
    role,
    showContactSelector = true,
    showCreateButton = false,
    disabled = false,
    disablePartyTypeSelector = false,
    disablePartySelector = false,
    className,
    layout = 'responsive',
    showPartyLabel = true,
}: PartyContactSelectorProps) {
    const effectiveAllowedRoles: PartyType[] = React.useMemo(() => {
        if (allowedRoles && allowedRoles.length > 0) {
            return allowedRoles
        }
        if (role) {
            return [role]
        }
        return ['customer']
    }, [allowedRoles, role])

    const showPartyTypeSelector = effectiveAllowedRoles.length > 1

    const [selectedPartyType, setSelectedPartyType] = React.useState<PartyType>(
        value?.partyType || effectiveAllowedRoles[0]
    )

    const [openParty, setOpenParty] = React.useState(false)
    const [openContact, setOpenContact] = React.useState(false)

    const [parties, setParties] = React.useState<Party[]>([])
    const [contacts, setContacts] = React.useState<Contact[]>([])

    const [loadingParties, setLoadingParties] = React.useState(false)
    const [loadingContacts, setLoadingContacts] = React.useState(false)

    const [searchQuery, setSearchQuery] = React.useState("")

    const [isPartyFormOpen, setIsPartyFormOpen] = React.useState(false)
    const [isPayeeFormOpen, setIsPayeeFormOpen] = React.useState(false)
    const [isContactFormOpen, setIsContactFormOpen] = React.useState(false)

    React.useEffect(() => {
        if (value?.partyType && effectiveAllowedRoles.includes(value.partyType)) {
            setSelectedPartyType(value.partyType)
        }
    }, [value?.partyType, effectiveAllowedRoles])

    const fetchParties = React.useCallback(async () => {
        if (selectedPartyType === 'vendor') {
            setParties([])
            return
        }

        setLoadingParties(true)
        try {
            let url = '/api/parties';
            const params = new URLSearchParams()

            if (selectedPartyType === 'payee') {
                url = '/api/payees';
            } else if (selectedPartyType === 'customer' || selectedPartyType === 'supplier') {
                params.set('role', selectedPartyType)
            }

            const res = await fetch(`${url}?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setParties(data)
            }
        } catch (error) {
            console.error("Failed to fetch parties", error)
        } finally {
            setLoadingParties(false)
        }
    }, [selectedPartyType])

    React.useEffect(() => {
        fetchParties()
    }, [fetchParties])

    React.useEffect(() => {
        const partyId = value?.partyId;
        if (!partyId || selectedPartyType === 'vendor' || selectedPartyType === 'payee') {
            setContacts([])
            return
        }

        async function fetchContacts() {
            setLoadingContacts(true)
            try {
                const res = await fetch(`/api/contacts?partyId=${partyId}`)
                if (res.ok) {
                    const data = await res.json()
                    setContacts(data)
                }
            } catch (error) {
                console.error("Failed to fetch contacts", error)
            } finally {
                setLoadingContacts(false)
            }
        }
        fetchContacts()
    }, [value?.partyId, selectedPartyType])

    React.useEffect(() => {
        if (openParty) {
            const selectedParty = parties.find((p) => p._id === value?.partyId)
            setSearchQuery(selectedParty ? (selectedParty.company || selectedParty.name || "") : "")
        }
    }, [openParty, parties, value?.partyId])

    const handlePartyTypeChange = (newType: PartyType) => {
        setSelectedPartyType(newType)
        onChange({
            partyType: newType,
            partyId: undefined,
            partyName: undefined,
            contactId: undefined
        })
    }

    const handlePartySelect = (party: Party) => {
        if (party._id === value?.partyId) {
            setOpenParty(false)
            return
        }

        onChange({
            partyType: selectedPartyType,
            partyId: party._id,
            partyName: undefined,
            contactId: undefined
        }, party)
        setOpenParty(false)
        setSearchQuery("")
    }

    const handleVendorNameChange = (vendorName: string) => {
        onChange({
            partyType: 'vendor',
            partyId: undefined,
            partyName: vendorName,
            contactId: undefined
        })
    }

    const handleContactSelect = (contactId: string) => {
        if (!value?.partyId) return
        const party = parties.find(p => p._id === value.partyId)
        onChange({ ...value, contactId }, party)
        setOpenContact(false)
    }

    const handleOpenPartyForm = () => {
        setOpenParty(false)
        setIsPartyFormOpen(true)
    }

    const handleOpenPayeeForm = () => {
        setOpenParty(false)
        setIsPayeeFormOpen(true)
    }

    const handleOpenContactForm = () => {
        setOpenContact(false)
        setIsContactFormOpen(true)
    }

    const handlePartyFormSubmit = async (data: any, id?: string) => {
        const url = id ? `/api/parties/${id}` : "/api/parties"
        const method = id ? "PUT" : "POST"

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                const newParty = await response.json()
                toast.success(`${PARTY_TYPE_LABELS[selectedPartyType]} created successfully`)

                await fetchParties()

                onChange({
                    partyType: selectedPartyType,
                    partyId: newParty._id,
                    partyName: undefined,
                    contactId: undefined
                }, newParty)

                setIsPartyFormOpen(false)
            } else {
                const error = await response.json()
                toast.error(`Failed to create ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()}`, {
                    description: error.error || "Please try again"
                })
            }
        } catch (error) {
            console.error("Error creating party:", error)
            toast.error(`Failed to create ${selectedPartyType}`)
        }
    }

    const handlePayeeFormSubmit = async (data: any, id?: string) => {
        const url = id ? `/api/payees/${id}` : "/api/payees"
        const method = id ? "PUT" : "POST"

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                const newPayee = await response.json()
                toast.success("Payee created successfully")

                await fetchParties()

                onChange({
                    partyType: 'payee',
                    partyId: newPayee._id,
                    partyName: undefined,
                    contactId: undefined
                }, newPayee)

                setIsPayeeFormOpen(false)
            } else {
                const error = await response.json()
                toast.error("Failed to create payee", {
                    description: error.error || "Please try again"
                })
            }
        } catch (error) {
            console.error("Error creating payee:", error)
            toast.error("Failed to create payee")
        }
    }

    const handleContactFormSubmit = async (data: any, id?: string) => {
        const url = id ? `/api/contacts/${id}` : "/api/contacts"
        const method = id ? "PUT" : "POST"

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (response.ok) {
                const newContact = await response.json()
                toast.success("Contact created successfully")

                if (value?.partyId) {
                    const res = await fetch(`/api/contacts?partyId=${value.partyId}`)
                    if (res.ok) {
                        const data = await res.json()
                        setContacts(data)
                    }
                }

                const party = parties.find(p => p._id === value?.partyId)
                onChange({ ...value!, contactId: newContact._id }, party)

                setIsContactFormOpen(false)
            } else {
                const error = await response.json()
                toast.error("Failed to create contact", {
                    description: error.error || "Please try again"
                })
            }
        } catch (error) {
            console.error("Error creating contact:", error)
            toast.error("Failed to create contact")
        }
    }

    const selectedParty = parties.find((p) => p._id === value?.partyId)
    const selectedContact = contacts.find((c) => c._id === value?.contactId)

    const containerClass = cn(
        "flex flex-col gap-4",
        layout === 'horizontal' && "flex-row",
        layout === 'responsive' && "sm:flex-row",
        className
    )

    const partyContactClass = cn(
        "flex flex-col gap-4",
        layout === 'horizontal' && "flex-row flex-1",
        layout === 'responsive' && "sm:flex-row sm:flex-1"
    )

    const shouldShowContactSelector = showContactSelector &&
        (selectedPartyType === 'customer' || selectedPartyType === 'supplier') &&
        value?.partyId

    const isPartyDisabled = disabled || disablePartySelector
    const isContactDisabled = disabled

    return (
        <>
            <div className={containerClass}>
                {showPartyTypeSelector && (
                    <div className={cn("space-y-2", (layout === 'horizontal' || layout === 'responsive') && "flex-1")}>
                        <Label>Party Type</Label>
                        <Select
                            value={selectedPartyType}
                            onValueChange={handlePartyTypeChange}
                            disabled={disabled || disablePartyTypeSelector}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select party type" />
                            </SelectTrigger>
                            <SelectContent>
                                {effectiveAllowedRoles.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {PARTY_TYPE_LABELS[type]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className={partyContactClass}>
                    <div className="flex flex-col gap-2 w-full">
                        {showPartyLabel && (
                            <Label>
                                {PARTY_TYPE_LABELS[selectedPartyType]}
                            </Label>
                        )}

                        {selectedPartyType === 'vendor' ? (
                            <Input
                                placeholder="Enter vendor name..."
                                value={value?.partyName ?? ''}
                                onChange={(e) => handleVendorNameChange(e.target.value)}
                                disabled={isPartyDisabled}
                                className="w-full"
                            />
                        ) : (
                            <ButtonGroup className="w-full p-0">
                                <Popover open={openParty} onOpenChange={setOpenParty}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openParty}
                                            className="flex-1 justify-between"
                                            disabled={isPartyDisabled}
                                        >
                                            {selectedParty
                                                ? (selectedParty.company || selectedParty.name)
                                                : `Select ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()}...`}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder={`Search ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()}...`}
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                            />
                                            <CommandList
                                                className="max-h-[200px] overflow-y-auto"
                                                onWheel={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onTouchMove={(e) => e.stopPropagation()}
                                            >
                                                <CommandEmpty>
                                                    No {PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()} found.
                                                </CommandEmpty>

                                                {parties.length > 0 && (
                                                    <CommandGroup heading={`Existing ${PARTY_TYPE_LABELS[selectedPartyType]}s`}>
                                                        {parties.map((party) => (
                                                            <CommandItem
                                                                key={party._id}
                                                                value={party.company || party.name}
                                                                onSelect={() => handlePartySelect(party)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        value?.partyId === party._id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {party.company || party.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {showCreateButton && !isPartyDisabled && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={selectedPartyType === 'payee' ? handleOpenPayeeForm : handleOpenPartyForm}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </ButtonGroup>
                        )}
                    </div>

                    {shouldShowContactSelector && (
                        <div className="flex flex-col gap-2 w-full">
                            <Label>Contact</Label>
                            <ButtonGroup className="w-full p-0">
                                <Popover open={openContact} onOpenChange={setOpenContact}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openContact}
                                            className="flex-1 justify-between"
                                            disabled={isContactDisabled || !value?.partyId}
                                        >
                                            {loadingContacts ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : selectedContact ? (
                                                selectedContact.name
                                            ) : (
                                                "Select contact..."
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search contact..." />
                                            <CommandList
                                                className="max-h-[200px] overflow-y-auto"
                                                onWheel={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onTouchMove={(e) => e.stopPropagation()}
                                            >
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map((contact) => (
                                                        <CommandItem
                                                            key={contact._id}
                                                            value={contact.name}
                                                            onSelect={() => handleContactSelect(contact._id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    value?.contactId === contact._id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {contact.name}
                                                            {contact.isPrimary && <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {showCreateButton && !isContactDisabled && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={handleOpenContactForm}
                                        disabled={!value?.partyId}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                )}
                            </ButtonGroup>
                        </div>
                    )}
                </div>
            </div>

            <PartyForm
                isOpen={isPartyFormOpen}
                onClose={() => setIsPartyFormOpen(false)}
                onSubmit={handlePartyFormSubmit}
                defaultValues={{
                    roles: {
                        customer: selectedPartyType === 'customer',
                        supplier: selectedPartyType === 'supplier',
                    }
                } as any}
            />

            <PayeeForm
                isOpen={isPayeeFormOpen}
                onClose={() => setIsPayeeFormOpen(false)}
                onSubmit={handlePayeeFormSubmit}
                defaultValues={null}
            />

            <ContactForm
                isOpen={isContactFormOpen}
                onClose={() => setIsContactFormOpen(false)}
                onSubmit={handleContactFormSubmit}
                defaultValues={null}
                parties={parties as IParty[]}
                preselectedPartyId={value?.partyId}
            />
        </>
    )
}