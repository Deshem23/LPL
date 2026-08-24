'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Minus,
  Highlighter,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { InsertImageDialog } from '@/components/admin/media/insert-image-dialog';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  children, 
  title 
}: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-1.5 rounded-md transition-colors hover:bg-muted",
      isActive && "bg-muted text-primary",
      disabled && "opacity-50 cursor-not-allowed"
    )}
    title={title}
    type="button"
  >
    {children}
  </button>
);

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Écrivez votre article ici...",
  className
}: RichTextEditorProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        // Tailwind Typography's default `prose` spacing is tuned for
        // long-form reading (~1.25em margin above/below every
        // paragraph), which in a compact editor box reads as if every
        // paragraph already has a blank line before and after it - a
        // few real paragraphs and the editor was mostly whitespace. The
        // prose-p:/prose-headings:/etc. modifiers (supported since
        // @tailwindcss/typography v0.5) override just the spacing,
        // without losing the rest of prose's styling (font sizes, list
        // markers, blockquote borders, etc).
        class:
          'prose prose-gray dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-blockquote:my-2 focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  if (!editor) {
    return null;
  }

  // Was window.prompt('Entrez l'URL de l'image') - only usable if the
  // image already happened to be hosted somewhere else. Now opens a real
  // picker: drag-and-drop/browse a file to upload, or choose one already
  // in the platform's media library.
  const addImage = () => {
    setIsImageDialogOpen(true);
  };

  const insertImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt('Entrez l\'URL du lien');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const toggleBlockquote = () => {
    editor.chain().focus().toggleBlockquote().run();
  };

  const toggleCodeBlock = () => {
    editor.chain().focus().toggleCodeBlock().run();
  };

  const undo = () => {
    editor.chain().focus().undo().run();
  };

  const redo = () => {
    editor.chain().focus().redo().run();
  };

  // Toolbar groups
  const toolbarGroups = [
    {
      label: 'Text Style',
      buttons: [
        {
          icon: <Type className="h-4 w-4" />,
          onClick: () => editor.chain().focus().setParagraph().run(),
          isActive: editor.isActive('paragraph'),
          title: 'Paragraphe',
        },
        {
          icon: <Heading1 className="h-4 w-4" />,
          onClick: () => setHeading(1),
          isActive: editor.isActive('heading', { level: 1 }),
          title: 'Titre 1',
        },
        {
          icon: <Heading2 className="h-4 w-4" />,
          onClick: () => setHeading(2),
          isActive: editor.isActive('heading', { level: 2 }),
          title: 'Titre 2',
        },
        {
          icon: <Heading3 className="h-4 w-4" />,
          onClick: () => setHeading(3),
          isActive: editor.isActive('heading', { level: 3 }),
          title: 'Titre 3',
        },
      ]
    },
    {
      label: 'Formatting',
      buttons: [
        {
          icon: <Bold className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleBold().run(),
          isActive: editor.isActive('bold'),
          title: 'Gras',
        },
        {
          icon: <Italic className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleItalic().run(),
          isActive: editor.isActive('italic'),
          title: 'Italique',
        },
        {
          icon: <Strikethrough className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleStrike().run(),
          isActive: editor.isActive('strike'),
          title: 'Barré',
        },
        {
          icon: <Code className="h-4 w-4" />,
          onClick: () => toggleCodeBlock(),
          isActive: editor.isActive('codeBlock'),
          title: 'Bloc de code',
        },
        {
          icon: <Highlighter className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleHighlight().run(),
          isActive: editor.isActive('highlight'),
          title: 'Surligner',
        },
      ]
    },
    {
      label: 'Lists & Quotes',
      buttons: [
        {
          icon: <List className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          isActive: editor.isActive('bulletList'),
          title: 'Liste à puces',
        },
        {
          icon: <ListOrdered className="h-4 w-4" />,
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: editor.isActive('orderedList'),
          title: 'Liste numérotée',
        },
        {
          icon: <Quote className="h-4 w-4" />,
          onClick: () => toggleBlockquote(),
          isActive: editor.isActive('blockquote'),
          title: 'Citation',
        },
        {
          icon: <Minus className="h-4 w-4" />,
          onClick: () => editor.chain().focus().setHorizontalRule().run(),
          isActive: false,
          title: 'Ligne horizontale',
        },
      ]
    },
    {
      label: 'Insert',
      buttons: [
        {
          icon: <LinkIcon className="h-4 w-4" />,
          onClick: () => addLink(),
          isActive: editor.isActive('link'),
          title: 'Insérer un lien',
        },
        {
          icon: <ImageIcon className="h-4 w-4" />,
          onClick: () => addImage(),
          isActive: false,
          title: 'Insérer une image',
        },
      ]
    },
    {
      label: 'History',
      buttons: [
        {
          icon: <Undo className="h-4 w-4" />,
          onClick: () => undo(),
          isActive: false,
          title: 'Annuler',
        },
        {
          icon: <Redo className="h-4 w-4" />,
          onClick: () => redo(),
          isActive: false,
          title: 'Rétablir',
        },
      ]
    },
  ];

  return (
    <div className={cn("rounded-lg border bg-background", className)}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-0.5">
            {groupIndex > 0 && (
              <div className="w-px h-6 bg-border mx-1" />
            )}
            {group.buttons.map((button, index) => (
              <MenuButton
                key={index}
                onClick={button.onClick}
                isActive={button.isActive}
                title={button.title}
              >
                {button.icon}
              </MenuButton>
            ))}
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-gray dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-blockquote:my-2"
      />

      <InsertImageDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onInsert={insertImage}
      />
    </div>
  );
}
