import { useState, createElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  Star,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Lock,
  Play,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Quest = {
  id: number;
  title: string;
  description: string;
  type: string;
  points: number;
  status: "not_started" | "in_progress" | "completed";
  progress: number | { [taskId: string]: boolean };
};

type Achievement = {
  id: number;
  title: string;
  description: string;
  type: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
};

type UserProgress = {
  totalPoints: number;
  level: number;
  questsCompleted: number;
  achievementsUnlocked: number;
  nextLevel: {
    pointsNeeded: number;
    progress: number;
  };
};

export default function LearningPath() {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: progress, isLoading: loadingProgress } = useQuery<UserProgress>({
    queryKey: ["/api/learning-path/progress"],
  });

  const { data: quests, isLoading: loadingQuests } = useQuery<Quest[]>({
    queryKey: ["/api/learning-path/quests"],
  });

  const { data: achievements, isLoading: loadingAchievements } = useQuery<Achievement[]>({
    queryKey: ["/api/learning-path/achievements"],
  });

  const getQuestIcon = (type: string) => {
    switch (type) {
      case "research":
        return BookOpen;
      case "profile":
        return GraduationCap;
      case "essay":
        return Star;
      case "application":
        return Trophy;
      default:
        return BookOpen;
    }
  };

  const getQuestStatusColor = (status: Quest["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "in_progress":
        return "text-yellow-500";
      default:
        return "text-blue-500";
    }
  };

  const startQuestMutation = useMutation({
    mutationFn: async (questId: number) => {
      const response = await fetch(`/api/learning-path/quests/${questId}/start`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path/quests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path/progress"] });
      toast({
        title: "Quest Started!",
        description: "Good luck on your journey!",
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

  const completeTaskMutation = useMutation({
    mutationFn: async ({ questId, taskId }: { questId: number; taskId: string }) => {
      const response = await fetch(
        `/api/learning-path/quests/${questId}/tasks/${taskId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path/quests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-path/progress"] });

      if (data.achievement) {
        toast({
          title: "Achievement Unlocked! 🎉",
          description: data.achievement.title,
        });
      }

      if (data.levelUp) {
        toast({
          title: "Level Up! 🌟",
          description: `Congratulations! You've reached level ${data.newLevel}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartQuest = (quest: Quest) => {
    startQuestMutation.mutate(quest.id);
    setActiveQuest(quest);
  };

  const handleCompleteTask = (questId: number, taskId: string) => {
    completeTaskMutation.mutate({ questId, taskId });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Learning Path</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Level</p>
                {loadingProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold">{progress?.level}</p>
                )}
              </div>
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            {progress && (
              <Progress
                value={progress.nextLevel.progress}
                className="h-2"
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {progress?.nextLevel.pointsNeeded} points to next level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Points</p>
              {loadingProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <p className="text-2xl font-bold">{progress?.totalPoints}</p>
              )}
            </div>
            <Star className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Quests Completed</p>
              {loadingProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <p className="text-2xl font-bold">{progress?.questsCompleted}</p>
              )}
            </div>
            <BookOpen className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Achievements</p>
              {loadingProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <p className="text-2xl font-bold">{progress?.achievementsUnlocked}</p>
              )}
            </div>
            <Award className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {loadingQuests ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : quests?.length ? (
                  <div className="space-y-4">
                    {quests.map((quest) => (
                      <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <Card className="transition-shadow hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div
                                className={`p-2 rounded-lg ${
                                  quest.status === "completed"
                                    ? "bg-green-100"
                                    : quest.status === "in_progress"
                                    ? "bg-yellow-100"
                                    : "bg-primary/10"
                                }`}
                              >
                                {createElement(getQuestIcon(quest.type), {
                                  className: "h-6 w-6 text-primary",
                                })}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{quest.title}</h3>
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {quest.points} points
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {quest.description}
                                </p>
                                <div className="flex items-center justify-between mt-4">
                                  <div className="flex items-center gap-2">
                                    {quest.status === "completed" ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : quest.status === "in_progress" ? (
                                      <Clock className="h-4 w-4 text-yellow-500" />
                                    ) : null}
                                    <span
                                      className={`text-sm font-medium ${getQuestStatusColor(
                                        quest.status
                                      )}`}
                                    >
                                      {quest.status === "completed"
                                        ? "Completed"
                                        : quest.status === "in_progress"
                                        ? "In Progress"
                                        : "Not Started"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    {quest.status === "not_started" && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => handleStartQuest(quest)}
                                        disabled={startQuestMutation.isPending}
                                      >
                                        <Play className="h-4 w-4" />
                                        Start Quest
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => setSelectedQuest(quest)}
                                    >
                                      View Details
                                      <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                  </div>
                                </div>
                                {quest.status === "in_progress" && typeof quest.progress === 'number' && (
                                  <div className="mt-4">
                                    <Progress value={quest.progress * 100} className="h-2" />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {Math.round(quest.progress * 100)}% complete
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No quests available at the moment.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {loadingAchievements ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : achievements?.length ? (
                  <div className="space-y-4">
                    {achievements.map((achievement) => (
                      <Card
                        key={achievement.id}
                        className={`transition-all ${
                          achievement.unlocked
                            ? "bg-primary/5"
                            : "opacity-50 grayscale"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-lg ${
                                achievement.unlocked
                                  ? "bg-primary/10"
                                  : "bg-muted"
                              }`}
                            >
                              {createElement(
                                achievement.unlocked ? Award : Lock,
                                {
                                  className: "h-6 w-6 text-primary",
                                }
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {achievement.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {achievement.description}
                              </p>
                              {achievement.unlocked && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Unlocked{" "}
                                  {new Date(
                                    achievement.unlockedAt!
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No achievements available yet.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {activeQuest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {activeQuest.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{activeQuest.description}</p>

              <div className="space-y-2">
                {activeQuest.progress && typeof activeQuest.progress === 'object' && Object.entries(activeQuest.progress).map(([taskId, completed]) => (
                  <div
                    key={taskId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      Task {parseInt(taskId) + 1}
                    </span>
                    {!completed && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteTask(activeQuest.id, taskId)}
                        disabled={completeTaskMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setActiveQuest(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}