"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
    GROUPED_SECTIONS,
    GroupsOrder,
    type DocSection
} from "@/app/(docs)/docs/content";

export function DocumentationSidebar({
    activeSectionId,
    onSectionSelect,
    ...props
}: {
    activeSectionId: string;
    onSectionSelect: (id: string) => void;
} & React.ComponentProps<typeof Sidebar>) {
    const { state } = useSidebar();
    const [searchQuery, setSearchQuery] = React.useState("");

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
            collapsible="offcanvas"
            variant="inset"
            className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
            {...props}
        >
            <SidebarHeader className="h-auto px-4 py-4 group-data-[collapsible=icon]:hidden">
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
                {GroupsOrder.map((group) => {
                    const sections = filteredGroups[group];
                    if (!sections) return null;

                    return (
                        <SidebarGroup key={group}>
                            <SidebarGroupLabel>{group}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {sections.map((section) => (
                                        <SidebarMenuItem key={section.id}>
                                            <SidebarMenuButton
                                                isActive={section.id === activeSectionId}
                                                onClick={() => onSectionSelect(section.id)}
                                                tooltip={section.title}
                                                className="cursor-pointer"
                                            >
                                                <section.icon className="h-4 w-4" />
                                                <span>{section.title}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>
        </Sidebar>
    );
}
