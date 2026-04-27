import {
    getPayrollPeriodDays,
    buildScheduleFromRow,
    findScheduleGaps,
} from "./scheduleHelpers";

export const validateSchedules = (
    employeeRows,
    headers,
    cutoffStart,
    cutoffEnd,
    employeeList,
    shiftMap,
) => {
    const errors = [];
    let isValid = true;

    const totalDays = getPayrollPeriodDays(cutoffStart, cutoffEnd);

    // UPDATED: Now 8 static columns (Emp ID, Name, Dept, Prod Line, Team, Shift Type, Supervisor ID, Approver2 ID)
    const STATIC_COLUMNS = 8;
    const scheduleStartCol = STATIC_COLUMNS;
    const actualDayCols = headers.length - scheduleStartCol;
    const expectedDays = Math.min(totalDays, actualDayCols);

    // 1. Duplicate IDs
    const seen = [];
    const duplicateIds = [];
    employeeRows.forEach((row) => {
        const id = row[0]?.toString();
        if (!id) return;
        if (seen.includes(id)) {
            if (!duplicateIds.includes(id)) duplicateIds.push(id);
        } else seen.push(id);
    });

    if (duplicateIds.length > 0) {
        errors.push({
            type: "duplicate",
            message: `Duplicate Employee IDs found: ${duplicateIds.join(", ")}. Each employee should appear only once.`,
            isBlocking: true,
        });
        isValid = false;
    }

    // 2. Unauthorized employees
    const authorizedIds = employeeList.map(
        (e) =>
            e.EMPLOYID?.toString() ||
            e.emp_id?.toString() ||
            e.employid?.toString(),
    );
    const unauthorized = employeeRows
        .filter((row) => row[0] && !authorizedIds.includes(row[0].toString()))
        .map((row) => `${row[1] || "Unknown"} (${row[0]})`);

    if (unauthorized.length > 0) {
        errors.push({
            type: "unauthorized",
            message: `Employees not under your supervision: ${unauthorized.join(", ")}`,
            isBlocking: true,
        });
        isValid = false;
    }

    if (errors.some((e) => e.isBlocking)) return { isValid: false, errors };

    // 3. Per-employee schedule validation
    employeeRows.forEach((row, index) => {
        const empId = row[0]?.toString();
        const empName = row[1] || empId || "Unknown";
        // Pass the STATIC_COLUMNS parameter to buildScheduleFromRow
        const schedule = buildScheduleFromRow(
            row,
            headers,
            expectedDays,
            STATIC_COLUMNS,
        );
        const scheduledDays = Object.keys(schedule).length;
        const rowErrors = [];

        // Invalid shift codes
        const invalidCodes = [
            ...new Set(
                Object.values(schedule).filter(
                    (code) => code && !shiftMap[code],
                ),
            ),
        ];
        if (invalidCodes.length > 0) {
            rowErrors.push(`Invalid shift codes: ${invalidCodes.join(", ")}`);
            isValid = false;
        }

        if (scheduledDays === 0) {
            rowErrors.push(
                `No schedule entries found — 0 of ${expectedDays} days filled`,
            );
            isValid = false;
        } else if (scheduledDays < expectedDays) {
            rowErrors.push(
                `Incomplete schedule — missing ${expectedDays - scheduledDays} day(s). Expected ${expectedDays} days, got ${scheduledDays}`,
            );
            isValid = false;
        }

        const gaps = findScheduleGaps(schedule, expectedDays);
        gaps.forEach((gap) => {
            rowErrors.push(
                `Gap found — missing ${gap.missingDays} day(s) from Day ${gap.startDay} to Day ${gap.endDay}`,
            );
            isValid = false;
        });

        if (rowErrors.length > 0) {
            errors.push({
                type: "schedule",
                employee: { empId, empName },
                errors: rowErrors,
                rowIndex: index,
                isBlocking: false,
            });
        }
    });

    return { isValid, errors };
};
