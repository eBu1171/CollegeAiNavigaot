
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  content: string;
  role: 'user' | 'ai';
  createdAt: string;
}

export default function Chat() {
  const { schoolId } = useParams();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/chat/${schoolId}`],
    enabled: !!schoolId,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/chat/${schoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData([`/api/chat/${schoolId}`], (old: Message[] = []) => [
        ...old,
        ...newMessages,
      ]);
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full gap-4">
        <ScrollArea className="flex-1 p-4 rounded-lg border">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <Card 
                key={msg.id || i} 
                className={`p-4 max-w-[80%] ${
                  msg.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto'
                }`}
              >
                {msg.content}
              </Card>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sendMessage.isPending}
          />
          <Button type="submit" disabled={sendMessage.isPending || !message.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
