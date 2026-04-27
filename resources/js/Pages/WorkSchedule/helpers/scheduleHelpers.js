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
