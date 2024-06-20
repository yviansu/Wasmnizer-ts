/*
 * Copyright (C) 2023 Intel Corporation.  All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
 */

declare function wasm_response_send(buffer: ArrayBuffer, size: i32): boolean;

declare function wasm_register_resource(url: ArrayBuffer): void;

declare function wasm_post_request(buffer: ArrayBuffer, size: i32): void;

declare function wasm_sub_event(url: ArrayBuffer): void;

declare function wasm_create_timer(a: i32, b: boolean, c: boolean): i32;

declare function wasm_timer_cancel(a: i32): void;

declare function wasm_timer_restart(a: i32, b: i32): void;

declare function wasm_get_sys_tick_ms(): i32;

const COAP_GET = 1;
const COAP_POST = 2;
const COAP_PUT = 3;
const COAP_DELETE = 4;
const COAP_EVENT = COAP_DELETE + 2;

/* CoAP response codes */
export enum CoAP_Status {
    NO_ERROR = 0,

    CREATED_2_01 = 65 /* CREATED */,
    DELETED_2_02 = 66 /* DELETED */,
    VALID_2_03 = 67 /* NOT_MODIFIED */,
    CHANGED_2_04 = 68 /* CHANGED */,
    CONTENT_2_05 = 69 /* OK */,
    CONTINUE_2_31 = 95 /* CONTINUE */,

    BAD_REQUEST_4_00 = 128 /* BAD_REQUEST */,
    UNAUTHORIZED_4_01 = 129 /* UNAUTHORIZED */,
    BAD_OPTION_4_02 = 130 /* BAD_OPTION */,
    FORBIDDEN_4_03 = 131 /* FORBIDDEN */,
    NOT_FOUND_4_04 = 132 /* NOT_FOUND */,
    METHOD_NOT_ALLOWED_4_05 = 133 /* METHOD_NOT_ALLOWED */,
    NOT_ACCEPTABLE_4_06 = 134 /* NOT_ACCEPTABLE */,
    PRECONDITION_FAILED_4_12 = 140 /* BAD_REQUEST */,
    REQUEST_ENTITY_TOO_LARGE_4_13 = 141 /* REQUEST_ENTITY_TOO_LARGE */,
    UNSUPPORTED_MEDIA_TYPE_4_15 = 143 /* UNSUPPORTED_MEDIA_TYPE */,

    INTERNAL_SERVER_ERROR_5_00 = 160 /* INTERNAL_SERVER_ERROR */,
    NOT_IMPLEMENTED_5_01 = 161 /* NOT_IMPLEMENTED */,
    BAD_GATEWAY_5_02 = 162 /* BAD_GATEWAY */,
    SERVICE_UNAVAILABLE_5_03 = 163 /* SERVICE_UNAVAILABLE */,
    GATEWAY_TIMEOUT_5_04 = 164 /* GATEWAY_TIMEOUT */,
    PROXYING_NOT_SUPPORTED_5_05 = 165 /* PROXYING_NOT_SUPPORTED */,

    /* Erbium errors */
    MEMORY_ALLOCATION_ERROR = 192,
    PACKET_SERIALIZATION_ERROR,

    /* Erbium hooks */
    MANUAL_RESPONSE,
    PING_RESPONSE,
}

class user_timer {
    timer_id: i32 = 0;
    timeout: i32;
    period = false;
    cb: () => void;

    constructor(cb: () => void, timeout: i32, period: boolean) {
        this.cb = cb;
        this.timeout = timeout;
        this.period = period;
        this.timer_id = timer_create(this.timeout, this.period, true);
    }
}

const timer_list = new Array<user_timer>();
let g_mid: i32 = 0;
let transaction_list = new Array<wamr_transaction>();
const REQUEST_PACKET_FIX_PART_LEN = 18;
const RESPONSE_PACKET_FIX_PART_LEN = 16;
const TRANSACTION_TIMEOUT_MS = 5000;
let g_trans_timer: user_timer;

const Reg_Event = 0;
const Reg_Request = 1;

class wamr_request {
    mid: i32 = 0;
    url = '';
    action: i32 = 0;
    fmt: i32 = 0;
    payload: ArrayBuffer;
    payload_len: i32 = 0;

    sender: i32 = 0;

    constructor(
        mid: i32,
        url: string,
        action: i32,
        fmt: i32,
        payload: ArrayBuffer,
        payload_len: i32,
    ) {
        this.mid = mid;
        this.url = url;
        this.action = action;
        this.fmt = fmt;
        this.payload = payload;
        this.payload_len = payload_len;
    }
}

class wamr_response {
    mid: i32 = 0;
    status: i32 = 0;
    fmt: i32 = 0;
    payload: ArrayBuffer | null;
    payload_len: i32 = 0;

    receiver: i32 = 0;

    constructor(
        mid: i32,
        status: i32,
        fmt: i32,
        payload: ArrayBuffer | null,
        payload_len: i32,
    ) {
        this.mid = mid;
        this.status = status;
        this.fmt = fmt;
        this.payload = payload;
        this.payload_len = payload_len;
    }

    set_status(status: i32): void {
        this.status = status;
    }

    set_payload(payload: ArrayBuffer, payload_len: i32): void {
        this.payload = payload;
        this.payload_len = payload_len;
    }
}

class wamr_resource {
    url: string;
    type: number;
    cb: request_handler_f;

    constructor(url: string, type: number, cb: request_handler_f) {
        this.url = url;
        this.type = type;
        this.cb = cb;
    }
}

export function timer_create(a: i32, b: boolean, c: boolean): i32 {
    return wasm_create_timer(a, b, c);
}

export function setTimeout(cb: () => void, timeout: i32): user_timer {
    const timer = new user_timer(cb, timeout, false);
    timer_list.push(timer);

    return timer;
}

export function setInterval(cb: () => void, timeout: i32): user_timer {
    const timer = new user_timer(cb, timeout, true);
    timer_list.push(timer);

    return timer;
}

export function timer_cancel(timer: user_timer): void {
    wasm_timer_cancel(timer.timer_id);

    let i = 0;
    for (i = 0; i < timer_list.length; i++) {
        if (timer_list[i].timer_id == timer.timer_id) break;
    }

    timer_list.splice(i, 1);
}

export function timer_restart(timer: user_timer, interval: number): void {
    wasm_timer_restart(timer.timer_id, interval);
}

export function now(): i32 {
    return wasm_get_sys_tick_ms();
}

function is_expire(
    trans: wamr_transaction,
    index: i32,
    array: Array<wamr_transaction>,
): boolean {
    const now_time = now();

    const elapsed_ms =
        now_time < trans.time
            ? now_time + (0xffffffff - trans.time) + 1
            : now_time - trans.time;

    return elapsed_ms >= TRANSACTION_TIMEOUT_MS;
}

function not_expire(
    trans: wamr_transaction,
    index: i32,
    array: Array<wamr_transaction>,
): boolean {
    const now_time = now();

    const elapsed_ms =
        now_time < trans.time
            ? now_time + (0xffffffff - trans.time) + 1
            : now_time - trans.time;

    return elapsed_ms < TRANSACTION_TIMEOUT_MS;
}

function transaction_timeout_handler(): void {
    let now_time = now();

    const expired = transaction_list.filter(is_expire);
    transaction_list = transaction_list.filter(not_expire);

    expired.forEach((item) => {
        item.cb(null);
        transaction_remove(item);
    });

    if (transaction_list.length > 0) {
        let elpased_ms: number;
        now_time = now();
        if (now_time < transaction_list[0].time) {
            elpased_ms = now_time + (0xffffffff - transaction_list[0].time) + 1;
        } else {
            elpased_ms = now_time - transaction_list[0].time;
        }
        const ms_to_expiry = TRANSACTION_TIMEOUT_MS - elpased_ms;
        timer_restart(g_trans_timer, ms_to_expiry);
    } else {
        timer_cancel(g_trans_timer);
    }
}

function transaction_find(mid: number): wamr_transaction | null {
    for (let i = 0; i < transaction_list.length; i++) {
        if (transaction_list[i].mid == mid) return transaction_list[i];
    }
    return null;
}

function transaction_add(trans: wamr_transaction): void {
    transaction_list.push(trans);

    if (transaction_list.length == 1) {
        g_trans_timer = setTimeout(
            transaction_timeout_handler,
            TRANSACTION_TIMEOUT_MS,
        );
    }
}

function transaction_remove(trans: wamr_transaction): void {
    const index = transaction_list.indexOf(trans);
    transaction_list.splice(index, 1);
}

class wamr_transaction {
    mid: number;
    time: number;
    cb: (resp: wamr_response | null) => void;

    constructor(
        mid: number,
        time: number,
        cb: (resp: wamr_response | null) => void,
    ) {
        this.mid = mid;
        this.time = time;
        this.cb = cb;
    }
}

function pack_request(req: wamr_request): DataView {
    const url_len = req.url.length + 1;
    const len = REQUEST_PACKET_FIX_PART_LEN + url_len + req.payload_len;
    const buf = new ArrayBuffer(len);

    const dataview = new DataView(buf, 0, len);

    dataview.setUint8(0, 1);
    dataview.setUint8(1, req.action);
    dataview.setUint16(2, req.fmt);
    dataview.setUint32(4, req.mid);
    dataview.setUint32(8, req.sender);
    dataview.setUint16(12, url_len);
    dataview.setUint32(14, req.payload_len);

    let i = 0;
    for (i = 0; i < url_len - 1; i++) {
        dataview.setUint8(i + 18, req.url.charCodeAt(i));
    }
    dataview.setUint8(i + 18, 0);

    const payload_view = new DataView(req.payload);
    for (i = 0; i < req.payload_len; i++) {
        dataview.setUint8(i + 18 + url_len, payload_view.getUint8(i));
    }

    return dataview;
}

function unpack_request(packet: ArrayBuffer, size: i32): wamr_request {
    const dataview = new DataView(packet, 0, size);

    if (dataview.getUint8(0) != 1) throw new Error('packet version mismatch');

    if (size < REQUEST_PACKET_FIX_PART_LEN)
        throw new Error('packet size error');

    const url_len = dataview.getUint16(12);
    const payload_len = dataview.getUint32(14);

    if (size != REQUEST_PACKET_FIX_PART_LEN + url_len + payload_len)
        throw new Error('packet size error');

    const action = dataview.getUint8(1);
    const fmt = dataview.getUint16(2);
    const mid = dataview.getUint32(4);
    const sender = dataview.getUint32(8);

    const url = packet.slice(
        REQUEST_PACKET_FIX_PART_LEN,
        REQUEST_PACKET_FIX_PART_LEN + url_len - 1,
    );
    const payload = packet.slice(
        REQUEST_PACKET_FIX_PART_LEN + url_len,
        REQUEST_PACKET_FIX_PART_LEN + url_len + payload_len,
    );
    const url_codes: number[] = new Array(url_len);
    for (let i = 0; i < url_len; i++) {
        url_codes.push(dataview.getUint8(REQUEST_PACKET_FIX_PART_LEN + i));
    }

    const req = new wamr_request(
        mid,
        String.fromCharCode(...url_codes),
        action,
        fmt,
        payload,
        payload_len,
    );
    req.sender = sender;

    return req;
}

function pack_response(resp: wamr_response): DataView {
    const len = RESPONSE_PACKET_FIX_PART_LEN + resp.payload_len;
    const buf = new ArrayBuffer(len);

    const dataview = new DataView(buf, 0, len);

    dataview.setUint8(0, 1);
    dataview.setUint8(1, resp.status);
    dataview.setUint16(2, resp.fmt);
    dataview.setUint32(4, resp.mid);
    dataview.setUint32(8, resp.receiver);
    dataview.setUint32(12, resp.payload_len);

    if (resp.payload != null) {
        const payload_view = new DataView(resp.payload!);
        for (let i = 0; i < resp.payload_len; i++) {
            dataview.setUint8(i + 16, payload_view.getUint8(i));
        }
    }

    return dataview;
}

function unpack_response(packet: ArrayBuffer, size: i32): wamr_response {
    const dataview = new DataView(packet, 0, size);

    if (dataview.getUint8(0) != 1) throw new Error('packet version mismatch');

    if (size < RESPONSE_PACKET_FIX_PART_LEN)
        throw new Error('packet size error');

    const payload_len = dataview.getUint32(12);
    if (size != RESPONSE_PACKET_FIX_PART_LEN + payload_len)
        throw new Error('packet size error');

    const status = dataview.getUint8(1);
    const fmt = dataview.getUint16(2);
    const mid = dataview.getUint32(4);
    const receiver = dataview.getUint32(8);

    const payload = packet.slice(RESPONSE_PACKET_FIX_PART_LEN);

    const resp = new wamr_response(mid, status, fmt, payload, payload_len);
    resp.receiver = receiver;

    return resp;
}

function do_request(
    req: wamr_request,
    cb: (resp: wamr_response | null) => void,
): void {
    const trans = new wamr_transaction(req.mid, now(), cb);
    const msg = pack_request(req);

    transaction_add(trans);

    wasm_post_request(msg.buffer, msg.byteLength);
}

function do_response(resp: wamr_response): void {
    const msg = pack_response(resp);

    wasm_response_send(msg.buffer, msg.byteLength);
}

const resource_list = new Array<wamr_resource>();
type request_handler_f = (req: wamr_request) => void;

function string_to_arraybuffer(url: string) {
    const url_length = url.length;
    const arraybuffer = new ArrayBuffer(url_length);
    const dataview = new DataView(arraybuffer, 0, url_length);
    for (let i = 0; i < url_length; i++) {
        dataview.setUint8(i, url.charCodeAt(i));
    }
    return arraybuffer;
}

function registe_url_handler(
    url: string,
    cb: request_handler_f,
    type: number,
): void {
    for (let i = 0; i < resource_list.length; i++) {
        if (resource_list[i].type == type && resource_list[i].url == url) {
            resource_list[i].cb = cb;
            return;
        }
    }

    const res = new wamr_resource(url, type, cb);
    resource_list.push(res);

    if (type == Reg_Request) wasm_register_resource(string_to_arraybuffer(url));
    else wasm_sub_event(string_to_arraybuffer(url));
}

function is_event_type(req: wamr_request): boolean {
    return req.action == COAP_EVENT;
}

function check_url_start(url: string, leading_str: string): boolean {
    return url.split('/')[0] == leading_str.split('/')[0];
}

/* User APIs below */
export function post(
    url: string,
    payload: ArrayBuffer,
    payload_len: number,
    tag: string,
    cb: (resp: wamr_response | null) => void,
): void {
    const req = new wamr_request(
        g_mid,
        url,
        COAP_POST,
        0,
        payload,
        payload_len,
    );
    g_mid = g_mid + 1;

    do_request(req, cb);
}

export function get(
    url: string,
    tag: string,
    cb: (resp: wamr_response | null) => void,
): void {
    const req = new wamr_request(
        g_mid,
        url,
        COAP_GET,
        0,
        new ArrayBuffer(0),
        0,
    );
    g_mid = g_mid + 1;

    do_request(req, cb);
}

export function put(
    url: string,
    payload: ArrayBuffer,
    payload_len: number,
    tag: string,
    cb: (resp: wamr_response | null) => void,
): void {
    const req = new wamr_request(g_mid, url, COAP_PUT, 0, payload, payload_len);
    g_mid = g_mid + 1;

    do_request(req, cb);
}

export function del(
    url: string,
    tag: string,
    cb: (resp: wamr_response | null) => void,
): void {
    const req = new wamr_request(
        g_mid,
        url,
        COAP_DELETE,
        0,
        new ArrayBuffer(0),
        0,
    );
    g_mid = g_mid + 1;

    do_request(req, cb);
}

export function make_response_for_request(req: wamr_request): wamr_response {
    const resp = new wamr_response(
        req.mid,
        CoAP_Status.CONTENT_2_05,
        0,
        null,
        0,
    );
    resp.receiver = req.sender;

    return resp;
}

export function api_response_send(resp: wamr_response): void {
    do_response(resp);
}

export function register_resource_handler(
    url: string,
    request_handle: request_handler_f,
): void {
    registe_url_handler(url, request_handle, Reg_Request);
}

export function publish_event(
    url: string,
    fmt: number,
    payload: ArrayBuffer,
    payload_len: number,
): void {
    const req = new wamr_request(
        g_mid,
        url,
        COAP_EVENT,
        fmt,
        payload,
        payload_len,
    );
    g_mid = g_mid + 1;

    const msg = pack_request(req);

    wasm_post_request(msg.buffer, msg.byteLength);
}

export function subscribe_event(url: string, cb: request_handler_f): void {
    registe_url_handler(url, cb, Reg_Event);
}

/* These two APIs are required by wamr runtime,
    use a wrapper to export them in the entry file

    e.g:

    import * as request from '.wamr_app_lib/request'

    // Your code here ...

    export function _on_request(buffer_offset: i32, size: i32): void {
        on_request(buffer_offset, size);
    }

    export function _on_response(buffer_offset: i32, size: i32): void {
        on_response(buffer_offset, size);
    }
*/
export function on_request(buffer: ArrayBuffer, size: i32): void {
    const req = unpack_request(buffer, size);

    const is_event = is_event_type(req);

    for (let i = 0; i < resource_list.length; i++) {
        if (
            (is_event && resource_list[i].type == Reg_Event) ||
            (!is_event && resource_list[i].type == Reg_Request)
        ) {
            if (check_url_start(req.url, resource_list[i].url)) {
                resource_list[i].cb(req);
                return;
            }
        }
    }

    console.log('on_request: exit. no service handler.');
}

export function on_response(buffer: ArrayBuffer, size: i32): void {
    const resp = unpack_response(buffer, size);
    const trans = transaction_find(resp.mid);

    if (trans != null) {
        if (transaction_list.indexOf(trans) == 0) {
            if (transaction_list.length >= 2) {
                let elpased_ms: number;
                const now_time = now();
                if (now_time < transaction_list[1].time) {
                    elpased_ms =
                        now_time + (0xffffffff - transaction_list[1].time) + 1;
                } else {
                    elpased_ms = now_time - transaction_list[1].time;
                }
                const ms_to_expiry = TRANSACTION_TIMEOUT_MS - elpased_ms;
                timer_restart(g_trans_timer, ms_to_expiry);
            } else {
                timer_cancel(g_trans_timer);
            }
        }

        trans.cb(resp);
    }
}

export function on_timer_callback(on_timer_id: i32): void {
    for (let i = 0; i < timer_list.length; i++) {
        if (timer_list[i].timer_id == on_timer_id) {
            timer_list[i].cb();
        }
    }
}
