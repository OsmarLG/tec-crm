import { router, usePage } from '@inertiajs/react';
import { Bell, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProjectInvitations() {
    const { invitations } = usePage().props;
    const [processingId, setProcessingId] = useState<string | null>(null);

    const respond = (id: string, accept: boolean) => {
        if (processingId) {
            return;
        }

        setProcessingId(id);
        const options = {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        };

        if (accept) {
            router.post(`/invitations/${id}/accept`, {}, options);
        } else {
            router.delete(`/invitations/${id}`, options);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9"
                    title="Invitaciones"
                >
                    <Bell className="size-4" />
                    {invitations.length > 0 && (
                        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                            {Math.min(invitations.length, 9)}
                        </span>
                    )}
                    <span className="sr-only">Invitaciones</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <DropdownMenuLabel className="px-3 py-2">
                    Invitaciones a proyectos
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {invitations.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No tienes invitaciones pendientes
                    </p>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="border-b p-3 last:border-0"
                            >
                                <p className="text-sm font-medium">
                                    {invitation.project_name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {invitation.inviter_name} te invitó a
                                    colaborar.
                                </p>
                                <div className="mt-3 flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={processingId !== null}
                                        onClick={() =>
                                            respond(invitation.id, true)
                                        }
                                    >
                                        <Check className="size-3.5" /> Aceptar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={processingId !== null}
                                        onClick={() =>
                                            respond(invitation.id, false)
                                        }
                                    >
                                        <X className="size-3.5" /> Rechazar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
