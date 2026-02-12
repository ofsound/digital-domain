<script lang="ts">
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Image from '@tiptap/extension-image';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';

	interface Props {
		content?: string;
		placeholder?: string;
		onChange?: (html: string) => void;
	}

	let { content = '', placeholder = 'Write something...', onChange }: Props = $props();

	let editor: Editor | null = $state(null);

	function editorAction(node: HTMLDivElement) {
		editor = new Editor({
			element: node,
			extensions: [
				StarterKit,
				Image,
				Link.configure({
					openOnClick: false
				}),
				Placeholder.configure({
					placeholder
				})
			],
			content,
			onUpdate: ({ editor }) => {
				onChange?.(editor.getHTML());
			}
		});
		return {
			destroy() {
				editor?.destroy();
			}
		};
	}

	function toggleBold() {
		editor?.chain().focus().toggleBold().run();
	}

	function toggleItalic() {
		editor?.chain().focus().toggleItalic().run();
	}

	function toggleHeading(level: 1 | 2 | 3) {
		editor?.chain().focus().toggleHeading({ level }).run();
	}

	function toggleBulletList() {
		editor?.chain().focus().toggleBulletList().run();
	}

	function toggleOrderedList() {
		editor?.chain().focus().toggleOrderedList().run();
	}

	function setLink() {
		const url = window.prompt('URL');
		if (url) {
			editor?.chain().focus().setLink({ href: url }).run();
		}
	}

	function unsetLink() {
		editor?.chain().focus().unsetLink().run();
	}
</script>

<div class="border-surface-subtle bg-surface rounded-lg border">
	<!-- Toolbar -->
	<div class="border-surface-subtle flex flex-wrap gap-1 border-b p-2">
		<button
			type="button"
			onclick={toggleBold}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('bold')
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			Bold
		</button>
		<button
			type="button"
			onclick={toggleItalic}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('italic')
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			Italic
		</button>
		<div class="bg-surface-subtle mx-1 w-px"></div>
		<button
			type="button"
			onclick={() => toggleHeading(1)}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('heading', {
				level: 1
			})
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			H1
		</button>
		<button
			type="button"
			onclick={() => toggleHeading(2)}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('heading', {
				level: 2
			})
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			H2
		</button>
		<button
			type="button"
			onclick={() => toggleHeading(3)}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('heading', {
				level: 3
			})
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			H3
		</button>
		<div class="bg-surface-subtle mx-1 w-px"></div>
		<button
			type="button"
			onclick={toggleBulletList}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('bulletList')
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			• List
		</button>
		<button
			type="button"
			onclick={toggleOrderedList}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive(
				'orderedList'
			)
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			1. List
		</button>
		<div class="bg-surface-subtle mx-1 w-px"></div>
		<button
			type="button"
			onclick={setLink}
			class="rounded px-3 py-1 text-sm font-medium transition-colors {editor?.isActive('link')
				? 'bg-violet-600 text-white'
				: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
		>
			Link
		</button>
		{#if editor?.isActive('link')}
			<button
				type="button"
				onclick={unsetLink}
				class="rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-200"
			>
				Remove Link
			</button>
		{/if}
	</div>

	<!-- Editor Content -->
	<div
		use:editorAction
		class="prose prose-sm dark:prose-invert min-h-[200px] max-w-none p-4 focus:outline-none"
	></div>
</div>

<style>
	:global(.ProseMirror p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.ProseMirror:focus) {
		outline: none;
	}
</style>
