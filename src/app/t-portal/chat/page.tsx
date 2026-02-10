'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { createMessage, markMessageAsRead, messagesCollection } from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeacherChatPage() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [notifications, setNotifications] = useState<Message[]>([]);
  const [communications, setCommunications] = useState<Message[]>([]);

  const [activeTab, setActiveTab] =
    useState<'notifications' | 'communications'>('communications');

  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [studentUnreadCounts, setStudentUnreadCounts] =
    useState<Record<string, number>>({});

  // Refs for merging dual communications queries
  const sentRef = useRef<Message[]>([]);
  const receivedRef = useRef<Message[]>([]);

  /* ---------------- STUDENTS + UNREAD COUNTS ---------------- */

  useEffect(() => {
    if (!user?.uid) return;

    const studentsQuery = query(collection(db, 'students'));
    const unsubStudents = onSnapshot(studentsQuery, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(list);
      setLoading(false);
      setSelectedStudent(prev =>
        prev ? list.find(s => s.id === prev.id) || list[0] || null : list[0] || null
      );
    });

    const unreadQuery = query(
      messagesCollection,
      where('to', '==', user.uid),
      where('type', '==', 'communications'),
      where('read', '==', false)
    );

    const unsubUnread = onSnapshot(unreadQuery, snap => {
      const counts: Record<string, number> = {};
      snap.forEach(doc => {
        const from = doc.data().from;
        counts[from] = (counts[from] || 0) + 1;
      });
      setStudentUnreadCounts(counts);
    });

    return () => {
      unsubStudents();
      unsubUnread();
    };
  }, [user]);

  /* ---------------- NOTIFICATIONS ---------------- */

  useEffect(() => {
    if (!user?.uid || !selectedStudent) {
      setNotifications([]);
      return;
    }

    const q = query(
      messagesCollection,
      where('type', '==', 'notification'),
      where('from', '==', user.uid),
      where('to', '==', selectedStudent.id),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setNotifications(list);
    });
  }, [user, selectedStudent]);

  /* ---------------- COMMUNICATIONS (dual query: sent + received) ---------------- */

  useEffect(() => {
    if (!user?.uid || !selectedStudent) {
      setCommunications([]);
      sentRef.current = [];
      receivedRef.current = [];
      return;
    }

    const teacherId = user.uid;
    const studentId = selectedStudent.id;

    function mergeCommunications() {
      const all = [...sentRef.current, ...receivedRef.current];
      all.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
      setCommunications(all);
    }

    // Query 1: messages FROM teacher TO student
    const qSent = query(
      messagesCollection,
      where('type', '==', 'communications'),
      where('from', '==', teacherId),
      where('to', '==', studentId),
      orderBy('timestamp', 'desc')
    );

    // Query 2: messages FROM student TO teacher
    const qReceived = query(
      messagesCollection,
      where('type', '==', 'communications'),
      where('from', '==', studentId),
      where('to', '==', teacherId),
      orderBy('timestamp', 'desc')
    );

    const unsubSent = onSnapshot(
      qSent,
      snap => {
        sentRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        mergeCommunications();
      },
      err => {
        console.error('[TeacherChat][COMMS-SENT] snapshot error', err);
      }
    );

    const unsubReceived = onSnapshot(
      qReceived,
      snap => {
        receivedRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        mergeCommunications();
      },
      err => {
        console.error('[TeacherChat][COMMS-RECEIVED] snapshot error', err);
      }
    );

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user, selectedStudent]);

  /* ---------------- SEND MESSAGE ---------------- */

  async function handleSendMessage() {
    if (!user?.uid || !selectedStudent || !newMessage.trim()) return;

    setSending(true);
    try {
      if (activeTab === 'notifications') {
        // Send as system notification
        await createMessage({
          type: 'notification',
          from: 'system',
          fromType: 'system',
          to: selectedStudent.id,
          toType: 'student',
          content: newSubject ? `${newSubject}: ${newMessage}` : newMessage,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          read: false,
        });
      } else {
        // Send as communications
        await createMessage({
          type: 'communications',
          from: user.uid,
          fromType: 'teacher',
          to: selectedStudent.id,
          toType: 'student',
          content: newMessage,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      setNewMessage('');
      setNewSubject('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex gap-6 h-[80vh]">
        <Card className="w-1/3">
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`w-full p-4 text-left hover:bg-accent ${
                  selectedStudent?.id === s.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex justify-between">
                  <span>{s.name}</span>
                  {studentUnreadCounts[s.id] > 0 && (
                    <Badge variant="destructive">
                      {studentUnreadCounts[s.id]}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedStudent
                ? `Chat with ${selectedStudent.name}`
                : 'Select a student'}
            </CardTitle>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
            <TabsList className="mx-6">
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-1" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="communications">
                <MessageSquare className="h-4 w-4 mr-1" /> Communications
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <ScrollArea className="h-[45vh] p-6">
                {(activeTab === 'notifications'
                  ? notifications
                  : communications
                ).map(m => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-lg mb-3 ${
                      m.from === user?.uid ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
                    }`}
                  >
                    <p>{m.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(m.timestamp), 'PPp')}
                    </p>
                    {!m.read && m.from !== user?.uid && (
                      <Button variant="ghost" size="sm" onClick={() => markMessageAsRead(m.id)}>
                        Mark read
                      </Button>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="border-t p-6 flex gap-2">
            {activeTab === 'notifications' && (
              <input
                className="border rounded p-2 w-full"
                placeholder="Subject"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
              />
            )}
            <Textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={handleSendMessage} disabled={sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}