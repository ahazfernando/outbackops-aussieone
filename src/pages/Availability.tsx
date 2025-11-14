import React, { useState, useEffect, useRef } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format, startOfWeek, addDays, subWeeks, addWeeks, addMinutes } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight, Edit3, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Badge,
} from '@/components/ui/badge'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase' // Adjust path to your Firebase config file
import { useToast } from '@/components/ui/use-toast'

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-purple-100']

const Availability = () => {
    const { toast } = useToast()

    // Auth state
    const [user, setUser] = useState<User | null>(null)

    // Leave Management states
    const [leaveDate, setLeaveDate] = useState<Date>()
    const [applyDays, setApplyDays] = useState('')
    const [description, setDescription] = useState('')
    const [leaveRequests, setLeaveRequests] = useState<{id: string, fromDate: string, toDate: string, status: 'pending' | 'approved' | 'rejected', description?: string}[]>([])

    // Availability Table states
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [selected, setSelected] = useState(new Set<string>())
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [weekData, setWeekData] = useState<{id: string, slots: {[key: string]: number[]}, pendingSlots: {[key: string]: number[]}, status: string, submittedAt: Timestamp, weekStart: string} | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [editSelected, setEditSelected] = useState(new Set<string>())
    const unsubRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        if (!auth) return
        const unsub = onAuthStateChanged(auth, setUser)
        return unsub
    }, [])

    // Fetch leave requests
    useEffect(() => {
        if (!db || !user) {
            setLeaveRequests([])
            return
        }
        const q = query(collection(db, 'leaveRequests'), where('uid', '==', user.uid))
        const unsub = onSnapshot(q, (snap) => {
            const now = new Date()
            const reqs = snap.docs
                .filter((d) => {
                    const toD = d.data().toDate.toDate()
                    return toD > now
                })
                .map((d) => {
                    const data = d.data()
                    return {
                        id: d.id,
                        fromDate: format(data.fromDate.toDate(), 'MMM dd'),
                        toDate: format(data.toDate.toDate(), 'MMM dd'),
                        status: data.status,
                        description: data.description,
                    }
                })
            setLeaveRequests(reqs)
        })
        return unsub
    }, [user])

    // Fetch availability for current week
    useEffect(() => {
        if (!user || !db) {
            setSelected(new Set())
            setIsSubmitted(false)
            setWeekData(null)
            return
        }
        const weekStr = format(currentWeek, 'yyyy-MM-dd')
        if (unsubRef.current) unsubRef.current()
        const q = query(
            collection(db, 'weeklyAvailability'),
            where('uid', '==', user.uid),
            where('weekStart', '==', weekStr)
        )
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) {
                setSelected(new Set())
                setIsSubmitted(false)
                setWeekData(null)
            } else {
                const docSnap = snap.docs[0]
                const data = docSnap.data()
                const slotsMap = data.slots || {}
                const pendingSlotsMap = data.pendingSlots || {}
                let displaySlotsMap = slotsMap
                if (data.status === 'pending' && Object.keys(pendingSlotsMap).length > 0) {
                    displaySlotsMap = pendingSlotsMap
                }
                const selSet = new Set<string>()
                dayNames.forEach((_, dIdx) => {
                    const dayDate = addDays(currentWeek, dIdx)
                    const dateStr = format(dayDate, 'yyyy-MM-dd')
                    ;(displaySlotsMap[dateStr] || []).forEach((tIdx: number) => {
                        selSet.add(`${dateStr}-${tIdx}`)
                    })
                })
                setSelected(selSet)
                setWeekData({ 
                    id: docSnap.id, 
                    slots: slotsMap, 
                    pendingSlots: pendingSlotsMap, 
                    status: data.status, 
                    submittedAt: data.submittedAt, 
                    weekStart: data.weekStart 
                })
                setIsSubmitted(true)
            }
        })
        unsubRef.current = unsub
        return () => {
            if (unsubRef.current) {
                unsubRef.current()
                unsubRef.current = null
            }
        }
    }, [currentWeek, user])

    const formatTime = (date: Date) => format(date, 'h:mm a').replace(/:/g, '.').replace(/\s/g, '')

    const timeSlots = (() => {
        const slots: string[] = []
        let current = new Date(2000, 0, 1, 4, 30)
        // Add slots from 4:30 AM to 11:30 PM
        while (current.getHours() < 23 || (current.getHours() === 23 && current.getMinutes() < 30)) {
            const end = addMinutes(current, 30)
            slots.push(`${formatTime(current)} - ${formatTime(end)}`)
            current = end
        }
        // Add the midnight slot: 11:30 PM - 12:00 AM
        const end = addMinutes(current, 30)
        slots.push(`${formatTime(current)} - ${formatTime(end)}`)
        return slots
    })()

    const toggleSlot = (key: string) => {
        const newSelected = new Set(selected)
        if (newSelected.has(key)) {
            newSelected.delete(key)
        } else {
            newSelected.add(key)
        }
        setSelected(newSelected)
    }

    const toggleEditSlot = (key: string) => {
        const newSelected = new Set(editSelected)
        if (newSelected.has(key)) {
            newSelected.delete(key)
        } else {
            newSelected.add(key)
        }
        setEditSelected(newSelected)
    }

    const prevWeek = () => {
        setCurrentWeek(subWeeks(currentWeek, 1))
    }

    const nextWeek = () => {
        setCurrentWeek(addWeeks(currentWeek, 1))
    }

    const submitCheckAvailability = () => {
        if (!user || !db) return
        const weekStr = format(currentWeek, 'yyyy-MM-dd')
        const slotsMap: { [key: string]: number[] } = {}
        dayNames.forEach((_, dIdx) => {
            const dayDate = addDays(currentWeek, dIdx)
            const dateStr = format(dayDate, 'yyyy-MM-dd')
            const daySlots: number[] = []
            timeSlots.forEach((_, tIdx) => {
                const key = `${dateStr}-${tIdx}`
                if (selected.has(key)) {
                    daySlots.push(tIdx)
                }
            })
            if (daySlots.length > 0) {
                slotsMap[dateStr] = daySlots
            }
        })
        const updateData = {
            slots: slotsMap,
            status: 'pending',
            submittedAt: Timestamp.fromDate(new Date()),
        }
        if (weekData) {
            updateDoc(doc(db, 'weeklyAvailability', weekData.id), updateData)
        } else {
            addDoc(collection(db, 'weeklyAvailability'), {
                uid: user.uid,
                weekStart: weekStr,
                ...updateData,
            })
        }
        toast({
            title: "Availability submitted successfully",
            description: "Your availability has been updated."
        })
    }

    const confirmEdit = () => {
        if (!user || !db || !weekData) return
        const slotsMap: { [key: string]: number[] } = {}
        dayNames.forEach((_, dIdx) => {
            const dayDate = addDays(currentWeek, dIdx)
            const dateStr = format(dayDate, 'yyyy-MM-dd')
            const daySlots: number[] = []
            timeSlots.forEach((_, tIdx) => {
                const key = `${dateStr}-${tIdx}`
                if (editSelected.has(key)) {
                    daySlots.push(tIdx)
                }
            })
            if (daySlots.length > 0) {
                slotsMap[dateStr] = daySlots
            }
        })
        updateDoc(doc(db, 'weeklyAvailability', weekData.id), {
            pendingSlots: slotsMap,
            status: 'pending',
        })
        setEditOpen(false)
        toast({
            title: "Changes requested successfully",
            description: "Your availability changes have been submitted."
        })
    }

    const canRequestLeave =
        !!leaveDate &&
        !!applyDays &&
        !!description &&
        !isNaN(Number(applyDays)) &&
        Number(applyDays) > 0 &&
        !!user

    const requestLeave = () => {
        if (!canRequestLeave || !db) return
        const days = Number(applyDays)
        const toDateCalc = addDays(leaveDate!, days - 1)
        addDoc(collection(db, 'leaveRequests'), {
            uid: user!.uid,
            fromDate: Timestamp.fromDate(leaveDate!),
            toDate: Timestamp.fromDate(toDateCalc),
            description,
            status: 'pending',
            appliedAt: Timestamp.fromDate(new Date()),
        })
        setLeaveDate(undefined)
        setApplyDays('')
        setDescription('')
        toast({
            title: "Leave requested successfully",
            description: "Your leave request has been submitted."
        })
    }

    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 mt-3 px-6">Pending</Badge>
            case 'approved':
                return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 mt-3 px-6">Approved</Badge>
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 mt-3 px-6">Rejected</Badge>
            default:
                return <Badge>Unknown</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Check Availability</h1>
                <p className="text-muted-foreground mt-1">
                    Manage Your Work Availability
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card className="w-full md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Apply Leaves</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="date">Apply Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !leaveDate && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {leaveDate ? format(leaveDate, 'PPP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={leaveDate}
                                            onSelect={setLeaveDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="applyDays">Apply Days</Label>
                                <Input
                                    id="applyDays"
                                    type="number"
                                    placeholder="e.g., 5"
                                    value={applyDays}
                                    onChange={(e) => setApplyDays(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-1 space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    placeholder="Enter leave description..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-1 space-y-2">
                                <Button onClick={requestLeave} className="w-full" disabled={!canRequestLeave}>
                                    Request Leave
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="w-full md:col-span-1 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Leave Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                        {leaveRequests.length === 0 ? (
                            <p className="text-muted-foreground text-left py-4">No Leaves Applied</p>
                        ) : (
                            leaveRequests.map((request) => (
                                <div key={request.id} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                                    <p className="text-sm font-medium text-foreground">
                                        Applied from {request.fromDate} to {request.toDate}
                                    </p>
                                    <div className="flex justify-between items-center">
                                        {getStatusBadge(request.status)}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
            <Card className="flex flex-col lg:h-[93vh] w-full">
                <div className="flex justify-end items-center space-x-2 m-5">
                    {isSubmitted && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setEditSelected(selected)
                                setEditOpen(true)
                            }}
                        >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                    )}
                    <Button
                        onClick={submitCheckAvailability}
                        disabled={isSubmitted}
                    >
                        {isSubmitted
                            ? 'Submitted'
                            : 'Submit Availability'}
                    </Button>
                </div>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <Button variant="outline" onClick={prevWeek}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium">Week of {format(currentWeek, 'MMM dd, yyyy')}</div>
                        <Button variant="outline" onClick={nextWeek}>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='text-center'>Time</TableHead>
                                        {dayNames.map((dayName, dIdx) => {
                                            const dayDate = addDays(currentWeek, dIdx)
                                            return (
                                                <TableHead key={dayName} className="text-center">
                                                    <div>{dayName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(dayDate, 'MM/dd')}
                                                    </div>
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeSlots.map((time, tIdx) => (
                                        <TableRow key={time}>
                                            <TableHead className="text-center w-24">{time}</TableHead>
                                            {dayNames.map((_, dIdx) => {
                                                const dayDate = addDays(currentWeek, dIdx)
                                                const dateStr = format(dayDate, 'yyyy-MM-dd')
                                                const key = `${dateStr}-${tIdx}`
                                                const isSelected = selected.has(key)
                                                const approvedSlots = weekData?.slots || {}
                                                const isInApproved = approvedSlots[dateStr]?.includes(tIdx) ?? false
                                                const pendingSlots = weekData?.pendingSlots || {}
                                                const isInPending = pendingSlots[dateStr]?.includes(tIdx) ?? false
                                                const isPending = weekData?.status === 'pending'
                                                const isAdded = isPending && isInPending && !isInApproved
                                                const isRemoved = isPending && isInApproved && !isInPending
                                                return (
                                                    <TableCell
                                                        key={dIdx}
                                                        className={cn(
                                                            'w-20 border text-center align-middle relative',
                                                            !isSubmitted && 'cursor-pointer',
                                                            (isSelected || isRemoved) && colors[dIdx],
                                                            isAdded && 'opacity-50',
                                                            isRemoved && 'opacity-75 line-through'
                                                        )}
                                                        onClick={!isSubmitted ? () => toggleSlot(key) : undefined}
                                                    >
                                                        {isAdded && <Clock className="h-3 w-3 mx-auto" />}
                                                        {isRemoved && <Clock className="h-3 w-3 mx-auto rotate-180" />}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 w-full">
                    <DialogHeader className="p-6 flex-shrink-0">
                        <DialogTitle>Edit Availability</DialogTitle>
                        <DialogDescription>
                            Select your available time slots for the week.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='text-center'>Time</TableHead>
                                        {dayNames.map((dayName, dIdx) => {
                                            const dayDate = addDays(currentWeek, dIdx)
                                            return (
                                                <TableHead key={dayName} className="text-center">
                                                    <div>{dayName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(dayDate, 'MM/dd')}
                                                    </div>
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeSlots.map((time, tIdx) => (
                                        <TableRow key={time}>
                                            <TableHead className="text-center w-24">{time}</TableHead>
                                            {dayNames.map((_, dIdx) => {
                                                const dayDate = addDays(currentWeek, dIdx)
                                                const dateStr = format(dayDate, 'yyyy-MM-dd')
                                                const key = `${dateStr}-${tIdx}`
                                                const isSelected = editSelected.has(key)
                                                return (
                                                    <TableCell
                                                        key={dIdx}
                                                        className={cn(
                                                            'w-20 border cursor-pointer text-center align-middle',
                                                            isSelected && colors[dIdx]
                                                        )}
                                                        onClick={() => toggleEditSlot(key)}
                                                    />
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter className="p-6 flex-shrink-0">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmEdit}>
                            Request Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Availability