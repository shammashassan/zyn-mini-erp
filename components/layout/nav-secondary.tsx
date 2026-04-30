"use client"

import * as React from "react"
import Link from "next/link"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CommandMenu } from "@/components/layout/command-menu"
import { Kbd } from "../ui/kbd"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [commandOpen, setCommandOpen] = React.useState(false)

  return (
    <>
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              // Handle Search button specially
              if (item.title === "Search") {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => setCommandOpen(true)}
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <Kbd className="ml-auto">
                        ⌘ K
                      </Kbd>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              // Regular navigation items
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}