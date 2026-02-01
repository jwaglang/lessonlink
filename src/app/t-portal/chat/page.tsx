'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
  email: string;
  notificationCount?: number;
  communicationCount?: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  channel: 'notifications' | 'communications';
  subject?: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

export default function TeacherChatPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannel, setActiveChannel] = useState<'notifications' | 'communications'>('notifications');
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch all students with unread counts
  useEffect(() => {
    if (!user) return;

    const studentsQuery = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(studentsQuery, async (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));

      // Get unread counts for each student
      const studentsWithCounts = await Promise.all(
        studentsData.map(async (student) => {
          const notifQuery = query(
            collection(db, 'messages'),
            where('to', '==', student.id),
            where('channel', '==', 'notifications'),
            where('read', '==', false)
          );
          const commQuery = query(
            collection(db, 'messages'),
            where('to', '==', student.id),
            where('channel', '==', 'communications'),
            where('read', '==', false)
          );

          const [notifSnapshot, commSnapshot] = await Promise.all([
            new Promise<number>((resolve) => {
              const unsub = onSnapshot(notifQuery, (snap) => {
                resolve(snap.size);
                unsub();
              });
            }),
            new Promise<number>((resolve) => {
              const unsub = onSnapshot(commQuery, (snap) => {
                resolve(snap.size);
                unsub();
              });
            })
          ]);

          return {
            ...student,
            notificationCount: notifSnapshot,
            communicationCount: commSnapshot
          };
        })
      );

      setStudents(studentsWithCounts);
      setLoading(false);

      // Auto-select first student if none selected
      if (!selectedStudent && studentsWithCounts.length > 0) {
        setSelectedStudent(studentsWithCounts[0]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for selected student
  useEffect(() => {
    if (!selectedStudent) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('to', '==', selectedStudent.id),
      where('channel', '==', activeChannel)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      
      // Sort in memory instead of in query
      messagesData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });
      
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [selectedStudent, activeChannel]);

  const handleSendMessage = async () => {
    if (!selectedStudent || !newMessage.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        from: 'system',
        to: selectedStudent.id,
        channel: activeChannel,
        subject: activeChannel === 'notifications' ? newSubject : undefined,
        message: newMessage,
        read: false,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
      setNewSubject('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Left Sidebar - Students List */}
        <Card className="w-1/3 flex flex-col">
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="space-y-1">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                    selectedStudent?.id === student.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{student.name}</span>
                    <div className="flex gap-2">
                      {(student.notificationCount || 0) > 0 && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          {student.notificationCount}
                        </Badge>
                      )}
                      {(student.communicationCount || 0) > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {student.communicationCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{student.email}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Messages */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedStudent ? `Messages with ${selectedStudent.name}` : 'Select a student'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {selectedStudent ? (
              <>
                <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as any)} className="flex-1 flex flex-col">
                  <TabsList className="mx-6 mt-4">
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                      {(selectedStudent.notificationCount || 0) > 0 && (
                        <Badge variant="default" className="ml-1">
                          {selectedStudent.notificationCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="communications" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Communications
                      {(selectedStudent.communicationCount || 0) > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedStudent.communicationCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeChannel} className="flex-1 flex flex-col mt-0">
                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No messages yet
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className="bg-muted p-4 rounded-lg">
                            {msg.subject && (
                              <h4 className="font-semibold mb-2">{msg.subject}</h4>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {msg.createdAt && format(msg.createdAt.toDate(), 'PPp')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="border-t p-6 space-y-4">
                      {activeChannel === 'notifications' && (
                        <input
                          type="text"
                          placeholder="Subject (optional)"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full p-2 border rounded-lg"
                        />
                      )}
                      <div className="flex gap-2">
                        <Textarea
                          placeholder={`Send ${activeChannel === 'notifications' ? 'notification' : 'message'} to ${selectedStudent.name}...`}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                          rows={3}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Select a student to view messages</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
