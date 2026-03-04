import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Chat } from '@/lib/types';

interface SidebarChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
  onRename: (e: React.MouseEvent, chatId: string, currentTitle: string) => void;
  onDelete: (e: React.MouseEvent, chatId: string, chatTitle: string) => void;
}

export function SortableChatItem({
  chat,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: SidebarChatItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center group",
        isDragging && "opacity-50"
      )}
    >
      <Button
        variant="ghost"
        className={cn(
          "flex-1 justify-start font-normal h-10 rounded-xl px-2 pr-1",
          isSelected
            ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
            : "text-slate-700 hover:bg-slate-100"
        )}
        onClick={() => onSelect(chat.id)}
        {...attributes}
        {...listeners}
      >
        <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate flex-1 text-left">{chat.title}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => onRename(e, chat.id, chat.title)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => onDelete(e, chat.id, chat.title)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
