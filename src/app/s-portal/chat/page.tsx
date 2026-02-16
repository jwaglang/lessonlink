'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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

import { createMessage, markMessageAsRead, getStudentById, messagesCollection } from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { onSnapshot, orderBy, query, where } from 'firebase/firestore';

export default function StudentChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: 'notifications' | 'communications' =
    tabParam === 'notifications' ? 'notifications' : 'communications';

  const [student, setStudent] = useState<Student | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Message[]>([]);
  const [communications, setCommunications] = useState<Message[]>([]);

  const [activeTab, setActiveTab] = useState<'notifications' | 'communications'>(initialTab);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs to hold both directions of communications for merging
  const sentRef = useRef<Message[]>([]);
  const receivedRef = useRef<Message[]>([]);

  /* ---------------- RESOLVE STUDENT + TEACHER ---------------- */

  useEffect(() => {
    if (!user?.uid) return;

    (async () => {
      const s = await getStudentById(user.uid);
      if (!s || !s.assignedTeacherId) return;
      setStudent(s);
      setTeacherId(s.assignedTeacherId);
    })();
  }, [user]);

  /* ---------------- UNREAD COUNT ---------------- */

  useEffect(() => {
    if (!student?.id || !user?.uid) return;

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
      }
    );
  }, [student, user]);

  /* ---------------- NOTIFICATIONS ---------------- */

  useEffect(() => {
    if (!student?.id || !user?.uid) {
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
      }
    );
  }, [student, user]);

  /* ---------------- COMMUNICATIONS (dual query: sent + received) ---------------- */

  useEffect(() => {
    if (!student?.id || !teacherId || !user?.uid) {
      setCommunications([]);
      return;
    }

    function mergeCommunications() {
      const all = [...sentRef.current, ...receivedRef.current];
      all.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
      setCommunications(all);
    }

    // Query 1: messages FROM student TO teacher
    const qSent = query(
      messagesCollection,
      where('type', '==', 'communications'),
      where('from', '==', student.id),
      where('to', '==', teacherId),
      orderBy('timestamp', 'desc')
    );

    // Query 2: messages FROM teacher TO student
    const qReceived = query(
      messagesCollection,
      where('type', '==', 'communications'),
      where('from', '==', teacherId),
      where('to', '==', student.id),
      orderBy('timestamp', 'desc')
    );

    const unsubSent = onSnapshot(
      qSent,
      snap => {
        sentRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        mergeCommunications();
      },
      err => {
        console.error('[StudentChat][COMMS-SENT] snapshot error', err);
      }
    );

    const unsubReceived = onSnapshot(
      qReceived,
      snap => {
        receivedRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        mergeCommunications();
      },
      err => {
        console.error('[StudentChat][COMMS-RECEIVED] snapshot error', err);
      }
    );

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [student, teacherId, user]);

  /* ---------------- SEND MESSAGE ---------------- */

  async function handleSendMessage() {
    if (!student || !teacherId || !newMessage.trim() || !user?.uid) return;

    setSending(true);
    try {
      await createMessage({
        type: 'communications',
        from: student.id,
        fromType: 'student',
        to: teacherId,
        toType: 'teacher',
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