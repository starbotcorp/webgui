import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  onConfirm,
  isPending,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <Input
          value={folderName}
          onChange={(e) => onFolderNameChange(e.target.value)}
          placeholder="Folder name"
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!folderName.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  folderId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteFolderDialog({
  folderId,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteFolderDialogProps) {
  return (
    <Dialog open={!!folderId} onOpenChange={() => onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Folder?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">Chats will be moved to root.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteChatDialogProps {
  chat: { id: string; title: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteChatDialog({
  chat,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteChatDialogProps) {
  return (
    <Dialog open={!!chat} onOpenChange={() => onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chat?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          Are you sure you want to delete "{chat?.title}"?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RenameChatDialogProps {
  chat: { id: string; currentTitle: string } | null;
  newTitle: string;
  onNewTitleChange: (title: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function RenameChatDialog({
  chat,
  newTitle,
  onNewTitleChange,
  onOpenChange,
  onConfirm,
  isPending,
}: RenameChatDialogProps) {
  return (
    <Dialog open={!!chat} onOpenChange={() => onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
        </DialogHeader>
        <Input
          value={newTitle}
          onChange={(e) => onNewTitleChange(e.target.value)}
          placeholder="Chat title"
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!newTitle.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
