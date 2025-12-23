"use client"

import * as React from "react"
import Link from "next/link"
import {
  PlusCircle,
  ChevronRight,
  Mail,
  type LucideIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const { state, setOpenMobile, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [openItems, setOpenItems] = React.useState<string[]>([])

  const handleCollapsibleTrigger = (item: NavItem) => {
    // If sidebar is collapsed and item has children, expand the sidebar and open this dropdown
    if (isCollapsed && item.items && item.items.length > 0) {
      toggleSidebar()
      // Set a small delay to ensure sidebar expands before opening dropdown
      setTimeout(() => {
        setOpenItems([item.title])
      }, 100)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* Top: Quick Create Button */}
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton tooltip="Quick Create" asChild>
              <Link
                href="/billing"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Bill</span>
              </Link>
            </SidebarMenuButton>
            {/* <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <Mail />
              <span className="sr-only">Inbox</span>
            </Button> */}
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Navigation Items */}
        <SidebarMenu>
          {items.map((item) => {
            // If item has no children, render as a simple menu item
            if (!item.items || item.items.length === 0) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            // If item has children, render as collapsible with proper shadcn structure
            return (
              <Collapsible
                key={item.title}
                asChild
                open={openItems.includes(item.title)}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenItems([...openItems, item.title])
                  } else {
                    setOpenItems(openItems.filter(title => title !== item.title))
                  }
                }}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild onClick={() => handleCollapsibleTrigger(item)}>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}