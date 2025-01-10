import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  School as SchoolIcon,
  Calendar as CalendarIcon,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type School = {
  id: number;
  name: string;
  location: string;
  deadlines: {
    earlyAction?: string;
    earlyDecision?: string;
    regularDecision: string;
    financialAid?: string;
    scholarship?: string;
  };
};

type ChecklistItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  completed: boolean;
  dueDate: string;
  completedAt?: string;
};

export default function Timeline() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schools, isLoading: loadingSchools } = useQuery<School[]>({
    queryKey: ["/api/timeline/schools"],
  });

  const { data: checklist, isLoading: loadingChecklist } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/timeline/checklist", selectedSchool?.id],
    enabled: !!selectedSchool,
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      const response = await fetch(`/api/timeline/checklist/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/timeline/checklist", selectedSchool?.id],
      });
      toast({
        title: "Success",
        description: "Checklist item updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getDeadlineType = (type: string) => {
    switch (type) {
      case "earlyAction":
        return "Early Action";
      case "earlyDecision":
        return "Early Decision";
      case "regularDecision":
        return "Regular Decision";
      case "financialAid":
        return "Financial Aid";
      case "scholarship":
        return "Scholarship";
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Application Timeline</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Schools List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SchoolIcon className="h-5 w-5" />
                My Schools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {loadingSchools ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : schools?.length ? (
                  <div className="space-y-2">
                    {schools.map((school) => (
                      <Button
                        key={school.id}
                        variant={
                          selectedSchool?.id === school.id ? "secondary" : "ghost"
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
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No schools added yet.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Timeline & Checklist */}
        <div className="md:col-span-2 space-y-6">
          {selectedSchool ? (
            <>
              {/* Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Application Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(selectedSchool.deadlines).map(
                      ([type, date]) =>
                        date && (
                          <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted"
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-medium">
                                  {getDeadlineType(type)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Due {formatDate(date)}
                                </div>
                              </div>
                            </div>
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          </motion.div>
                        )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Application Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingChecklist ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : checklist?.length ? (
                    <div className="space-y-4">
                      {checklist.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-4 p-4 rounded-lg bg-muted"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`shrink-0 ${
                              item.completed
                                ? "text-green-500 hover:text-green-600"
                                : "text-muted-foreground"
                            }`}
                            onClick={() =>
                              toggleItemMutation.mutate({
                                itemId: item.id,
                                completed: !item.completed,
                              })
                            }
                            disabled={toggleItemMutation.isPending}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{item.name}</h3>
                              <span className="text-sm text-muted-foreground">
                                Due {formatDate(item.dueDate)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                            {item.completed && item.completedAt && (
                              <p className="text-xs text-green-500 mt-2">
                                Completed on {formatDate(item.completedAt)}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No checklist items available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              <p>Select a school to view timeline and checklist</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
