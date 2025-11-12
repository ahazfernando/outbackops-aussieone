"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Clock as ClockIcon, LogIn, LogOut, Calendar as CalendarIcon, Plus, Loader2, Users, Activity } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TimeEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  date: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  totalHours: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ActiveUser {
  userId: string;
  userName: string;
  userEmail: string;
  clockInTime: Date;
  entryId: string;
}

interface FirestoreTimeEntry {
  userId: string;
  date: Timestamp;
  dateString?: string;
  clockIn: Timestamp | null;
  clockOut: Timestamp | null;
  totalHours: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Type guard function to ensure data is properly typed
const getTimeEntryData = (data: unknown): FirestoreTimeEntry => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid time entry data');
  }
  return data as FirestoreTimeEntry;
};

const Clock = () => {
  const { user, getAllUsers } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [openManualEntry, setOpenManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState<Date>(new Date());
  const [manualClockIn, setManualClockIn] = useState('');
  const [manualClockOut, setManualClockOut] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Admin view states
  const [allUsersEntries, setAllUsersEntries] = useState<TimeEntry[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminSelectedDate, setAdminSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadTimeEntries();
      checkCurrentStatus();
      if (user.role === 'admin') {
        loadAllUsersEntries();
        loadActiveUsers();
      }
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllUsersEntries();
    }
  }, [adminSelectedDate, user]);

  const checkCurrentStatus = async () => {
    if (!user) return;

    try {
      // Use date string format to avoid composite index requirement
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = format(today, 'yyyy-MM-dd');

      // Query by userId and dateString (no composite index needed)
      const q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.id),
        where('dateString', '==', dateString)
      );

      const querySnapshot = await getDocs(q);
      
      // Find the active entry (clocked in but not clocked out)
      // Since we can have multiple entries per day, we need to check all of them
      let activeEntryDoc: { id: string; data: FirestoreTimeEntry } | null = null;
      for (const docSnapshot of querySnapshot.docs) {
        const entry = getTimeEntryData(docSnapshot.data());
        if (entry.clockIn && !entry.clockOut) {
          activeEntryDoc = { id: docSnapshot.id, data: entry };
          break; // Found the active entry
        }
      }

      if (activeEntryDoc) {
        const entry = activeEntryDoc.data;
        setIsClockedIn(true);
        setCurrentEntry({
          id: activeEntryDoc.id,
          userId: entry.userId,
          date: entry.date.toDate(),
          clockIn: entry.clockIn.toDate(),
          clockOut: entry.clockOut?.toDate() || null,
          totalHours: entry.totalHours || null,
          createdAt: entry.createdAt.toDate(),
          updatedAt: entry.updatedAt.toDate(),
        });
      } else {
        setIsClockedIn(false);
        setCurrentEntry(null);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadTimeEntries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let q;

      if (selectedDate) {
        // Use dateString to avoid composite index requirement
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        q = query(
          collection(db, 'timeEntries'),
          where('userId', '==', user.id),
          where('dateString', '==', dateString)
        );
      } else {
        // Fetch all entries for user and sort client-side
        q = query(
          collection(db, 'timeEntries'),
          where('userId', '==', user.id)
        );
      }

      const querySnapshot = await getDocs(q);
      let entries: TimeEntry[] = querySnapshot.docs.map((doc) => {
        const data = getTimeEntryData(doc.data());
        return {
          id: doc.id,
          userId: data.userId,
          date: data.date.toDate(),
          clockIn: data.clockIn?.toDate() || null,
          clockOut: data.clockOut?.toDate() || null,
          totalHours: data.totalHours || null,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        };
      });

      // Sort by date descending (newest first)
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());

      setTimeEntries(entries);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load time entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // Check if there's already an active entry (clocked in but not clocked out)
      const dateString = format(today, 'yyyy-MM-dd');

      const q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.id),
        where('dateString', '==', dateString)
      );

      const querySnapshot = await getDocs(q);
      
      // Check if user is already clocked in (has an entry with clockIn but no clockOut)
      const activeEntry = querySnapshot.docs.find(doc => {
        try {
          const data = getTimeEntryData(doc.data());
          return data.clockIn && !data.clockOut;
        } catch {
          return false;
        }
      });

      if (activeEntry) {
        toast({
          title: 'Already Clocked In',
          description: 'You are already clocked in. Please clock out first.',
          variant: 'destructive',
        });
        return;
      }

      // Always create a new entry for each clock in (supports multiple clock in/out cycles per day)
      await addDoc(collection(db, 'timeEntries'), {
        userId: user.id,
        date: Timestamp.fromDate(today),
        dateString: dateString,
        clockIn: Timestamp.fromDate(now),
        clockOut: null,
        totalHours: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Clocked In',
        description: `Clocked in at ${format(now, 'h:mm a')}`,
      });

      await checkCurrentStatus();
      await loadTimeEntries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock in',
        variant: 'destructive',
      });
    }
  };

  const handleClockOut = async () => {
    if (!user || !currentEntry) return;

    try {
      const now = new Date();
      const clockInTime = currentEntry.clockIn;
      
      if (!clockInTime) {
        toast({
          title: 'Error',
          description: 'No clock in time found',
          variant: 'destructive',
        });
        return;
      }

      const totalHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      await updateDoc(doc(db, 'timeEntries', currentEntry.id), {
        clockOut: Timestamp.fromDate(now),
        totalHours: Math.round(totalHours * 100) / 100,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Clocked Out',
        description: `Clocked out at ${format(now, 'h:mm a')}. Total hours: ${Math.round(totalHours * 100) / 100}h`,
      });

      setIsClockedIn(false);
      setCurrentEntry(null);
      await checkCurrentStatus(); // Refresh status to ensure UI is in sync
      await loadTimeEntries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clock out',
        variant: 'destructive',
      });
    }
  };

  const handleManualEntry = async () => {
    if (!user) return;

    if (!manualClockIn || !manualClockOut) {
      toast({
        title: 'Error',
        description: 'Please fill in both clock in and clock out times',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const entryDate = new Date(manualDate);
      entryDate.setHours(0, 0, 0, 0);

      // Parse times
      const [clockInHour, clockInMin] = manualClockIn.split(':').map(Number);
      const [clockOutHour, clockOutMin] = manualClockOut.split(':').map(Number);

      const clockIn = new Date(entryDate);
      clockIn.setHours(clockInHour, clockInMin, 0, 0);

      const clockOut = new Date(entryDate);
      clockOut.setHours(clockOutHour, clockOutMin, 0, 0);

      if (clockOut <= clockIn) {
        toast({
          title: 'Error',
          description: 'Clock out time must be after clock in time',
          variant: 'destructive',
        });
        return;
      }

      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      // Check if entry already exists for this date using dateString
      const dateString = format(entryDate, 'yyyy-MM-dd');

      const q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.id),
        where('dateString', '==', dateString)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing entry
        await updateDoc(doc(db, 'timeEntries', querySnapshot.docs[0].id), {
          dateString: dateString, // Ensure dateString is set
          clockIn: Timestamp.fromDate(clockIn),
          clockOut: Timestamp.fromDate(clockOut),
          totalHours: Math.round(totalHours * 100) / 100,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new entry
        await addDoc(collection(db, 'timeEntries'), {
          userId: user.id,
          date: Timestamp.fromDate(entryDate),
          dateString: dateString, // Add dateString for easier querying
          clockIn: Timestamp.fromDate(clockIn),
          clockOut: Timestamp.fromDate(clockOut),
          totalHours: Math.round(totalHours * 100) / 100,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Entry Added',
        description: `Time entry added for ${format(entryDate, 'MMM dd, yyyy')}`,
      });

      setOpenManualEntry(false);
      setManualClockIn('');
      setManualClockOut('');
      await loadTimeEntries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add entry',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'h:mm a');
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy');
  };

  const loadAllUsersEntries = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoadingAdmin(true);
      const users = await getAllUsers();
      const userMap = new Map(users.map(u => [u.id, { name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email, email: u.email }]));

      let q;
      if (adminSelectedDate) {
        const dateString = format(adminSelectedDate, 'yyyy-MM-dd');
        q = query(
          collection(db, 'timeEntries'),
          where('dateString', '==', dateString)
        );
      } else {
        // Get today's entries for all users
        const today = new Date();
        const dateString = format(today, 'yyyy-MM-dd');
        q = query(
          collection(db, 'timeEntries'),
          where('dateString', '==', dateString)
        );
      }

      const querySnapshot = await getDocs(q);
      const entries: TimeEntry[] = querySnapshot.docs.map((doc) => {
        const data = getTimeEntryData(doc.data());
        const userInfo = userMap.get(data.userId) || { name: 'Unknown', email: 'N/A' };
        return {
          id: doc.id,
          userId: data.userId,
          userName: userInfo.name,
          userEmail: userInfo.email,
          date: data.date.toDate(),
          clockIn: data.clockIn?.toDate() || null,
          clockOut: data.clockOut?.toDate() || null,
          totalHours: data.totalHours || null,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        };
      });

      // Sort by date descending, then by user name
      entries.sort((a, b) => {
        const dateCompare = b.date.getTime() - a.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return (a.userName || '').localeCompare(b.userName || '');
      });

      setAllUsersEntries(entries);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load all users entries',
        variant: 'destructive',
      });
    } finally {
      setLoadingAdmin(false);
    }
  };

  const loadActiveUsers = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = format(today, 'yyyy-MM-dd');

      // Get all time entries for today
      const q = query(
        collection(db, 'timeEntries'),
        where('dateString', '==', dateString)
      );

      const querySnapshot = await getDocs(q);
      const users = await getAllUsers();
      const userMap = new Map(users.map(u => [u.id, { name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email, email: u.email }]));

      const active: ActiveUser[] = [];
      querySnapshot.docs.forEach((doc) => {
        try {
          const data = getTimeEntryData(doc.data());
          // Check if user is clocked in but not clocked out
          if (data.clockIn && !data.clockOut) {
            const userInfo = userMap.get(data.userId);
            if (userInfo) {
              active.push({
                userId: data.userId,
                userName: userInfo.name,
                userEmail: userInfo.email,
                clockInTime: data.clockIn.toDate(),
                entryId: doc.id,
              });
            }
          }
        } catch {
          // Skip invalid entries
        }
      });

      // Sort by clock in time (most recent first)
      active.sort((a, b) => b.clockInTime.getTime() - a.clockInTime.getTime());
      setActiveUsers(active);
    } catch (error: any) {
      console.error('Error loading active users:', error);
    }
  };

  // Refresh active users every 30 seconds
  useEffect(() => {
    if (user?.role === 'admin') {
      loadActiveUsers();
      const interval = setInterval(() => {
        loadActiveUsers();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Clock</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage and view all users\' time tracking' : 'Track your working hours'}
          </p>
        </div>
        <Dialog open={openManualEntry} onOpenChange={setOpenManualEntry}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Manual Time Entry</DialogTitle>
              <DialogDescription>
                Add a time entry for a past date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {manualDate ? format(manualDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={manualDate}
                      onSelect={(date) => date && setManualDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clockIn">Clock In Time (HH:MM)</Label>
                <Input
                  id="clockIn"
                  type="time"
                  value={manualClockIn}
                  onChange={(e) => setManualClockIn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clockOut">Clock Out Time (HH:MM)</Label>
                <Input
                  id="clockOut"
                  type="time"
                  value={manualClockOut}
                  onChange={(e) => setManualClockOut(e.target.value)}
                  required
                />
              </div>
              <Button
                onClick={handleManualEntry}
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Entry'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon />
              Current Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {format(currentTime, 'h:mm:ss a')}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {format(currentTime, 'EEEE, MMMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium">
                {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
              </span>
            </div>
            {isClockedIn && currentEntry?.clockIn && (
              <div className="text-sm text-muted-foreground">
                Clocked in at: {formatTime(currentEntry.clockIn)}
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={handleClockIn} 
                disabled={isClockedIn}
                className="flex-1"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Clock In
              </Button>
              <Button 
                onClick={handleClockOut} 
                disabled={!isClockedIn || !currentEntry}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Clock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Currently Active Users
            </CardTitle>
            <CardDescription>Users who are currently clocked in</CardDescription>
          </CardHeader>
          <CardContent>
            {activeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users currently clocked in
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeUsers.map((activeUser) => {
                  const hoursActive = (currentTime.getTime() - activeUser.clockInTime.getTime()) / (1000 * 60 * 60);
                  return (
                    <div key={activeUser.entryId} className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium">{activeUser.userName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{activeUser.userEmail}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Clocked in: {formatTime(activeUser.clockInTime)}</p>
                        <p>Active for: {Math.round(hoursActive * 100) / 100}h</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <Tabs defaultValue="all-users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all-users">
              <Users className="h-4 w-4 mr-2" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="my-entries">
              <ClockIcon className="h-4 w-4 mr-2" />
              My Entries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Users Time Entries</CardTitle>
                    <CardDescription>View clock in/out records for all users</CardDescription>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {adminSelectedDate ? format(adminSelectedDate, 'MMM dd, yyyy') : 'Today'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={adminSelectedDate}
                        onSelect={(date) => {
                          setAdminSelectedDate(date || new Date());
                        }}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setAdminSelectedDate(new Date())}
                        >
                          Show Today
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAdmin ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allUsersEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No time entries found for this date
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsersEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {entry.userName || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.userEmail}
                            </TableCell>
                            <TableCell>{formatDate(entry.date)}</TableCell>
                            <TableCell>{formatTime(entry.clockIn)}</TableCell>
                            <TableCell>{formatTime(entry.clockOut)}</TableCell>
                            <TableCell>
                              {entry.totalHours ? (
                                <Badge variant="outline">{entry.totalHours}h</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.clockOut ? (
                                <Badge variant="default">Completed</Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-entries">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Time Entries</CardTitle>
                    <CardDescription>Your clock in/out history</CardDescription>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'All Dates'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                        }}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedDate(undefined)}
                        >
                          Show All Dates
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No time entries found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell>{formatTime(entry.clockIn)}</TableCell>
                          <TableCell>{formatTime(entry.clockOut)}</TableCell>
                          <TableCell>
                            {entry.totalHours ? (
                              <Badge variant="outline">{entry.totalHours}h</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.clockOut ? (
                              <Badge variant="default">Completed</Badge>
                            ) : (
                              <Badge variant="secondary">In Progress</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>Your clock in/out history</CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'All Dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedDate(undefined)}
                    >
                      Show All Dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : timeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No time entries found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{formatTime(entry.clockIn)}</TableCell>
                      <TableCell>{formatTime(entry.clockOut)}</TableCell>
                      <TableCell>
                        {entry.totalHours ? (
                          <Badge variant="outline">{entry.totalHours}h</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.clockOut ? (
                          <Badge variant="default">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Clock;
