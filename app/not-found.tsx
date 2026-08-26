import Link from "next/link";

export interface NotFoundProps {
  statusCode?: string | number;
  title: string;
  href?: string;
  btnLabel?: string;
}

function NotFoundContent({ statusCode, title, href, btnLabel }: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-[50vh]">
      <div className="space-y-4">
        <h1 className="text-9xl font-bold tracking-tighter text-primary">
          {statusCode || "404"}
        </h1>
        <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title || "الصفحة غير موجودة"}
        </p>
      </div>
      {href && (
        <Link
          href={href}
          className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-secondary-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {btnLabel || "رجوع"}
        </Link>
      )}
    </div>
  );
}

export default function NotFound() {
  return <NotFoundContent title="الصفحة غير موجودة" href="/dashboard" btnLabel="العودة للرئيسية" />;
}
