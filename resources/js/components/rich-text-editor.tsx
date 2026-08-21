import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading2,
    Italic,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RichTextDocument } from '@/types';

type Props = {
    content?: RichTextDocument;
    onChange: (content: RichTextDocument) => void;
};

export function RichTextEditor({ content, onChange }: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder:
                    'Agrega contexto, criterios de aceptación, enlaces o notas...',
            }),
        ],
        content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
        immediatelyRender: false,
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.getJSON() as RichTextDocument);
        },
    });

    if (!editor) {
        return null;
    }

    const tools = [
        {
            label: 'Negrita',
            icon: Bold,
            active: editor.isActive('bold'),
            action: () => editor.chain().focus().toggleBold().run(),
        },
        {
            label: 'Cursiva',
            icon: Italic,
            active: editor.isActive('italic'),
            action: () => editor.chain().focus().toggleItalic().run(),
        },
        {
            label: 'Encabezado',
            icon: Heading2,
            active: editor.isActive('heading', { level: 2 }),
            action: () =>
                editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            label: 'Lista',
            icon: List,
            active: editor.isActive('bulletList'),
            action: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            label: 'Lista numerada',
            icon: ListOrdered,
            active: editor.isActive('orderedList'),
            action: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            label: 'Cita',
            icon: Quote,
            active: editor.isActive('blockquote'),
            action: () => editor.chain().focus().toggleBlockquote().run(),
        },
    ];

    return (
        <div className="rich-text-editor overflow-hidden rounded-md border bg-background">
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-1.5">
                {tools.map(({ label, icon: Icon, active, action }) => (
                    <Button
                        key={label}
                        type="button"
                        variant={active ? 'secondary' : 'ghost'}
                        size="icon"
                        className="size-8"
                        onClick={action}
                        title={label}
                    >
                        <Icon className="size-4" />
                        <span className="sr-only">{label}</span>
                    </Button>
                ))}
                <div className="mx-1 h-5 w-px bg-border" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Deshacer"
                >
                    <Undo2 className="size-4" />
                    <span className="sr-only">Deshacer</span>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Rehacer"
                >
                    <Redo2 className="size-4" />
                    <span className="sr-only">Rehacer</span>
                </Button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
