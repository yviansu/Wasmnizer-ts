"use strict";

function indexGenerator(alpha) {
    var results = new Array(alpha); // sneller dan []
    for (var counter = 0; counter < alpha; counter++) {
        results[counter] = counter;
    }
    return results;
}
;
function gradeUp(alpha, indices, low, high) {
    if (high <= low)
        return indices;
    var midValue = alpha[indices[Math.floor((low + high) / 2)]];
    var t1, t2;
    var t3, t4;
    var i = low, j = high;
    while (i <= j) {
        (t1 = indices[i]), (t2 = indices[j]);
        (t3 = alpha[t1] >= midValue), (t4 = alpha[t2] <= midValue);
        if (t3 && t4) {
            // [indices[i], indices[j]] = [indices[j], indices[i]]  // swap not supported
            indices[i] = t2;
            indices[j] = t1;
            i = i + 1;
            j = j - 1;
        }
        else {
            if (t3 === false) {
                i++;
            }
            if (t4 === false) {
                j--;
            }
        }
    }
    gradeUp(alpha, indices, low, j);
    gradeUp(alpha, indices, i, high);
    return indices;
}
;
var m_w = 123456789;
var m_z = 987654321;
var mask = 0xffffffff;
function random() {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    var xx = 4294967296; // 2**32
    var result;
    result = (((m_z << 16) + (m_w & 65535)) >>> 1) / xx;
    return result;
}
function deal(l, r) {
    // Result is an integer vector obtained by making "r" random selections from indexGenerator(l) without repetition.
    var results = indexGenerator(l);
    var h, j;
    for (var i = 0; i < r; i++) {
        j = i + Math.floor(random() * (l - i)); // Math.floor|number j = i + (omega-i).roll
        //   [results[j], results[i]]=[results[i], results[j]]   //destructuring werkt nog niet
        h = results[i];
        results[i] = results[j];
        results[j] = h;
    }
    return results.slice(0, r);
}
;
function from(alpha, omega) {
    var rho = alpha.length;
    var z = new Array(rho);
    for (var i = 0; i < rho; i++) {
        z[i] = omega[alpha[i] >= 0 ? alpha[i] : omega.length + alpha[i]];
    }
    return z;
}
;
function main() {
    var length = 1000000;
    var dd = deal(length, length);
    var indexes = indexGenerator(length); //deal(length, length)
    var nul = 0;
    var ai = Date.now();
    var index = gradeUp(dd, indexes, 0, length - 1); //, indexes) //, nul, length - 1)
    // console.log(Date.now() - ai)
    var test = true;
    var gg = index.map(function (a, x, arr) { return test = test && dd[a] === x; });
    // console.log(test)
    return index[length - 1];
    // const sorted=from(index,data)
}

main()
