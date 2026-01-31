"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

export type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor'

export interface PartyContactValue {
    partyType?: PartyType
    partyId?: string
    partyName?: string // For vendor manual input
    contactId?: string // Optional, as some parties might not have contacts or user might not select one
}

interface PartyContactSelectorProps {
    value?: PartyContactValue
    onChange: (value: PartyContactValue, party?: Party) => void
    allowedRoles?: PartyType[] // New prop for dynamic party types
    role?: PartyType // Legacy prop for backward compatibility
    showContactSelector?: boolean
    showCreateButton?: boolean // Control visibility of create party/payee button
    disabled?: boolean
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
    role, // Legacy backward compatibility
    showContactSelector = true,
    showCreateButton = false, // Default to false for backward compatibility
    disabled = false,
    className,
    layout = 'responsive',
    showPartyLabel = true,
}: PartyContactSelectorProps) {
    // Determine effective allowed roles (new prop takes precedence over legacy)
    const effectiveAllowedRoles: PartyType[] = React.useMemo(() => {
        if (allowedRoles && allowedRoles.length > 0) {
            return allowedRoles
        }
        if (role) {
            return [role]
        }
        return ['customer'] // Default fallback
    }, [allowedRoles, role])

    const showPartyTypeSelector = effectiveAllowedRoles.length > 1

    // Initialize party type to first allowed role or value's party type
    const [selectedPartyType, setSelectedPartyType] = React.useState<PartyType>(
        value?.partyType || effectiveAllowedRoles[0]
    )

    const [openParty, setOpenParty] = React.useState(false)
    const [openContact, setOpenContact] = React.useState(false)

    const [parties, setParties] = React.useState<Party[]>([])
    const [contacts, setContacts] = React.useState<Contact[]>([])

    const [loadingParties, setLoadingParties] = React.useState(false)
    const [loadingContacts, setLoadingContacts] = React.useState(false)
    const [isCreating, setIsCreating] = React.useState(false)

    const [searchQuery, setSearchQuery] = React.useState("")

    // Sync selected party type with value
    React.useEffect(() => {
        if (value?.partyType && effectiveAllowedRoles.includes(value.partyType)) {
            setSelectedPartyType(value.partyType)
        }
    }, [value?.partyType, effectiveAllowedRoles])

    // Fetch Parties or Payees based on selected party type
    const fetchParties = React.useCallback(async () => {
        // Skip fetching for vendor (manual input)
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

    // Fetch Contacts when Party changes
    React.useEffect(() => {
        const partyId = value?.partyId;
        // Don't fetch contacts for vendor or payee
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

    // Sync search query with party popover state
    React.useEffect(() => {
        if (openParty) {
            const selectedParty = parties.find((p) => p._id === value?.partyId)
            setSearchQuery(selectedParty ? (selectedParty.company || selectedParty.name || "") : "")
        }
    }, [openParty, parties, value?.partyId])

    const handlePartyTypeChange = (newType: PartyType) => {
        setSelectedPartyType(newType)
        // Reset selection when party type changes
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

        // Reset contact when party changes
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

    const handleCreateParty = async () => {
        if (!searchQuery.trim()) return

        setIsCreating(true)
        try {
            if (selectedPartyType === 'payee') {
                // Create Payee
                const payeePayload = {
                    name: searchQuery.trim(),
                    type: 'individual', // Default type for payee
                }

                const response = await fetch("/api/payees", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payeePayload),
                })

                if (response.ok) {
                    const newPayee = await response.json()
                    toast.success(`Payee "${searchQuery}" created`)

                    // Refresh the parties list
                    await fetchParties()

                    // Select the newly created payee
                    onChange({
                        partyType: 'payee',
                        partyId: newPayee._id,
                        partyName: undefined,
                        contactId: undefined
                    }, newPayee)

                    setOpenParty(false)
                    setSearchQuery("")
                } else {
                    const error = await response.json()
                    toast.error(`Failed to create payee "${searchQuery}"`, {
                        description: error.error || "Please try again"
                    })
                }
            } else {
                // Create Party (Customer or Supplier)
                const partyPayload = {
                    name: searchQuery.trim(),
                    roles: {
                        customer: selectedPartyType === 'customer',
                        supplier: selectedPartyType === 'supplier',
                    }
                }

                const response = await fetch("/api/parties", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partyPayload),
                })

                if (response.ok) {
                    const newParty = await response.json()
                    toast.success(`${PARTY_TYPE_LABELS[selectedPartyType]} "${searchQuery}" created`)

                    // Refresh the parties list
                    await fetchParties()

                    // Select the newly created party
                    onChange({
                        partyType: selectedPartyType,
                        partyId: newParty._id,
                        partyName: undefined,
                        contactId: undefined
                    }, newParty)

                    setOpenParty(false)
                    setSearchQuery("")
                } else {
                    const error = await response.json()
                    toast.error(`Failed to create ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()} "${searchQuery}"`, {
                        description: error.error || "Please try again"
                    })
                }
            }
        } catch (error) {
            console.error("Error creating party:", error)
            toast.error(`Failed to create ${selectedPartyType}`)
        } finally {
            setIsCreating(false)
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

    // Determine if we should show contact selector for current party type
    const shouldShowContactSelector = showContactSelector &&
        (selectedPartyType === 'customer' || selectedPartyType === 'supplier') &&
        value?.partyId

    // Check if party/payee already exists
    const doesPartyExist = parties.some(
        (p) => (p.company?.toLowerCase() === searchQuery.trim().toLowerCase()) ||
            (p.name?.toLowerCase() === searchQuery.trim().toLowerCase())
    )

    return (
        <div className={containerClass}>
            {/* Party Type Selector - only shown when multiple roles allowed */}
            {showPartyTypeSelector && (
                <div className={cn("space-y-2", (layout === 'horizontal' || layout === 'responsive') && "flex-1")}>
                    <Label>Party Type</Label>
                    <Select
                        value={selectedPartyType}
                        onValueChange={handlePartyTypeChange}
                        disabled={disabled}
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

            {/* Party and Contact Selectors */}
            <div className={partyContactClass}>
                <div className="flex flex-col gap-2 w-full">
                    {showPartyLabel && (
                        <Label>
                            {PARTY_TYPE_LABELS[selectedPartyType]}
                            {!showPartyTypeSelector && ` (${selectedPartyType})`}
                        </Label>
                    )}

                    {/* Vendor Manual Input */}
                    {selectedPartyType === 'vendor' ? (
                        <Input
                            placeholder="Enter vendor name..."
                            value={value?.partyName || ''}
                            onChange={(e) => handleVendorNameChange(e.target.value)}
                            disabled={disabled}
                            className="w-full"
                        />
                    ) : (
                        /* Party Dropdown for customer/supplier/payee */
                        <Popover open={openParty} onOpenChange={setOpenParty}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openParty}
                                    className="w-full justify-between"
                                    disabled={disabled}
                                >
                                    {selectedParty
                                        ? (selectedParty.company || selectedParty.name)
                                        : `Select ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()}...`}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput
                                        placeholder={`Search or create ${PARTY_TYPE_LABELS[selectedPartyType].toLowerCase()}...`}
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

                                        {/* Existing Parties */}
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

                                        {/* Create New Party/Payee */}
                                        {showCreateButton && searchQuery.trim() && !doesPartyExist && (
                                            <CommandGroup heading={`Create New ${PARTY_TYPE_LABELS[selectedPartyType]}`}>
                                                <CommandItem
                                                    onSelect={handleCreateParty}
                                                    className="text-blue-600 dark:text-blue-400"
                                                    value={`create-${searchQuery}`}
                                                    disabled={isCreating}
                                                >
                                                    {isCreating ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Create "{searchQuery}"
                                                </CommandItem>
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {shouldShowContactSelector && (
                    <div className="flex flex-col gap-2 w-full">
                        <Label>Contact</Label>
                        <Popover open={openContact} onOpenChange={setOpenContact}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openContact}
                                    className="w-full justify-between"
                                    disabled={disabled || !value?.partyId}
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
                            <PopoverContent className="w-[300px] p-0">
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
                    </div>
                )}
            </div>
        </div>
    )
}