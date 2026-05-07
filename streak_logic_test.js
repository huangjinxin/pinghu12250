function calculateStreak(todayStartStr, completedDateStrings) {
    const todayStart = new Date(todayStartStr);
    const completedDates = new Set(completedDateStrings);

    // LOGIC START
    let streak = 0;
    let checkDate = new Date(todayStart);
    const todayKey = checkDate.toISOString().split('T')[0];

    // 如果今天没完成，尝试从昨天开始接续
    if (!completedDates.has(todayKey)) {
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (true) {
        const dateKey = checkDate.toISOString().split('T')[0];
        if (completedDates.has(dateKey)) {
            streak++;
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        } else {
            break;
        }
    }
    // LOGIC END
    return streak;
}

// Test 1: Today is 2026-01-23. Completed: 2026-01-22. (Today missed)
// Expected: 1
const res1 = calculateStreak('2026-01-23T00:00:00.000Z', ['2026-01-22']);
console.log(`Test 1 (Yesterday only): Expected 1, Got ${res1}`);
if (res1 !== 1) console.error('FAIL Test 1');

// Test 2: Today is 2026-01-23. Completed: 2026-01-22, 2026-01-23. (Today matched)
// Expected: 2
const res2 = calculateStreak('2026-01-23T00:00:00.000Z', ['2026-01-22', '2026-01-23']);
console.log(`Test 2 (Today + Yesterday): Expected 2, Got ${res2}`);
if (res2 !== 2) console.error('FAIL Test 2');

// Test 3: Today is 2026-01-23. Completed: None.
// Expected: 0
const res3 = calculateStreak('2026-01-23T00:00:00.000Z', []);
console.log(`Test 3 (None): Expected 0, Got ${res3}`);
if (res3 !== 0) console.error('FAIL Test 3');

// Test 4: Today is 2026-01-23. Completed: 2026-01-21. (Gap yesterday)
// Expected: 0
const res4 = calculateStreak('2026-01-23T00:00:00.000Z', ['2026-01-21']);
console.log(`Test 4 (Gap yesterday): Expected 0, Got ${res4}`);
if (res4 !== 0) console.error('FAIL Test 4');

// Test 5: Today is 2026-01-23. Completed: 2026-01-23. (Today only)
// Expected: 1
const res5 = calculateStreak('2026-01-23T00:00:00.000Z', ['2026-01-23']);
console.log(`Test 5 (Today only): Expected 1, Got ${res5}`);
if (res5 !== 1) console.error('FAIL Test 5');
