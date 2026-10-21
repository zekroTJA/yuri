import styles from "./IconButton.module.css";

import type React from "react";

export type Props = React.PropsWithChildren &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({ children, className, ...props }: Props) {
  return (
    <button className={`${styles.button} ${className ?? ""}`} {...props}>
      {children}
    </button>
  );
}
