"use client";

import { useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
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
  faHeading,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

// Lowlight 초기화 (코드 블록 문법 강조)
const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 에디터에 삽입된 미업로드 이미지를 게시 시점까지 보관하는 ref */
  pendingFilesRef: React.MutableRefObject<Map<string, File>>;
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
  pendingFilesRef,
}: TiptapEditorProps) {
  // 에디터 인스턴스 최신 참조 (handleDrop/handlePaste 클로저에서 활용)
  const editorRef = useRef<Editor | null>(null);
  // 이미지 파일 input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  /**
   * 이미지 파일을 data: URL로 변환해 에디터에 삽입하고
   * pendingFilesRef에 등록해 게시 시점에 일괄 업로드 준비
   */
  const insertImageFromFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("이미지 크기는 10MB 이하여야 합니다");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl || !editorRef.current) return;
        // 게시 전까지 파일 보관
        pendingFilesRef.current.set(dataUrl, file);
        // 에디터에 data: URL로 미리보기 삽입
        editorRef.current.chain().focus().setImage({ src: dataUrl }).run();
      };
      reader.readAsDataURL(file);
    },
    [pendingFilesRef],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6], // 모든 헤딩 레벨 활성화
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
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
            "bg-gray-900 rounded-lg p-4 my-2 font-mono text-sm overflow-x-auto",
        },
      }),
      // 인라인 이미지 — data: URL 임시 미리보기 허용
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-xl max-w-full my-2 block cursor-pointer",
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
      // 드래그 앤 드롭으로 이미지 삽입
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const images = Array.from(files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!images.length) return false;
        event.preventDefault();
        images.forEach((f) => insertImageFromFile(f));
        return true;
      },
      // 클립보드 붙여넣기로 이미지 삽입 (Ctrl+V)
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const images = items.filter((i) => i.type.startsWith("image/"));
        if (!images.length) return false;
        images.forEach((item) => {
          const file = item.getAsFile();
          if (file) insertImageFromFile(file);
        });
        return true;
      },
    },
  });

  // editorRef를 항상 최신 editor 인스턴스로 유지
  useEffect(() => {
    if (editor) editorRef.current = editor;
  }, [editor]);

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
            editor.isActive("bold") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("italic") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("strike") ? "bg-purple-600 text-white" : ""
          }`}
          title="Strikethrough"
        >
          <FontAwesomeIcon icon={faStrikethrough} />
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* 헤딩 */}
        <Button
          type="button"
          size="sm"
          variant={
            editor.isActive("heading", { level: 1 }) ? "default" : "ghost"
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`h-8 w-10 p-0 text-xs font-bold ${
            editor.isActive("heading", { level: 1 })
              ? "bg-purple-600 text-white"
              : ""
          }`}
          title="Heading 1"
        >
          H1
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            editor.isActive("heading", { level: 2 }) ? "default" : "ghost"
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`h-8 w-10 p-0 text-xs font-bold ${
            editor.isActive("heading", { level: 2 })
              ? "bg-purple-600 text-white"
              : ""
          }`}
          title="Heading 2"
        >
          H2
        </Button>

        <Button
          type="button"
          size="sm"
          variant={
            editor.isActive("heading", { level: 3 }) ? "default" : "ghost"
          }
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`h-8 w-10 p-0 text-xs font-bold ${
            editor.isActive("heading", { level: 3 })
              ? "bg-purple-600 text-white"
              : ""
          }`}
          title="Heading 3"
        >
          H3
        </Button>

        <div className="w-px h-8 bg-purple-300 mx-1" />

        {/* 리스트 */}
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${
            editor.isActive("bulletList") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("orderedList") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("blockquote") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("codeBlock") ? "bg-purple-600 text-white" : ""
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
            editor.isActive("link") ? "bg-purple-600 text-white" : ""
          }`}
          title="Insert Link"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>

        {/* 이미지 삽입 (툴바 버튼 클릭 → 파일 선택) */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImageFromFile(file);
            // 같은 파일 재선택 가능하도록 초기화
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => imageInputRef.current?.click()}
          className="h-8 w-8 p-0"
          title="이미지 삽입"
        >
          <FontAwesomeIcon icon={faImage} />
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
      <div className="text-xs text-gray-500 space-y-1"></div>
    </div>
  );
}
