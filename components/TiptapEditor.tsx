"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faStrikethrough,
  faListUl,
  faListOl,
  faQuoteLeft,
  faCode,
  faLink,
  faUndo,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";

// Lowlight 초기화 (코드 블록 문법 강조)
const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Tiptap 기반 Rich Text 에디터
 * - HTML 저장, Markdown 입력 지원
 * - 볼드, 이탤릭, 리스트, 코드 블록, 링크 등 기본 서식
 * - Purple-Pink 테마 스타일링
 */
export default function TiptapEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // lowlight 버전 사용
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-purple-600 underline hover:text-purple-700",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class:
            "bg-gray-100 rounded-lg p-4 my-2 font-mono text-sm overflow-x-auto",
        },
      }),
    ],
    content,
    immediatelyRender: false, // SSR 하이드레이션 오류 방지
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 text-gray-700",
      },
    },
  });

  if (!editor) return null;

  // 링크 추가 핸들러
  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요:", previousUrl);

    // 취소 시
    if (url === null) {
      return;
    }

    // 빈 값이면 링크 제거
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // 링크 설정
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="space-y-2">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-1 p-2 bg-purple-50 rounded-2xl border-2 border-purple-200">
        {/* 텍스트 서식 */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("bold")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Bold"
        >
          <FontAwesomeIcon icon={faBold} />
        </Button>

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("italic")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Italic"
        >
          <FontAwesomeIcon icon={faItalic} />
        </Button>

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("strike") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("strike")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Strikethrough"
        >
          <FontAwesomeIcon icon={faStrikethrough} />
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* 리스트 */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("bulletList")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Bullet List"
        >
          <FontAwesomeIcon icon={faListUl} />
        </Button>

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("orderedList")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Ordered List"
        >
          <FontAwesomeIcon icon={faListOl} />
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* 블록 타입 */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("blockquote")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Quote"
        >
          <FontAwesomeIcon icon={faQuoteLeft} />
        </Button>

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("codeBlock") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("codeBlock")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Code Block"
        >
          <FontAwesomeIcon icon={faCode} />
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* 링크 */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("link") ? "default" : "ghost"}
          onClick={setLink}
          className={`h-8 w-8 p-0 ${
            editor.isActive("link")
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              : ""
          }`}
          title="Insert Link"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* Undo/Redo */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <FontAwesomeIcon icon={faUndo} />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          title="Redo"
        >
          <FontAwesomeIcon icon={faRedo} />
        </Button>
      </div>

      {/* 에디터 영역 */}
      <div className="border-2 border-purple-200 focus-within:border-purple-500 rounded-2xl overflow-hidden bg-white transition-colors">
        <EditorContent editor={editor} />
      </div>

      {/* 도움말 */}
      <p className="text-xs text-gray-500">
        💡 Markdown 문법도 사용 가능합니다: **굵게**, *기울임*, `코드`, - 목록
      </p>
    </div>
  );
}
