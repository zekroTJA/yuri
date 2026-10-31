import {
  useRef,
  useState,
  type FormEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import styles from "./TagInput.module.css";
import { onSanitizedInput } from "../../utils/input";
import { sanitizeTag, TAG_SEPARATORS } from "../../utils/tags";
import CloseIcon from "../../assets/close.svg?react";

export type TagsChangeCallback = (tags: string[]) => void;

export type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onInput"
> & {
  tags: string[];
  onChange: TagsChangeCallback;
};

// Input showing each entered tag as a removable element in front of a text
// input for new tags. A new tag is added when a comma or space is entered or
// when the text input loses focus.
//
// Must not be wrapped in a <label>, because clicking the label would activate
// the first tag's remove button.
export default function TagInput({
  tags,
  onChange,
  className,
  onKeyDown,
  onBlur,
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");

  const addTags = (newTags: string[]) => {
    const merged = [...tags];
    for (const tag of newTags) {
      if (tag && !merged.includes(tag)) merged.push(tag);
    }
    if (merged.length !== tags.length) onChange(merged);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const commitDraft = () => {
    addTags([draft]);
    setDraft("");
  };

  const onInput = (e: FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (!TAG_SEPARATORS.test(value)) {
      onSanitizedInput(e, sanitizeTag, setDraft);
      return;
    }
    // Everything in front of the last separator is added as tags, the rest
    // remains as the new draft. This also splits pasted lists of tags.
    const parts = value.split(TAG_SEPARATORS).map(sanitizeTag);
    setDraft(parts.pop() ?? "");
    addTags(parts);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitDraft();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
    onKeyDown?.(e);
  };

  const onInputBlur = (e: FocusEvent<HTMLInputElement>) => {
    commitDraft();
    onBlur?.(e);
  };

  return (
    <div
      className={`${styles.container} ${className ?? ""}`}
      onClick={() => input.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className={styles.tag}>
          {tag}
          <button
            type="button"
            className={styles.remove}
            title={`Remove tag "${tag}"`}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
          >
            <CloseIcon />
          </button>
        </span>
      ))}
      <input
        ref={input}
        className={styles.input}
        value={draft}
        onInput={onInput}
        onKeyDown={onInputKeyDown}
        onBlur={onInputBlur}
        {...props}
      />
    </div>
  );
}
