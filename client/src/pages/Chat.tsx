import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Loader2,
  ChevronRight,
  School as SchoolIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number;
  content: string;
  isAI: boolean;
  createdAt: string;
};

type School = {
  id: number;
  name: string;
  location: string;
  status: string;
};

export default function Chat() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's schools
  const { data: userStats } = useQuery<{ schools: School[] }>({
    queryKey: ["/api/user/stats"],
  });

  // Get chat messages for selected school
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat", selectedSchool?.id],
    enabled: !!selectedSchool,
    onError: (error: Error) => {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedSchool) {
        throw new Error("Please select a school first");
      }
      
      console.log('Sending message to school:', selectedSchool);
      const response = await fetch(`/api/chat/${selectedSchool.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || "Failed to send message");
        } catch {
          throw new Error(text || "Failed to send message");
        }
      }

      return response.json();
    },
    onSuccess: (newMessages) => {
      queryClient.setQueryData(
        ["/api/chat", selectedSchool?.id],
        (oldMessages: Message[] = []) => [...oldMessages, ...newMessages]
      );
      setMessageInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedSchool || sendMessage.isPending) return;
    sendMessage.mutate(messageInput);
  };

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)] flex gap-4">
      {/* Schools Sidebar */}
      <Card className="w-64">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SchoolIcon className="h-5 w-5" />
            My Schools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {userStats?.schools?.map((school) => (
                <Button
                  key={school.id}
                  variant={selectedSchool?.id === school.id ? "secondary" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setSelectedSchool(school)}
                >
                  <div className="text-left">
                    <div className="font-medium">{school.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {school.location}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ))}
              {!userStats?.schools?.length && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>No schools added yet</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => {
                      window.location.href = "/find-school";
                    }}
                  >
                    Add schools to start chatting
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {selectedSchool ? `Chat about ${selectedSchool.name}` : "Select a school"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col h-[calc(100vh-16rem)]">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${message.isAI ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-lg ${
                            message.isAI
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs mt-1 block opacity-70">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : selectedSchool ? (
                  <div className="text-center text-muted-foreground">
                    Start chatting about {selectedSchool.name}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Select a school to start chatting
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Form */}
            <div className="p-4 border-t">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={selectedSchool ? "Type your message..." : "Select a school"}
                  disabled={!selectedSchool || sendMessage.isPending}
                />
                <Button
                  type="submit"
                  disabled={!selectedSchool || !messageInput.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}