"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { DraggableTaskCard } from '@/components/tasks/DraggableTaskCard';
import { DroppableColumn } from '@/components/tasks/DroppableColumn';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailsDialog } from '@/components/tasks/TaskDetailsDialog';
import { getAllTasks, getTasksByUser, updateTaskStatus } from '@/lib/tasks';
import { Task, TaskStatus } from '@/types/task';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';

const Tasks = () => {
  const { user, getAllUsers: fetchAllUsers } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned'>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const isAdmin = user?.role === 'admin';

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    })
  );

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [user, filter]);

  const loadUsers = async () => {
    try {
      const allUsers = await fetchAllUsers();
      // Filter only approved users
      const approvedUsers = allUsers.filter((u: any) => u.status === 'approved');
      setUsers(approvedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      let fetchedTasks: Task[];

      if (isAdmin) {
        // Admins see all tasks
        fetchedTasks = await getAllTasks();
      } else {
        // Regular users see only assigned tasks
        if (filter === 'assigned' && user) {
          fetchedTasks = await getTasksByUser(user.id);
        } else if (filter === 'all' && user) {
          // For non-admins, 'all' still means assigned tasks
          fetchedTasks = await getTasksByUser(user.id);
        } else {
          fetchedTasks = [];
        }
      }

      setTasks(fetchedTasks);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on search query and date range
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.taskId.toLowerCase().includes(query) ||
        task.assignedMemberNames?.some(name => name.toLowerCase().includes(query))
      );
    }

    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return taskDate >= fromDate && taskDate <= toDate;
        } else if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          return taskDate >= fromDate;
        } else if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return taskDate <= toDate;
        }
        return true;
      });
    }

    return filtered;
  }, [tasks, searchQuery, dateRange]);

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return filteredTasks.filter(task => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = filteredTasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.data.current?.type === 'column') {
      setDraggedOverColumn(over.id as string);
    } else {
      setDraggedOverColumn(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDraggedOverColumn(null);

    if (!over) return;

    const taskId = active.id as string;
    // Find task in original tasks array for updates
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Check if dropped on a column
    if (over.data.current?.type === 'column') {
      const newStatus = over.data.current.status as TaskStatus;
      
      // Don't update if status hasn't changed
      if (task.status === newStatus) return;

      // Check permissions
      const isAssigned = user && task.assignedMembers.includes(user.id);
      if (!isAssigned && !isAdmin) {
        toast({
          title: 'Permission denied',
          description: 'You can only move tasks assigned to you.',
          variant: 'destructive',
        });
        return;
      }

      try {
        // Optimistically update UI
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
          )
        );

        // Update in database
        await updateTaskStatus(taskId, newStatus, {
          changedBy: user?.id,
          changedByName: user?.name,
        });

        toast({
          title: 'Task moved',
          description: `Task status changed to ${newStatus}`,
        });
      } catch (error: any) {
        // Revert on error
        setTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId ? { ...t, status: task.status } : t
          )
        );

        toast({
          title: 'Error',
          description: error.message || 'Failed to update task status',
          variant: 'destructive',
        });
      }
    }
  };

  const handleTaskCardClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  };

  const columns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'New', title: 'New', color: 'bg-blue-500' },
    { status: 'Progress', title: 'In Progress', color: 'bg-yellow-500' },
    { status: 'Complete', title: 'Completed', color: 'bg-green-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange(undefined);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || dateRange?.from || dateRange?.to;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage all tasks' : 'View your assigned tasks'}
          </p>
        </div>
        {isAdmin && (
          <CreateTaskDialog users={users} onTaskCreated={loadTasks} />
        )}
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by name, description, ID, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Filter by date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
            {dateRange && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange(undefined)}
                >
                  Clear date filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.status);
            return (
              <DroppableColumn
                key={column.status}
                id={column.status}
                status={column.status}
                title={column.title}
                color={column.color}
                taskCount={columnTasks.length}
                isOver={draggedOverColumn === column.status}
              >
                {columnTasks.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={loadTasks}
                    canEdit={isAdmin}
                    onCardClick={handleTaskCardClick}
                  />
                ))}
              </DroppableColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 rotate-2">
              <TaskCard
                task={activeTask}
                onStatusChange={loadTasks}
                canEdit={isAdmin}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Details Dialog */}
      <TaskDetailsDialog
        task={selectedTask}
        open={taskDetailsOpen}
        onOpenChange={setTaskDetailsOpen}
        users={users}
        onTaskUpdated={() => {
          loadTasks();
          setTaskDetailsOpen(false);
        }}
      />
    </div>
  );
};

export default Tasks;

