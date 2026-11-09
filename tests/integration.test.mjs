import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,validDate,shiftDay,mondayOf} from '../shared/dates.mjs';
test('date navigation preserves local calendar days across month/year and DST boundaries',()=>{
 assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
 assert.equal(shiftDay('2026-03-29',-1),'2026-03-28');
 assert.equal(shiftDay('2026-10-25',1),'2026-10-26');
 assert.equal(shiftDay('2024-02-28',1),'2024-02-29');
 assert.equal(mondayOf('2026-10-04'),'2026-09-28');
});
test('message date validation rejects rollover and non-strings',()=>{
 for(const value of ['2026-02-29','2026-13-01','x',null,{},'2026-1-01'])assert.equal(validDate(value),false);
 assert.equal(validDate('2024-02-29'),true);assert.match(dateKey(),/^\d{4}-\d{2}-\d{2}$/);
});
