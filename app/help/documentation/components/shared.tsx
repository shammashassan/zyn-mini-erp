"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const PermissionTable = ({
    resourceName,
    userPerms,
    managerPerms,
    adminPerms,
}: {
    resourceName: string;
    userPerms: string;
    managerPerms: string;
    adminPerms: string;
}) => (
    <div className="my-8 rounded-md border">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px]">Role</TableHead>
                    <TableHead>Permissions for {resourceName}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow className="hover:bg-transparent">
                    <TableCell className="font-medium text-muted-foreground">User</TableCell>
                    <TableCell>{userPerms}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                    <TableCell className="font-medium text-muted-foreground">Manager</TableCell>
                    <TableCell>{managerPerms}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                    <TableCell className="font-medium text-muted-foreground">Admin</TableCell>
                    <TableCell>{adminPerms}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
);

export const Step = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="group relative border-l-4 border-muted pl-6 pb-8 last:pb-0 last:border-l-0">
        {/* Vertical line fix for last item */}
        <div className="absolute -left-1 top-0 h-full w-1 bg-muted group-last:bg-transparent" />

        <div className="absolute -left-[9px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-muted">
            <div className="h-2 w-2 rounded-full bg-primary" />
        </div>

        <h3 className="text-base font-semibold tracking-tight mb-2 mt-[-3px]">{title}</h3>
        <div className="text-muted-foreground text-sm/relaxed space-y-2">
            {children}
        </div>
    </div>
);
