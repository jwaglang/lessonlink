'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageSquare, Send, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

import {
  createMessage,
  markMessageAsRead,
  getStudentByEmail,
  messagesCollection,
} from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { onSnapshot, orderBy, query, where } from 'firebase/firestore';

export default function StudentChatPage() {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[StudentChat][AUTH]', {
      userEmail: user?.email,
      userUid: user?.uid,
    });
  }, [user]);

  const [student, setStudent] = useState<Student | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Message[]>([]);
  const [communications, setCommunications] = useState<Message[]>([]);

  const [activeTab, setActiveTab] = useState<'notifications' | 'communications'>('communications');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ---------------- RESOLVE STUDENT + TEACHER ---------------- */

  useEffect(() => {
    if (!user?.email) return;

    (async () => {
      const s = await getStudentByEmail(user.email);
      if (!s || !s.assignedTeacherId) return;
      setStudent(s);
      setTeacherId(s.assignedTeacherId);
    })();
  }, [user]);

  /* ---------------- UNREAD COUNT ---------------- */

  useEffect(() => {
    if (!student?.id) return;

    const q = query(
      messagesCollection,
      where('to', '==', student.id),
      where('read', '==', false)
    );

    return onSnapshot(
      q,
      snap => setUnreadCount(snap.size),
      err => {
        console.error('[StudentChat][UNREAD] snapshot error', err);
        console.log('[StudentChat][UNREAD] studentId=', student?.id);
      }
    );
  }, [student]);

  /* ---------------- NOTIFICATIONS ---------------- */

  useEffect(() => {
    if (!student?.id) {
      setNotifications([]);
      return;
    }

    const q = query(
      messagesCollection,
      where('type', '==', 'notification'),
      where('to', '==', student.id),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setNotifications(list);
      },
      err => {
        console.error('[StudentChat][NOTIFICATIONS] snapshot error', err);
        console.log('[StudentChat][NOTIFICATIONS] studentId=', student?.id);
      }
    );
  }, [student]);

  /* ---------------- SINGLE COMMUNICATIONS LISTENER ---------------- */

  useEffect(() => {
    if (!student?.id || !teacherId) {
      setCommunications([]);
      return;
    }

    const participantKey = `${teacherId}:${student.id}`;

    const q = query(
      messagesCollection,
      where('type', '==', 'communications'),
      where('participants', 'array-contains', participantKey),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setCommunications(list);
      },
      err => {
        console.error('[StudentChat][COMMUNICATIONS] snapshot error', err);
        console.log(
          '[StudentChat][COMMUNICATIONS] studentId=',
          student?.id,
          'teacherId=',
          teacherId,
          'participantKey=',
          `${teacherId}:${student?.id}`
        );
      }
    );
  }, [student, teacherId]);

  /* ---------------- SEND MESSAGE ---------------- */

  async function handleSendMessage() {
    if (!student || !teacherId || !newMessage.trim()) return;

    setSending(true);
    try {
      await createMessage({
        type: 'communications',
        from: student.id,
        fromType: 'student',
        to: teacherId,
        toType: 'teacher',
        participants: [`${teacherId}:${student.id}`],
        content: newMessage,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        read: false,
      });
      setNewMessage('');
    } finally {
      setSending(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    await markMessageAsRead(id);
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Chat" description="Talk with your tutor">
        {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="communications">
            <MessageSquare className="h-4 w-4 mr-1" /> Communications
          </TabsTrigger>
        </TabsList>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>Updates about your learning</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-4">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-lg mb-3 border ${
                        !n.read ? 'bg-primary/5 border-primary/20' : 'bg-card'
                      }`}
                    >
                      <p>{n.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(n.timestamp), 'PPp')}
                      </p>
                      {n.actionLink && (
                        <Link href={n.actionLink}>
                          <Button variant="link" size="sm" className="px-0">
                            <ExternalLink className="h-3 w-3 mr-1" /> View details
                          </Button>
                        </Link>
                      )}
                      {!n.read && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(n.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Communications</CardTitle>
              <CardDescription>Chat with your teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[360px] pr-4">
                {communications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No messages yet</p>
                ) : (
                  communications.map(m => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-lg mb-3 ${
                        m.from === student?.id ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {m.from === student?.id ? 'You' : 'Teacher'}
                      </p>
                      <p>{m.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(m.timestamp), 'PPp')}
                      </p>
                      {!m.read && m.from !== student?.id && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(m.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  rows={3}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message…"
                />
                <Button onClick={handleSendMessage} disabled={sending}>
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
