// app/accounting/chart-of-accounts/group-management.tsx

"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTree, ChevronRight, Plus } from "lucide-react";
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import { cn } from "@/lib/utils";

interface GroupManagementProps {
  accounts: IChartOfAccount[];
  onCreateAccount: (prefilledGroup?: string, prefilledSubGroup?: string) => void;
  canCreate: boolean;
}

interface GroupedData {
  [group: string]: {
    [subGroup: string]: IChartOfAccount[];
  };
}

const GROUP_COLORS: Record<string, string> = {
  'Assets': 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20',
  'Liabilities': 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20',
  'Equity': 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20',
  'Income': 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20',
  'Expenses': 'border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20',
};

const GROUP_TEXT_COLORS: Record<string, string> = {
  'Assets': 'text-green-700 dark:text-green-300',
  'Liabilities': 'text-red-700 dark:text-red-300',
  'Equity': 'text-blue-700 dark:text-blue-300',
  'Income': 'text-emerald-700 dark:text-emerald-300',
  'Expenses': 'text-orange-700 dark:text-orange-300',
};

export function GroupManagement({ accounts, onCreateAccount, canCreate }: GroupManagementProps) {
  // Group accounts by group and subgroup
  const groupedAccounts = useMemo(() => {
    const grouped: GroupedData = {};

    accounts.forEach(account => {
      if (!grouped[account.groupName]) {
        grouped[account.groupName] = {};
      }
      if (!grouped[account.groupName][account.subGroup]) {
        grouped[account.groupName][account.subGroup] = [];
      }
      grouped[account.groupName][account.subGroup].push(account);
    });

    // Sort subgroups and accounts within each group
    Object.keys(grouped).forEach(group => {
      const sortedSubGroups: Record<string, IChartOfAccount[]> = {};
      Object.keys(grouped[group])
        .sort()
        .forEach(subGroup => {
          sortedSubGroups[subGroup] = grouped[group][subGroup].sort((a, b) => 
            a.accountCode.localeCompare(b.accountCode)
          );
        });
      grouped[group] = sortedSubGroups;
    });

    return grouped;
  }, [accounts]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const stats: Record<string, { total: number; active: number; subGroups: number }> = {};
    
    Object.keys(groupedAccounts).forEach(group => {
      const subGroups = Object.keys(groupedAccounts[group]);
      const allAccounts = subGroups.flatMap(sg => groupedAccounts[group][sg]);
      
      stats[group] = {
        total: allAccounts.length,
        active: allAccounts.filter(acc => acc.isActive).length,
        subGroups: subGroups.length,
      };
    });

    return stats;
  }, [groupedAccounts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {Object.keys(groupedAccounts).sort().map(group => {
          const subGroups = Object.keys(groupedAccounts[group]);
          const stats = statistics[group];

          return (
            <Card 
              key={group} 
              className={cn("overflow-hidden", GROUP_COLORS[group])}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className={cn("text-lg", GROUP_TEXT_COLORS[group])}>
                      {group}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {stats.subGroups} subgroup{stats.subGroups !== 1 ? 's' : ''} • {stats.total} account{stats.total !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="gray" appearance="outline">
                      {stats.active} Active
                    </Badge>
                    <Badge variant="gray" appearance="outline">
                      {stats.total - stats.active} Inactive
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {subGroups.map(subGroup => {
                  const subGroupAccounts = groupedAccounts[group][subGroup];

                  return (
                    <div key={subGroup} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium text-sm">{subGroup}</h4>
                          <Badge variant="gray" appearance="outline" className="text-xs">
                            {subGroupAccounts.length}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                        {subGroupAccounts.map(account => (
                          <div
                            key={account._id}
                            className={cn(
                              "p-3 rounded-md border bg-background/50",
                              !account.isActive && "opacity-50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-muted-foreground">
                                    {account.accountCode}
                                  </span>
                                  <Badge
                                    variant={account.nature === 'debit' ? 'primary' : 'warning'}
                                    appearance="outline"
                                    className="text-xs"
                                  >
                                    {account.nature[0].toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium truncate mt-1">
                                  {account.accountName}
                                </p>
                                {account.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {account.description}
                                  </p>
                                )}
                              </div>
                              {!account.isActive && (
                                <Badge variant="gray" appearance="light" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}