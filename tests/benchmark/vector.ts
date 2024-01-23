type i32_ = number;
type i64_ = number;
type f32_ = number;
type f64_ = number;
type anyref = any;

function indexGenerator(alpha: i32_): i32_[] {
    const results: i32_[] = new Array(alpha); // sneller dan []
    for (let counter: i32_ = 0; counter < alpha; counter++) {
        results[counter] = counter;
    }
    return results;
}

function gradeUp(
    alpha: f64_[],
    indices: i32_[],
    low: i32_,
    high: i32_,
): i32_[] {
    if (high <= low) return indices;
    const midValue: f64_ = alpha[indices[Math.floor((low + high) / 2) as i32_]];
    let t1: i32_, t2: i32_;
    let t3: boolean, t4: boolean;
    let i = low,
        j = high;
    while (i <= j) {
        (t1 = indices[i]), (t2 = indices[j]);
        (t3 = alpha[t1] >= midValue), (t4 = alpha[t2] <= midValue);
        if (t3 && t4) {
            // [indices[i], indices[j]] = [indices[j], indices[i]]  // swap not supported
            indices[i] = t2;
            indices[j] = t1;
            i = i + 1;
            j = j - 1;
        } else {
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

let m_w: i32_ = 123456789;
let m_z: i32_ = 987654321;
const mask: i32_ = 0xffffffff;

function random() {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    const xx: f64_ = 4294967296; // 2**32
    const result: f64_ = (((m_z << 16) + (m_w & 65535)) >>> 1) / xx;
    return result;
}

function deal(l: i32_, r: i32_): i32_[] {
    // Result is an integer vector obtained by making "r" random selections from indexGenerator(l) without repetition.
    const results = indexGenerator(l);
    let h: i32_, j: i32_;

    for (let i: i32_ = 0; i < r; i++) {
        j = (i + Math.floor(random() * (l - i))) as i32_; // Math.floor|number j = i + (omega-i).roll

        //   [results[j], results[i]]=[results[i], results[j]]   //destructuring werkt nog niet
        h = results[i];
        results[i] = results[j];
        results[j] = h;
    }
    return results.slice(0, r);
}

function from(alpha: number[], omega: number[]) {
    const rho = alpha.length;
    const z = new Array(rho);
    for (let i = 0; i < rho; i++) {
        z[i] = omega[alpha[i] >= 0 ? alpha[i] : omega.length + alpha[i]];
    }
    return z;
}

export function main() {
    const length: i32_ = 1000000;
    const dd = deal(length, length);
    const indexes = indexGenerator(length); //deal(length, length)
    const nul: i32_ = 0;
    const ai = Date.now();
    const index: i32_[] = gradeUp(dd, indexes, 0, length - 1); //, indexes) //, nul, length - 1)
    // console.log(Date.now() - ai)
    let test = true;
    const gg = index.map((a, x, arr) => (test = test && dd[a] === x));
    // console.log(test)
    return index[length - 1];
    // const sorted=from(index,data)
}
