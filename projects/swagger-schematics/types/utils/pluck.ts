export function isDefined<T>(val: T): val is NonNullable<T> {
    return val !== null && val !== undefined;
}

export function isKeyOf<O>(k: unknown): k is keyof O {
    const typeofK = typeof k;
    return (
      k !== null &&
      k !== undefined &&
      ['string', 'symbol', 'number'].includes(typeofK)
    );
}
  
export function isObjectGuard(obj: unknown): obj is object {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      !Array.isArray(obj)
    );
}

export function safePluck<T extends object, K1 extends keyof T>(
    stateObject: T,
    keys: K1 | [K1]
): T[K1];
  
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1]>(stateObject: T, keys: [K1, K2]): T[K1][K2];
  
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2]>(stateObject: T, keys: [K1, K2, K3]): T[K1][K2][K3];
  
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3]>(stateObject: T, keys: [K1, K2, K3, K4]): T[K1][K2][K3][K4];
  
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4]>(stateObject: T, keys: [K1, K2, K3, K4, K5]): T[K1][K2][K3][K4][K5];
  
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4],
    K6 extends keyof T[K1][K2][K3][K4][K5]>(
    stateObject: T,
    keys:
      | [K1]
      | [K1, K2]
      | [K1, K2, K3]
      | [K1, K2, K3, K4]
      | [K1, K2, K3, K4, K5]
      | [K1, K2, K3, K4, K5, K6]
): T[K1][K2][K3][K4][K5][K6];
export function safePluck<T extends object,
    K1 extends keyof T,
    K2 extends keyof T[K1],
    K3 extends keyof T[K1][K2],
    K4 extends keyof T[K1][K2][K3],
    K5 extends keyof T[K1][K2][K3][K4],
    K6 extends keyof T[K1][K2][K3][K4][K5]>(
    stateObject: T,
    keys:
      | [K1]
      | [K1, K2]
      | [K1, K2, K3]
      | [K1, K2, K3, K4]
      | [K1, K2, K3, K4, K5]
      | [K1, K2, K3, K4, K5, K6]
  ):
    | T[K1]
    | T[K1][K2]
    | T[K1][K2][K3]
    | T[K1][K2][K3][K4]
    | T[K1][K2][K3][K4][K5]
    | T[K1][K2][K3][K4][K5][K6]
    | null
    | undefined {
    if (!isDefined(stateObject)) {
      return stateObject;
    }
    if (!isDefined(keys)) {
      return undefined;
    }
    // sanitize keys -> keep only valid keys (string, number, symbol)
    const keysArr = (Array.isArray(keys) ? keys : [keys]).filter(k =>
        isKeyOf<T>(k)
    );
    if (
        keysArr.length === 0 ||
        !isObjectGuard(stateObject) ||
        Object.keys(stateObject).length === 0
    ) {
        return undefined;
    }
    let prop: unknown = stateObject[keysArr.shift() as K1];

    keysArr.forEach(key => {
            prop = (prop as Record<PropertyKey, unknown>)[key];
    });
    return prop as T[K1];
}