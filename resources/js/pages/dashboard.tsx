import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    ListTodo,
    Plus,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type Summary = {
    projects: number;
    open_tasks: number;
    due_soon: number;
    overdue: number;
    completed_this_week: number;
};

type DashboardProject = {
    id: number;
    name: string;
    description?: string;
    color: string;
    tasks_count: number;
    completed_tasks_count: number;
    members_count: number;
    updated_at: string;
};

type DashboardTask = {
    id: number;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    project: { id: number; name: string; color: string };
    status: { name: string; color: string };
    assignees: Array<{ id: number; name: string }>;
};

type Props = {
    summary: Summary;
    projects: DashboardProject[];
    myTasks: DashboardTask[];
    calendarTasks: CalendarTask[];
};

type CalendarTask = {
    id: number;
    title: string;
    due_date: string;
    project: { id: number; name: string; color: string };
    status: { name: string; is_done: boolean };
};

const priorityLabels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
};

const priorityStyles = {
    low: 'text-sky-600 dark:text-sky-400',
    medium: 'text-amber-600 dark:text-amber-400',
    high: 'text-orange-600 dark:text-orange-400',
    urgent: 'text-red-600 dark:text-red-400',
};

export default function Dashboard({
    summary,
    projects,
    myTasks,
    calendarTasks,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const firstName = auth.user.name.split(' ')[0];

    const metrics = [
        {
            label: 'Proyectos activos',
            value: summary.projects,
            detail: 'En tu espacio de trabajo',
            icon: FolderKanban,
            iconClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        },
        {
            label: 'Tareas abiertas',
            value: summary.open_tasks,
            detail: 'Pendientes de completar',
            icon: ListTodo,
            iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Próximas a vencer',
            value: summary.due_soon,
            detail:
                summary.overdue > 0
                    ? `${summary.overdue} vencida${summary.overdue === 1 ? '' : 's'}`
                    : 'Sin tareas vencidas',
            icon: CalendarClock,
            iconClass:
                summary.overdue > 0
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        },
        {
            label: 'Completadas',
            value: summary.completed_this_week,
            detail: 'Durante los últimos 7 días',
            icon: CheckCircle2,
            iconClass:
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
    ];

    return (
        <>
            <Head title="Panel" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Resumen operativo
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold">
                            Hola, {firstName}
                        </h1>
                    </div>
                    <Button asChild size="sm">
                        <Link href="/projects">
                            <Plus className="size-4" />
                            Nuevo proyecto
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="flex min-h-28 items-start justify-between gap-4 rounded-md border bg-card p-4"
                        >
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    {metric.label}
                                </p>
                                <p className="mt-2 text-3xl font-semibold tabular-nums">
                                    {metric.value}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {metric.detail}
                                </p>
                            </div>
                            <span
                                className={`flex size-9 shrink-0 items-center justify-center rounded-md ${metric.iconClass}`}
                            >
                                <metric.icon className="size-4" />
                            </span>
                        </div>
                    ))}
                </div>

                <DashboardCalendar tasks={calendarTasks} />

                <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                    <section className="min-w-0">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">
                                    Proyectos recientes
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Avance general del trabajo activo
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/projects">
                                    Ver todos
                                    <ArrowUpRight className="size-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="overflow-hidden rounded-md border">
                            {projects.length === 0 ? (
                                <EmptyState
                                    icon={FolderKanban}
                                    title="Aún no hay proyectos"
                                    action="Crear proyecto"
                                    href="/projects"
                                />
                            ) : (
                                <div className="divide-y">
                                    {projects.map((project) => {
                                        const progress = project.tasks_count
                                            ? Math.round(
                                                  (project.completed_tasks_count /
                                                      project.tasks_count) *
                                                      100,
                                              )
                                            : 0;

                                        return (
                                            <Link
                                                key={project.id}
                                                href={`/projects/${project.id}`}
                                                className="group grid gap-3 p-4 transition-colors hover:bg-muted/35 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_auto] sm:items-center"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className="size-2.5 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                project.color,
                                                        }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">
                                                            {project.name}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {project.description ||
                                                                'Sin descripción'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                                                        <span>
                                                            {
                                                                project.completed_tasks_count
                                                            }
                                                            /
                                                            {
                                                                project.tasks_count
                                                            }{' '}
                                                            tareas
                                                        </span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-500 transition-[width]"
                                                            style={{
                                                                width: `${progress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <UsersRound className="size-3.5" />
                                                    {project.members_count}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="min-w-0">
                        <div className="mb-3">
                            <h2 className="font-semibold">
                                Mis próximas tareas
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Asignaciones abiertas por fecha
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-md border">
                            {myTasks.length === 0 ? (
                                <EmptyState
                                    icon={CheckCircle2}
                                    title="No tienes tareas pendientes"
                                />
                            ) : (
                                <div className="divide-y">
                                    {myTasks.map((task) => (
                                        <Link
                                            key={task.id}
                                            href={`/projects/${task.project.id}`}
                                            className="block p-4 transition-colors hover:bg-muted/35"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span
                                                    className="mt-1.5 size-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            task.status.color,
                                                    }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {task.title}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {task.project.name} ·{' '}
                                                        {task.status.name}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`text-xs font-medium ${priorityStyles[task.priority]}`}
                                                >
                                                    {
                                                        priorityLabels[
                                                            task.priority
                                                        ]
                                                    }
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-3 pl-5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    {task.due_date ? (
                                                        <>
                                                            <CalendarClock className="size-3.5" />
                                                            {formatDate(
                                                                task.due_date,
                                                            )}
                                                        </>
                                                    ) : (
                                                        'Sin fecha límite'
                                                    )}
                                                </span>
                                                <span className="truncate">
                                                    {task.assignees
                                                        .map(
                                                            (user) => user.name,
                                                        )
                                                        .join(', ')}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

function DashboardCalendar({ tasks }: { tasks: CalendarTask[] }) {
    const [month, setMonth] = useState(
        () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
    const firstWeekday = (month.getDay() + 6) % 7;
    const daysInMonth = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
    ).getDate();
    const cells = Array.from(
        { length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 },
        (_, index) => index - firstWeekday + 1,
    );
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

    return (
        <section>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-semibold">Calendario del portafolio</h2>
                    <p className="text-sm text-muted-foreground">
                        Fechas objetivo de todos tus proyectos
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                        <span className="sr-only">Mes anterior</span>
                    </Button>
                    <span className="w-36 text-center text-sm font-medium capitalize">
                        {month.toLocaleDateString('es-MX', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </span>
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
                        <span className="sr-only">Mes siguiente</span>
                    </Button>
                </div>
            </div>
            <div className="overflow-hidden rounded-md border bg-card">
                <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
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
                        const date = `${monthKey}-${String(day).padStart(2, '0')}`;
                        const dayTasks = tasks.filter(
                            (task) => task.due_date === date,
                        );

                        return (
                            <div
                                key={index}
                                className="min-h-24 border-r border-b p-2 last:border-r-0 md:min-h-28"
                            >
                                {day > 0 && day <= daysInMonth && (
                                    <>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayTasks
                                                .slice(0, 3)
                                                .map((task) => (
                                                    <Link
                                                        key={task.id}
                                                        href={`/projects/${task.project.id}`}
                                                        className={`block truncate rounded px-1.5 py-1 text-[10px] font-medium ${task.status.is_done ? 'line-through opacity-50' : ''}`}
                                                        style={{
                                                            color: task.project
                                                                .color,
                                                            backgroundColor: `${task.project.color}18`,
                                                        }}
                                                        title={`${task.project.name}: ${task.title}`}
                                                    >
                                                        {task.title}
                                                    </Link>
                                                ))}
                                            {dayTasks.length > 3 && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    +{dayTasks.length - 3} más
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function EmptyState({
    icon: Icon,
    title,
    action,
    href,
}: {
    icon: LucideIcon;
    title: string;
    action?: string;
    href?: string;
}) {
    return (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" />
            </span>
            <p className="text-sm text-muted-foreground">{title}</p>
            {action && href && (
                <Button variant="outline" size="sm" asChild>
                    <Link href={href}>{action}</Link>
                </Button>
            )}
        </div>
    );
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(`${date}T00:00:00`));
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Panel',
            href: dashboard(),
        },
    ],
};
