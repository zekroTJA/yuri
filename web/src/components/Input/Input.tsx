import styles from "./Input.module.css";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  isError?: boolean;
};

export default function Input({ isError, className, ...props }: Props) {
  return (
    <input
      className={`${styles.input} ${isError ? styles.error : ""} ${className ?? ""}`}
      {...props}
    />
  );
}
