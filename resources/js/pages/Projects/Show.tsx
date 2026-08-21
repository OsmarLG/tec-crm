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
import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    CalendarDays,
    CalendarRange,
    ChartGantt,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    LayoutDashboard,
    ListTodo,
    Network,
    Plus,
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
    RichTextDocument,
    RichTextNode,
    Task,
    TaskStatus,
} from '@/types';

type KanbanColumn = {
    status: TaskStatus;
    tasks: Task[];
};

const emptyDocument: RichTextDocument = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

export default function ProjectShow({ project }: { project: Project }) {
    const [view, setView] = useState<
        'overview' | 'tasks' | 'calendar' | 'gantt'
    >('overview');
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [newTaskStatusId, setNewTaskStatusId] = useState<number | null>(null);
    const [teamOpen, setTeamOpen] = useState(false);
    const [diagramsOpen, setDiagramsOpen] = useState(false);

    const columns: KanbanColumn[] = (project.statuses ?? []).map((status) => ({
        status,
        tasks: status.tasks ?? [],
    }));
    const allTasks = columns.flatMap((column) => column.tasks);

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

                <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-md border bg-muted/30 p-1">
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
                                    String(over.id).replace('column-', ''),
                                );
                                targetPosition =
                                    columns.find(
                                        (column) =>
                                            column.status.id === targetStatusId,
                                    )?.tasks.length ?? 0;
                            } else {
                                const overTask = columns
                                    .flatMap((column) => column.tasks)
                                    .find(
                                        (item) => item.id === Number(over.id),
                                    );

                                if (!overTask) {
                                    return;
                                }

                                targetStatusId = overTask.task_status_id;
                                targetPosition = overTask.position;
                            }

                            if (
                                task.task_status_id === targetStatusId &&
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
                            {columns.map((column) => (
                                <KanbanColumnComponent
                                    key={column.status.id}
                                    column={column}
                                    onAdd={() =>
                                        setNewTaskStatusId(column.status.id)
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
    const dated = tasks.filter((task) => task.due_date);
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
    const [month, setMonth] = useState(() => {
        const date = firstDate ? new Date(`${firstDate}T00:00:00`) : new Date();

        return new Date(date.getFullYear(), date.getMonth(), 1);
    });
    const offset = (month.getDay() + 6) % 7;
    const days = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
    ).getDate();
    const cells = Array.from(
        { length: Math.ceil((offset + days) / 7) * 7 },
        (_, index) => index - offset + 1,
    );
    const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

    return (
        <section className="overflow-hidden rounded-md border bg-card">
            <div className="flex items-center justify-between border-b p-4">
                <h2 className="font-semibold capitalize">
                    {month.toLocaleDateString('es-MX', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                            setMonth(
                                new Date(
                                    month.getFullYear(),
                                    month.getMonth() - 1,
                                    1,
                                ),
                            )
                        }
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                            setMonth(
                                new Date(
                                    month.getFullYear(),
                                    month.getMonth() + 1,
                                    1,
                                ),
                            )
                        }
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
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
                {cells.map((day, index) => {
                    const date = `${prefix}-${String(day).padStart(2, '0')}`;
                    const items = tasks.filter(
                        (task) => task.due_date === date,
                    );

                    return (
                        <div
                            key={index}
                            className="min-h-28 border-r border-b p-2"
                        >
                            {day > 0 && day <= days && (
                                <>
                                    <span className="text-xs text-muted-foreground">
                                        {day}
                                    </span>
                                    <div className="mt-1 space-y-1">
                                        {items.map((task) => (
                                            <button
                                                key={task.id}
                                                onClick={() => onOpen(task)}
                                                className="block w-full truncate rounded bg-primary/10 px-1.5 py-1 text-left text-[10px] font-medium text-primary"
                                            >
                                                {task.title}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
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

    const dayMs = 86_400_000;
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
        <section className="overflow-x-auto rounded-md border bg-card">
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
                                    date.getDay() === 0 || date.getDay() === 6;

                                return (
                                    <div
                                        key={iso}
                                        className={`min-w-9 flex-1 border-r py-1.5 text-center ${weekend ? 'bg-muted/50' : ''} ${iso === today ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                    >
                                        <span className="block text-[9px] uppercase">
                                            {date.toLocaleDateString('es-MX', {
                                                weekday: 'narrow',
                                            })}
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
                    const startIndex = Math.round((start - rangeStart) / dayMs);
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
                                <span className="truncate">{task.title}</span>
                            </button>
                            <span className="relative flex h-12 w-full min-w-0">
                                {days.map((date) => {
                                    const iso = date.toISOString().slice(0, 10);
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
                                    className="absolute top-2.5 flex h-7 cursor-pointer items-center overflow-hidden rounded bg-primary px-2 text-[10px] font-medium whitespace-nowrap text-primary-foreground shadow-sm"
                                    style={{
                                        left: `calc(${startIndex * dayPercent}% + 3px)`,
                                        width: `calc(${duration * dayPercent}% - 6px)`,
                                    }}
                                    title={`${startDate} al ${task.due_date}`}
                                >
                                    {startDate} → {task.due_date}
                                </button>
                            </span>
                        </div>
                    );
                })}
            </div>
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
                            {task ? 'Detalles de la tarea' : 'Nueva tarea'}
                        </SheetTitle>
                        <SheetDescription>
                            Define el trabajo, responsables y fecha objetivo.
                        </SheetDescription>
                    </SheetHeader>
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
                                autoFocus
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
                                                    value={String(status.id)}
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
                                        setPriority(value as Task['priority'])
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
                                    <Label htmlFor="task-module">Módulo</Label>
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
                                            {(project.modules ?? []).map(
                                                (module) => (
                                                    <option
                                                        key={module.id}
                                                        value={module.name}
                                                    />
                                                ),
                                            )}
                                        </datalist>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Selecciona uno existente o escribe uno
                                        nuevo.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="task-tags">Etiquetas</Label>
                                    <div className="relative">
                                        <Tags className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                        <Input
                                            id="task-tags"
                                            className="pl-9"
                                            value={tagNames}
                                            onChange={(event) =>
                                                setTagNames(event.target.value)
                                            }
                                            placeholder="backend, reportes, servicio social"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Separa varias etiquetas con comas.
                                    </p>
                                </div>
                            </div>
                            <Label>Responsables</Label>
                            <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                                {(project.members ?? []).map((member) => (
                                    <label
                                        key={member.id}
                                        className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted"
                                    >
                                        <Checkbox
                                            checked={assigneeIds.includes(
                                                member.id,
                                            )}
                                            onCheckedChange={(checked) =>
                                                setAssigneeIds((current) =>
                                                    checked
                                                        ? [
                                                              ...current,
                                                              member.id,
                                                          ]
                                                        : current.filter(
                                                              (id) =>
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
                                ))}
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
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <Trash2 className="size-4" /> Eliminar
                            </Button>
                        ) : (
                            <span />
                        )}
                        <Button
                            onClick={submit}
                            disabled={processing || !title.trim()}
                        >
                            {processing ? 'Guardando...' : 'Guardar tarea'}
                        </Button>
                    </SheetFooter>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Equipo del proyecto</DialogTitle>
                        <DialogDescription>
                            Los miembros pueden ver el tablero, editar tareas y
                            trabajar en los diagramas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {(project.members ?? []).map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 rounded-md border p-3"
                            >
                                <Avatar user={member} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {member.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {member.email}
                                    </p>
                                </div>
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
                        ))}
                    </div>
                    {project.can_manage_members && (
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="persona@empresa.com"
                            />
                            <Button
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
