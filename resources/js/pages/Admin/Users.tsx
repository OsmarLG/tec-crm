import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    KeyRound,
    Pencil,
    Plus,
    ShieldCheck,
    UserRound,
    UserX,
} from 'lucide-react';
import { useState } from 'react';
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

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    projects_count: number;
    task_assignments_count: number;
    created_at: string;
};

export default function UsersIndex({ users }: { users: ManagedUser[] }) {
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

    const openEditor = (user: ManagedUser | null) => {
        setSelectedUser(user);
        setEditorOpen(true);
    };

    return (
        <>
            <Head title="Usuarios" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Usuarios</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Accesos, roles y actividad del equipo.
                        </p>
                    </div>
                    <Button onClick={() => openEditor(null)}>
                        <Plus className="size-4" />
                        Nuevo usuario
                    </Button>
                </div>

                <div className="overflow-hidden rounded-md border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Usuario
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Acceso
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Proyectos
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Tareas
                                    </th>
                                    <th className="w-16 px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-muted/20"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                                                    <UserRound className="size-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate font-medium">
                                                            {user.name}
                                                        </span>
                                                        {user.is_admin && (
                                                            <ShieldCheck
                                                                className="size-3.5 text-emerald-600"
                                                                aria-label="Administrador"
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                                            >
                                                {user.is_active ? (
                                                    <CheckCircle2 className="size-3" />
                                                ) : (
                                                    <UserX className="size-3" />
                                                )}
                                                {user.is_active
                                                    ? 'Activo'
                                                    : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {user.projects_count}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {user.task_assignments_count}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                onClick={() => openEditor(user)}
                                                title="Editar usuario"
                                            >
                                                <Pencil className="size-4" />
                                                <span className="sr-only">
                                                    Editar usuario
                                                </span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <UserEditor
                key={selectedUser?.id ?? 'new'}
                user={selectedUser}
                open={editorOpen}
                onOpenChange={setEditorOpen}
            />
        </>
    );
}

function UserEditor({
    user,
    open,
    onOpenChange,
}: {
    user: ManagedUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(user?.is_admin ?? false);
    const [isActive, setIsActive] = useState(user?.is_active ?? true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const submit = () => {
        setProcessing(true);
        setError('');
        const payload = {
            name: name.trim(),
            email: email.trim(),
            password: password || null,
            is_admin: isAdmin,
            is_active: isActive,
        };
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
            onError: (errors: Record<string, string>) =>
                setError(
                    Object.values(errors)[0] ??
                        'No se pudo guardar el usuario.',
                ),
            onFinish: () => setProcessing(false),
        };

        if (user) {
            router.patch(`/admin/users/${user.id}`, payload, options);
        } else {
            router.post('/admin/users', payload, options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {user ? 'Editar usuario' : 'Nuevo usuario'}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? 'Actualiza sus datos, rol o acceso.'
                            : 'Crea las credenciales iniciales para un integrante.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="user-name">Nombre</Label>
                        <Input
                            id="user-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="user-email">Correo electrónico</Label>
                        <Input
                            id="user-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="user-password">
                            {user ? 'Nueva contraseña' : 'Contraseña'}
                        </Label>
                        <div className="relative">
                            <KeyRound className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                            <Input
                                id="user-password"
                                className="pl-9"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder={
                                    user
                                        ? 'Dejar vacío para conservar'
                                        : 'Contraseña inicial'
                                }
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 rounded-md border p-3">
                        <Checkbox
                            checked={isAdmin}
                            onCheckedChange={(checked) =>
                                setIsAdmin(checked === true)
                            }
                        />
                        <span>
                            <span className="block text-sm font-medium">
                                Administrador
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                Puede administrar usuarios y accesos.
                            </span>
                        </span>
                    </label>
                    {user && (
                        <label className="flex items-center gap-3 rounded-md border p-3">
                            <Checkbox
                                checked={isActive}
                                onCheckedChange={(checked) =>
                                    setIsActive(checked === true)
                                }
                            />
                            <span>
                                <span className="block text-sm font-medium">
                                    Acceso activo
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    Al desactivarlo ya no podrá iniciar sesión.
                                </span>
                            </span>
                        </label>
                    )}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        onClick={submit}
                        disabled={
                            processing ||
                            !name.trim() ||
                            !email.trim() ||
                            (!user && !password)
                        }
                    >
                        {processing ? 'Guardando...' : 'Guardar usuario'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'Usuarios', href: '/admin/users' }],
};
