/** Status map shared by Index table and View header. */
export const SCHEDULE_STATUS = {
    1: { label: "For Approval",   variant: "warning"     },
    2: { label: "To Acknowledge", variant: "default"     },
    3: { label: "Acknowledged",   variant: "success"     },
    4: { label: "Disapproved",    variant: "destructive" },
};

/**
 * Convert a raw shiftCodes array (from server) into a keyed lookup map.
 * Used by both useWorkSchedule and useWorkScheduleView so it lives here.
 */
export const buildShiftMap = (shiftCodes = []) => {
    const normalize = (hex) =>
        hex && /^[0-9A-Fa-f]{6}$/.test(hex) ? `#${hex}` : hex || null;
    return Object.fromEntries(
        shiftCodes.map((s) => [
            s.shiftcode,
            {
                id: s.shift_code_id,
                bg: normalize(s.shiftcode_bg_color) ?? "#FFFFFF",
                color: normalize(s.shiftcode_font_color) ?? "#000000",
                desc: s.shiftcode_desc || "",
            },
        ]),
    );
};

/** Convert a raw shiftCodes array into Combobox option objects (deduplicated by code). */
export const buildShiftOptions = (shiftCodes = []) => {
    const seen = new Set();
    return shiftCodes
        .filter((s) => {
            if (!s.shiftcode || seen.has(s.shiftcode)) return false;
            seen.add(s.shiftcode);
            return true;
        })
        .map((s) => ({
            value: s.shiftcode,
            label: `${s.shiftcode} - ${s.shiftcode_desc}`,
        }));
};

export const getPayrollPeriodDays = (startDate, endDate) => {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

export const buildScheduleFromRow = (
    row,
    headers,
    totalDays,
    staticColumns = 8,
) => {
    const schedule = {};
    // Use the provided staticColumns parameter (default 8 for the new structure)
    const scheduleStartCol = staticColumns;
    const availableDayCols = headers.length - scheduleStartCol;
    const daysToProcess = Math.min(totalDays, availableDayCols);

    for (let i = 0; i < daysToProcess; i++) {
        const value = row[scheduleStartCol + i];
        if (
            value !== undefined &&
            value !== null &&
            value.toString().trim() !== ""
        ) {
            schedule[(i + 1).toString()] = value.toString().trim();
        }
    }
    return schedule;
};

export const findScheduleGaps = (schedule, totalDays) => {
    const gaps = [];
    let gapStart = null;
    let consecutiveMissingDays = 0;

    for (let i = 1; i <= totalDays; i++) {
        const hasSchedule = !!schedule[i.toString()];

        if (!hasSchedule) {
            if (gapStart === null) gapStart = i;
            consecutiveMissingDays++;
        } else if (gapStart !== null) {
            gaps.push({
                startDay: gapStart,
                endDay: i - 1,
                missingDays: consecutiveMissingDays,
            });
            gapStart = null;
            consecutiveMissingDays = 0;
        }
    }

    if (gapStart !== null) {
        gaps.push({
            startDay: gapStart,
            endDay: totalDays,
            missingDays: consecutiveMissingDays,
        });
    }

    return gaps;
};
