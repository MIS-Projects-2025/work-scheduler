import SidebarLink from "@/Components/sidebar/SidebarLink";
import { LayoutDashboard, FileSpreadsheet, Eye } from "lucide-react";

export default function NavLinks({ isSidebarOpen }) {
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
            <SidebarLink
                href={route("workschedule.template.page")}
                label="Create Work Schedule"
                icon={<FileSpreadsheet className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
            <SidebarLink
                href={route("workschedule.view")}
                label="View Work Schedule"
                icon={<Eye className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
        </nav>
    );
}
