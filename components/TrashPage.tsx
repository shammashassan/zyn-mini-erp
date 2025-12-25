"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, RefreshCw, AlertTriangle, PackageX, Undo2, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TrashPageProps<T> {
  title: string;
  description: string;
  icon: React.ReactNode;
  apiEndpoint: string;
  restoreEndpoint: string;
  deleteEndpoint: string;
  backUrl: string;
  backLabel: string;
  getItemName: (item: T) => string;
  getItemDescription?: (item: T) => string;
}

export function TrashPage<T extends { _id: string; deletedAt?: Date | string; deletedBy?: string }>({
  title,
  description,
  icon,
  apiEndpoint,
  restoreEndpoint,
  deleteEndpoint,
  backUrl,
  backLabel,
  getItemName,
  getItemDescription,
}: TrashPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const fetchTrashItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(apiEndpoint);
      if (!res.ok) throw new Error("Failed to fetch trash items");
      const data = await res.json();
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      toast.error("Could not load trash items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter((item) => {
        const name = getItemName(item).toLowerCase();
        const desc = getItemDescription ? getItemDescription(item).toLowerCase() : "";
        return name.includes(query) || desc.includes(query);
      });
      setFilteredItems(filtered);
    }
  }, [searchQuery, items]);

  const handleRestore = async (item: T) => {
    try {
      const res = await fetch(restoreEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id }),
      });

      if (!res.ok) throw new Error("Failed to restore item");

      toast.success("Item restored successfully.");
      fetchTrashItems();
    } catch (error) {
      toast.error("Failed to restore item.");
    }
  };

  const handlePermanentDelete = async (item: T) => {
    try {
      const res = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id }),
      });

      if (!res.ok) throw new Error("Failed to delete item");

      toast.success("Item permanently deleted.");
      fetchTrashItems();
      setShowDeleteDialog(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error("Failed to permanently delete item.");
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const promises = items.map((item) =>
        fetch(deleteEndpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item._id }),
        })
      );

      await Promise.all(promises);

      toast.success(`All ${items.length} items permanently deleted from trash.`);

      fetchTrashItems();
      setShowEmptyTrashDialog(false);
    } catch (error) {
      toast.error("Failed to empty trash.");
    }
  };

  const openDeleteDialog = (item: T) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                  <Badge variant="destructive" appearance="light">
                    {items.length}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = backUrl)}
                className="gap-2"
              >
                <Undo2 className="h-4 w-4" />
                {backLabel}
              </Button>
              {items.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowEmptyTrashDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Empty Trash
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Deleted Items</CardTitle>
                <CardDescription>
                  Items will be permanently deleted after 30 days
                </CardDescription>
                {items.length > 0 && (
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search deleted items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading...</div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {filteredItems.map((item) => (
                      <Item key={item._id} variant="outline">
                        <ItemContent>
                          <ItemTitle>{getItemName(item)}</ItemTitle>
                          <ItemDescription>
                            {getItemDescription ? (
                              <span className="block mb-1">{getItemDescription(item)}</span>
                            ) : (
                              <span className="flex items-center gap-2 text-xs">
                                <span>
                                  Deleted{" "}
                                  {item.deletedAt
                                    ? formatDistanceToNow(new Date(item.deletedAt), {
                                        addSuffix: true,
                                      })
                                    : "at unknown time"}
                                </span>
                                {item.deletedBy && (
                                  <>
                                    <span>•</span>
                                    <span>by @{item.deletedBy}</span>
                                  </>
                                )}
                              </span>
                            )}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(item)}
                            className="gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(item)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </ItemActions>
                      </Item>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? "No results found" : "Trash is empty"}
                    </h3>
                    <p className="text-muted-foreground text-center">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "No deleted items to display"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Single Item Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete Item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{selectedItem ? getItemName(selectedItem) : "this item"}</strong> from
              the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && handlePermanentDelete(selectedItem)}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Dialog */}
      <AlertDialog open={showEmptyTrashDialog} onOpenChange={setShowEmptyTrashDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Empty Entire Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>all {items.length} items</strong> from the trash.
              <br />
              <br />
              Are you absolutely sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}