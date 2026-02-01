'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageHeader from '@/components/page-header';
import {
  getNotificationsByUser,
  getCommunicationsByUser,
  createMessage,
  markMessageAsRead,
  getUnreadCount,
  getStudentByEmail,
} from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { Bell, MessageSquare, Send, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

export default function StudentChatPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<Message[]>([]);
  const [communications, setCommunications] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;

      const studentData = await getStudentByEmail(user.email);
      if (!studentData) return;
      
      setStudent(studentData);

      // Load notifications
      const notifs = await getNotificationsByUser(studentData.id);
      setNotifications(notifs);

      // Load communications
      const comms = await getCommunicationsByUser(studentData.id);
      setCommunications(comms);

      // Get unread count
      const count = await getUnreadCount(studentData.id);
      setUnreadCount(count);
    }

    loadData();
  }, [user]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !student || !user) return;

    setIsSending(true);
    try {
      const message = await createMessage({
        type: 'communication',
        from: student.id,
        to: 'jwag.lang@gmail.com', // Teacher ID (hardcoded for now)
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
      });

      setCommunications(prev => [message, ...prev]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleMarkAsRead(messageId: string) {
    try {
      await markMessageAsRead(messageId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, read: true } : msg)
      );
      setCommunications(prev =>
        prev.map(msg => msg.id === messageId ? { ...msg, read: true } : msg)
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Messages"
        description="System notifications and teacher communications"
      >
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {unreadCount} unread
          </Badge>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communications
            {communications.filter(c => !c.read).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {communications.filter(c => !c.read).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Notifications
              </CardTitle>
              <CardDescription>
                Updates from LessonLink about your learning progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          !notification.read
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm">{notification.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(parseISO(notification.timestamp), 'PPp')}
                            </p>
                            {notification.actionLink && (
                              <Link href={notification.actionLink}>
                                <Button variant="link" size="sm" className="px-0 h-auto mt-2">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </Link>
                            )}
                          </div>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Teacher Communications
              </CardTitle>
              <CardDescription>
                Chat with your teacher
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Message List */}
              <ScrollArea className="h-[400px] pr-4">
                {communications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No messages yet</p>
                    <p className="text-xs mt-2">Start a conversation with your teacher!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {communications.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.from === student?.id
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">
                              {message.from === student?.id ? 'You' : 'Teacher'}
                            </p>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(parseISO(message.timestamp), 'PPp')}
                            </p>
                          </div>
                          {!message.read && message.from !== student?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(message.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                  className="h-auto"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
