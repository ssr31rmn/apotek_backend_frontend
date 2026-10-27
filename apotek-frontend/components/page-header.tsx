import Link from "next/link";
import { Icon } from "@/components/icon";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function PageHeader({
  eyebrow = "Ringkasan",
  title,
  description,
  action,
  actionHref,
  onAction,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {action &&
        (actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800"
          >
            <Icon name="plus" size={18} />
            {action}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800"
          >
            <Icon name="plus" size={18} />
            {action}
          </button>
        ))}
    </div>
  );
}
