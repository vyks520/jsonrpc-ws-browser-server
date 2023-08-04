/**
 * @file JSON RPC 2.0 Server for WebSocket.
 * Implemented according to http://www.jsonrpc.org/specification
 */
/**
 * RPC specific error codes, application errors should not use these.
 */
declare enum JsonRpcErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603
}
type JsonRpcId = string | number | null;
declare class JsonRpcError {
    readonly name = "JSONRPCError";
    readonly code: number;
    readonly message: string;
    constructor(code: number, e: any);
    info(): string;
}
interface JsonRpcResponseOptions {
    error?: JsonRpcError;
    request?: JsonRpcRequest;
    result?: any;
    time?: number;
}
declare class JsonRpcResponse {
    readonly jsonrpc: string;
    readonly id: JsonRpcId;
    readonly error?: JsonRpcError;
    readonly request?: JsonRpcRequest;
    readonly result?: any;
    constructor({ error, request, result }: JsonRpcResponseOptions);
    toJSON(): {
        jsonrpc: string;
        id: JsonRpcId;
        error: JsonRpcError;
        result?: undefined;
    } | {
        jsonrpc: string;
        id: JsonRpcId;
        result: any;
        error?: undefined;
    };
    stringify(): string;
}
declare class JsonRpcRequest {
    readonly jsonrpc: string;
    readonly id: JsonRpcId;
    readonly method: string;
    readonly params?: any;
    static from(data: any): JsonRpcRequest;
    constructor(jsonrpc: string, id: JsonRpcId, method: string, params?: any);
}
declare function rpcAssert(value: any, message?: string): void;
declare function rpcAssertEqual(actual: any, expected: any, message?: string): void;
interface JsonRpcMethodContext {
    request: JsonRpcRequest;
    assert: typeof rpcAssert;
    assertEqual: typeof rpcAssertEqual;
}
type JsonRpcMethod = (this: JsonRpcMethodContext, ...params: string[]) => any;
declare class JsonRpcServer {
    url: string;
    namespace?: string | undefined;
    readonly methods: {
        [name: string]: {
            method: JsonRpcMethod;
            params: string[];
        };
    };
    ws: WebSocket | null;
    private closed;
    onopen: {
        (): void;
    } | null;
    onerror: {
        (e: string): void;
    } | null;
    /**
     * @param url
     * @param namespace  Optional namespace to add to all methods.
     */
    constructor(url: string, namespace?: string | undefined);
    /**
     * Register a rpc method.
     * @param name    Method name.
     * @param method  Method implementation.
     */
    register(name: string, method: JsonRpcMethod): string | null;
    close(): void;
    open(): Promise<unknown>;
    send(data: any): string | undefined;
    handleWsMessage: (reqData: any) => Promise<void>;
    private handleRequest;
}

/**
 * @file Misc utilities.
 */
/**
 * Sleep.
 */
declare function sleep(ms: number): Promise<void>;
/**
 * Resolve params object to positional array.
 */
declare function resolveParams(params: any[] | {
    [key: string]: any;
}, names: string[]): any[];
/**
 * Get parameter names for function as array.
 */
declare function getParamNames(func: any): any;
/**
 * 错误断言, 抛出错误.
 */
declare function assert(notErr: boolean, e: any): void;

declare const utils_assert: typeof assert;
declare const utils_getParamNames: typeof getParamNames;
declare const utils_resolveParams: typeof resolveParams;
declare const utils_sleep: typeof sleep;
declare namespace utils {
  export {
    utils_assert as assert,
    utils_getParamNames as getParamNames,
    utils_resolveParams as resolveParams,
    utils_sleep as sleep,
  };
}

export { JsonRpcError, JsonRpcErrorCode, JsonRpcId, JsonRpcMethod, JsonRpcMethodContext, JsonRpcRequest, JsonRpcResponse, JsonRpcResponseOptions, JsonRpcServer, rpcAssert, rpcAssertEqual, utils };
