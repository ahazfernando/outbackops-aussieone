import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Star, Users, Calendar, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { title: 'Clock In Today', value: '08:30 AM', icon: Clock, color: 'text-blue-600' },
    { title: 'This Week Rating', value: '4.5/5', icon: Star, color: 'text-yellow-600' },
    { title: 'Active Leads', value: '23', icon: Users, color: 'text-green-600' },
    { title: 'Leave Requests', value: '5 Pending', icon: Calendar, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground mt-1">We Will Australia Operations Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Clock in/out for time tracking</span>
              </p>
              <p className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span>Submit weekly ratings</span>
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>View and manage leads</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium">New lead added</p>
                  <p className="text-muted-foreground text-xs">Sydney - 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Star className="h-4 w-4 mt-0.5 text-yellow-600" />
                <div>
                  <p className="font-medium">Rating submitted</p>
                  <p className="text-muted-foreground text-xs">Weekly review - 1 day ago</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Clock in recorded</p>
                  <p className="text-muted-foreground text-xs">Today at 08:30 AM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {user?.role === 'itteam' && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Limited Access Notice</CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              IT team has restricted access by default. Contact an admin to request specific permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
