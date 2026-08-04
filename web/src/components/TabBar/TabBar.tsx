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

export default function TabBar({ options }: Props) {
  return (
    <div className={styles.container}>
      {options.map((option) => (
        <button>{option.element}</button>
      ))}
    </div>
  );
}
