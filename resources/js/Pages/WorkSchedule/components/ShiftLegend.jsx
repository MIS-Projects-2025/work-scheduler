import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/Components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ShiftLegend({ shifts, shiftMap, collapsed, onToggle }) {
    const codes = shifts.filter((s) => s.shiftcode);
    const codesPerRow = 6;

    if (collapsed) {
        return (
            <div className="rounded-md border bg-muted/30 mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="w-full justify-between"
                >
                    <span className="text-xs font-semibold">
                        Shift Legend ({codes.length} codes)
                    </span>
                    <ChevronDown className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-muted/30 mb-4">
            <div className="flex justify-between px-4 py-2 border-b bg-muted/50">
                <span className="text-xs font-semibold">
                    Shift Legend ({codes.length} codes)
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-6 w-6 p-0"
                >
                    <ChevronUp className="w-4 h-4" />
                </Button>
            </div>
            <Table>
                <TableBody>
                    {Array.from({
                        length: Math.ceil(codes.length / codesPerRow),
                    }).map((_, rowIdx) => (
                        <TableRow key={rowIdx}>
                            {codes
                                .slice(
                                    rowIdx * codesPerRow,
                                    (rowIdx + 1) * codesPerRow,
                                )
                                .map((code) => {
                                    const style =
                                        shiftMap[code.shiftcode] ?? {};
                                    return (
                                        <TooltipProvider
                                            key={code.shift_code_id}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <TableCell
                                                        className="text-center p-2 font-semibold text-sm cursor-help"
                                                        style={{
                                                            backgroundColor:
                                                                style.bg,
                                                            color: style.color,
                                                        }}
                                                    >
                                                        <div>
                                                            {code.shiftcode}
                                                        </div>
                                                        <div className="text-xs font-normal opacity-75 mt-0.5">
                                                            {code.shiftcode_desc?.substring(
                                                                0,
                                                                30,
                                                            )}
                                                            {code.shiftcode_desc
                                                                ?.length > 30
                                                                ? "..."
                                                                : ""}
                                                        </div>
                                                    </TableCell>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="top"
                                                    className="max-w-xs"
                                                >
                                                    <p className="text-xs">
                                                        <span className="font-semibold">
                                                            {code.shiftcode}
                                                        </span>
                                                        <br />
                                                        {code.shiftcode_desc}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
