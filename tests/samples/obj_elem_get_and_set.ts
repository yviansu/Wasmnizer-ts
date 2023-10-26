/*
 * Copyright (C) 2023 Intel Corporation.  All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
 */

interface I {
    [key: string]: number;
}

interface I_FUNC {
    [key: string]: () => number;
}

export function infc_obj_get_field() {
    const obj: I = {
        x: 1,
        y: 2,
    };
    console.log(obj['x']);
}

export function infc_obj_set_field() {
    const obj: I = {
        x: 1,
        y: 2,
    };
    obj['x'] = 100;
    console.log(obj['x']);
}

export function obj_get_field() {
    const obj = {
        x: 1,
        y: 2,
    };
    console.log(obj['x']);
}

export function obj_set_field() {
    const obj = {
        x: 1,
        y: 2,
    };
    obj['x'] = 100;
    console.log(obj['x']);
}

export function infc_obj_get_method() {
    const obj: I_FUNC = {
        x: () => 1,
        y: () => 2,
        hello() {
            return 5;
        }
    };
    const a = obj['hello'];
    console.log(a());
}

export function obj_get_method() {
    const obj = {
        x: () => 1,
        y: () => 2,
    };
    const a = obj['x'];
    console.log(a());
}

/* TODO: assignment between funcref and closureref
 * Need to get funcref from closureref 

export function infc_obj_set_method() {
    const obj: I_FUNC = {
        x: () => 1,
        y: () => 2,
    };
    obj['x'] = () => 100;
    const a = obj['x'];
    console.log(a());
}

export function obj_set_method() {
    const obj = {
        x: () => 1,
        y: () => 2,
    };
    obj['x'] = () => 100;
    const a = obj['x'];
    console.log(a());
}

*/
