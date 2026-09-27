import { IApiModel, IEndpointModel, TTypeModel } from './api-model';
import { toPropertyKey } from '../../types/utils/transform-type';

/**
 * breaking: code written against the previous generation may stop compiling or
 * behave differently. added: new surface, existing code is unaffected.
 */
export type TApiChangeSeverity = 'breaking' | 'added';

export interface IApiChange {
    severity: TApiChangeSeverity;
    /** What happened, e.g. `Endpoint removed`, `Property changed` */
    kind: string;
    /** What it happened to, e.g. `DELETE /api/Orders/{id}`, `IOrderDto.total` */
    subject: string;
    /** Where the subject lives or how it reads, e.g. `OrdersApiService.delete()`, `roles?: IRoleDto[]` */
    ref?: string;
    /** For changes: the previous and the new form */
    from?: string;
    to?: string;
}

const KIND_LABEL: Record<TTypeModel['kind'], string> = {
    'interface': 'Interface',
    'enum': 'Enum',
    'type-alias': 'Type'
};

/** Everything that differs between two generations of the API, breaking changes first. */
export function diffApiModels(previous: IApiModel, current: IApiModel): IApiChange[] {
    const changes = [
        ...diffTypes(previous.types, current.types),
        ...diffEndpoints(previous.endpoints, current.endpoints)
    ];
    // Stable: keeps types before endpoints within each severity
    return [
        ...changes.filter(change => change.severity === 'breaking'),
        ...changes.filter(change => change.severity === 'added')
    ];
}

function sortedUnion(a: object, b: object): string[] {
    return Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
}

function diffTypes(previous: IApiModel['types'], current: IApiModel['types']): IApiChange[] {
    return sortedUnion(previous, current).flatMap((symbol): IApiChange[] => {
        const before = previous[symbol];
        const after = current[symbol];

        if (!after) {
            return [{ severity: 'breaking', kind: `${KIND_LABEL[before.kind]} removed`, subject: symbol }];
        }
        if (!before) {
            return [{ severity: 'added', kind: `${KIND_LABEL[after.kind]} added`, subject: symbol }];
        }
        if (before.kind !== after.kind) {
            return [{
                severity: 'breaking',
                kind: 'Type changed',
                subject: symbol,
                from: KIND_LABEL[before.kind].toLowerCase(),
                to: KIND_LABEL[after.kind].toLowerCase()
            }];
        }
        if (before.kind === 'interface' && after.kind === 'interface') {
            return [
                ...diffMembers(symbol, before.properties, after.properties, 'Property'),
                ...diffIndexSignature(symbol, before.indexSignature, after.indexSignature)
            ];
        }
        if (before.kind === 'enum' && after.kind === 'enum') {
            return diffMembers(symbol, before.members, after.members, 'Enum member');
        }
        if (before.kind === 'type-alias' && after.kind === 'type-alias' && before.expression !== after.expression) {
            return [{ severity: 'breaking', kind: 'Type changed', subject: symbol, from: before.expression, to: after.expression }];
        }
        return [];
    });
}

function diffMembers(owner: string, previous: Record<string, string>, current: Record<string, string>, label: string): IApiChange[] {
    return sortedUnion(previous, current).flatMap((name): IApiChange[] => {
        const subject = `${owner}.${name}`;
        if (!(name in current)) {
            return [{ severity: 'breaking', kind: `${label} removed`, subject }];
        }
        if (!(name in previous)) {
            // A new required property breaks object literals written against the previous interface.
            // The declaration starts with the key as written, quoted when the name needs it
            if (label === 'Property' && !current[name].startsWith(`${toPropertyKey(name)}?:`)) {
                return [{ severity: 'breaking', kind: 'Required property added', subject, ref: current[name] }];
            }
            return [{ severity: 'added', kind: `${label} added`, subject, ref: current[name] }];
        }
        if (previous[name] !== current[name]) {
            return [{ severity: 'breaking', kind: `${label} changed`, subject, from: previous[name], to: current[name] }];
        }
        return [];
    });
}

/**
 * An index signature (`[key: string]: ...`) is breaking when it appears, since `keyof` the
 * interface becomes `string | number` and a class implementing it needs one too; when it goes,
 * since extra keys no longer compile; and when its type changes.
 */
function diffIndexSignature(owner: string, previous: string | undefined, current: string | undefined): IApiChange[] {
    const subject = `${owner}[key: string]`;
    if (previous === current) {
        return [];
    }
    if (previous === undefined) {
        return [{ severity: 'breaking', kind: 'Index signature added', subject, ref: `[key: string]: ${current}` }];
    }
    if (current === undefined) {
        return [{ severity: 'breaking', kind: 'Index signature removed', subject, ref: `[key: string]: ${previous}` }];
    }
    return [{ severity: 'breaking', kind: 'Index signature changed', subject, from: previous, to: current }];
}

function diffEndpoints(previous: IApiModel['endpoints'], current: IApiModel['endpoints']): IApiChange[] {
    return sortedUnion(previous, current).flatMap((label): IApiChange[] => {
        const before = previous[label];
        const after = current[label];

        if (!after) {
            return [{ severity: 'breaking', kind: 'Endpoint removed', subject: label, ref: before.symbol }];
        }
        if (!before) {
            return [{ severity: 'added', kind: 'Endpoint added', subject: label, ref: after.symbol }];
        }
        if (before.symbol !== after.symbol) {
            // Renamed method (or controller): show where it lived and where it lives now
            return [{
                severity: 'breaking',
                kind: 'Endpoint changed',
                subject: label,
                from: `${before.symbol} ${before.signature}`,
                to: `${after.symbol} ${after.signature}`
            }];
        }
        if (before.signature !== after.signature) {
            const additive = isOnlyOptionalParamsAdded(before, after);
            return [{
                severity: additive ? 'added' : 'breaking',
                kind: additive ? 'Optional parameter added' : 'Endpoint changed',
                subject: label,
                ref: after.symbol,
                from: before.signature,
                to: after.signature
            }];
        }
        return [];
    });
}

/**
 * Whether the only change is new optional parameters that every existing call can leave out:
 * the result and the existing parameters are unchanged, and the arguments existing calls pass
 * still line up (new ones only at the end, and optional). E.g. a new optional header (Angular's
 * headers object defaults to {}), or a new optional query param next to existing ones.
 */
function isOnlyOptionalParamsAdded(before: IEndpointModel, after: IEndpointModel): boolean {
    if (before.response !== after.response) {
        return false;
    }
    const kept = Object.keys(before.params).every(key => after.params[key] === before.params[key]);
    const added = Object.keys(after.params).filter(key => !(key in before.params));
    if (!kept || !added.length || added.some(key => !after.params[key].split(':')[0].endsWith('?'))) {
        return false;
    }
    const argsLineUp = before.args.every((arg, index) =>
        after.args[index]?.id === arg.id && (after.args[index].optional || !arg.optional));
    return argsLineUp && after.args.slice(before.args.length).every(arg => arg.optional);
}
