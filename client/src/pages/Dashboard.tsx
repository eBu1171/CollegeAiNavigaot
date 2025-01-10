import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  School,
  GraduationCap,
  BookOpen,
  Clock,
  Loader2,
} from "lucide-react";

type UserSchool = {
  id: number;
  name: string;
  status: string;
  deadline: string;
  progress: number;
  admissionTitle?: string;
};

type Stats = {
  totalSchools: number;
  completedApplications: number;
  averageProgress: number;
};

export default function Dashboard() {
  const { data: schools, isLoading: loadingSchools } = useQuery<UserSchool[]>({
    queryKey: ["/api/user-schools"],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<Stats>({
    queryKey: ["/api/user/stats"],
  });

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "interested":
        return "text-blue-500";
      case "applying":
        return "text-yellow-500";
      case "accepted":
        return "text-green-500";
      case "rejected":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getAdmissionBadgeColor = (title?: string): string => {
    if (!title) return "bg-gray-100 text-gray-800";
    if (title.toLowerCase().includes("competitive")) {
      return "bg-green-100 text-green-800";
    }
    if (title.toLowerCase().includes("average")) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Application Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          icon={School}
          title="Total Schools"
          value={stats?.totalSchools || 0}
          loading={loadingStats}
        />
        <StatsCard
          icon={GraduationCap}
          title="Completed Applications"
          value={stats?.completedApplications || 0}
          loading={loadingStats}
        />
        <StatsCard
          icon={BookOpen}
          title="Average Progress"
          value={`${stats?.averageProgress || 0}%`}
          loading={loadingStats}
        />
      </div>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Schools</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchools ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admission Title</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools?.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>
                      <span className={getStatusColor(school.status)}>
                        {school.status.charAt(0).toUpperCase() +
                          school.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {school.admissionTitle && (
                        <span
                          className={`px-2 py-1 rounded-full text-sm ${getAdmissionBadgeColor(
                            school.admissionTitle
                          )}`}
                        >
                          {school.admissionTitle}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(school.deadline).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={school.progress} className="w-[60%]" />
                        <span className="text-sm">{school.progress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  title,
  value,
  loading,
}: {
  icon: typeof School;
  title: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <Icon className="h-8 w-8 text-primary mr-4" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}