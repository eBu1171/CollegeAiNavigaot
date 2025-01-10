import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SchoolSearchForm = {
  location: string;
  major: string;
  satScore?: string;
  gpa?: string;
};

type SchoolRecommendation = {
  id: number;
  name: string;
  location: string;
  description: string;
  acceptanceRate?: number;
  match: number;
};

export default function FindSchool() {
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { control, register, handleSubmit, formState: { isSubmitting } } = useForm<SchoolSearchForm>();

  const { data: recommendations, isLoading } = useQuery<SchoolRecommendation[]>({
    queryKey: ["/api/schools/search"],
    enabled: searching,
  });

  const searchMutation = useMutation({
    mutationFn: async (data: SchoolSearchForm) => {
      const response = await fetch("/api/schools/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSearching(true);
      queryClient.setQueryData(["/api/schools/search"], data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SchoolSearchForm) => {
    searchMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Find Your Perfect School</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Search Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location">Preferred Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. California, Northeast, etc."
                  {...register("location")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">Intended Major</Label>
                <Controller
                  name="major"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a major" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="arts">Arts & Humanities</SelectItem>
                        <SelectItem value="science">Natural Sciences</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="satScore">SAT Score (optional)</Label>
                <Input
                  id="satScore"
                  type="number"
                  placeholder="Your SAT score"
                  {...register("satScore")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpa">GPA (optional)</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  placeholder="Your GPA"
                  {...register("gpa")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Find Schools
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : recommendations ? (
              <div className="space-y-4">
                {recommendations.map((school) => (
                  <Card key={school.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{school.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {school.location}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {(school.match * 100).toFixed(0)}% match
                            </p>
                            {school.acceptanceRate && (
                              <p className="text-sm text-muted-foreground">
                                {school.acceptanceRate}% acceptance rate
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {school.description}
                        </p>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Enter your criteria and click "Find Schools" to get personalized
                recommendations
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}