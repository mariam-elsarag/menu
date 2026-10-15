import styles from "@/components/menu/menu-styles";

export default function MenuLoading() {
  return (
    <div className={styles.loadingScreen} role="status" aria-live="polite">
      جارٍ تحميل القائمة...
    </div>
  );
}
