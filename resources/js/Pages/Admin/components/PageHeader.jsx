/**
 * PageHeader
 *
 * Renders the icon + title + subtitle block used at the top of maintenance
 * pages.
 *
 * @example
 * <PageHeader
 *   icon={<CalendarDays className="h-6 w-6 text-primary" />}
 *   title="Holiday Maintenance"
 *   subtitle="Manage company holidays for payroll and scheduling."
 * />
 */
export function PageHeader({ icon, title, subtitle }) {
    return (
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
