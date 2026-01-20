'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Review } from '@/lib/types';
import PageHeader from '@/components/page-header';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [filterPinned, setFilterPinned] = useState<'all' | 'pinned' | 'unpinned'>('all');
  
  // Delete confirmation
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, filterVisibility, filterPinned]);

  async function fetchReviews() {
    try {
      const snapshot = await getDocs(collection(db, 'reviews'));
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      
      // Sort: pinned first, then by date
      const sorted = reviewsData.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setReviews(sorted);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterReviews() {
    let filtered = [...reviews];
    
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(term) ||
        r.comment?.toLowerCase().includes(term)
      );
    }
    
    // Visibility filter
    if (filterVisibility === 'visible') {
      filtered = filtered.filter(r => r.visible);
    } else if (filterVisibility === 'hidden') {
      filtered = filtered.filter(r => !r.visible);
    }
    
    // Pinned filter
    if (filterPinned === 'pinned') {
      filtered = filtered.filter(r => r.pinned);
    } else if (filterPinned === 'unpinned') {
      filtered = filtered.filter(r => !r.pinned);
    }
    
    setFilteredReviews(filtered);
  }

  async function togglePin(review: Review) {
    const pinnedCount = reviews.filter(r => r.pinned).length;
    
    if (!review.pinned && pinnedCount >= 5) {
      setNotification({ type: 'error', message: 'Maximum 5 pinned reviews allowed' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    try {
      const docRef = doc(db, 'reviews', review.id);
      await updateDoc(docRef, { pinned: !review.pinned });
      
      setReviews(prev => prev.map(r => 
        r.id === review.id ? { ...r, pinned: !r.pinned } : r
      ));
      
      setNotification({ 
        type: 'success', 
        message: review.pinned ? 'Review unpinned' : 'Review pinned as Teacher\'s Pick' 
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error toggling pin:', error);
      setNotification({ type: 'error', message: 'Failed to update review' });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  async function toggleVisibility(review: Review) {
    try {
      const docRef = doc(db, 'reviews', review.id);
      await updateDoc(docRef, { visible: !review.visible });
      
      setReviews(prev => prev.map(r => 
        r.id === review.id ? { ...r, visible: !r.visible } : r
      ));
      
      setNotification({ 
        type: 'success', 
        message: review.visible ? 'Review hidden from public' : 'Review now visible' 
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      setNotification({ type: 'error', message: 'Failed to update review' });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  async function handleDelete() {
    if (!deleteReview) return;
    
    setIsDeleting(true);
    
    try {
      const docRef = doc(db, 'reviews', deleteReview.id);
      await deleteDoc(docRef);
      
      setReviews(prev => prev.filter(r => r.id !== deleteReview.id));
      setDeleteReview(null);
      
      setNotification({ type: 'success', message: 'Review deleted' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error deleting review:', error);
      setNotification({ type: 'error', message: 'Failed to delete review' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  }

  const pinnedCount = reviews.filter(r => r.pinned).length;
  const hiddenCount = reviews.filter(r => !r.visible).length;

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Reviews"
        description={`Moderate and manage student reviews (${reviews.length} total)`}
      />

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          <Pin className="h-3 w-3 mr-1" />
          {pinnedCount}/5 Pinned
        </Badge>
        <Badge variant="secondary" className="text-sm py-1 px-3">
          <EyeOff className="h-3 w-3 mr-1" />
          {hiddenCount} Hidden
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterVisibility} onValueChange={(v) => setFilterVisibility(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPinned} onValueChange={(v) => setFilterPinned(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Pinned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
                <SelectItem value="unpinned">Unpinned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <Card key={review.id} className={!review.visible ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Review content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{review.studentName}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {review.pinned && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Pin className="h-3 w-3 mr-1" />
                          Teacher's Pick
                        </Badge>
                      )}
                      {!review.visible && (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                      {review.imported && (
                        <Badge variant="outline" className="text-xs">
                          Imported from {review.importSource}
                        </Badge>
                      )}
                    </div>
                    
                    {review.comment && (
                      <p className="mt-2 text-muted-foreground">{review.comment}</p>
                    )}
                    
                    <p className="mt-2 text-xs text-muted-foreground">
                      {format(parseISO(review.createdAt), 'MMM d, yyyy')}
                    </p>

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {review.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePin(review)}
                      title={review.pinned ? 'Unpin' : 'Pin as Teacher\'s Pick'}
                    >
                      {review.pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleVisibility(review)}
                      title={review.visible ? 'Hide' : 'Show'}
                    >
                      {review.visible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteReview(review)}
                      title="Delete"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No reviews found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReview} onOpenChange={() => setDeleteReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the review from {deleteReview?.studentName}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
