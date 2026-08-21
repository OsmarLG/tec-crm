import '@excalidraw/excalidraw/index.css';

import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { DiagramSummary, Whiteboard } from '@/types';

type Props = {
    project: { id: number; name: string };
    diagram: Whiteboard;
    diagrams: DiagramSummary[];
};

export default function ProjectWhiteboard({
    project,
    diagram,
    diagrams,
}: Props) {
    return (
        <WhiteboardWorkspace
            key={diagram.id}
            project={project}
            diagram={diagram}
            diagrams={diagrams}
        />
    );
}

function WhiteboardWorkspace({ project, diagram, diagrams }: Props) {
    const [saving, setSaving] = useState(false);
    const [librarySaving, setLibrarySaving] = useState(false);
    const [api, setApi] = useState<any>(null);
    const [diagramName, setDiagramName] = useState(diagram.name);
    const [newDiagramOpen, setNewDiagramOpen] = useState(false);
    const [newDiagramName, setNewDiagramName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const libraryItemsRef = useRef<readonly any[]>(diagram.library_items ?? []);
    const librarySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSave = useCallback(() => {
        if (!api) {
            return;
        }

        setSaving(true);
        router.patch(
            `/projects/${project.id}/diagrams/${diagram.id}`,
            {
                name: diagramName.trim() || diagram.name,
                elements: api.getSceneElements() || [],
                app_state: api.getAppState() || {},
                files: api.getFiles() || {},
                library_items: [...libraryItemsRef.current],
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    }, [api, diagram.id, diagram.name, diagramName, project.id]);

    const createDiagram = () => {
        if (!newDiagramName.trim() || creating) {
            return;
        }

        setCreating(true);
        setCreateError('');
        router.post(
            `/projects/${project.id}/diagrams`,
            { name: newDiagramName.trim() },
            {
                onSuccess: () => setNewDiagramOpen(false),
                onError: (errors) =>
                    setCreateError(
                        errors.name ?? 'No se pudo crear el diagrama.',
                    ),
                onFinish: () => setCreating(false),
            },
        );
    };

    const persistLibrary = (items: readonly any[]) => {
        libraryItemsRef.current = items;

        if (librarySaveTimer.current) {
            clearTimeout(librarySaveTimer.current);
        }

        setLibrarySaving(true);
        librarySaveTimer.current = setTimeout(() => {
            router.patch(
                `/projects/${project.id}/diagrams/${diagram.id}`,
                { library_items: [...items] },
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => setLibrarySaving(false),
                },
            );
        }, 900);
    };

    return (
        <>
            <Head title={`${diagram.name} - ${project.name}`} />
            <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-background">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.visit(`/projects/${project.id}`)}
                        title="Volver al tablero"
                    >
                        <ArrowLeft className="size-4" />
                        <span className="sr-only">Volver al tablero</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteOpen(true)}
                        title="Eliminar diagrama"
                    >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Eliminar diagrama</span>
                    </Button>
                    <Select
                        value={String(diagram.id)}
                        onValueChange={(value) =>
                            router.visit(
                                `/projects/${project.id}/diagrams/${value}`,
                            )
                        }
                    >
                        <SelectTrigger className="w-44 sm:w-60">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {diagrams.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={String(item.id)}
                                >
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewDiagramOpen(true)}
                        title="Nuevo diagrama"
                    >
                        <Plus className="size-4" />
                        <span className="sr-only">Nuevo diagrama</span>
                    </Button>
                    <Input
                        value={diagramName}
                        onChange={(event) => setDiagramName(event.target.value)}
                        onBlur={() => {
                            if (
                                diagramName.trim() &&
                                diagramName.trim() !== diagram.name
                            ) {
                                router.patch(
                                    `/projects/${project.id}/diagrams/${diagram.id}`,
                                    { name: diagramName.trim() },
                                    { preserveScroll: true },
                                );
                            }
                        }}
                        className="hidden max-w-sm border-transparent bg-transparent font-medium shadow-none lg:block"
                        aria-label="Nombre del diagrama"
                    />
                    <div className="ml-auto">
                        {librarySaving && (
                            <span className="mr-3 hidden text-xs text-muted-foreground sm:inline">
                                Guardando biblioteca...
                            </span>
                        )}
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || !api}
                        >
                            <Save className="size-4" />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </header>

                <main className="min-h-0 flex-1">
                    <Excalidraw
                        excalidrawAPI={setApi}
                        initialData={{
                            elements: diagram.elements || [],
                            appState: diagram.app_state || {},
                            files: diagram.files || {},
                            libraryItems: diagram.library_items || [],
                        }}
                        onLibraryChange={persistLibrary}
                        UIOptions={{
                            canvasActions: {
                                saveToActiveFile: false,
                                loadScene: true,
                            },
                        }}
                    >
                        <MainMenu>
                            <MainMenu.DefaultItems.LoadScene />
                            <MainMenu.DefaultItems.SaveAsImage />
                            <MainMenu.DefaultItems.Export />
                            <MainMenu.DefaultItems.ClearCanvas />
                            <MainMenu.DefaultItems.ChangeCanvasBackground />
                        </MainMenu>
                    </Excalidraw>
                </main>
            </div>

            <Dialog open={newDiagramOpen} onOpenChange={setNewDiagramOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuevo diagrama</DialogTitle>
                        <DialogDescription>
                            Crea una pizarra independiente dentro de{' '}
                            {project.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={newDiagramName}
                        onChange={(event) =>
                            setNewDiagramName(event.target.value)
                        }
                        placeholder="Ej. Arquitectura del sistema"
                        autoFocus
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                createDiagram();
                            }
                        }}
                    />
                    {createError && (
                        <p className="text-sm text-destructive">
                            {createError}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            onClick={createDiagram}
                            disabled={!newDiagramName.trim() || creating}
                        >
                            {creating ? 'Creando...' : 'Crear diagrama'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar diagrama</DialogTitle>
                        <DialogDescription>
                            Se eliminará “{diagram.name}” junto con su lienzo y
                            biblioteca. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                router.delete(
                                    `/projects/${project.id}/diagrams/${diagram.id}`,
                                )
                            }
                        >
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ProjectWhiteboard.layout = null;
