import { ReactNode } from "react";

export const PageHeader = ({
  crumb,
  title,
  actions,
}: {
  crumb: string;
  title: string;
  actions?: ReactNode;
}) => (
  <header className="h-14 border-b border-edge px-8 flex items-center justify-between shrink-0">
    <h1 className="text-sm font-medium text-muted-foreground">
      Terminal <span className="text-muted-foreground/40">/</span>{" "}
      <span className="text-foreground">{crumb}</span>
      <span className="text-muted-foreground/40 mx-2">/</span>
      <span className="text-foreground">{title}</span>
    </h1>
    {actions && <div className="flex gap-2">{actions}</div>}
  </header>
);
