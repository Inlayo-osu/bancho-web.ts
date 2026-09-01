import { Fragment } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function renderLinkText(content: string) {
  const parts = content.split(URL_PATTERN);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer nofollow"
        className="text-accent hover:text-accent-hover"
      >
        {part}
      </a>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * Render a player's userpage as safe plain text: whitespace preserved,
 * urls clickable. (bancho.py stores raw text; full BBCode rendering is
 * intentionally out of scope for now.)
 */
export function UserpageContent({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
      {renderLinkText(content)}
    </p>
  );
}
