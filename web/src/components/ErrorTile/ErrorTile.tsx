import styles from "./ErrorTile.module.css";
import AlertIcon from "../../assets/alert.svg?react";

export default function ErrorTile({ message }: { message: string }) {
    return (
        <div className={styles.errortile}>
            <AlertIcon />
            <span>{message}</span>
        </div>
    );
}
