import { useEffect, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Inbox, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { loadConversationsForUser, type Conversation } from "@/lib/messaging";
import { Card, CardContent } from "@/components/ui/card";

export default function MessagesList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    loadConversationsForUser(user.uid)
      .then((results) =>
        setConversations(
          results.sort((a, b) => {
            const aTime = a.lastMessageAt ?? a.createdAt;
            const bTime = b.lastMessageAt ?? b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          }),
        ),
      )
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-gray-500">Your job-request conversations</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-700">No conversations yet</p>
            <p className="text-xs mt-1 text-muted-foreground">
              Start a conversation from a job request or quote card.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const lastTime = c.lastMessageAt ?? c.createdAt;
            return (
              <Link href={`/messages/${c.id}`} key={c.id}>
                <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">
                          {c.jobRequestTitle}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(lastTime), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {c.lastMessage ? (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {c.lastMessage}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          No messages yet — say hello!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
