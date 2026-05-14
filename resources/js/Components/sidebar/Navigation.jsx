import { usePage } from "@inertiajs/react";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import Dropdown from "@/Components/sidebar/Dropdown";
import {
    LayoutDashboard,
    FileSpreadsheet,
    CalendarDays,
    Gift,
    CreditCard,
    Clock,
    Shield,
    Users,
    Settings,
} from "lucide-react";

export default function NavLinks({ isSidebarOpen }) {
    const { emp_data } = usePage().props;

    const userRole = emp_data?.emp_system_role || "user";
    const isHrAdmin = userRole === "hr_admin";
    const hasDirectReports = emp_data?.has_direct_reports ?? false;

    return (
        <nav
            className="flex flex-col flex-grow space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
        >
            <SidebarLink
                href={route("dashboard")}
                label="Dashboard"
                icon={<LayoutDashboard className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />

            {/* Admin Dropdown - Only show for HR Admin users */}
            {isHrAdmin && (
                <Dropdown
                    label="Administration"
                    icon={<Shield className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                    links={[
                        {
                            href: route("holidays.page"),
                            label: "Holidays",
                            icon: <Gift className="w-4 h-4" />,
                        },
                        {
                            href: route("payroll-cutoff-schedules.page"),
                            label: "Payroll Cutoff Schedules",
                            icon: <CreditCard className="w-4 h-4" />,
                        },
                        {
                            href: route("shift-codes.page"),
                            label: "Shift Codes",
                            icon: <Clock className="w-4 h-4" />,
                        },
                    ]}
                />
            )}
            {!isHrAdmin && hasDirectReports && (
                <SidebarLink
                    href={route("workschedule.template")}
                    label="Create Work Schedule"
                    icon={<FileSpreadsheet className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                />
            )}
            <SidebarLink
                href={route("workschedule.index")}
                label="Work Schedules"
                icon={<CalendarDays className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
        </nav>
    );
}
