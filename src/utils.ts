/**
 * @file Misc utilities.
 */


/**
 * Sleep.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Resolve params object to positional array.
 */
export function resolveParams(params: any[] | { [key: string]: any }, names: string[]) {
    assert(typeof params === 'object', 'not an object or array');
    if (!Array.isArray(params)) {
        // resolve named arguments to positional
        const rv: any[] = names.map(() => undefined);
        for (const key of Object.keys(params)) {
            const idx = names.indexOf(key);
            assert(idx !== -1, `unknown param: ${key}`);
            rv[idx] = params[key];
        }
        return rv;
    } else {
        return params;
    }
}

// https://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically
// tslint:disable-next-line
const STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * Get parameter names for function as array.
 */
export function getParamNames(func: any) {
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    return result || [];
}

/**
 * 错误断言, 抛出错误.
 */
export function assert(notErr: boolean, e: any) {
    if (!notErr) throw e;
}
