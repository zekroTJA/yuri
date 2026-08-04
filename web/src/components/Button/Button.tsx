import styles from "./Button.module.css";

import type React from "react";

export type Variant = "default" | "primary";

export type Props = React.PropsWithChildren & {
  variant?: Variant;
};

export default function Button({ children }: Props) {
  return <button className={styles.button}>{children}</button>;
}
