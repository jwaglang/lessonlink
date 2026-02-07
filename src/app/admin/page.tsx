'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  Star,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PageHeader from '@/components/page-header';

interface DashboardStats {
  totalStudents: number;
  totalLessons: number;
  upcomingLessons: number;
  completedLessons: number;
  totalReviews: number;
  pendingApprovals: number;
  averageRating: number;
}

interface RecentReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalLessons: 0,
    upcomingLessons: 0,
    completedLessons: 0,
    totalReviews: 0,
    pendingApprovals: 0,
    averageRating: 0,
  });
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch students count
        const studentsSnap = await getDocs(collection(db, 'students'));
        const totalStudents = studentsSnap.size;

        // Fetch lessons
        const lessonsSnap = await getDocs(collection(db, 'sessionInstances'));
        const lessons = lessonsSnap.docs.map(doc => doc.data());
        const totalLessons = lessons.length;
        const now = new Date().toISOString();
        const upcomingLessons = lessons.filter(l => l.date > now).length;
        const completedLessons = lessons.filter(l => l.date <= now).length;

        // Fetch reviews
        const reviewsSnap = await getDocs(collection(db, 'reviews'));
        const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalReviews = reviews.length;
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, r: any) => sum + (r.rating || 0), 0) / reviews.length
          : 0;

        // Recent reviews (sorted by createdAt)
        const sortedReviews = reviews
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5) as RecentReview[];
        setRecentReviews(sortedReviews);

        // Fetch pending approvals
        const approvalsSnap = await getDocs(
          query(collection(db, 'approvalRequests'), where('status', '==', 'pending'))
        );
        const pendingApprovals = approvalsSnap.size;

        setStats({
          totalStudents,
          totalLessons,
          upcomingLessons,
          completedLessons,
          totalReviews,
          pendingApprovals,
          averageRating,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader
        title="Admin Panel"
        description="Overview of your LessonLink activity"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upcomingLessons} upcoming · {stats.completedLessons} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              {stats.averageRating.toFixed(1)} avg rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            {stats.pendingApprovals > 0 && (
              <Link href="/approvals">
                <Button variant="link" className="px-0 h-auto text-xs">
                  View requests →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Reviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/reviews" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Star className="h-4 w-4 mr-2" />
                Moderate Reviews
              </Button>
            </Link>
            <Link href="/approvals" className="block">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="h-4 w-4 mr-2" />
                Handle Approvals
                {stats.pendingApprovals > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {stats.pendingApprovals}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/t-portal/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Edit Public Profile
              </Button>
            </Link>
            <Link href="/calendar" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Availability
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Latest student feedback</CardDescription>
            </div>
            <Link href="/admin/reviews">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReviews.length > 0 ? (
              <div className="space-y-4">
                {recentReviews.map((review) => (
                  <div key={review.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.studentName}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
