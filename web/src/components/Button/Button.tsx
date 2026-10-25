import styles from "./Button.module.css";

import type React from "react";

export type Variant = "default" | "primary" | "danger";

export type Props = React.PropsWithChildren &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  };

export default function Button({
  children,
  variant = "default",
  ...props
}: Props) {
  return (
    <button className={`${styles.button} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
}
