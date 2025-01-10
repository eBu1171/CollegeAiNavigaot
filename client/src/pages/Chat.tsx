import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, School as SchoolIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schools, isLoading: loadingSchools } = useQuery<{ schools: School[] }>({
    queryKey: ["/api/user/stats"],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat", selectedSchool?.id],
    enabled: !!selectedSchool,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedSchool) {
        throw new Error("Please select a school first");
      }

      const response = await fetch(`/api/chat/${selectedSchool.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send message");
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-2rem)]">
      <div className="grid grid-cols-12 gap-8 h-full">
        {/* School List */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SchoolIcon className="h-5 w-5" />
                My Schools
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSchools ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : schools?.schools && schools.schools.length > 0 ? (
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="space-y-2">
                    {schools.schools.map((school) => (
                      <Button
                        key={school.id}
                        variant={
                          selectedSchool?.id === school.id
                            ? "secondary"
                            : "ghost"
                        }
                        className="w-full justify-start"
                        onClick={() => setSelectedSchool(school)}
                      >
                        <div className="text-left">
                          <div>{school.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {school.location}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No schools added yet.</p>
                  <Button
                    variant="link"
                    onClick={() => window.location.href = '/find-school'}
                    className="mt-2"
                  >
                    Add schools to start chatting
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="col-span-9">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedSchool
                  ? `Chat about ${selectedSchool.name}`
                  : "Select a school to start chatting"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 mb-4 pr-4">
                <AnimatePresence initial={false}>
                  {loadingMessages ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages?.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${
                            message.isAI ? "justify-start" : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-4 rounded-lg shadow-sm ${
                              message.isAI
                                ? "bg-muted"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            <span className="text-xs opacity-70 mt-2 block">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                      {sendMessageMutation.isPending && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="max-w-[70%] p-4 rounded-lg shadow-sm bg-muted">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">AI is thinking...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder={
                    selectedSchool
                      ? "Type your message..."
                      : "Select a school first"
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={!selectedSchool || sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    !selectedSchool ||
                    !messageInput.trim() ||
                    sendMessageMutation.isPending
                  }
                  className="w-24"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}