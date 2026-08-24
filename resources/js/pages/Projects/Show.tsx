import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Head, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    CalendarDays,
    CalendarRange,
    ChartGantt,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Filter,
    GripVertical,
    LayoutDashboard,
    ListTodo,
    Network,
    Pencil,
    Plus,
    RotateCcw,
    Trash2,
    Tags,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { RichTextEditor } from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type {
    DiagramSummary,
    Project,
    ProjectMember,
    RichTextDocument,
    RichTextNode,
    Task,
    TaskStatus,
    UserSummary,
} from '@/types';

type KanbanColumn = {
    status: TaskStatus;
    tasks: Task[];
};

type CalendarView = 'day' | 'week' | 'month';
type TaskDateFilter = 'today' | 'week' | 'with_due_date' | 'overdue' | 'all';
type TaskAssigneeFilter = 'mine' | 'all' | 'unassigned' | `user-${number}`;

type TaskFilters = {
    date: TaskDateFilter;
    assignee: TaskAssigneeFilter;
};

const emptyDocument: RichTextDocument = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

const dayMs = 86_400_000;

function parseLocalDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
}

function formatIsoDate(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeek(date: Date): Date {
    const offset = (date.getDay() + 6) % 7;

    return addDays(date, -offset);
}

function isTaskDone(task: Task): boolean {
    return Boolean(task.completed_at);
}

function taskAssignees(task: Task): UserSummary[] {
    return task.assignees ?? (task.assignee ? [task.assignee] : []);
}

function taskMatchesAssignee(
    task: Task,
    assignee: TaskAssigneeFilter,
    currentUserId: number,
): boolean {
    const assignees = taskAssignees(task);

    if (assignee === 'all') {
        return true;
    }

    if (assignee === 'unassigned') {
        return assignees.length === 0;
    }

    const targetUserId =
        assignee === 'mine'
            ? currentUserId
            : Number(assignee.replace('user-', ''));

    return assignees.some((user) => user.id === targetUserId);
}

function taskMatchesDate(task: Task, filter: TaskDateFilter): boolean {
    if (filter === 'all') {
        return true;
    }

    const today = formatIsoDate(new Date());

    if (filter === 'with_due_date') {
        return Boolean(task.due_date);
    }

    if (!task.due_date) {
        return false;
    }

    if (filter === 'today') {
        return task.due_date === today;
    }

    if (filter === 'overdue') {
        return task.due_date < today && !isTaskDone(task);
    }

    const weekEnd = formatIsoDate(addDays(new Date(), 7));

    return task.due_date >= today && task.due_date <= weekEnd;
}

function filterColumns(
    columns: KanbanColumn[],
    filters: TaskFilters,
    currentUserId: number,
): KanbanColumn[] {
    return columns.map((column) => ({
        ...column,
        tasks: column.tasks.filter(
            (task) =>
                taskMatchesDate(task, filters.date) &&
                taskMatchesAssignee(task, filters.assignee, currentUserId),
        ),
    }));
}

function filtersAreDefault(filters: TaskFilters): boolean {
    return filters.date === 'today' && filters.assignee === 'mine';
}

export default function ProjectShow({ project }: { project: Project }) {
    const {
        props: { auth },
    } = usePage();
    const [view, setView] = useState<
        'overview' | 'tasks' | 'calendar' | 'gantt'
    >('overview');
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [newTaskStatusId, setNewTaskStatusId] = useState<number | null>(null);
    const [teamOpen, setTeamOpen] = useState(false);
    const [diagramsOpen, setDiagramsOpen] = useState(false);
    const [taskFilters, setTaskFilters] = useState<TaskFilters>({
        date: 'today',
        assignee: 'mine',
    });

    const columns: KanbanColumn[] = (project.statuses ?? []).map((status) => ({
        status,
        tasks: status.tasks ?? [],
    }));
    const allTasks = columns.flatMap((column) => column.tasks);
    const filteredColumns = filterColumns(columns, taskFilters, auth.user.id);
    const filteredTaskCount = filteredColumns.reduce(
        (total, column) => total + column.tasks.length,
        0,
    );
    const canFilterUsers = Boolean(
        auth.user.is_admin || project.can_manage_members,
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    return (
        <>
            <Head title={project.name} />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold">
                            {project.name}
                        </h1>
                        {project.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {project.description}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setTeamOpen(true)}
                        >
                            <Users className="size-4" />
                            Equipo
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setDiagramsOpen(true)}
                        >
                            <Network className="size-4" />
                            Diagramas
                            <span className="text-muted-foreground">
                                {project.diagrams?.length ?? 0}
                            </span>
                        </Button>
                    </div>
                </div>

                <div className="flex w-full gap-1 overflow-x-auto rounded-md border bg-muted/30 p-1 md:w-fit">
                    {[
                        ['overview', 'Resumen', LayoutDashboard],
                        ['tasks', 'Tareas', ListTodo],
                        ['calendar', 'Calendario', CalendarRange],
                        ['gantt', 'Gantt', ChartGantt],
                    ].map(([value, label, Icon]) => (
                        <Button
                            key={value as string}
                            variant={view === value ? 'secondary' : 'ghost'}
                            size="sm"
                            className="shrink-0"
                            onClick={() => setView(value as typeof view)}
                        >
                            <Icon className="size-4" />
                            {label as string}
                        </Button>
                    ))}
                </div>

                {view === 'overview' && (
                    <ProjectOverview project={project} tasks={allTasks} />
                )}
                {view === 'calendar' && (
                    <ProjectCalendar
                        tasks={allTasks}
                        onOpen={setSelectedTask}
                    />
                )}
                {view === 'gantt' && (
                    <ProjectGantt tasks={allTasks} onOpen={setSelectedTask} />
                )}

                {view === 'tasks' && (
                    <>
                        <TaskFilterBar
                            filters={taskFilters}
                            members={project.members ?? []}
                            currentUserId={auth.user.id}
                            canFilterUsers={canFilterUsers}
                            totalTasks={allTasks.length}
                            visibleTasks={filteredTaskCount}
                            onChange={setTaskFilters}
                        />
                        <MobileTaskList
                            columns={filteredColumns}
                            filtersActive={!filtersAreDefault(taskFilters)}
                            onAdd={setNewTaskStatusId}
                            onOpenTask={setSelectedTask}
                        />
                        <div className="hidden md:block">
                            <DndContext
                                sensors={sensors}
                                onDragStart={({ active }) => {
                                    const task = columns
                                        .flatMap((column) => column.tasks)
                                        .find((item) => item.id === active.id);
                                    setActiveTask(task ?? null);
                                }}
                                onDragCancel={() => setActiveTask(null)}
                                onDragEnd={({ active, over }) => {
                                    setActiveTask(null);

                                    if (!over) {
                                        return;
                                    }

                                    const taskId = Number(active.id);
                                    const task = columns
                                        .flatMap((column) => column.tasks)
                                        .find((item) => item.id === taskId);

                                    if (!task) {
                                        return;
                                    }

                                    let targetStatusId: number;
                                    let targetPosition: number;

                                    if (String(over.id).startsWith('column-')) {
                                        targetStatusId = Number(
                                            String(over.id).replace(
                                                'column-',
                                                '',
                                            ),
                                        );
                                        targetPosition =
                                            columns.find(
                                                (column) =>
                                                    column.status.id ===
                                                    targetStatusId,
                                            )?.tasks.length ?? 0;
                                    } else {
                                        const overTask = columns
                                            .flatMap((column) => column.tasks)
                                            .find(
                                                (item) =>
                                                    item.id === Number(over.id),
                                            );

                                        if (!overTask) {
                                            return;
                                        }

                                        targetStatusId =
                                            overTask.task_status_id;
                                        targetPosition = overTask.position;
                                    }

                                    if (
                                        task.task_status_id ===
                                            targetStatusId &&
                                        task.position === targetPosition
                                    ) {
                                        return;
                                    }

                                    router.post(
                                        `/api/projects/${project.id}/tasks/reorder`,
                                        {
                                            task_id: taskId,
                                            task_status_id: targetStatusId,
                                            position: targetPosition,
                                        },
                                        { preserveScroll: true },
                                    );
                                }}
                            >
                                <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
                                    {filteredColumns.map((column) => (
                                        <KanbanColumnComponent
                                            key={column.status.id}
                                            column={column}
                                            onAdd={() =>
                                                setNewTaskStatusId(
                                                    column.status.id,
                                                )
                                            }
                                            onOpenTask={setSelectedTask}
                                        />
                                    ))}
                                </div>
                                <DragOverlay>
                                    {activeTask && (
                                        <TaskCard task={activeTask} dragging />
                                    )}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </>
                )}
            </div>

            <TaskSheet
                key={
                    selectedTask
                        ? `task-${selectedTask.id}`
                        : `new-${newTaskStatusId}`
                }
                project={project}
                task={selectedTask}
                initialStatusId={newTaskStatusId}
                open={selectedTask !== null || newTaskStatusId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedTask(null);
                        setNewTaskStatusId(null);
                    }
                }}
            />
            <TeamDialog
                project={project}
                open={teamOpen}
                onOpenChange={setTeamOpen}
            />
            <DiagramsDialog
                project={project}
                open={diagramsOpen}
                onOpenChange={setDiagramsOpen}
            />
        </>
    );
}

function TaskFilterBar({
    filters,
    members,
    currentUserId,
    canFilterUsers,
    totalTasks,
    visibleTasks,
    onChange,
}: {
    filters: TaskFilters;
    members: ProjectMember[];
    currentUserId: number;
    canFilterUsers: boolean;
    totalTasks: number;
    visibleTasks: number;
    onChange: (filters: TaskFilters) => void;
}) {
    const dateOptions: Array<{ value: TaskDateFilter; label: string }> = [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Semana' },
        { value: 'with_due_date', label: 'Con cierre' },
        { value: 'overdue', label: 'Vencidas' },
        { value: 'all', label: 'Todas' },
    ];
    const currentMember = members.find((member) => member.id === currentUserId);
    const assigneeLabel =
        filters.assignee === 'mine'
            ? 'Mis tareas'
            : filters.assignee === 'all'
              ? 'Todos'
              : filters.assignee === 'unassigned'
                ? 'Sin responsable'
                : (members.find(
                      (member) =>
                          member.id ===
                          Number(filters.assignee.replace('user-', '')),
                  )?.name ?? 'Usuario');

    const update = (next: Partial<TaskFilters>) =>
        onChange({ ...filters, ...next });

    return (
        <section className="rounded-md border bg-card p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Filter className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                            {visibleTasks} de {totalTasks} tareas
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {assigneeLabel} ·{' '}
                            {
                                dateOptions.find(
                                    (option) => option.value === filters.date,
                                )?.label
                            }
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex max-w-full gap-1 overflow-x-auto rounded-md border bg-muted/30 p-1">
                        {dateOptions.map((option) => (
                            <Button
                                key={option.value}
                                type="button"
                                variant={
                                    filters.date === option.value
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                size="sm"
                                className="h-8 shrink-0 px-2.5"
                                onClick={() => update({ date: option.value })}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
                        <Select
                            value={filters.assignee}
                            onValueChange={(value) =>
                                update({
                                    assignee: value as TaskAssigneeFilter,
                                })
                            }
                        >
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mine">
                                    Mis tareas
                                    {currentMember
                                        ? ` (${currentMember.name})`
                                        : ''}
                                </SelectItem>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="unassigned">
                                    Sin responsable
                                </SelectItem>
                                {canFilterUsers &&
                                    members.map((member) => (
                                        <SelectItem
                                            key={member.id}
                                            value={`user-${member.id}`}
                                        >
                                            {member.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={filtersAreDefault(filters)}
                            onClick={() =>
                                onChange({ date: 'today', assignee: 'mine' })
                            }
                            title="Restablecer filtros"
                        >
                            <RotateCcw className="size-4" />
                            <span className="sr-only">Restablecer filtros</span>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ProjectOverview({
    project,
    tasks,
}: {
    project: Project;
    tasks: Task[];
}) {
    const done = (project.statuses ?? [])
        .filter((status) => status.is_done)
        .reduce((total, status) => total + (status.tasks?.length ?? 0), 0);
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const dated = tasks
        .filter((task) => task.due_date && !isTaskDone(task))
        .sort((a, b) => {
            const aStart = a.start_date ?? a.created_at.slice(0, 10);
            const bStart = b.start_date ?? b.created_at.slice(0, 10);

            return aStart.localeCompare(bStart);
        });
    const overdue = dated.filter(
        (task) =>
            !task.completed_at &&
            task.due_date! < new Date().toISOString().slice(0, 10),
    ).length;

    return (
        <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Avance', `${progress}%`],
                    ['Tareas', String(tasks.length)],
                    ['Fechas objetivo', String(dated.length)],
                    ['Vencidas', String(overdue)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-md border bg-card p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums">
                            {value}
                        </p>
                    </div>
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
                <section className="rounded-md border bg-card p-5">
                    <h2 className="font-semibold">Acerca del proyecto</h2>
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                        {project.description ||
                            'Este proyecto todavía no tiene descripción.'}
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {done} de {tasks.length} tareas completadas
                    </p>
                </section>
                <section className="rounded-md border bg-card p-5">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-muted-foreground" />
                        <h2 className="font-semibold">Distribución</h2>
                    </div>
                    <div className="mt-4 space-y-3">
                        {(project.statuses ?? []).map((status) => (
                            <div
                                key={status.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{
                                            backgroundColor: status.color,
                                        }}
                                    />
                                    {status.name}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                    {status.tasks?.length ?? 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <ClassificationList
                    title="Módulos"
                    icon={Boxes}
                    items={project.modules ?? []}
                />
                <ClassificationList
                    title="Etiquetas"
                    icon={Tags}
                    items={project.tags ?? []}
                />
            </div>
        </div>
    );
}

function ClassificationList({
    title,
    icon: Icon,
    items,
}: {
    title: string;
    icon: typeof Boxes;
    items: Array<{ id: number; name: string; color: string }>;
}) {
    return (
        <section className="rounded-md border bg-card p-5">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <h2 className="font-semibold">{title}</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {items.length ? (
                    items.map((item) => (
                        <span
                            key={item.id}
                            className="rounded px-2 py-1 text-xs font-medium"
                            style={{
                                color: item.color,
                                backgroundColor: `${item.color}18`,
                            }}
                        >
                            {item.name}
                        </span>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Sin elementos todavía
                    </p>
                )}
            </div>
        </section>
    );
}

function ProjectCalendar({
    tasks,
    onOpen,
}: {
    tasks: Task[];
    onOpen: (task: Task) => void;
}) {
    const firstDate = tasks.find((task) => task.due_date)?.due_date;
    const [calendarView, setCalendarView] = useState<CalendarView>('week');
    const [anchorDate, setAnchorDate] = useState(() => {
        const date = firstDate ? parseLocalDate(firstDate) : new Date();

        return startOfWeek(date);
    });
    const monthStart = new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth(),
        1,
    );
    const monthOffset = (monthStart.getDay() + 6) % 7;
    const monthDays = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0,
    ).getDate();
    const monthCells = Array.from(
        { length: Math.ceil((monthOffset + monthDays) / 7) * 7 },
        (_, index) => index - monthOffset + 1,
    );
    const weekStart = startOfWeek(anchorDate);
    const weekDays = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );
    const dayTasks = (date: Date) => {
        const iso = formatIsoDate(date);

        return tasks
            .filter((task) => task.due_date === iso)
            .sort((a, b) => a.priority.localeCompare(b.priority));
    };
    const move = (direction: -1 | 1) => {
        if (calendarView === 'day') {
            setAnchorDate(addDays(anchorDate, direction));
        } else if (calendarView === 'week') {
            setAnchorDate(addDays(anchorDate, direction * 7));
        } else {
            setAnchorDate(
                new Date(
                    anchorDate.getFullYear(),
                    anchorDate.getMonth() + direction,
                    1,
                ),
            );
        }
    };
    const title =
        calendarView === 'day'
            ? anchorDate.toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
              })
            : calendarView === 'week'
              ? `${weekStart.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                })} - ${addDays(weekStart, 6).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })}`
              : monthStart.toLocaleDateString('es-MX', {
                    month: 'long',
                    year: 'numeric',
                });

    return (
        <section className="overflow-hidden rounded-md border bg-card">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                        Calendario
                    </p>
                    <h2 className="truncate font-semibold capitalize">
                        {title}
                    </h2>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                    <div className="flex shrink-0 rounded-md border bg-muted/30 p-1">
                        {[
                            ['day', 'Día'],
                            ['week', 'Semana'],
                            ['month', 'Mes'],
                        ].map(([value, label]) => (
                            <Button
                                key={value}
                                variant={
                                    calendarView === value
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                size="sm"
                                className="h-7 px-2.5"
                                onClick={() =>
                                    setCalendarView(value as CalendarView)
                                }
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => move(-1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => move(1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            {calendarView === 'day' && (
                <CalendarAgendaDay
                    date={anchorDate}
                    tasks={dayTasks(anchorDate)}
                    onOpen={onOpen}
                />
            )}

            {calendarView === 'week' && (
                <div className="divide-y md:grid md:grid-cols-7 md:divide-y-0">
                    {weekDays.map((date) => (
                        <CalendarAgendaDay
                            key={formatIsoDate(date)}
                            date={date}
                            tasks={dayTasks(date)}
                            onOpen={onOpen}
                            compact
                        />
                    ))}
                </div>
            )}

            {calendarView === 'month' && (
                <>
                    <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs text-muted-foreground">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(
                            (day) => (
                                <div key={day} className="p-2">
                                    {day}
                                </div>
                            ),
                        )}
                    </div>
                    <div className="grid grid-cols-7">
                        {monthCells.map((day, index) => {
                            const date = new Date(
                                monthStart.getFullYear(),
                                monthStart.getMonth(),
                                day,
                            );
                            const items =
                                day > 0 && day <= monthDays
                                    ? dayTasks(date)
                                    : [];

                            return (
                                <div
                                    key={index}
                                    className="min-h-24 border-r border-b p-1.5 sm:min-h-28 sm:p-2"
                                >
                                    {day > 0 && day <= monthDays && (
                                        <>
                                            <span className="text-xs text-muted-foreground">
                                                {day}
                                            </span>
                                            <div className="mt-1 space-y-1">
                                                {items
                                                    .slice(0, 2)
                                                    .map((task) => (
                                                        <CalendarTaskButton
                                                            key={task.id}
                                                            task={task}
                                                            onOpen={onOpen}
                                                        />
                                                    ))}
                                                {items.length > 2 && (
                                                    <span className="block rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                                                        +{items.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}

function CalendarAgendaDay({
    date,
    tasks,
    onOpen,
    compact = false,
}: {
    date: Date;
    tasks: Task[];
    onOpen: (task: Task) => void;
    compact?: boolean;
}) {
    return (
        <div className={compact ? 'p-3 md:min-h-48' : 'p-4'}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground capitalize">
                        {date.toLocaleDateString('es-MX', {
                            weekday: 'long',
                        })}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                        {date.getDate()}
                    </p>
                </div>
                <span className="text-xs text-muted-foreground">
                    {tasks.length}
                </span>
            </div>
            <div className="space-y-2">
                {tasks.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                        Sin tareas
                    </p>
                ) : (
                    tasks.map((task) => (
                        <CalendarTaskButton
                            key={task.id}
                            task={task}
                            onOpen={onOpen}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function CalendarTaskButton({
    task,
    onOpen,
}: {
    task: Task;
    onOpen: (task: Task) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onOpen(task)}
            className="block w-full rounded-md bg-primary/10 px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/15"
        >
            <span className="line-clamp-2">{task.title}</span>
        </button>
    );
}

function ProjectGantt({
    tasks,
    onOpen,
}: {
    tasks: Task[];
    onOpen: (task: Task) => void;
}) {
    const dated = tasks.filter((task) => task.due_date);

    if (!dated.length) {
        return (
            <div className="rounded-md border p-10 text-center text-sm text-muted-foreground">
                Agrega fechas a las tareas para construir el Gantt.
            </div>
        );
    }

    const dayWidth = 36;
    const parseDate = (date: string) => new Date(`${date}T00:00:00`).getTime();
    const starts = dated.map((task) =>
        parseDate(task.start_date ?? task.created_at.slice(0, 10)),
    );
    const ends = dated.map((task) => parseDate(task.due_date!));
    const rangeStart = Math.min(...starts) - dayMs;
    const rangeEnd = Math.max(...ends) + dayMs;
    const dayCount = Math.round((rangeEnd - rangeStart) / dayMs) + 1;
    const days = Array.from(
        { length: dayCount },
        (_, index) => new Date(rangeStart + index * dayMs),
    );
    const months = days.reduce<
        Array<{ key: string; label: string; days: number }>
    >((groups, date) => {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const current = groups.at(-1);

        if (current?.key === key) {
            current.days += 1;
        } else {
            groups.push({
                key,
                label: date.toLocaleDateString('es-MX', {
                    month: 'long',
                    year: 'numeric',
                }),
                days: 1,
            });
        }

        return groups;
    }, []);
    const today = new Date().toISOString().slice(0, 10);
    const timelineWidth = dayCount * dayWidth;
    const dayPercent = 100 / dayCount;

    return (
        <section className="rounded-md border bg-card">
            <div className="border-b p-4">
                <h2 className="font-semibold">Gantt</h2>
                <p className="text-sm text-muted-foreground">
                    Tareas activas con fechas. Las tareas terminadas quedan
                    fuera de esta vista.
                </p>
            </div>
            <div className="divide-y md:hidden">
                {dated.map((task) => {
                    const startDate =
                        task.start_date ?? task.created_at.slice(0, 10);

                    return (
                        <button
                            key={task.id}
                            type="button"
                            onClick={() => onOpen(task)}
                            className="flex w-full flex-col gap-2 p-4 text-left hover:bg-muted/30"
                        >
                            <span className="line-clamp-2 text-sm font-medium">
                                {task.title}
                            </span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarDays className="size-3.5" />
                                {startDate} - {task.due_date}
                            </span>
                            <span className="h-2 rounded-full bg-muted">
                                <span
                                    className="block h-full rounded-full bg-primary"
                                    style={{
                                        width: `${Math.min(
                                            Math.max(
                                                Math.round(
                                                    ((parseDate(
                                                        task.due_date!,
                                                    ) -
                                                        parseDate(startDate)) /
                                                        dayMs +
                                                        1) *
                                                        18,
                                                ),
                                                18,
                                            ),
                                            100,
                                        )}%`,
                                    }}
                                />
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="hidden overflow-x-auto md:block">
                <div
                    className="w-max min-w-full"
                    style={{ width: `max(100%, ${260 + timelineWidth}px)` }}
                >
                    <div className="sticky top-0 z-20 grid grid-cols-[260px_minmax(0,1fr)] border-b bg-card">
                        <div className="flex items-end border-r p-3 text-xs font-medium text-muted-foreground">
                            Tarea
                        </div>
                        <div className="min-w-0">
                            <div className="flex border-b">
                                {months.map((month) => (
                                    <div
                                        key={month.key}
                                        className="border-r px-2 py-1.5 text-xs font-semibold capitalize"
                                        style={{
                                            width: `${month.days * dayPercent}%`,
                                        }}
                                    >
                                        {month.label}
                                    </div>
                                ))}
                            </div>
                            <div className="flex">
                                {days.map((date) => {
                                    const iso = date.toISOString().slice(0, 10);
                                    const weekend =
                                        date.getDay() === 0 ||
                                        date.getDay() === 6;

                                    return (
                                        <div
                                            key={iso}
                                            className={`min-w-9 flex-1 border-r py-1.5 text-center ${weekend ? 'bg-muted/50' : ''} ${iso === today ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                        >
                                            <span className="block text-[9px] uppercase">
                                                {date.toLocaleDateString(
                                                    'es-MX',
                                                    {
                                                        weekday: 'narrow',
                                                    },
                                                )}
                                            </span>
                                            <span className="text-xs font-medium tabular-nums">
                                                {date.getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    {dated.map((task) => {
                        const startDate =
                            task.start_date ?? task.created_at.slice(0, 10);
                        const start = parseDate(startDate);
                        const end = parseDate(task.due_date!);
                        const startIndex = Math.round(
                            (start - rangeStart) / dayMs,
                        );
                        const duration = Math.max(
                            Math.round((end - start) / dayMs) + 1,
                            1,
                        );

                        return (
                            <div
                                key={task.id}
                                className="grid w-full grid-cols-[260px_minmax(0,1fr)] border-b text-left last:border-b-0 hover:bg-muted/20"
                            >
                                <button
                                    type="button"
                                    onClick={() => onOpen(task)}
                                    className="sticky left-0 z-10 flex min-w-0 cursor-pointer items-center border-r bg-card px-3 py-3 text-left text-sm font-medium hover:bg-muted/40"
                                >
                                    <span className="truncate">
                                        {task.title}
                                    </span>
                                </button>
                                <span className="relative flex h-12 w-full min-w-0">
                                    {days.map((date) => {
                                        const iso = date
                                            .toISOString()
                                            .slice(0, 10);
                                        const weekend =
                                            date.getDay() === 0 ||
                                            date.getDay() === 6;

                                        return (
                                            <span
                                                key={iso}
                                                className={`h-full min-w-9 flex-1 border-r ${weekend ? 'bg-muted/35' : ''} ${iso === today ? 'bg-primary/5' : ''}`}
                                            />
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={() => onOpen(task)}
                                        className="absolute top-2.5 flex h-7 max-w-[calc(100%-6px)] cursor-pointer items-center overflow-hidden rounded bg-primary px-2 text-[10px] font-medium whitespace-nowrap text-primary-foreground shadow-sm"
                                        style={{
                                            left: `calc(${startIndex * dayPercent}% + 3px)`,
                                            width: `max(2rem, calc(${duration * dayPercent}% - 6px))`,
                                        }}
                                        title={`${startDate} al ${task.due_date}`}
                                    >
                                        <span className="truncate">
                                            {startDate} - {task.due_date}
                                        </span>
                                    </button>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function MobileTaskList({
    columns,
    filtersActive,
    onAdd,
    onOpenTask,
}: {
    columns: KanbanColumn[];
    filtersActive: boolean;
    onAdd: (statusId: number) => void;
    onOpenTask: (task: Task) => void;
}) {
    const [collapsedStatusIds, setCollapsedStatusIds] = useState<Set<number>>(
        () => new Set(),
    );
    const visibleTasks = columns.reduce(
        (total, column) => total + column.tasks.length,
        0,
    );
    const toggleStatus = (statusId: number) => {
        setCollapsedStatusIds((current) => {
            const next = new Set(current);

            if (next.has(statusId)) {
                next.delete(statusId);
            } else {
                next.add(statusId);
            }

            return next;
        });
    };

    return (
        <div className="space-y-4 md:hidden">
            {visibleTasks === 0 && filtersActive && (
                <div className="rounded-md border border-dashed bg-card p-4 text-sm text-muted-foreground">
                    No hay tareas con estos filtros.
                </div>
            )}
            {columns.map((column) => (
                <MobileTaskSection
                    key={column.status.id}
                    column={column}
                    collapsed={collapsedStatusIds.has(column.status.id)}
                    onToggle={() => toggleStatus(column.status.id)}
                    onAdd={() => onAdd(column.status.id)}
                    onOpenTask={onOpenTask}
                />
            ))}
        </div>
    );
}

function MobileTaskSection({
    column,
    collapsed,
    onToggle,
    onAdd,
    onOpenTask,
}: {
    column: KanbanColumn;
    collapsed: boolean;
    onToggle: () => void;
    onAdd: () => void;
    onOpenTask: (task: Task) => void;
}) {
    return (
        <section className="overflow-hidden rounded-md border bg-card">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-3 py-2.5">
                <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={onToggle}
                >
                    <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`}
                    />
                    <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: column.status.color }}
                    />
                    <h2 className="truncate text-sm font-semibold">
                        {column.status.name}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {column.tasks.length}
                    </span>
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={onAdd}
                    title="Agregar tarea"
                >
                    <Plus className="size-4" />
                    <span className="sr-only">Agregar tarea</span>
                </Button>
            </div>
            {!collapsed && (
                <div className="space-y-2 p-3">
                    {column.tasks.length === 0 ? (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="w-full rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                        >
                            Agregar tarea
                        </button>
                    ) : (
                        column.tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onOpen={() => onOpenTask(task)}
                            />
                        ))
                    )}
                </div>
            )}
        </section>
    );
}

function KanbanColumnComponent({
    column,
    onAdd,
    onOpenTask,
}: {
    column: KanbanColumn;
    onAdd: () => void;
    onOpenTask: (task: Task) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.status.id}`,
    });

    return (
        <section className="flex w-[19rem] shrink-0 flex-col gap-3">
            <div className="flex h-8 items-center justify-between gap-2 px-1">
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: column.status.color }}
                    />
                    <h2 className="truncate text-sm font-semibold">
                        {column.status.name}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {column.tasks.length}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={onAdd}
                    title="Agregar tarea"
                >
                    <Plus className="size-4" />
                    <span className="sr-only">Agregar tarea</span>
                </Button>
            </div>

            <SortableContext
                items={column.tasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
            >
                <div
                    ref={setNodeRef}
                    className={`flex min-h-36 flex-col gap-2 rounded-md border border-dashed p-2 transition-colors ${isOver ? 'border-primary/60 bg-primary/5' : 'bg-muted/20'}`}
                >
                    {column.tasks.map((task) => (
                        <SortableTaskCard
                            key={task.id}
                            task={task}
                            onOpen={() => onOpenTask(task)}
                        />
                    ))}
                </div>
            </SortableContext>

            <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={onAdd}
            >
                <Plus className="size-4" />
                Agregar tarea
            </Button>
        </section>
    );
}

function SortableTaskCard({
    task,
    onOpen,
}: {
    task: Task;
    onOpen: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: transform
                    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
                    : undefined,
                transition,
                opacity: isDragging ? 0.35 : 1,
            }}
        >
            <TaskCard
                task={task}
                onOpen={onOpen}
                dragHandle={
                    <button
                        ref={setActivatorNodeRef}
                        type="button"
                        className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                        title="Mover tarea"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4" />
                        <span className="sr-only">Mover tarea</span>
                    </button>
                }
            />
        </div>
    );
}

function TaskCard({
    task,
    onOpen,
    dragging = false,
    dragHandle,
}: {
    task: Task;
    onOpen?: () => void;
    dragging?: boolean;
    dragHandle?: React.ReactNode;
}) {
    const priorityColors = {
        low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
        high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
        urgent: 'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    const summary = task.details
        ? richTextToPlain(task.details)
        : task.description;

    return (
        <article
            className={`rounded-md border bg-card p-3 shadow-sm ${dragging ? 'w-[19rem] rotate-1 shadow-lg' : ''}`}
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={onOpen}
                >
                    <h3 className="text-sm leading-5 font-medium">
                        {task.title}
                    </h3>
                    {summary && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {summary}
                        </p>
                    )}
                </button>
                {dragHandle}
            </div>
            {(task.module || (task.tags?.length ?? 0) > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {task.module && (
                        <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <Boxes className="size-3" />
                            {task.module.name}
                        </span>
                    )}
                    {(task.tags ?? []).slice(0, 3).map((tag) => (
                        <span
                            key={tag.id}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                                color: tag.color,
                                backgroundColor: `${tag.color}18`,
                            }}
                        >
                            {tag.name}
                        </span>
                    ))}
                    {(task.tags?.length ?? 0) > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                            +{(task.tags?.length ?? 0) - 3}
                        </span>
                    )}
                </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColors[task.priority]}`}
                >
                    {task.priority}
                </span>
                <div className="flex items-center gap-2">
                    {task.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarDays className="size-3.5" />
                            {task.due_date}
                        </span>
                    )}
                    <AvatarStack
                        users={
                            task.assignees ??
                            (task.assignee ? [task.assignee] : [])
                        }
                    />
                </div>
            </div>
        </article>
    );
}

function TaskSheet({
    project,
    task,
    initialStatusId,
    open,
    onOpenChange,
}: {
    project: Project;
    task: Task | null;
    initialStatusId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [title, setTitle] = useState(task?.title ?? '');
    const [statusId, setStatusId] = useState(
        task?.task_status_id ??
            initialStatusId ??
            project.statuses?.[0]?.id ??
            0,
    );
    const [priority, setPriority] = useState<Task['priority']>(
        task?.priority ?? 'medium',
    );
    const [dueDate, setDueDate] = useState(task?.due_date ?? '');
    const [startDate, setStartDate] = useState(task?.start_date ?? '');
    const [moduleName, setModuleName] = useState(task?.module?.name ?? '');
    const [tagNames, setTagNames] = useState(
        (task?.tags ?? []).map((tag) => tag.name).join(', '),
    );
    const [assigneeIds, setAssigneeIds] = useState<number[]>(
        (task?.assignees ?? (task?.assignee ? [task.assignee] : [])).map(
            (user) => user.id,
        ),
    );
    const [details, setDetails] = useState<RichTextDocument>(
        task?.details ??
            (task?.description
                ? {
                      type: 'doc',
                      content: [
                          {
                              type: 'paragraph',
                              content: [
                                  { type: 'text', text: task.description },
                              ],
                          },
                      ],
                  }
                : emptyDocument),
    );
    const [processing, setProcessing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editing, setEditing] = useState(task === null);
    const status = project.statuses?.find(
        (projectStatus) => projectStatus.id === statusId,
    );
    const assignees = (project.members ?? []).filter((member) =>
        assigneeIds.includes(member.id),
    );
    const detailsText = richTextToPlain(details);
    const priorityLabels: Record<Task['priority'], string> = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente',
    };

    const resetForm = () => {
        setTitle(task?.title ?? '');
        setStatusId(
            task?.task_status_id ??
                initialStatusId ??
                project.statuses?.[0]?.id ??
                0,
        );
        setPriority(task?.priority ?? 'medium');
        setDueDate(task?.due_date ?? '');
        setStartDate(task?.start_date ?? '');
        setModuleName(task?.module?.name ?? '');
        setTagNames((task?.tags ?? []).map((tag) => tag.name).join(', '));
        setAssigneeIds(
            (task?.assignees ?? (task?.assignee ? [task.assignee] : [])).map(
                (user) => user.id,
            ),
        );
        setDetails(
            task?.details ??
                (task?.description
                    ? {
                          type: 'doc',
                          content: [
                              {
                                  type: 'paragraph',
                                  content: [
                                      { type: 'text', text: task.description },
                                  ],
                              },
                          ],
                      }
                    : emptyDocument),
        );
    };

    const submit = () => {
        if (!title.trim() || !statusId) {
            return;
        }

        setProcessing(true);
        const payload = {
            title: title.trim(),
            task_status_id: statusId,
            priority,
            due_date: dueDate || null,
            start_date: startDate || null,
            assignee_ids: assigneeIds,
            details,
            module_name: moduleName.trim() || null,
            tag_names: tagNames
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean),
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
            onFinish: () => setProcessing(false),
        };

        if (task) {
            router.patch(`/api/tasks/${task.id}`, payload as any, options);
        } else {
            router.post(
                `/api/projects/${project.id}/tasks`,
                payload as any,
                options,
            );
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
                    <SheetHeader className="border-b px-6 py-5">
                        <SheetTitle>
                            {task
                                ? editing
                                    ? 'Editar tarea'
                                    : 'Detalle de tarea'
                                : 'Nueva tarea'}
                        </SheetTitle>
                        <SheetDescription>
                            {editing
                                ? 'Actualiza solo lo que necesitas cambiar.'
                                : 'Consulta la información antes de hacer cambios.'}
                        </SheetDescription>
                    </SheetHeader>
                    {editing ? (
                        <>
                            <div className="space-y-5 px-6 pb-6">
                                <div className="space-y-2">
                                    <Label htmlFor="task-title">Título</Label>
                                    <Input
                                        id="task-title"
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(event.target.value)
                                        }
                                        placeholder="¿Qué hay que entregar?"
                                        autoFocus={!task}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>Estado</Label>
                                        <Select
                                            value={String(statusId)}
                                            onValueChange={(value) =>
                                                setStatusId(Number(value))
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(project.statuses ?? []).map(
                                                    (status) => (
                                                        <SelectItem
                                                            key={status.id}
                                                            value={String(
                                                                status.id,
                                                            )}
                                                        >
                                                            {status.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="task-start-date">
                                            Fecha de inicio
                                        </Label>
                                        <Input
                                            id="task-start-date"
                                            type="date"
                                            value={startDate}
                                            max={dueDate || undefined}
                                            onChange={(event) =>
                                                setStartDate(event.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Prioridad</Label>
                                        <Select
                                            value={priority}
                                            onValueChange={(value) =>
                                                setPriority(
                                                    value as Task['priority'],
                                                )
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">
                                                    Baja
                                                </SelectItem>
                                                <SelectItem value="medium">
                                                    Media
                                                </SelectItem>
                                                <SelectItem value="high">
                                                    Alta
                                                </SelectItem>
                                                <SelectItem value="urgent">
                                                    Urgente
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="task-date">
                                            Fecha objetivo
                                        </Label>
                                        <Input
                                            id="task-date"
                                            type="date"
                                            value={dueDate}
                                            onChange={(event) =>
                                                setDueDate(event.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="task-module">
                                                Módulo
                                            </Label>
                                            <div className="relative">
                                                <Boxes className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                                <Input
                                                    id="task-module"
                                                    list="project-modules"
                                                    className="pl-9"
                                                    value={moduleName}
                                                    onChange={(event) =>
                                                        setModuleName(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Servicio Social"
                                                />
                                                <datalist id="project-modules">
                                                    {(
                                                        project.modules ?? []
                                                    ).map((module) => (
                                                        <option
                                                            key={module.id}
                                                            value={module.name}
                                                        />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Selecciona uno existente o
                                                escribe uno nuevo.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="task-tags">
                                                Etiquetas
                                            </Label>
                                            <div className="relative">
                                                <Tags className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                                <Input
                                                    id="task-tags"
                                                    className="pl-9"
                                                    value={tagNames}
                                                    onChange={(event) =>
                                                        setTagNames(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="backend, reportes, servicio social"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Separa varias etiquetas con
                                                comas.
                                            </p>
                                        </div>
                                    </div>
                                    <Label>Responsables</Label>
                                    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                                        {(project.members ?? []).map(
                                            (member) => (
                                                <label
                                                    key={member.id}
                                                    className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                                                >
                                                    <Checkbox
                                                        checked={assigneeIds.includes(
                                                            member.id,
                                                        )}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            setAssigneeIds(
                                                                (current) =>
                                                                    checked
                                                                        ? [
                                                                              ...current,
                                                                              member.id,
                                                                          ]
                                                                        : current.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
                                                                                  id !==
                                                                                  member.id,
                                                                          ),
                                                            )
                                                        }
                                                    />
                                                    <Avatar user={member} />
                                                    <span className="min-w-0 text-sm">
                                                        <span className="block truncate font-medium">
                                                            {member.name}
                                                        </span>
                                                        <span className="block truncate text-xs text-muted-foreground">
                                                            {member.email}
                                                        </span>
                                                    </span>
                                                </label>
                                            ),
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <RichTextEditor
                                        content={details}
                                        onChange={setDetails}
                                    />
                                </div>
                            </div>
                            <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-between">
                                {task ? (
                                    <Button
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => {
                                            resetForm();
                                            setEditing(false);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                ) : (
                                    <span />
                                )}
                                <Button
                                    onClick={submit}
                                    disabled={processing || !title.trim()}
                                >
                                    {processing
                                        ? 'Guardando...'
                                        : 'Guardar tarea'}
                                </Button>
                            </SheetFooter>
                        </>
                    ) : (
                        <>
                            <div className="space-y-6 px-6 py-5">
                                <div className="space-y-3">
                                    <h2 className="text-xl leading-7 font-semibold text-pretty">
                                        {title}
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        {status && (
                                            <span
                                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                                                style={{
                                                    borderColor: `${status.color}55`,
                                                    color: status.color,
                                                    backgroundColor: `${status.color}12`,
                                                }}
                                            >
                                                <span
                                                    className="size-2 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            status.color,
                                                    }}
                                                />
                                                {status.name}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                            {priorityLabels[priority]}
                                        </span>
                                    </div>
                                </div>

                                <dl className="grid gap-3 sm:grid-cols-2">
                                    <TaskDetailItem
                                        label="Fecha de inicio"
                                        value={startDate || 'Sin fecha'}
                                    />
                                    <TaskDetailItem
                                        label="Fecha objetivo"
                                        value={dueDate || 'Sin fecha'}
                                    />
                                    <TaskDetailItem
                                        label="Módulo"
                                        value={moduleName || 'Sin módulo'}
                                    />
                                    <TaskDetailItem
                                        label="Etiquetas"
                                        value={tagNames || 'Sin etiquetas'}
                                    />
                                </dl>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Responsables
                                    </p>
                                    {assignees.length === 0 ? (
                                        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                            Sin responsables asignados.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignees.map((member) => (
                                                <div
                                                    key={member.id}
                                                    className="flex min-w-0 items-center gap-3 rounded-md border p-3"
                                                >
                                                    <Avatar user={member} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">
                                                            {member.name}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {member.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Descripción
                                    </p>
                                    {detailsText ? (
                                        <p className="rounded-md border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">
                                            {detailsText}
                                        </p>
                                    ) : (
                                        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                            Sin descripción.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-between">
                                <Button
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    <Trash2 className="size-4" /> Eliminar
                                </Button>
                                <Button onClick={() => setEditing(true)}>
                                    <Pencil className="size-4" />
                                    Editar
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </SheetContent>
            </Sheet>
            <Dialog
                open={confirmDelete}
                onOpenChange={(nextOpen) => {
                    if (!deleting) {
                        setConfirmDelete(nextOpen);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar tarea</DialogTitle>
                        <DialogDescription>
                            Se eliminará “{task?.title}” permanentemente. Esta
                            acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={deleting}
                            onClick={() => setConfirmDelete(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={() => {
                                if (!task || deleting) {
                                    return;
                                }

                                setDeleting(true);
                                router.delete(`/api/tasks/${task.id}`, {
                                    onSuccess: () => {
                                        setConfirmDelete(false);
                                        onOpenChange(false);
                                    },
                                    onFinish: () => setDeleting(false),
                                });
                            }}
                        >
                            <Trash2 className="size-4" />
                            {deleting ? 'Eliminando...' : 'Eliminar tarea'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function TaskDetailItem({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="rounded-md border p-3">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-medium break-words">{value}</dd>
        </div>
    );
}

function TeamDialog({
    project,
    open,
    onOpenChange,
}: {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [email, setEmail] = useState('');
    const [processing, setProcessing] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<number | null>(
        null,
    );
    const [memberToRemove, setMemberToRemove] = useState<{
        id: number;
        name: string;
    } | null>(null);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Equipo del proyecto</DialogTitle>
                        <DialogDescription className="text-pretty">
                            Los miembros pueden ver el tablero, editar tareas y
                            trabajar en los diagramas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {(project.members ?? []).map((member) => (
                            <div
                                key={member.id}
                                className="flex min-w-0 flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar user={member} />
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-sm leading-5 font-medium">
                                            {member.name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 sm:ml-auto">
                                    <span className="text-xs text-muted-foreground">
                                        {member.role === 'owner'
                                            ? 'Propietario'
                                            : 'Miembro'}
                                    </span>
                                    {project.can_manage_members &&
                                        member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                title="Quitar miembro"
                                                disabled={
                                                    removingMemberId !== null ||
                                                    processing
                                                }
                                                onClick={() =>
                                                    setMemberToRemove({
                                                        id: member.id,
                                                        name: member.name,
                                                    })
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                <span className="sr-only">
                                                    Quitar miembro
                                                </span>
                                            </Button>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {project.can_manage_members && (
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <Input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="persona@empresa.com"
                            />
                            <Button
                                className="w-full sm:w-auto"
                                disabled={
                                    !email ||
                                    processing ||
                                    removingMemberId !== null
                                }
                                onClick={() => {
                                    setProcessing(true);
                                    router.post(
                                        `/api/projects/${project.id}/members`,
                                        { email },
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => setEmail(''),
                                            onFinish: () =>
                                                setProcessing(false),
                                        },
                                    );
                                }}
                            >
                                <UserPlus className="size-4" />
                                {processing ? 'Enviando...' : 'Invitar'}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={memberToRemove !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && removingMemberId === null) {
                        setMemberToRemove(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Quitar miembro</DialogTitle>
                        <DialogDescription>
                            ¿Confirmas que deseas quitar a “
                            {memberToRemove?.name}” del proyecto? Perderá acceso
                            y sus asignaciones en este proyecto serán retiradas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={removingMemberId !== null}
                            onClick={() => setMemberToRemove(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={removingMemberId !== null}
                            onClick={() => {
                                if (
                                    !memberToRemove ||
                                    removingMemberId !== null
                                ) {
                                    return;
                                }

                                setRemovingMemberId(memberToRemove.id);
                                router.delete(
                                    `/api/projects/${project.id}/members/${memberToRemove.id}`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () =>
                                            setMemberToRemove(null),
                                        onFinish: () =>
                                            setRemovingMemberId(null),
                                    },
                                );
                            }}
                        >
                            <Trash2 className="size-4" />
                            {removingMemberId !== null
                                ? 'Quitando...'
                                : 'Quitar miembro'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function DiagramsDialog({
    project,
    open,
    onOpenChange,
}: {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [name, setName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<DiagramSummary | null>(
        null,
    );
    const diagrams = project.diagrams ?? [];

    const createDiagram = () => {
        if (!name.trim() || processing) {
            return;
        }

        setProcessing(true);
        setError('');
        router.post(
            `/projects/${project.id}/diagrams`,
            { name: name.trim() },
            {
                onError: (errors) =>
                    setError(errors.name ?? 'No se pudo crear el diagrama.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Diagramas</DialogTitle>
                        <DialogDescription>
                            Crea una pizarra separada para cada flujo,
                            arquitectura o idea.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {diagrams.length === 0 && (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Todavía no hay diagramas.
                            </div>
                        )}
                        {diagrams.map((diagram: DiagramSummary) => (
                            <div
                                key={diagram.id}
                                className="flex items-center gap-2 rounded-md border p-2"
                            >
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded p-1 text-left hover:bg-muted/50"
                                    onClick={() =>
                                        router.visit(
                                            `/projects/${project.id}/diagrams/${diagram.id}`,
                                        )
                                    }
                                >
                                    <span className="flex size-9 items-center justify-center rounded-md bg-muted">
                                        <Network className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {diagram.name}
                                    </span>
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleteTarget(diagram)}
                                    title="Eliminar diagrama"
                                >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">
                                        Eliminar diagrama
                                    </span>
                                </Button>
                            </div>
                        ))}
                    </div>
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    <DialogFooter className="sm:justify-stretch">
                        <Input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Ej. Flujo de ventas"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    createDiagram();
                                }
                            }}
                        />
                        <Button
                            disabled={!name.trim() || processing}
                            onClick={createDiagram}
                        >
                            <Plus className="size-4" />
                            {processing ? 'Creando...' : 'Crear diagrama'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteTarget !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setDeleteTarget(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar diagrama</DialogTitle>
                        <DialogDescription>
                            Se eliminará “{deleteTarget?.name}” junto con su
                            lienzo y biblioteca. Esta acción no se puede
                            deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!deleteTarget) {
                                    return;
                                }

                                router.delete(
                                    `/projects/${project.id}/diagrams/${deleteTarget.id}`,
                                    { onSuccess: () => setDeleteTarget(null) },
                                );
                            }}
                        >
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function AvatarStack({
    users,
}: {
    users: Array<{ id: number; name: string }>;
}) {
    if (users.length === 0) {
        return null;
    }

    return (
        <div className="flex -space-x-1.5">
            {users.slice(0, 3).map((user) => (
                <Avatar key={user.id} user={user} small />
            ))}
            {users.length > 3 && (
                <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px]">
                    +{users.length - 3}
                </span>
            )}
        </div>
    );
}

function Avatar({
    user,
    small = false,
}: {
    user: { name: string };
    small?: boolean;
}) {
    const initials = user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return (
        <span
            title={user.name}
            className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground ${small ? 'size-6 border-2 border-card text-[9px]' : 'size-8 text-xs'}`}
        >
            {initials}
        </span>
    );
}

function richTextToPlain(node: RichTextNode): string {
    if (node.text) {
        return node.text;
    }

    const content = (node.content ?? [])
        .map(richTextToPlain)
        .filter(Boolean)
        .join(node.type === 'doc' ? ' ' : '');

    return content.replace(/\s+/g, ' ').trim();
}

ProjectShow.layout = {
    breadcrumbs: [{ title: 'Projects', href: '/projects' }],
};
