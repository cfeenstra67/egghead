import type { QuerySessionsRequest } from "@/src/server";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useContext, useState } from "react";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast.js";
import { AppContext } from "../lib";
import SearchResults from "./SearchResults.js";
import { Button } from "./ui/button.js";
import { Checkbox } from "./ui/checkbox.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.js";
import { Label } from "./ui/label.js";
import { ScrollArea } from "./ui/scroll-area.js";

export interface DeleteSubmissionModalProps {
  request: Omit<QuerySessionsRequest, "skip" | "limit">;
  open?: boolean;
  onOpenChanged?: (open: boolean) => void;
  onDelete?: (ids: string[]) => void;
}

export function DeleteSessionModal({
  request,
  open,
  onOpenChanged,
  onDelete,
}: DeleteSubmissionModalProps) {
  const [deleteFromChrome, setDeleteFromChrome] = useState(true);
  const { serverClientFactory } = useContext(AppContext);

  const queryClient = useQueryClient();

  const { toast } = useToast();

  const pageSize = 200;

  const sessionsQuery = useInfiniteQuery({
    enabled: !!open,
    queryKey: ["deleteHistory", request],
    queryFn: async ({ pageParam }) => {
      const client = await serverClientFactory();
      return await client.querySessions({
        ...request,
        isSearch: true,
        skip: pageParam,
        limit: pageSize,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage.results.length === 0) {
        return null;
      }
      return lastPageParam + pageSize;
    },
  });

  const deleteSessions = useMutation({
    mutationKey: ["deleteSessions", request, deleteFromChrome],
    mutationFn: async () => {
      const client = await serverClientFactory();

      return await client.deleteSessions({
        ...request,
        deleteCorrespondingChromeHistory: deleteFromChrome,
      });
    },
    onSuccess: (response) => {
      onDelete?.(response.deletedSessionIds);
      queryClient.invalidateQueries({
        queryKey: ["history"],
      });
    },
    onError: (error) => {
      console.error("Error deleting sessions", error);
      toast({ title: "An error occurred", variant: "destructive" });
    },
  });

  const countString =
    sessionsQuery.data?.pages[0].totalCount.toString() ?? "...";

  return (
    <Dialog open={open} onOpenChange={onOpenChanged}>
      <DialogContent className="max-w-[600px]">
        <div className="max-w-full space-y-4 overflow-auto">
          <DialogHeader className="gap-4">
            <DialogTitle>
              Are you sure you want to delete {countString} item(s)?
            </DialogTitle>
            <DialogDescription>
              <strong>This operation is not reversible.</strong> If you wish,
              you can back up your data first using the "Export Database" option
              in the{" "}
              <Link href="/settings/import-export" className="underline">
                Settings
              </Link>
              .
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex flex-col gap-2 border-destructive border p-2 rounded max-h-60">
            <SearchResults
              sessions={
                sessionsQuery.data?.pages.flatMap((p) => p.results) ?? []
              }
              isLoading={sessionsQuery.status === "pending"}
              onEndReached={() => sessionsQuery.fetchNextPage()}
            />
          </ScrollArea>
          <div className="flex gap-4 px-4">
            <Checkbox
              id="deleteFromChrome"
              checked={deleteFromChrome}
              onCheckedChange={(c) => {
                if (c !== "indeterminate") {
                  setDeleteFromChrome(c);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="deleteFromChrome">
                Also delete from browser history storage
              </Label>
              <div className="text-sm text-muted-foreground">
                Egghead uses a separate storage location on your device to store
                more detailed history information than your browser normally
                does. If you check this box, these history items will be deleted
                from both locations instead of only Egghead's storage.
                <br />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              className="justify-self-center"
              disabled={
                deleteSessions.status === "pending" ||
                sessionsQuery.status === "pending"
              }
              onClick={() => deleteSessions.mutate()}
            >
              <Trash2 />
              Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
