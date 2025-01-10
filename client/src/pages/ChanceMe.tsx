import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ChanceMeForm = {
  schoolId: string;
  gpa: string;
  sat?: string;
  act?: string;
  extracurriculars: string;
  essays: string;
};

export default function ChanceMe() {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<ChanceMeForm>();

  const chanceMeMutation = useMutation({
    mutationFn: async (data: ChanceMeForm) => {
      const response = await fetch("/api/chance-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit ChanceMe request");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: "Your admission chances have been calculated!",
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

  const onSubmit = (data: ChanceMeForm) => {
    chanceMeMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Calculate Your Chances</h1>

        <Card>
          <CardHeader>
            <CardTitle>Academic Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="school">Select School</Label>
                <Select {...register("schoolId", { required: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Harvard University</SelectItem>
                    <SelectItem value="2">Stanford University</SelectItem>
                    <SelectItem value="3">MIT</SelectItem>
                    {/* Add more schools */}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpa">GPA (Required)</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="Enter your GPA (e.g., 3.85)"
                  {...register("gpa", { required: true })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sat">SAT Score (Optional)</Label>
                  <Input
                    id="sat"
                    type="number"
                    min="400"
                    max="1600"
                    placeholder="Your SAT score"
                    {...register("sat")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="act">ACT Score (Optional)</Label>
                  <Input
                    id="act"
                    type="number"
                    min="1"
                    max="36"
                    placeholder="Your ACT score"
                    {...register("act")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extracurriculars">
                  Extracurricular Activities
                </Label>
                <Textarea
                  id="extracurriculars"
                  placeholder="List your activities, leadership roles, and achievements..."
                  className="h-32"
                  {...register("extracurriculars", { required: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="essays">Essays & Personal Statement</Label>
                <Textarea
                  id="essays"
                  placeholder="Paste your essay or describe your main essay themes..."
                  className="h-48"
                  {...register("essays", { required: true })}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={chanceMeMutation.isPending}
              >
                {chanceMeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Calculate My Chances"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {chanceMeMutation.data && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{
                  __html: chanceMeMutation.data.aiAnalysis,
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
