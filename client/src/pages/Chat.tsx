import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";

type Message = {
  id: number;
  content: string;
  isAI: boolean;
  timestamp: string;
};

type School = {
  id: number;
  name: string;
};

export default function Chat() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [messageInput, setMessageInput] = useState("");

  const { data: schools, isLoading: loadingSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat", selectedSchool?.id],
    enabled: !!selectedSchool,
  });

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // TODO: Implement message sending
    setMessageInput("");
  };

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-2rem)]">
      <div className="grid grid-cols-12 gap-8 h-full">
        {/* School List */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Your Schools</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSchools ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="space-y-2">
                    {schools?.map((school) => (
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
                        {school.name}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
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
              <ScrollArea className="flex-1 mb-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages?.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.isAI ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.isAI
                              ? "bg-secondary"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p>{message.content}</p>
                          <span className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={!selectedSchool}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!selectedSchool || !messageInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
