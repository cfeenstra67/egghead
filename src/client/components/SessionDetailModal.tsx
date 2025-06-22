import SessionDetail from "./SessionDetail.js";
import { Dialog, DialogContent } from "./ui/dialog.js";

export interface SessionDetailModalProps {
  sessionId: string;
  open: boolean;
  onOpenChanged?: (open: boolean) => void;
}

export default function SessionDetailModal({
  sessionId,
  open,
  onOpenChanged,
}: SessionDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChanged}>
      <DialogContent className="max-w-[800px] h-[85%] overflow-hidden pt-12 flex flex-col">
        <SessionDetail
          sessionId={sessionId}
          onDelete={() => onOpenChanged?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
