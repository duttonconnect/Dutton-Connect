import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadConversation,
  subscribeToMessages,
  sendMessage,
  type Conversation,
  type Message,
} from "@/lib/messaging";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const { user } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingConv, setLoadingConv] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    loadConversation(conversationId)
      .then(setConversation)
      .finally(() => setLoadingConv(false));
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeToMessages(conversationId, setMessages);
    return unsub;
  }, [conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !conversationId) return;
    setText("");
    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, trimmed);
    } catch {
      toast.error("Failed to send. Try again.");
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingConv) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Conversation not found.</p>
        <Link href="/messages">
          <Button variant="outline" size="sm" className="mt-3">
            Back to Messages
          </Button>
        </Link>
      </div>
    );
  }

  if (user && !conversation.participants.includes(user.uid)) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>You don't have access to this conversation.</p>
        <Link href="/messages">
          <Button variant="outline" size="sm" className="mt-3">
            Back to Messages
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Link href="/messages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="font-semibold truncate">{conversation.jobRequestTitle}</div>
          <div className="text-xs text-muted-foreground">Job request conversation</div>
        </div>
      </div>

      {/* Messages */}
      <div className="border rounded-xl bg-gray-50 p-4 min-h-[260px] max-h-[55vh] overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-8">
            No messages yet. Send one to get started.
          </div>
        ) : (
          messages.map((m) => {
            const isOwn = m.senderId === user?.uid;
            return (
              <div
                key={m.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOwn
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 border rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                    {m.text}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwn ? "text-blue-200 text-right" : "text-gray-400"
                    }`}
                  >
                    {format(new Date(m.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none flex-1"
          disabled={sending}
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          size="icon"
          className="h-[4.5rem] w-12 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
