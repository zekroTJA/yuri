import { useLayoutEffect, useRef, useState } from "react";
import styles from "./TabBar.module.css";
import type { JSX } from "react/jsx-runtime";

type Element = {
  id: string;
  element: string | JSX.Element;
};

type Props = {
  options: Element[];
  onSelect?: (selectedId: string) => void;
};

export default function TabBar({ options, onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    options[0]?.id,
  );

  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!selectedId) return;
    const button = buttonRefs.current.get(selectedId);
    if (!button) return;
    setIndicatorStyle({ left: button.offsetLeft, width: button.offsetWidth });
  }, [selectedId, options]);

  function handleSelect(id: string) {
    setSelectedId(id);
    onSelect?.(id);
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.indicator}
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: indicatorStyle.width,
        }}
      />
      {options.map((option) => (
        <button
          key={option.id}
          ref={(el) => {
            if (el) buttonRefs.current.set(option.id, el);
            else buttonRefs.current.delete(option.id);
          }}
          className={
            option.id === selectedId
              ? `${styles.tab} ${styles.selected}`
              : styles.tab
          }
          onClick={() => handleSelect(option.id)}
        >
          {option.element}
        </button>
      ))}
    </div>
  );
}
