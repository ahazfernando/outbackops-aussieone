// AvailabilityTable.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    Card,
    CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isBefore, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Edit3, Clock, CheckCircle, AlertCircle, X, Circle } from 'lucide-react'
import {
    Badge,
} from '@/components/ui/badge'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase' // Adjust path to your Firebase config file
import { useToast } from '@/components/ui/use-toast'

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

type WeekData = {
    id: string
    slots: { [key: string]: number[] }
    pendingSlots: { [key: string]: number[] }
    status: string
    submittedAt: Timestamp
    weekStart: string
}

interface AvailabilityTableProps {
    timeSlots: string[]
}

const AvailabilityTable: React.FC<AvailabilityTableProps> = ({ timeSlots }) => {
    const { toast } = useToast()

    // Auth state
    const [user, setUser] = useState<User | null>(null)

    // Availability Table states
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [selected, setSelected] = useState(new Set<string>())
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [weekData, setWeekData] = useState<WeekData | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [editSelected, setEditSelected] = useState(new Set<string>())
    const unsubRef = useRef<(() => void) | null>(null)

    const getDraftKey = useCallback(() => `draft-availability-${user?.uid}-${format(currentWeek, 'yyyy-MM-dd')}`, [user, currentWeek])

    const saveDraft = useCallback((sel: Set<string>) => {
        if (!user) return
        const weekStr = format(currentWeek, 'yyyy-MM-dd')
        const draftData = {
            weekStart: weekStr,
            selected: Array.from(sel),
            updatedAt: new Date().toISOString()
        }
        localStorage.setItem(getDraftKey(), JSON.stringify(draftData))
    }, [user, currentWeek, getDraftKey])

    const loadDraft = useCallback((): Set<string> | null => {
        if (!user) return null
        const key = getDraftKey()
        const draftStr = localStorage.getItem(key)
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr)
                const selSet = new Set<string>(draft.selected as string[])
                setSelected(selSet)
                return selSet
            } catch (e) {
                localStorage.removeItem(key)
            }
        }
        return null
    }, [user, getDraftKey, setSelected])

    const clearDraft = useCallback(() => {
        if (!user) return
        localStorage.removeItem(getDraftKey())
    }, [user, getDraftKey])

    useEffect(() => {
        if (!auth) return
        const unsub = onAuthStateChanged(auth, setUser)
        return unsub
    }, [])

    // Load draft when week or user changes
    useEffect(() => {
        if (!user) return
        loadDraft()
    }, [user, currentWeek, loadDraft])

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
                // Load draft if no data
                const draftSel = loadDraft()
                if (draftSel && draftSel.size > 0) {
                    setIsSubmitted(false)
                } else {
                    setSelected(new Set())
                    setIsSubmitted(false)
                }
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
                // Clear draft if submitted
                clearDraft()
            }
        })
        unsubRef.current = unsub
        return () => {
            if (unsubRef.current) {
                unsubRef.current()
                unsubRef.current = null
            }
        }
    }, [currentWeek, user, loadDraft, clearDraft])

    const isPastDate = (dateStr: string) => {
        const dayDate = new Date(dateStr)
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        dayDate.setHours(0, 0, 0, 0)
        return isBefore(dayDate, now)
    }

    const toggleSlot = (key: string) => {
        const parts = key.split('-')
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`
        if (isPastDate(dateStr)) {
            toast({
                title: "Cannot edit past dates",
                variant: "destructive"
            })
            return
        }
        const newSelected = new Set(selected)
        if (newSelected.has(key)) {
            newSelected.delete(key)
        } else {
            newSelected.add(key)
        }
        setSelected(newSelected)
        // Save draft
        saveDraft(newSelected)
    }

    const toggleEditSlot = (key: string) => {
        const parts = key.split('-')
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`
        if (isPastDate(dateStr)) {
            return
        }
        const newSelected = new Set(editSelected)
        if (newSelected.has(key)) {
            newSelected.delete(key)
        } else {
            newSelected.add(key)
        }
        setEditSelected(newSelected)
    }

    const todayWeek = startOfWeek(new Date(), { weekStartsOn: 1 })

    const prevWeek = () => {
        const newWeek = subWeeks(currentWeek, 1)
        if (isBefore(newWeek, todayWeek)) {
            toast({
                title: "Cannot navigate to past weeks",
                description: "Availability can only be set for current and future weeks."
            })
            return
        }
        setCurrentWeek(newWeek)
    }

    const nextWeek = () => {
        setCurrentWeek(addWeeks(currentWeek, 1))
    }

    const submitCheckAvailability = () => {
        if (!user || !db || selected.size === 0) return
        if (isBefore(currentWeek, todayWeek)) {
            toast({
                title: "Cannot submit for past week",
                variant: "destructive"
            })
            return
        }
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
        clearDraft()
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

    const getCellContent = (isInBase: boolean, isProposed: boolean, status?: string) => {
        let icon, badgeText, badgeClass
        if (isProposed && isInBase) {
            // keep
            if (status === 'approved') {
                icon = <CheckCircle className="h-3 w-3 text-green-500" />
                badgeText = "Approved"
                badgeClass = "bg-green-100 text-green-700 border-green-200"
                return (
                    <div className="flex items-center justify-between w-full px-1">
                        {icon}
                        <Badge variant="secondary" className={`text-xs px-1 py-0.5 ${badgeClass}`}>
                            {badgeText}
                        </Badge>
                    </div>
                )
            } else {
                icon = <Clock className="h-3 w-3 text-blue-500" />
                badgeText = "Pending"
                badgeClass = "bg-blue-100 text-blue-700 border-blue-200"
                return (
                    <div className="flex items-center justify-between w-full px-1">
                        {icon}
                        <Badge variant="secondary" className={`text-xs px-1 py-0.5 ${badgeClass}`}>
                            {badgeText}
                        </Badge>
                    </div>
                )
            }
        } else if (isProposed && !isInBase) {
            // add
            icon = <AlertCircle className="h-3 w-3 text-yellow-500" />
            badgeText = "Requesting"
            badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200"
            return (
                <div className="flex items-center justify-between w-full px-1">
                    {icon}
                    <Badge variant="secondary" className={`text-xs px-1 py-0.5 ${badgeClass}`}>
                        {badgeText}
                    </Badge>
                </div>
            )
        } else if (!isProposed && isInBase) {
            // remove
            icon = <X className="h-3 w-3 text-red-500" />
            badgeText = "Remove"
            badgeClass = "bg-red-100 text-red-700 border-red-200"
            return (
                <div className="flex items-center justify-between w-full px-1">
                    {icon}
                    <Badge variant="secondary" className={`text-xs px-1 py-0.5 ${badgeClass}`}>
                        {badgeText}
                    </Badge>
                </div>
            )
        }
        return null
    }

    const getCellClass = (isInBase: boolean, isProposed: boolean, isPastDay: boolean, isSubmitted: boolean, status?: string) => {
        let bgClass = ''
        if (isProposed && isInBase) {
            if (status === 'approved') {
                bgClass = 'bg-green-50 border-green-300'
            } else {
                bgClass = 'bg-yellow-100 border-yellow-300'
            }
        } else if (isProposed && !isInBase) {
            bgClass = 'bg-yellow-50 border-yellow-300'
        } else if (!isProposed && isInBase) {
            bgClass = 'bg-red-50 border-red-300 line-through opacity-75'
        }
        return cn(
            'h-12 border border-gray-200 text-center align-middle relative transition-all duration-200',
            isPastDay && 'opacity-30 cursor-not-allowed bg-gray-100',
            !isSubmitted && !isPastDay && 'cursor-pointer hover:bg-blue-50',
            !isSubmitted && isProposed && 'bg-blue-100 border-blue-300 shadow-sm',
            bgClass
        )
    }

    return (
        <>
            <Card className="flex flex-col lg:h-[93vh] w-full shadow-xl border-0 rounded-xl overflow-hidden">
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
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                        {isSubmitted
                            ? 'Submitted'
                            : 'Submit Availability'}
                    </Button>
                </div>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                    <div className="flex justify-between items-center mb-4 px-6 pt-6">
                        <Button variant="outline" onClick={prevWeek}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-semibold">Week of {format(currentWeek, 'MMM dd, yyyy')}</div>
                        <Button variant="outline" onClick={nextWeek}>
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="overflow-x-auto">
                            <Table className="w-full border-separate border-spacing-0">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='text-center w-32 font-semibold rounded-tl-lg'>Time</TableHead>
                                        {dayNames.map((dayName, dIdx) => {
                                            const dayDate = addDays(currentWeek, dIdx)
                                            return (
                                                <TableHead key={dayName} className={cn("text-center w-24 font-semibold", dIdx === 0 && "rounded-tl-none", dIdx === dayNames.length - 1 && "rounded-tr-lg")}>
                                                    <div className="font-bold">{dayName}</div>
                                                    <div className="text-xs">
                                                        {format(dayDate, 'MM/dd')}
                                                    </div>
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeSlots.map((time, tIdx) => (
                                        <TableRow key={time} className="transition-colors duration-200">
                                            <TableHead className="text-center w-32 h-12 font-medium text-sm">
                                                {time}
                                            </TableHead>
                                            {dayNames.map((_, dIdx) => {
                                                const dayDate = addDays(currentWeek, dIdx)
                                                const dateStr = format(dayDate, 'yyyy-MM-dd')
                                                const key = `${dateStr}-${tIdx}`
                                                const isPastDay = isPastDate(dateStr)
                                                const isSelected = selected.has(key)
                                                const approvedSlots = weekData?.slots || {}
                                                const isInApproved = approvedSlots[dateStr]?.includes(tIdx) ?? false
                                                const pendingSlots = weekData?.pendingSlots || {}
                                                const isInPending = pendingSlots[dateStr]?.includes(tIdx) ?? false
                                                const status = weekData?.status
                                                const hasPending = status === 'pending' && Object.keys(weekData?.pendingSlots || {}).some(date => pendingSlots[date]?.length > 0)
                                                const isInitialPendingSelected = status === 'pending' && !hasPending && isSelected
                                                const isApprovedSelected = status === 'approved' && isInApproved
                                                const isAdd = status === 'pending' && hasPending && isInPending && !isInApproved
                                                const isRemove = status === 'pending' && hasPending && isInApproved && !isInPending
                                                const isKeep = status === 'pending' && hasPending && isInPending && isInApproved

                                                let cellContent = null
                                                let cellBgClass = ''
                                                if (!weekData && isSelected) {
                                                    // draft
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <Circle className="h-4 w-4 mr-3 text-blue-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-blue-100 px-1 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                                                                Selected
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-blue-100 border-blue-300 shadow-sm'
                                                } else if (isInitialPendingSelected) {
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <Clock className="h-4 w-4 mr-3 text-blue-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-blue-100 px-1 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                                                                Pending
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-yellow-100 border-yellow-300'
                                                } else if (isApprovedSelected) {
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-green-100 px-1 py-0.5 bg-green-100 text-green-700 border-green-200">
                                                                Approved
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-green-50 border-green-300 shadow-sm'
                                                } else if (isKeep) {
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <Clock className="h-4 w-4 mr-3 text-blue-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-blue-100 px-1 py-0.5 bg-blue-100 text-blue-700 border-blue-200">
                                                                Pending
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-yellow-100 border-yellow-300'
                                                } else if (isAdd) {
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <AlertCircle className="h-4 w-4 mr-3 text-yellow-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-yellow-100 px-1 py-0.5 bg-yellow-100 text-yellow-700 border-yellow-200">
                                                                Requesting
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-yellow-50 border-yellow-300'
                                                } else if (isRemove) {
                                                    cellContent = (
                                                        <div className="flex items-center justify-center w-full px-1">
                                                            <X className="h-4 w-4 mr-3 text-red-500" />
                                                            <Badge variant="secondary" className="text-xs hover:bg-red-100 px-1 py-0.5 bg-red-100 text-red-700 border-red-200">
                                                                Remove
                                                            </Badge>
                                                        </div>
                                                    )
                                                    cellBgClass = 'bg-red-50 border-red-300 line-through opacity-75'
                                                }

                                                const cellClass = cn(
                                                    'h-12 border text-center align-middle relative transition-all duration-200',
                                                    isPastDay && 'opacity-30 cursor-not-allowed bg-gray-100',
                                                    !isSubmitted && !isPastDay && 'cursor-pointer',
                                                    !isSubmitted && isSelected && 'shadow-sm',
                                                    cellBgClass,
                                                    dIdx === 0 && 'rounded-l',
                                                    dIdx === dayNames.length - 1 && 'rounded-r'
                                                )

                                                const onCellClick = !isSubmitted && !isPastDay ? () => toggleSlot(key) : undefined

                                                return (
                                                    <TableCell
                                                        key={dIdx}
                                                        className={cellClass}
                                                        onClick={onCellClick}
                                                    >
                                                        {cellContent}
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
                <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 w-full rounded-xl shadow-2xl">
                    <DialogHeader className="p-6 flex-shrink-0 rounded-t-xl">
                        <DialogTitle className="text-xl font-bold">Edit Availability</DialogTitle>
                        <DialogDescription>
                            Select your available time slots for the week. Only changes will be highlighted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="overflow-x-auto">
                            <Table className="w-full border-separate border-spacing-0">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='text-center w-32 font-semibold rounded-tl-lg'>Time</TableHead>
                                        {dayNames.map((dayName, dIdx) => {
                                            const dayDate = addDays(currentWeek, dIdx)
                                            return (
                                                <TableHead key={dayName} className={cn("text-center w-24 font-semibold border", dIdx === dayNames.length - 1 && "rounded-tr-lg")}>
                                                    <div className="font-bold">{dayName}</div>
                                                    <div className="text-xs">
                                                        {format(dayDate, 'MM/dd')}
                                                    </div>
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {timeSlots.map((time, tIdx) => (
                                        <TableRow key={time} className="transition-colors duration-200">
                                            <TableHead className="text-center w-32 h-12 font-medium text-sm">
                                                {time}
                                            </TableHead>
                                            {dayNames.map((_, dIdx) => {
                                                const dayDate = addDays(currentWeek, dIdx)
                                                const dateStr = format(dayDate, 'yyyy-MM-dd')
                                                const key = `${dateStr}-${tIdx}`
                                                const isPastDay = isPastDate(dateStr)
                                                const isProposed = editSelected.has(key)
                                                const baseSlots = weekData?.slots || {}
                                                const isInBase = baseSlots[dateStr]?.includes(tIdx) ?? false
                                                const onCellClick = !isPastDay ? () => toggleEditSlot(key) : undefined
                                                const cellContent = getCellContent(isInBase, isProposed, weekData?.status)
                                                const cellClass = cn(
                                                    getCellClass(isInBase, isProposed, isPastDay, false, weekData?.status),
                                                    dIdx === 0 && 'rounded-l',
                                                    dIdx === dayNames.length - 1 && 'rounded-r'
                                                )
                                                return (
                                                    <TableCell
                                                        key={dIdx}
                                                        className={cellClass}
                                                        onClick={onCellClick}
                                                    >
                                                        {cellContent}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter className="p-6 flex-shrink-0 rounded-b-xl border-t">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmEdit} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                            Request Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default AvailabilityTable