/**
 * @file JSON RPC 2.0 Server for WebSocket.
 * Implemented according to http://www.jsonrpc.org/specification
 */


import {getParamNames, assert, resolveParams, sleep} from './utils';

/**
 * RPC specific error codes, application errors should not use these.
 */
export enum JsonRpcErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
}

export type JsonRpcId = string | number | null

function isValidId(id: JsonRpcId) {
    return id === null || id === undefined || typeof id === 'string' || (
        typeof id === 'number' && Number.isSafeInteger(id)
    );
}

function isValidResponse(response: JsonRpcResponse) {
    return (response.id !== null && response.id !== undefined) || response.error !== undefined;
}

export class JsonRpcError {

    public readonly name = 'JSONRPCError';
    public readonly code: number;
    public readonly message: string;

    constructor(code: number, e: any) {
        this.code = code;
        this.message = e || code;
    }

    public info() {
        return `${this.name}: ${this.message}`;
    }
}

export interface JsonRpcResponseOptions {
    error?: JsonRpcError;
    request?: JsonRpcRequest;
    result?: any;
    time?: number;
}

export class JsonRpcResponse {

    public readonly jsonrpc: string = '2.0';
    public readonly id: JsonRpcId;
    public readonly error?: JsonRpcError;
    public readonly request?: JsonRpcRequest;
    public readonly result?: any;

    constructor({error, request, result}: JsonRpcResponseOptions) {
        if (!result || !error) {
            this.error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, 'must specify either result or error');
        }
        if (!(result && error)) {
            this.error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, 'result and error are mutually exclusive');
        }
        this.id = request ? request.id : null;
        this.error = error;
        this.request = request;
        this.result = result === undefined ? null : result;
    }

    public toJSON() {
        const {jsonrpc, id, error, result} = this;
        if (error) {
            return {jsonrpc, id, error};
        } else {
            return {jsonrpc, id, result};
        }
    }

    public stringify() {
        return JSON.stringify(this.toJSON());
    }

}

export class JsonRpcRequest {

    public static from(data: any) {
        const {jsonrpc, method, params, id} = data;
        return new JsonRpcRequest(jsonrpc, id, method, params);
    }

    constructor(
        public readonly jsonrpc: string,
        public readonly id: JsonRpcId,
        public readonly method: string,
        public readonly params?: any
    ) {
        assert(jsonrpc === '2.0', 'invalid rpc version');
        assert(isValidId(id), 'invalid id');
        assert(typeof method === 'string', 'invalid method');
    }

}

export function rpcAssert(value: any, message?: string) {
    if (!value) {
        throw new JsonRpcError(400, message || 'Assertion failed');
    }
}

export function rpcAssertEqual(actual: any, expected: any, message?: string) {
    // tslint:disable-next-line:triple-equals
    if (actual != expected) {
        throw new JsonRpcError(400, `${message || 'Assertion failed'}`);
    }
}

export interface JsonRpcMethodContext {
    request: JsonRpcRequest,
    assert: typeof rpcAssert
    assertEqual: typeof rpcAssertEqual
}

export type JsonRpcMethod = (this: JsonRpcMethodContext, ...params: string[]) => any

export class JsonRpcServer {
    public readonly methods: {
        [name: string]: { method: JsonRpcMethod, params: string[] },
    } = {};
    public ws: WebSocket | null = null;
    private closed: boolean = false;
    public onopen: { (): void; } | null = null;
    public onerror: { (e: string): void } | null = null;

    /**
     * @param url
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(public url: string, public namespace?: string) {
    }

    /**
     * Register a rpc method.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    public register(name: string, method: JsonRpcMethod): string | null {
        const n = this.namespace ? `${this.namespace}.${name}` : name;
        if (this.methods[n]) {
            return 'json rpc server method already exists';
        }
        const params = getParamNames(method);
        this.methods[n] = {method, params};
        return null;
    }

    public close() {
        this.closed = true;
        if (this.ws) this.ws.close();
    }

    public open() {
        const openFn = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                this.closed = false;
                try {
                    const ws = new WebSocket(this.url);
                    this.ws = ws;
                    ws.onopen = () => {
                        this.onopen?.();
                        resolve();
                    };
                    ws.onerror = () => {
                        const e = new JsonRpcError(JsonRpcErrorCode.InternalError, `connection to '${this.url}' failed`).info();
                        this.onerror?.(e);
                        reject(e);
                    };
                    ws.onclose = function (ev) {

                    };
                    ws.onmessage = async (e) => {
                        await this.handleWsMessage(e.data);
                    };
                } catch (e) {
                    reject(new JsonRpcError(JsonRpcErrorCode.InternalError, e));
                }
            });
        };
        const reconnect = async (openFn: () => Promise<void>) => {
            let ms = 10;
            for (let i = 0; ;) {
                if (i <= 10) {
                    ms = 5 * 1000;
                } else {
                    ms = 60 * 1000; // 重连超过十次后一分钟重连一次
                }
                await sleep(ms);
                if (this.closed) return;
                if (!this.ws || this.ws.readyState === 3) {
                    if (this?.ws?.readyState === 3) this.ws.close();
                    console.warn(`jsonRpcServer: WebSocket reconnect`);
                    await openFn().then(() => {
                        i = 0;
                        ms = 5 * 1000;
                    }).catch(e => {
                        console.error(e);
                    });
                    if (i <= 10) i++;
                }
            }
        };
        return new Promise(async (resolve, reject) => {
            await openFn().then(() => {
                resolve(null);
            }).catch(e => {
                reject(e);
            });
            reconnect(openFn).then();
        });
    }

    public send(data: any) {
        if (!this.ws) {
            return new JsonRpcError(JsonRpcErrorCode.InternalError, `service is not open`).info();
        }
        let resData: any;
        if (data && typeof data === 'object') {
            resData = data.stringify ? data.stringify() : JSON.stringify(data);
        } else {
            resData = data;
        }
        try {
            this.ws.send(resData);
        } catch (e) {
            console.error(new JsonRpcError(JsonRpcErrorCode.InternalError, e).info());
        }
    }

    public handleWsMessage = async (reqData: any) => {
        let data: any;
        try {
            data = JSON.parse(reqData);
        } catch (e) {
            const error = new JsonRpcError(JsonRpcErrorCode.ParseError, 'Parse error, request data parsing failed');
            const res = new JsonRpcResponse({error});
            this.send(res.stringify());
            console.error(error.info());
            return;
        }
        // spec says an empty batch request is invalid
        if (Array.isArray(data) && data.length === 0) {
            const error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, 'Invalid Request');
            const res = new JsonRpcResponse({error});
            this.send(res);
            console.error(error.info());
            return;
        }

        if (Array.isArray(data)) {
            const rp = data.map((d) => this.handleRequest(d));
            const responses = (await Promise.all(rp)).filter(isValidResponse);
            this.send(responses);
        } else {
            const response = await this.handleRequest(data);
            this.send(isValidResponse(response) ? response : '');
        }
    };

    private handleRequest = async (data: any) => {
        let request: JsonRpcRequest;
        try {
            request = JsonRpcRequest.from(data);
        } catch (e) {
            const error = new JsonRpcError(JsonRpcErrorCode.InvalidRequest, `${e}, Invalid Request`);
            return new JsonRpcResponse({request: {id: data?.id || null} as JsonRpcRequest, error});
        }

        const handler = this.methods[request.method];
        if (!handler) {
            const error = new JsonRpcError(JsonRpcErrorCode.MethodNotFound, 'Method not found');
            return new JsonRpcResponse({request, error});
        }

        let params: any[];
        try {
            if (request.params !== undefined) {
                params = resolveParams(request.params, handler.params);
            } else {
                params = [];
            }
        } catch (cause) {
            const error = new JsonRpcError(JsonRpcErrorCode.InvalidParams, `${cause}, Invalid params`);
            return new JsonRpcResponse({request, error});
        }

        let result: any;
        try {
            const bind: JsonRpcMethodContext = {
                assert: rpcAssert,
                assertEqual: rpcAssertEqual,
                request
            };
            result = await handler.method.apply(bind, params);
        } catch (error) {
            if (!(error instanceof JsonRpcError)) {
                error = new JsonRpcError(JsonRpcErrorCode.InternalError, `${error}, Internal error`);
            }
            return new JsonRpcResponse({request, error} as JsonRpcResponseOptions);
        }
        return new JsonRpcResponse({request, result});
    };
}
