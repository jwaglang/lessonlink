'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  createMessage,
  messagesCollection,
} from '@/lib/firestore';
import type { Message, Student } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeacherChatPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // States for different message types
  const [notifications, setNotifications] = useState<Message[]>([]);
  const [communications, setCommunications] = useState<Message[]>([]);
  const [incomingComms, setIncomingComms] = useState<Message[]>([]);
  const [outgoingComms, setOutgoingComms] = useState<Message[]>([]);

  const [activeTab, setActiveTab] = useState<'notifications' | 'communications'>('communications');
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [studentUnreadCounts, setStudentUnreadCounts] = useState<Record<string, number>>({});

  // Merge incoming and outgoing communications into a single list
  useEffect(() => {
    const allComms = [...incomingComms, ...outgoingComms]
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
    setCommunications(allComms);
  }, [incomingComms, outgoingComms]);

  // Fetch all students and listen for unread messages
  useEffect(() => {
    if (!user?.email) return;

    const studentsQuery = query(collection(db, 'students'));
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));

      setStudents(studentsData);
      setLoading(false);

      if (!selectedStudent && studentsData.length > 0) {
        setSelectedStudent(studentsData[0]);
      } else if (selectedStudent) {
        const updatedSelected = studentsData.find(s => s.id === selectedStudent.id);
        if(updatedSelected) setSelectedStudent(updatedSelected);
      }
    });
    
    // Single listener for all unread communications to the teacher
    const unreadQuery = query(
      messagesCollection, 
      where('to', '==', user.uid), 
      where('read', '==', false), 
      where('type', '==', 'communication')
    );
    const unreadUnsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach(doc => {
        const fromId = doc.data().from;
        counts[fromId] = (counts[fromId] || 0) + 1;
      });
      setStudentUnreadCounts(counts);
    });

    return () => {
      studentsUnsubscribe();
      unreadUnsubscribe();
    };
  }, [user, selectedStudent]);

  // Fetch messages for the selected student
  useEffect(() => {
    if (!selectedStudent || !user?.uid) {
      setNotifications([]);
      setIncomingComms([]);
      setOutgoingComms([]);
      return;
    };

    const teacherUid = user.uid;
    const studentId = selectedStudent.id;

    // Listener for notifications sent to this student by the teacher
    const notifsQuery = query(
      messagesCollection,
      where('to', '==', studentId),
      where('from', '==', teacherUid),
      where('type', '==', 'notification')
    );
    const unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
      setNotifications(notifs);
    });

    // Listener for outgoing communications (teacher -> student)
    const q1 = query(messagesCollection, where('from', '==', teacherUid), where('to', '==', studentId), where('type', '==', 'communication'));
    const unsubscribeComms1 = onSnapshot(q1, (snapshot) => {
      setOutgoingComms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    // Listener for incoming communications (student -> teacher)
    const q2 = query(messagesCollection, where('from', '==', studentId), where('to', '==', teacherUid), where('type', '==', 'communication'));
    const unsubscribeComms2 = onSnapshot(q2, (snapshot) => {
      setIncomingComms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return () => {
      unsubscribeNotifs();
      unsubscribeComms1();
      unsubscribeComms2();
    };
  }, [selectedStudent, user]);

  const handleSendMessage = async () => {
    if (!selectedStudent || !newMessage.trim() || !user?.uid) return;

    setSending(true);
    try {
      const messageData: any = {
        type: activeTab,
        from: user.uid,
        fromType: 'teacher',
        to: selectedStudent.id,
        toType: 'student',
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false,
        createdAt: new Date().toISOString(),
      };

      if (activeTab === 'notifications' && newSubject) {
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
                const unreadCount = studentUnreadCounts[student.id] || 0;
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
                      {unreadCount > 0 && (
                        <Badge variant="destructive">{unreadCount}</Badge>
                      )}
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
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'notifications' | 'communications')} className="flex-1 flex flex-col">
                  <TabsList className="mx-6 mt-4">
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="communications" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Communications
                      {(studentUnreadCounts[selectedStudent.id] || 0) > 0 && (
                        <Badge variant="destructive" className="ml-1">
                          {studentUnreadCounts[selectedStudent.id]}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Notifications Tab */}
                  <TabsContent value="notifications" className="flex-1 flex flex-col mt-0">
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-4">
                        {notifications.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No notifications sent to {selectedStudent.name}</p>
                        ) : (
                          notifications.map((msg) => (
                            <div key={msg.id} className="bg-muted p-4 rounded-lg">
                              <h4 className="font-semibold mb-2">{(msg as any).subject || 'Notification'}</h4>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">{format(parseISO(msg.timestamp), 'PPp')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  {/* Communications Tab */}
                  <TabsContent value="communications" className="flex-1 flex flex-col mt-0">
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-4">
                        {communications.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No messages yet</p>
                        ) : (
                          communications.map((msg) => (
                            <div key={msg.id} className={`p-4 rounded-lg ${
                              msg.from === user?.uid ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
                            }`}>
                              <p className="text-sm font-medium mb-1">
                                {msg.from === user?.uid ? 'You' : selectedStudent.name}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">{format(parseISO(msg.timestamp), 'PPp')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Message Input - common for both tabs */}
                  <div className="border-t p-6 space-y-4">
                    {activeTab === 'notifications' && (
                      <input
                        type="text"
                        placeholder="Subject (optional for notifications)"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-input"
                      />
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder={`Send ${activeTab === 'notifications' ? 'notification' : 'message'} to ${selectedStudent.name}...`}
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
