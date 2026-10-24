import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";
import styles from "./ContextMenu.module.css";

export type ContextMenuItem = {
  label: string;
  icon?: React.ReactNode;
  isDanger?: boolean;
  onClick: () => void;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

// Distance in pixels the menu keeps to the viewport edges.
const viewportMargin = 8;

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menu = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Shift the menu back into the viewport when it would overflow at the
  // cursor position, e.g. when opened close to the right or bottom edge.
  useLayoutEffect(() => {
    if (!menu.current) return;
    const { width, height } = menu.current.getBoundingClientRect();
    setPosition({
      left: Math.max(
        viewportMargin,
        Math.min(x, window.innerWidth - width - viewportMargin),
      ),
      top: Math.max(
        viewportMargin,
        Math.min(y, window.innerHeight - height - viewportMargin),
      ),
    });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key == "Escape") onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    document.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
      document.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return (
    <ul
      ref={menu}
      className={styles.menu}
      role="menu"
      style={position}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <li key={item.label} role="none">
          <button
            className={`${styles.item} ${item.isDanger ? styles.danger : ""}`}
            role="menuitem"
            onClick={() => {
              onClose();
              item.onClick();
            }}
          >
            {item.icon}
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
