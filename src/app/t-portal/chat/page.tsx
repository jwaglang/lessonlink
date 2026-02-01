'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  createMessage,
  getUnreadCountByChannel,
  messagesCollection,
} from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [studentCounts, setStudentCounts] = useState<Record<string, { notifications: number; communications: number }>>({});

  // Fetch all students
  useEffect(() => {
    if (!user) return;

    const studentsQuery = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(studentsQuery, async (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));

      setStudents(studentsData);
      setLoading(false);

      // Auto-select first student if none selected
      if (!selectedStudent && studentsData.length > 0) {
        setSelectedStudent(studentsData[0]);
      }

      // Fetch unread counts for each student
      const counts: Record<string, { notifications: number; communications: number }> = {};
      for (const student of studentsData) {
        const notifCount = await getUnreadCountByChannel(student.id, 'notifications');
        const commCount = await getUnreadCountByChannel(student.id, 'communications');
        counts[student.id] = {
          notifications: notifCount,
          communications: commCount
        };
      }
      setStudentCounts(counts);
    });

    return () => unsubscribe();
  }, [user, selectedStudent]);

  // Fetch messages for selected student
  useEffect(() => {
    if (!selectedStudent || !user?.email) {
      setMessages([]); // Clear messages when no student is selected
      return;
    };

    let unsubscribe: (() => void) | undefined;
    let unsubscribe1: (() => void) | undefined;
    let unsubscribe2: (() => void) | undefined;

    const teacherEmail = user.email;
    const studentId = selectedStudent.id;

    if (activeChannel === 'notifications') {
        // One-way query for notifications sent to this student
        const q = query(
            messagesCollection,
            where('to', '==', studentId),
            where('type', '==', 'notification')
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))
                .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
            setMessages(msgs);
        });
    } else { // 'communications'
        // Two-way query for communications
        let teacherToStudentMsgs: Message[] = [];
        let studentToTeacherMsgs: Message[] = [];

        const q1 = query(messagesCollection, where('from', '==', teacherEmail), where('to', '==', studentId), where('type', '==', 'communication'));
        unsubscribe1 = onSnapshot(q1, (snapshot) => {
            teacherToStudentMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            const merged = [...teacherToStudentMsgs, ...studentToTeacherMsgs]
                .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
            setMessages(merged);
        });

        const q2 = query(messagesCollection, where('from', '==', studentId), where('to', '==', teacherEmail), where('type', '==', 'communication'));
        unsubscribe2 = onSnapshot(q2, (snapshot) => {
            studentToTeacherMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            const merged = [...teacherToStudentMsgs, ...studentToTeacherMsgs]
                .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
            setMessages(merged);
        });
    }

    return () => {
        if (unsubscribe) unsubscribe();
        if (unsubscribe1) unsubscribe1();
        if (unsubscribe2) unsubscribe2();
    };
  }, [selectedStudent, activeChannel, user]);

  const handleSendMessage = async () => {
    if (!selectedStudent || !newMessage.trim() || !user?.email) return;

    setSending(true);
    try {
      const messageData: any = {
        type: activeChannel,
        from: user.email,
        to: selectedStudent.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // Only add subject if it exists
      if (activeChannel === 'notifications' && newSubject) {
        messageData.subject = newSubject;
      }

      await createMessage(messageData);

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
              {students.map((student) => {
                const counts = studentCounts[student.id] || { notifications: 0, communications: 0 };
                return (
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
                        {counts.notifications > 0 && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            {counts.notifications}
                          </Badge>
                        )}
                        {counts.communications > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {counts.communications}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{student.email}</p>
                  </button>
                );
              })}
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
                      {(studentCounts[selectedStudent.id]?.notifications || 0) > 0 && (
                        <Badge variant="default" className="ml-1">
                          {studentCounts[selectedStudent.id].notifications}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="communications" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Communications
                      {(studentCounts[selectedStudent.id]?.communications || 0) > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {studentCounts[selectedStudent.id].communications}
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
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(parseISO(msg.timestamp), 'PPp')}
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
