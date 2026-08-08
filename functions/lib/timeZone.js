const formatterCache = new Map();
function getFormatter(timeZone) {
    const cached = formatterCache.get(timeZone);
    if (cached)
        return cached;
    const formatter = new Intl.DateTimeFormat('en-US', {
        calendar: 'gregory',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        month: '2-digit',
        numberingSystem: 'latn',
        second: '2-digit',
        timeZone,
        year: 'numeric',
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
}
function readParts(date, timeZone) {
    const parts = Object.fromEntries(getFormatter(timeZone)
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]));
    if (parts.year === undefined ||
        parts.month === undefined ||
        parts.day === undefined ||
        parts.hour === undefined ||
        parts.minute === undefined ||
        parts.second === undefined) {
        throw new RangeError('Could not format date in timezone');
    }
    return parts;
}
function asUtcMilliseconds(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}
function withoutMilliseconds(date) {
    return new Date(Math.floor(date.getTime() / 1000) * 1000);
}
export function formatInTimeZone(date, timeZone, format) {
    const parts = readParts(date, timeZone);
    if (format === 'yyyy-MM-dd') {
        return [parts.year, parts.month, parts.day]
            .map((value) => String(value).padStart(2, '0'))
            .join('-');
    }
    return [parts.hour, parts.minute]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
}
export function fromZonedTime(value, timeZone) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/.exec(value);
    if (!match)
        return new Date(Number.NaN);
    const localGuess = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] || 0), Number((match[7] || '').padEnd(3, '0') || 0)));
    if (Number.isNaN(localGuess.getTime()))
        return localGuess;
    const localMilliseconds = localGuess.getTime();
    const localSecond = withoutMilliseconds(localGuess);
    const firstOffset = asUtcMilliseconds(readParts(localSecond, timeZone)) - localSecond.getTime();
    const firstInstant = new Date(localMilliseconds - firstOffset);
    const firstInstantSecond = withoutMilliseconds(firstInstant);
    const correctedOffset = asUtcMilliseconds(readParts(firstInstantSecond, timeZone)) - firstInstantSecond.getTime();
    return new Date(localMilliseconds - correctedOffset);
}
