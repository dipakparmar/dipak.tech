import type { ReactNode } from 'react';

interface MarginNoteProps {
  children: ReactNode;
  /**
   * When provided, switches the component to *enclosure* mode: `children`
   * becomes the wrapped content and `text` is rendered as the handwritten
   * note. The bracket then explicitly scopes the content (vertical `[` on
   * desktop, horizontal `U` below content on mobile).
   *
   * Omit `text` and the component renders in *standalone* mode: `children`
   * is the handwritten note, anchored to the previous paragraph.
   */
  text?: string;
}

export function MarginNote({ children, text }: MarginNoteProps) {
  if (text) {
    return (
      <div className="mdx-margin-enclose">
        <div className="mdx-margin-enclose__content">{children}</div>
        <span aria-hidden className="mdx-margin-enclose__bracket" />
        <aside className="mdx-margin-enclose__note">{text}</aside>
      </div>
    );
  }

  return (
    <aside className="mdx-margin-note">
      <span aria-hidden className="mdx-margin-note__bracket" />
      <span className="mdx-margin-note__text">{children}</span>
    </aside>
  );
}
