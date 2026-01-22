"use client";

import * as React from "react";
import Link from "next/link";
import {
    BookOpen,
    ChevronRight,
    Search,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SiteHeader } from "@/components/site-header";

import {
    DOC_SECTIONS,
    GROUPED_SECTIONS,
    GroupsOrder,
    GROUP_ICONS,
    type DocSection
} from "./content";

// --- Sidebar Component ---

function DocumentationSidebar({
    activeSectionId,
    onSelect
}: {
    activeSectionId: string;
    onSelect: (id: string) => void;
}) {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [openGroups, setOpenGroups] = React.useState<string[]>([]);

    // Initialize open groups (e.g., General or all if searching)
    React.useEffect(() => {
        if (searchQuery.trim()) {
            setOpenGroups(GroupsOrder);
        } else {
            // Keep existing open state or default to 'General' if easier, 
            // but here we just ensure 'General' is open initially if nothing is executing this multiple times.
            // For simplicity, let's just make sure General is open by default logic in rendering or separate state init.
            // Actually, following NavMain pattern, we control state.
            setOpenGroups(prev => prev.includes("General") ? prev : [...prev, "General"]);
        }
    }, [searchQuery]);


    // Filter sections based on search query
    const filteredGroups = React.useMemo(() => {
        if (!searchQuery.trim()) return GROUPED_SECTIONS;

        const query = searchQuery.toLowerCase();
        const filtered: Record<string, DocSection[]> = {};

        Object.entries(GROUPED_SECTIONS).forEach(([group, sections]) => {
            const matchingSections = sections.filter(section =>
                section.title.toLowerCase().includes(query) ||
                section.group.toLowerCase().includes(query) ||
                section.id.toLowerCase().includes(query)
            );

            if (matchingSections.length > 0) {
                filtered[group] = matchingSections;
            }
        });

        return filtered;
    }, [searchQuery]);

    return (
        <Sidebar
            className="top-(--header-height) h-[calc(100svh-var(--header-height))]! border-r bg-background"
        >
            <SidebarHeader className="h-auto px-4 py-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search docs..."
                        className="pl-8 h-9 bg-background shadow-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </SidebarHeader>
            <SidebarContent className="sidebar-scroll">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {GroupsOrder.map((group) => {
                                const sections = filteredGroups[group];
                                if (!sections) return null;

                                const GroupIcon = GROUP_ICONS[group] || BookOpen;
                                const isOpen = openGroups.includes(group) || !!searchQuery.trim();

                                return (
                                    <Collapsible
                                        key={group}
                                        open={isOpen}
                                        onOpenChange={(open) => {
                                            if (open) {
                                                setOpenGroups([...openGroups, group]);
                                            } else {
                                                setOpenGroups(openGroups.filter(g => g !== group));
                                            }
                                        }}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={group}>
                                                    <GroupIcon />
                                                    <span>{group}</span>
                                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {sections.map((section) => (
                                                        <SidebarMenuSubItem key={section.id}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={section.id === activeSectionId}
                                                                onClick={() => onSelect(section.id)}
                                                                className="cursor-pointer [&>svg]:text-current"
                                                            >
                                                                <a className="flex items-center gap-2">
                                                                    {section.icon && <section.icon className="h-4 w-4" />}
                                                                    <span>{section.title}</span>
                                                                </a>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

// --- Main Page Component ---

export default function DocumentationPage() {
    const [activeSectionId, setActiveSectionId] = React.useState("getting-started");

    // Scroll to top when section changes
    React.useEffect(() => {
        const mainContent = document.getElementById("doc-scroll-area");
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [activeSectionId]);

    const activeContent = DOC_SECTIONS.find((s) => s.id === activeSectionId) || DOC_SECTIONS[0];

    return (
        <div className="[--header-height:calc(--spacing(14))]">
            <SidebarProvider className="flex flex-col h-svh overflow-hidden">
                <SiteHeader />
                <div className="flex flex-1 min-h-0">
                    <DocumentationSidebar
                        activeSectionId={activeSectionId}
                        onSelect={(id) => setActiveSectionId(id)}
                    />
                    <SidebarInset className="bg-background">
                        <div id="doc-scroll-area" className="flex-1 overflow-y-auto bg-background p-6 lg:p-10">
                            <div className="mx-auto max-w-4xl pb-20 animate-in fade-in-50 duration-300">
                                <div className="mb-10 border-b pb-8">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="p-3 bg-primary/10 rounded-full shrink-0">
                                            <activeContent.icon className="h-8 w-8 text-primary" />
                                        </div>
                                        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight lg:text-5xl">{activeContent.title}</h1>
                                    </div>
                                    <p className="text-xl text-muted-foreground leading-8 ml-1">
                                        {activeContent.description}
                                    </p>
                                </div>

                                {activeContent.content}
                            </div>
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </div>
    );
}

