import { Head, router } from '@inertiajs/react';
import { FolderKanban, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Project } from '@/types';

export default function ProjectsIndex({ projects }: { projects: Project[] }) {
    const [showDialog, setShowDialog] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(
        null,
    );
    const [deleting, setDeleting] = useState(false);

    const handleCreate = () => {
        setSubmitting(true);
        router.post(
            '/projects',
            { name, description },
            {
                onSuccess: () => {
                    setShowDialog(false);
                    setName('');
                    setDescription('');
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <>
            <Head title="Projects" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Projects
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your project boards
                        </p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="size-4" />
                        New Project
                    </Button>
                </div>

                {projects.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center py-16">
                        <FolderKanban className="size-12 text-muted-foreground" />
                        <CardHeader className="text-center">
                            <CardTitle>No projects yet</CardTitle>
                            <CardDescription>
                                Create your first project to get started
                            </CardDescription>
                        </CardHeader>
                        <Button onClick={() => setShowDialog(true)}>
                            <Plus className="size-4" />
                            Create Project
                        </Button>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Card
                                key={project.id}
                                className="cursor-pointer transition-colors hover:bg-accent/50"
                                onClick={() =>
                                    router.visit(`/projects/${project.id}`)
                                }
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <CardTitle className="line-clamp-1">
                                                {project.name}
                                            </CardTitle>
                                            {project.description && (
                                                <CardDescription className="mt-1.5 line-clamp-2">
                                                    {project.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div
                                                className="size-3 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        project.color,
                                                }}
                                            />
                                            {project.can_delete && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            onClick={(event) =>
                                                                event.stopPropagation()
                                                            }
                                                        >
                                                            <MoreHorizontal className="size-4" />
                                                            <span className="sr-only">
                                                                Acciones del
                                                                proyecto
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onSelect={() =>
                                                                setProjectToDelete(
                                                                    project,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />{' '}
                                                            Eliminar proyecto
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                    {project.tasks_count !== undefined && (
                                        <p className="pt-4 text-sm text-muted-foreground">
                                            {project.tasks_count}{' '}
                                            {project.tasks_count === 1
                                                ? 'task'
                                                : 'tasks'}
                                        </p>
                                    )}
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                        <DialogDescription>
                            Give your project a name and optional description
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="CRM Roadmap"
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Track features and bugs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!name.trim() || submitting}
                        >
                            {submitting ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={projectToDelete !== null}
                onOpenChange={(open) =>
                    !open && !deleting && setProjectToDelete(null)
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar proyecto</DialogTitle>
                        <DialogDescription>
                            Se eliminarán permanentemente “
                            {projectToDelete?.name}”, sus tareas y diagramas.
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={deleting}
                            onClick={() => setProjectToDelete(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={() => {
                                if (!projectToDelete || deleting) {
                                    return;
                                }

                                setDeleting(true);
                                router.delete(
                                    `/projects/${projectToDelete.id}`,
                                    {
                                        onSuccess: () =>
                                            setProjectToDelete(null),
                                        onFinish: () => setDeleting(false),
                                    },
                                );
                            }}
                        >
                            <Trash2 className="size-4" />{' '}
                            {deleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ProjectsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Projects',
            href: '/projects',
        },
    ],
};
