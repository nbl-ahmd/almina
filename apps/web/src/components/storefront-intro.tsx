import type { ReactNode } from 'react';
import styles from './storefront-information.module.css';

export function StorefrontIntro({ title, description, children }: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return <header className={styles.intro}>
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {children}
  </header>;
}
