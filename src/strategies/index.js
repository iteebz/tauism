import { T1 } from './t1.js';
import { T2 } from './t2.js';
import { T3 } from './t3.js';
import { T4 } from './t4.js';
import { T5 } from './t5.js';
import { T6 } from './t6.js';
import { T7 } from './t7.js';
import { T8 } from './t8.js';

var strategies = [T1, T2, T3, T4, T5, T6, T7, T8];

var createStrategy = (theoryId) => {
    if (theoryId < 0 || theoryId > 7) return null;
    return new strategies[theoryId]();
};


