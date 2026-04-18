interface Props {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "info" | "warning" | "danger" | "success";
}

const tones = {
  default: "text-foreground",
  info: "text-info",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
};

const labelTones = {
  default: "text-muted-foreground",
  info: "text-muted-foreground",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
};

export const StatCard = ({ label, value, sub, tone = "default" }: Props) => (
  <div className="bg-surface p-5 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
    <span className={`font-mono text-[10px] uppercase tracking-widest font-medium ${labelTones[tone]}`}>
      {label}
    </span>
    <div className="flex flex-col gap-1 mt-3">
      <span className={`font-mono text-3xl font-bold tracking-tight tabular-nums ${tones[tone]}`}>
        {value}
      </span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground uppercase">{sub}</span>}
    </div>
  </div>
);
