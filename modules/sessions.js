export class SessionManager {
  static getBeirutTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Beirut',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });
    
    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);

    return {
      formatted: `${map.hour}:${map.minute}:${map.second} ${map.dayPeriod} Beirut`,
      hours: parseInt(map.hour, 10) + (map.dayPeriod === 'PM' && map.hour !== '12' ? 12 : (map.dayPeriod === 'AM' && map.hour === '12' ? -12 : 0)),
      minutes: parseInt(map.minute, 10)
    };
  }

  static getSessionStatus() {
    const { hours, minutes } = this.getBeirutTime();
    const totalMinutes = hours * 60 + minutes;

    const londonOpen = 11 * 60;
    const londonClose = 19 * 60 + 30;

    const nyOpen = 16 * 60 + 30;
    const nyClose = 23 * 60;

    const isLondon = totalMinutes >= londonOpen && totalMinutes <= londonClose;
    const isNY = totalMinutes >= nyOpen && totalMinutes <= nyClose;

    let activeSession = 'ASIAN / OFF-HOURS';
    if (isLondon && isNY) activeSession = 'LONDON / NY OVERLAP';
    else if (isLondon) activeSession = 'LONDON SESSION';
    else if (isNY) activeSession = 'NEW YORK SESSION';

    return {
      timeStr: this.getBeirutTime().formatted,
      activeSession,
      isPrecisionEligible: isLondon || isNY,
      londonOpenStr: '11:00 AM Beirut',
      nyOpenStr: '04:30 PM Beirut'
    };
  }
}